"""
Event Orchestrator Module (Asyncio-based)
Connects LLM Scenario Streaming with Parallel Audio & Visual Workers,
and dispatches synchronized chunk frames through the Conductor multiplexer.
"""

import os
import re
import json
import asyncio
import logging
from typing import AsyncGenerator, List, Dict, Any, Optional

import httpx

from workers.audio_stream_worker import AudioStreamWorker
from workers.visual_stream_worker import VisualStreamWorker
from conductor import conductor

logger = logging.getLogger("stream_orchestrator")

class StreamOrchestrator:
    def __init__(self):
        self.audio_worker = AudioStreamWorker()
        self.visual_worker = VisualStreamWorker()
        self.omniroute_base_url = (
            os.getenv("OMNIROUTE_BASE_URL") or "http://localhost:20128/v1"
        ).rstrip("/")
        self.omniroute_api_key = (
            os.getenv("OMNIROUTE_API_KEY") or "sk-3f480b5172cb4e50-bdaadb-65e4e3ef"
        )
        self.default_model = (
            os.getenv("OMNIROUTE_PRIMARY_MODEL")
            or os.getenv("OMNIROUTE_MODEL")
            or "groq/openai/gpt-oss-120b"
        )

    def split_into_sentence_chunks(self, text: str) -> List[str]:
        """
        Splits scenario text into narrative phrase chunks suitable for real-time
        speech synthesis and dynamic visual frame updates (approx 8-15 words per chunk).
        """
        raw_chunks = re.split(r"(?<=[.!?,\n])\s+", text.strip())
        merged_chunks = []
        current = ""

        for part in raw_chunks:
            p = part.strip()
            if not p:
                continue
            if not current:
                current = p
            elif len(current.split()) + len(p.split()) <= 15:
                current += f" {p}"
            else:
                merged_chunks.append(current)
                current = p

        if current:
            merged_chunks.append(current)

        return merged_chunks if merged_chunks else [text]

    async def stream_from_llm(
        self,
        topic: str,
        knowledge_base: str = "",
        model_id: Optional[str] = None,
    ) -> AsyncGenerator[str, None]:
        raw_model = model_id or self.default_model
        model = "groq/openai/gpt-oss-120b" if not raw_model or raw_model == "auto" else raw_model

        endpoint = f"{self.omniroute_base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.omniroute_api_key}",
            "Content-Type": "application/json",
        }
        user_prompt = (
            f"Jelaskan mekanisme dan alur teknis dari: '{topic}'.\n"
            "Tuliskan dalam 6 sampai 8 kalimat narasi lisan bahasa Indonesia yang mengalir, lugas, "
            "dan fokus pada arsitektur komponen fisik internal."
        )

        payload = {
            "model": model,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "Kamu narator video teknik engineering Shorts/Reels. Tulis kalimat narasi lisan per kalimat (maksimal 14 kata per kalimat). "
                        "Jika membahas CPU/GPU/mikroelektronika, jelaskan arsitektur semikonduktor, transistor, die, dan fotolitografi. "
                        "Jangan gunakan analogi mekanik (roda gigi, silinder uap)."
                    ),
                },
                {"role": "user", "content": user_prompt},
            ],
            "stream": True,
            "temperature": 0.4,
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                async with client.stream("POST", endpoint, json=payload, headers=headers) as response:
                    if response.status_code != 200:
                        raise RuntimeError(f"LLM Stream returned status {response.status_code}")

                    async for line in response.aiter_lines():
                        if not line or not line.startswith("data:"):
                            continue
                        data_str = line[5:].strip()
                        if data_str == "[DONE]":
                            break
                        try:
                            parsed = json.loads(data_str)
                            delta = parsed.get("choices", [{}])[0].get("delta", {}).get("content", "")
                            if delta:
                                yield delta
                        except Exception:
                            continue
        except Exception as e:
            logger.warning(f"[ORCHESTRATOR] LLM Stream fallback triggered: {e}")
            sample_narrative = [
                f"Ini anatomi teknis dari {topic} yang bekerja di balik layar.",
                "Energi primer dikonversi menjadi daya bertegangan ekstra tinggi untuk meminimalkan kerugian transmisi.",
                "Melalui gardu induk dan transformator step-down, tegangan diturunkan bertahap sesuai standar jaringan.",
                "Kabel distribusi menyalurkan aliran arus bolak-balik menuju trafo lingkungan pemukiman.",
                f"Sistem proteksi dan isolasi memastikan pasokan {topic} sampai ke sakelar rumah dengan aman.",
            ]
            for sentence in sample_narrative:
                yield sentence + " "
                await asyncio.sleep(0.05)

    async def execute_streaming_pipeline(
        self,
        job_id: str,
        topic: str,
        knowledge_base: str = "",
        model_id: Optional[str] = None,
        custom_script: Optional[List[str]] = None,
    ):
        logger.info(f"[ORCHESTRATOR] Starting Event-Driven Stream Pipeline for Job '{job_id}' (Topic: '{topic}')")

        chunks_to_process: List[str] = []

        if custom_script and len(custom_script) > 0:
            chunks_to_process = custom_script
        else:
            accumulated_text = ""
            async for token in self.stream_from_llm(topic, knowledge_base, model_id):
                accumulated_text += token

            chunks_to_process = self.split_into_sentence_chunks(accumulated_text)

        logger.info(f"[ORCHESTRATOR] Pipeline executing {len(chunks_to_process)} parallel stream chunks for '{job_id}'")

        for idx, chunk_text in enumerate(chunks_to_process, start=1):
            logger.info(f"[ORCHESTRATOR] [Job {job_id[:8]}] Chunk #{idx}: '{chunk_text[:35]}...'")

            audio_task = asyncio.create_task(
                self.audio_worker.stream_audio_chunk(chunk_text)
            )
            visual_task = asyncio.create_task(
                self.visual_worker.generate_frame(
                    chunk_text=chunk_text,
                    topic=topic,
                    chunk_index=idx,
                    camera_shot="XRAY_WIREFRAME_SCAN" if idx % 2 == 1 else "BLUEPRINT_CAD_CALLOUT",
                )
            )

            audio_result, visual_result = await asyncio.gather(audio_task, visual_task)

            await conductor.multiplex_and_emit(
                job_id=job_id,
                chunk_index=idx,
                narration_chunk=chunk_text,
                audio_result=audio_result,
                visual_result=visual_result,
                camera_shot="XRAY_WIREFRAME_SCAN" if idx % 2 == 1 else "BLUEPRINT_CAD_CALLOUT",
            )

        # Notify clients that stream has ended
        await conductor.emit_stream_end(job_id, total_chunks=len(chunks_to_process))
        logger.info(f"[ORCHESTRATOR] Stream Pipeline finished successfully for Job '{job_id}'")

        # Update Job Status in Next.js DB to COMPLETED
        try:
            next_url = os.getenv("NEXT_APP_URL", "http://localhost:2000")
            async with httpx.AsyncClient(timeout=3.0) as client:
                await client.patch(
                    f"{next_url}/api/jobs/{job_id}",
                    json={"status": "COMPLETED", "progress": 100, "currentStage": "COMPLETED"},
                )
        except Exception as e:
            logger.debug(f"[ORCHESTRATOR] Notice updating job status: {e}")


orchestrator = StreamOrchestrator()
