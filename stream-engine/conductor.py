"""
Syncer/Conductor Module
Arrival timestamp-accurate multiplexer. Combines incoming raw audio bytes and visual frames
based on arrival timestamps, then broadcasts unified stream packets via WebSockets to Frontend Canvas Player.
"""

import time
import base64
import logging
from typing import Dict, List, Any, Optional, Set
from fastapi import WebSocket

logger = logging.getLogger("stream_conductor")

class StreamConductor:
    def __init__(self):
        # job_id -> Set[WebSocket]
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # job_id -> timeline metadata
        self.timelines: Dict[str, Dict[str, Any]] = {}
        # job_id -> list of emitted packets (history buffer for late / reconnecting clients)
        self.packet_history: Dict[str, List[Dict[str, Any]]] = {}

    async def connect(self, job_id: str, websocket: WebSocket):
        await websocket.accept()
        if job_id not in self.active_connections:
            self.active_connections[job_id] = set()
        
        if job_id not in self.timelines:
            self.timelines[job_id] = {
                "start_time": time.time(),
                "accumulated_duration_ms": 0,
                "chunks_processed": 0,
            }
            
        self.active_connections[job_id].add(websocket)
        logger.info(f"[CONDUCTOR] Client connected for job '{job_id}'. Total clients: {len(self.active_connections[job_id])}")

        # 1. Send initial handshake packet
        await websocket.send_json({
            "type": "STREAM_START",
            "jobId": job_id,
            "chunkIndex": 0,
            "timestampMs": 0,
            "message": "Stream engine connected and awaiting multiplexed audio/visual frames",
        })

        # 2. Replay all previously generated packets for this job (critical for late-connecting or refreshing clients)
        history = self.packet_history.get(job_id, [])
        if history:
            logger.info(f"[CONDUCTOR] Replaying {len(history)} buffered packets for job '{job_id}'")
            for past_packet in history:
                try:
                    await websocket.send_json(past_packet)
                except Exception as e:
                    logger.warning(f"[CONDUCTOR] Failed to send history packet to client: {e}")
                    break

    def disconnect(self, job_id: str, websocket: WebSocket):
        if job_id in self.active_connections:
            self.active_connections[job_id].discard(websocket)
            if not self.active_connections[job_id]:
                del self.active_connections[job_id]
        logger.info(f"[CONDUCTOR] Client disconnected for job '{job_id}'")

    async def broadcast_packet(self, job_id: str, packet: Dict[str, Any]):
        """Buffers packet into history and broadcasts to all connected WebSockets."""
        self.packet_history.setdefault(job_id, []).append(packet)

        if job_id not in self.active_connections:
            return

        dead_connections = set()
        for ws in self.active_connections[job_id]:
            try:
                await ws.send_json(packet)
            except Exception as e:
                logger.warning(f"[CONDUCTOR] Error sending to websocket: {e}")
                dead_connections.add(ws)

        for ws in dead_connections:
            self.disconnect(job_id, ws)

    async def multiplex_and_emit(
        self,
        job_id: str,
        chunk_index: int,
        narration_chunk: str,
        audio_result: Dict[str, Any],
        visual_result: Dict[str, Any],
        telemetry: Optional[Dict[str, Any]] = None,
        callouts: Optional[List[Dict[str, Any]]] = None,
        camera_shot: str = "XRAY_WIREFRAME_SCAN",
    ) -> Dict[str, Any]:
        """
        Arrival timestamp-accurate multiplexer:
        Binds raw audio bytes and visual frame, advances the timeline,
        and broadcasts a synchronized FRAME_SYNC packet to the Frontend Canvas Player.
        """
        timeline = self.timelines.setdefault(job_id, {
            "start_time": time.time(),
            "accumulated_duration_ms": 0,
            "chunks_processed": 0,
        })

        timestamp_ms = timeline["accumulated_duration_ms"]
        chunk_duration_ms = audio_result.get("duration_ms", 2500)
        
        # Advance accumulated timeline for next chunk
        timeline["accumulated_duration_ms"] += chunk_duration_ms
        timeline["chunks_processed"] += 1

        # Encode raw audio bytes to base64 for reliable Web Audio API ingestion in browser
        raw_audio_bytes = audio_result.get("audio_bytes", b"")
        audio_b64 = base64.b64encode(raw_audio_bytes).decode("ascii") if raw_audio_bytes else ""

        image_b64 = visual_result.get("image_base64", "")
        is_computing = visual_result.get("is_computing", False)
        domain = visual_result.get(
            "domain", "COMPUTING_HARDWARE" if is_computing else "GENERAL_ENGINEERING"
        )

        # Domain-aware Telemetry & Callout Matrix (Prevents CPU display on non-computing topics)
        if domain == "METEOROLOGY_FLUID":
            default_telemetry = {
                "objectName": "PRECIPITATION NUCLEI",
                "categoryTag": "METEOROLOGY // WATER CYCLE",
                "label": "VAPOR SATURATION",
                "startValue": 70,
                "endValue": 99,
                "unit": "% RH",
                "trendLabel": "▲ CONDENSATION",
                "chartType": "LINE_SPIKE",
                "dataPoints": [65, 72, 80, 88, 94, 99],
            }
            default_callouts = [
                {"label": "AEROSOL_NUCLEUS", "detail": "Condensation seed particle", "x": 50, "y": 48},
                {"label": "PRECIPITATION_VECTOR", "detail": "Gravity droplet fall", "x": 35, "y": 65},
            ]
        elif domain == "POWER_ENERGY":
            default_telemetry = {
                "objectName": "STEP-DOWN TRANSFORMER",
                "categoryTag": "ELECTRICAL // POWER GRID",
                "label": "GRID VOLTAGE",
                "startValue": 150,
                "endValue": 20,
                "unit": "kV",
                "trendLabel": "▼ STEP-DOWN",
                "chartType": "LINE_SPIKE",
                "dataPoints": [150, 150, 120, 80, 40, 20],
            }
            default_callouts = [
                {"label": "PRIMARY_WINDING", "detail": "High-voltage transmission bus", "x": 35, "y": 40},
                {"label": "MAGNETIC_FLUX", "detail": "Induction core circuit", "x": 65, "y": 62},
            ]
        elif domain == "MECHANICAL_AUTOMOTIVE":
            default_telemetry = {
                "objectName": "PROPULSION CYLINDER",
                "categoryTag": "MECHANICAL // KINEMATICS",
                "label": "CHAMBER TORQUE",
                "startValue": 1200,
                "endValue": 4500,
                "unit": "RPM",
                "trendLabel": "▲ POWER STROKE",
                "chartType": "LINE_SPIKE",
                "dataPoints": [20, 45, 60, 85, 90, 95],
            }
            default_callouts = [
                {"label": "PISTON_CROWN", "detail": "Combustion pressure boundary", "x": 48, "y": 42},
                {"label": "CRANKSHAFT_AXIS", "detail": "Rotary kinetic conversion", "x": 50, "y": 65},
            ]
        elif is_computing or domain == "COMPUTING_HARDWARE":
            default_telemetry = {
                "objectName": "LOGIC CORE DIE",
                "categoryTag": "SEMICONDUCTOR // ARCHITECTURE",
                "label": "CLOCK FREQUENCY",
                "startValue": 1000,
                "endValue": 4500,
                "unit": "MHz",
                "trendLabel": "▲ HIGH ACCURACY",
                "chartType": "LINE_SPIKE",
                "dataPoints": [20, 35, 55, 70, 85, 98],
            }
            default_callouts = [
                {"label": "SILICON_DIE", "detail": "Photolithography pattern", "x": 30, "y": 45},
                {"label": "INTERCONNECT", "detail": "Nanometer wirebonds", "x": 70, "y": 65},
            ]
        else:
            default_telemetry = {
                "objectName": "SYSTEM ASSEMBLY",
                "categoryTag": "ENGINEERING // CAD",
                "label": "PRESSURE",
                "startValue": 100,
                "endValue": 420,
                "unit": "kPa",
                "trendLabel": "▲ NOMINAL",
                "chartType": "LINE_SPIKE",
                "dataPoints": [20, 35, 55, 70, 85, 98],
            }
            default_callouts = [
                {"label": "PRIMARY_DATUM", "detail": "Core reference surface", "x": 35, "y": 42},
                {"label": "LOAD_BEARING", "detail": "Structural element", "x": 65, "y": 68},
            ]

        packet = {
            "type": "FRAME_SYNC",
            "jobId": job_id,
            "chunkIndex": chunk_index,
            "timestampMs": timestamp_ms,
            "durationMs": chunk_duration_ms,
            "narrationChunk": narration_chunk,
            "audioBase64": audio_b64,
            "imageBase64": image_b64,
            "visualSource": visual_result.get("source", "procedural"),
            "isComputingEntity": is_computing,
            "domain": domain,
            "cameraShot": camera_shot,
            "telemetry": telemetry or default_telemetry,
            "callouts": callouts or default_callouts,
        }

        logger.info(
            f"[CONDUCTOR] Multiplexed chunk #{chunk_index} @ {timestamp_ms}ms (dur: {chunk_duration_ms}ms, audio_bytes: {len(raw_audio_bytes)})"
        )

        await self.broadcast_packet(job_id, packet)
        return packet

    async def emit_stream_end(self, job_id: str, total_chunks: int):
        """Notifies frontend that streaming pipeline has completed."""
        timeline = self.timelines.get(job_id, {"accumulated_duration_ms": 0})
        packet = {
            "type": "STREAM_END",
            "jobId": job_id,
            "totalChunks": total_chunks,
            "totalDurationMs": timeline["accumulated_duration_ms"],
            "message": "Stream pipeline completed all chunks.",
        }
        await self.broadcast_packet(job_id, packet)
        logger.info(f"[CONDUCTOR] Emitted STREAM_END for job '{job_id}'")


conductor = StreamConductor()
