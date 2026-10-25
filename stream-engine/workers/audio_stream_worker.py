"""
Worker Audio: VoiceStudio Local API Streaming Worker
Streams scenario text chunks to VoiceStudio Local API (/v1/audio/speech)
and streams raw audio bytes directly into memory buffers without writing files.
"""

import os
import io
import math
import asyncio
import httpx
import logging
from typing import AsyncGenerator, Dict, Any

logger = logging.getLogger("audio_stream_worker")

class AudioStreamWorker:
    def __init__(
        self,
        base_url: str = None,
        voice_id: str = None,
        voice_name: str = None,
    ):
        self.base_url = (
            base_url
            or os.getenv("VOICESTUDIO_BASE_URL")
            or "http://localhost:3900/v1"
        ).rstrip("/")
        self.voice_id = voice_id or os.getenv("VOICE_DEFAULT_ID") or "aad77d68"
        self.voice_name = voice_name or os.getenv("VOICESTUDIO_VOICE_NAME") or "reza"
        self.timeout = httpx.Timeout(connect=5.0, read=60.0, write=5.0, pool=5.0)
        self._gpu_lock = asyncio.Lock()

    async def stream_audio_chunk(
        self, text_chunk: str
    ) -> Dict[str, Any]:
        async with self._gpu_lock:
            return await self._synthesize_chunk_locked(text_chunk)

    async def _synthesize_chunk_locked(
        self, text_chunk: str
    ) -> Dict[str, Any]:
        """
        Sends text chunk to VoiceStudio Local API and streams raw audio bytes
        directly into an in-memory byte buffer without saving to disk.
        """
        endpoint = f"{self.base_url}/audio/speech"
        payload = {
            "model": "tts-1",
            "voice": self.voice_id,
            "input": text_chunk,
            "response_format": "mp3",
            "stream": True,
        }
        headers = {
            "Authorization": "Bearer local",
            "Content-Type": "application/json",
        }

        max_retries = 3
        last_error = None

        for attempt in range(1, max_retries + 1):
            raw_bytes_buffer = io.BytesIO()
            byte_chunks_count = 0

            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    async with client.stream(
                        "POST", endpoint, json=payload, headers=headers
                    ) as response:
                        if response.status_code == 429:
                            error_detail = await response.aread()
                            logger.warning(
                                f"[VOICESTUDIO] Worker saturated (429) on attempt {attempt}/{max_retries}. Backing off 3s..."
                            )
                            await asyncio.sleep(3.0)
                            continue

                        if response.status_code != 200:
                            error_detail = await response.aread()
                            logger.warning(
                                f"[VOICESTUDIO] API returned status {response.status_code}: {error_detail.decode('utf-8', errors='ignore')}"
                            )
                            raise RuntimeError(
                                f"VoiceStudio HTTP {response.status_code}: {error_detail.decode('utf-8', errors='ignore')}"
                            )

                        async for chunk in response.aiter_bytes():
                            if chunk:
                                raw_bytes_buffer.write(chunk)
                                byte_chunks_count += 1

                audio_data = raw_bytes_buffer.getvalue()

                # Estimated duration based on MP3 stream size (assuming ~128kbps = 16KB/s)
                # or word count pacing (approx 3.5 words/sec)
                estimated_duration_ms = max(
                    800,
                    math.floor((len(audio_data) / 16000.0) * 1000)
                    if len(audio_data) > 2000
                    else math.floor((len(text_chunk.split()) / 3.5) * 1000)
                )

                # Cooldown to ensure VoiceStudio GPU worker resets cleanly before next chunk
                await asyncio.sleep(1.0)

                return {
                    "success": True,
                    "audio_bytes": audio_data,
                    "byte_size": len(audio_data),
                    "duration_ms": estimated_duration_ms,
                    "engine": "voicestudio-local-stream",
                }

            except Exception as exc:
                last_error = exc
                if attempt < max_retries:
                    logger.info(f"[VOICESTUDIO] Retrying attempt {attempt + 1} after error: {exc}")
                    await asyncio.sleep(2.0)
                else:
                    break

        logger.warning(f"[VOICESTUDIO] Local stream failed ({last_error}). Generating resilient fallback stream buffer.")
        # Resilient fallback: word-pacing based duration estimate with synthetic PCM/silence header
        word_count = max(1, len(text_chunk.split()))
        fallback_duration_ms = math.floor((word_count / 3.2) * 1000)
        
        return {
            "success": False,
            "audio_bytes": b"",
            "byte_size": 0,
            "duration_ms": fallback_duration_ms,
            "engine": "fallback-silence",
            "error": str(last_error),
        }
