"""
Pabrik-Video: Real-Time Stream Engine (FastAPI & WebSockets)
Event-driven streaming engine orchestrating Local VoiceStudio TTS,
<150ms visual generation with Anti-Hallucination Guardrails, and live Conductor multiplexing.
"""

import os
import sys
import asyncio
import logging
from typing import Optional, List

# Ensure stream-engine root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv

# Load .env.local and .env from workspace root
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_local = os.path.join(root_dir, ".env.local")
env_base = os.path.join(root_dir, ".env")
if os.path.exists(env_local):
    load_dotenv(env_local, override=True)
elif os.path.exists(env_base):
    load_dotenv(env_base)

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from conductor import conductor
from orchestrator import orchestrator
from guardrails import is_computing_entity

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("stream_main")

app = FastAPI(
    title="Pabrik-Video Stream Engine",
    description="Event-Driven & Stream-Based Pipeline with Local VoiceStudio & Fast Visuals",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class StreamStartRequest(BaseModel):
    job_id: str
    topic: str
    knowledge_base: Optional[str] = ""
    model_id: Optional[str] = "auto"
    custom_script: Optional[List[str]] = None


@app.get("/health")
async def health_check():
    return {
        "status": "HEALTHY",
        "service": "stream-engine",
        "engine": "FastAPI/Asyncio",
        "voicestudio_url": os.getenv("VOICESTUDIO_BASE_URL", "http://localhost:3900/v1"),
        "fast_image_url": os.getenv("FAST_IMAGE_URL", "procedural-blueprint"),
    }


@app.websocket("/ws/stream/{job_id}")
async def websocket_stream_endpoint(websocket: WebSocket, job_id: str):
    """
    Live WebSocket feed subscribed by Frontend Canvas Player.
    Receives synchronized FRAME_SYNC packets with audio bytes, frame imagery, and HUD telemetry.
    """
    await conductor.connect(job_id, websocket)
    try:
        while True:
            # Keep-alive loop listening for client messages (e.g. ping or controls)
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        conductor.disconnect(job_id, websocket)
    except Exception as e:
        logger.warning(f"[WS] Connection error for job '{job_id}': {e}")
        conductor.disconnect(job_id, websocket)


@app.post("/api/stream/start")
async def start_streaming_job(req: StreamStartRequest, background_tasks: BackgroundTasks):
    """
    Triggers the streaming pipeline in the background.
    Frontend connects to /ws/stream/{job_id} to receive the live frames and audio.
    """
    job_id = req.job_id
    topic = req.topic
    
    logger.info(f"[API] Triggering stream start for job '{job_id}' (Topic: '{topic}')")

    background_tasks.add_task(
        orchestrator.execute_streaming_pipeline,
        job_id=job_id,
        topic=topic,
        knowledge_base=req.knowledge_base or "",
        model_id=req.model_id,
        custom_script=req.custom_script,
    )

    return {
        "status": "STREAM_STARTED",
        "job_id": job_id,
        "topic": topic,
        "is_computing_entity": is_computing_entity(topic),
        "ws_url": f"/ws/stream/{job_id}",
    }


@app.get("/api/stream/status/{job_id}")
async def get_stream_status(job_id: str):
    timeline = conductor.timelines.get(job_id)
    connected_clients = len(conductor.active_connections.get(job_id, []))
    history = conductor.packet_history.get(job_id, [])
    latest_packet = history[-1] if history else None
    return {
        "job_id": job_id,
        "active": job_id in conductor.active_connections,
        "connected_clients": connected_clients,
        "timeline": timeline,
        "history_count": len(history),
        "latest_packet": {
            "chunkIndex": latest_packet.get("chunkIndex"),
            "domain": latest_packet.get("domain"),
            "isComputingEntity": latest_packet.get("isComputingEntity"),
            "telemetry": latest_packet.get("telemetry"),
            "callouts": latest_packet.get("callouts"),
        }
        if latest_packet
        else None,
    }


if __name__ == "__main__":
    import uvicorn
    engine_dir = os.path.dirname(os.path.abspath(__file__))
    port = int(os.getenv("STREAM_ENGINE_PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False, app_dir=engine_dir)
