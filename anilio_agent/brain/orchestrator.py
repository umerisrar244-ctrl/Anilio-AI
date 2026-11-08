"""
Anilio Brain Central AI Orchestrator.
Coordinates full lifecycle of video generation projects:
- Understands user instructions
- Breaks projects into tasks
- Plans complete video production
- Selects appropriate agents
- Manages agent dependencies
- Monitors task completion
- Detects errors and retries failed tasks
- Saves checkpoints and resumes interrupted projects
- Returns final MP4 video URL
"""
import uuid
import logging
from typing import Dict, Any, Optional
from adapters.supabase_adapter import SupabaseAdapter
from brain.graph import (
    node_story_agent,
    node_character_agent,
    node_background_agent,
    node_voice_agent,
    node_scene_planner,
    node_video_agent,
    node_qc_agent,
    node_editing_agent
)

logger = logging.getLogger("anilio.brain")

class AnilioBrainOrchestrator:
    def __init__(self, supabase_adapter: Optional[SupabaseAdapter] = None):
        self.supabase = supabase_adapter or SupabaseAdapter()
        self.active_jobs: Dict[str, Dict[str, Any]] = {}

    def create_project(
        self,
        user_id: str,
        prompt: str,
        mode: str = "autonomous",
        target_duration_seconds: int = 30,
        clip_duration_seconds: int = 5,
        aspect_ratio: str = "16:9",
        resolution: str = "1280x720",
        fps: int = 24
    ) -> Dict[str, Any]:
        """Creates and initializes a new video project and job state."""
        project_id = str(uuid.uuid4())
        job_id = str(uuid.uuid4())
        
        state: Dict[str, Any] = {
            "project_id": project_id,
            "job_id": job_id,
            "user_id": user_id,
            "prompt": prompt,
            "title": f"Video: {prompt[:30]}",
            "mode": mode,
            "target_duration_seconds": target_duration_seconds,
            "clip_duration_seconds": clip_duration_seconds,
            "total_scenes": max(1, target_duration_seconds // clip_duration_seconds),
            "aspect_ratio": aspect_ratio,
            "resolution": resolution,
            "fps": fps,
            "current_agent": "anilio_brain",
            "current_step": "initialized",
            "progress_percentage": 0,
            "status": "pending",
            "retry_count": 0,
            "scenes": [],
            "logs": [{
                "agent": "AnilioBrain",
                "action": "project_created",
                "message": f"Initialized project in {mode.upper()} mode for {target_duration_seconds}s video.",
                "timestamp": "now"
            }],
            "final_video_url": None
        }
        
        self.active_jobs[job_id] = state
        return state

    async def run_pipeline(self, job_id: str) -> Dict[str, Any]:
        """
        Executes the autonomous agent graph sequence step-by-step,
        persisting checkpoints along the way.
        """
        state = self.active_jobs.get(job_id)
        if not state:
            raise ValueError(f"Job {job_id} not found")

        state["status"] = "running"

        steps = [
            ("story_agent", node_story_agent),
            ("character_agent", node_character_agent),
            ("background_agent", node_background_agent),
            ("voice_agent", node_voice_agent),
            ("scene_planner", node_scene_planner),
            ("video_agent", node_video_agent),
            ("qc_agent", node_qc_agent),
            ("editing_agent", node_editing_agent),
        ]

        for step_name, node_func in steps:
            # Check if paused
            if state.get("status") == "paused":
                await self.supabase.save_checkpoint(job_id, step_name, state)
                return state

            # Execute node
            logger.info("Anilio Brain executing step: %s", step_name)
            result = await node_func(state)
            state.update(result)

            # Persist checkpoint
            await self.supabase.save_checkpoint(job_id, step_name, state)

            # Check if review mode paused the pipeline
            if state.get("status") == "paused":
                return state

        state["status"] = "completed"
        return state

    async def pause_job(self, job_id: str) -> Dict[str, Any]:
        """Pauses a running job and saves checkpoint."""
        state = self.active_jobs.get(job_id)
        if state:
            state["status"] = "paused"
            state["logs"].append({
                "agent": "AnilioBrain",
                "action": "job_paused",
                "message": f"Job paused at step {state.get('current_step')}. Checkpoint preserved.",
                "timestamp": "now"
            })
            await self.supabase.save_checkpoint(job_id, state.get("current_step", "paused"), state)
            return state
        raise ValueError(f"Job {job_id} not found")

    async def resume_job(self, job_id: str) -> Dict[str, Any]:
        """Resumes an interrupted or paused job from its latest checkpoint."""
        state = self.active_jobs.get(job_id)
        if not state:
            # Try loading checkpoint from Supabase
            cached_state = await self.supabase.get_latest_checkpoint(job_id)
            if cached_state:
                state = cached_state
                self.active_jobs[job_id] = state
            else:
                raise ValueError(f"No checkpoint found for job {job_id}")

        state["status"] = "running"
        state["logs"].append({
            "agent": "AnilioBrain",
            "action": "job_resumed",
            "message": "Job resumed from checkpoint.",
            "timestamp": "now"
        })
        return await self.run_pipeline(job_id)

    async def retry_scene(self, job_id: str, scene_id: str) -> Dict[str, Any]:
        """Retries a specific failed or defective scene individually."""
        state = self.active_jobs.get(job_id)
        if not state:
            raise ValueError(f"Job {job_id} not found")

        target_scene = None
        for scene in state.get("scenes", []):
            if scene.get("scene_id") == scene_id:
                target_scene = scene
                break

        if not target_scene:
            raise ValueError(f"Scene {scene_id} not found in job {job_id}")

        target_scene["status"] = "pending"
        target_scene["retry_count"] = target_scene.get("retry_count", 0) + 1
        target_scene["video_clip_url"] = None
        target_scene["qc_passed"] = False

        state["logs"].append({
            "agent": "AnilioBrain",
            "action": "scene_retry_requested",
            "message": f"Retrying scene {target_scene['scene_index']} (Attempt {target_scene['retry_count']}).",
            "timestamp": "now"
        })

        # Re-run Video Agent and QC Agent
        await node_video_agent(state)
        await node_qc_agent(state)
        
        # If QC passes now and video wasn't assembled, re-run editing agent
        if state.get("qc_report", {}).get("passed"):
            await node_editing_agent(state)

        return state
