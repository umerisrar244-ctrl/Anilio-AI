"""
Video Agent for Anilio Brain.
Orchestrates scene-by-scene video generation using the modular Wan 2.2 TI2V-5B adapter.
Tracks individual scene states, supports both I2V (image-to-video) and T2V (text-to-video),
handles scene-level progress, and coordinates retries for defective clips.
"""
from typing import Dict, Any, List
import asyncio
from adapters.wan22_adapter import Wan22Adapter

class VideoAgent:
    def __init__(self, wan_adapter: Wan22Adapter = None):
        self.wan_adapter = wan_adapter or Wan22Adapter()

    async def execute(self, state: Dict[str, Any]) -> Dict[str, Any]:
        scenes = state.get("scenes", [])
        logs = state.get("logs", [])
        mode = state.get("mode", "autonomous")
        
        resolution = state.get("resolution", "1280x720")
        fps = int(state.get("fps", 24))
        
        # Check GPU status first
        gpu_health = await self.wan_adapter.check_gpu_health()
        
        completed_count = 0
        total_count = len(scenes)

        for scene in scenes:
            # Skip if already completed and QC passed
            if scene.get("status") == "completed" and scene.get("video_clip_url"):
                completed_count += 1
                continue

            # Review mode check: if scene needs user approval and hasn't been approved
            if mode == "review" and not scene.get("approved_by_user", False):
                scene["status"] = "awaiting_approval"
                logs.append({
                    "agent": "VideoAgent",
                    "action": "scene_review_required",
                    "message": f"Scene {scene['scene_index']} paused for human review per project settings.",
                    "timestamp": "now"
                })
                return {
                    "scenes": scenes,
                    "current_agent": "VideoAgent",
                    "current_step": "awaiting_user_review",
                    "status": "paused",
                    "logs": logs
                }

            # Determine generation mode: I2V if reference image present, else T2V
            gen_mode = "i2v" if scene.get("reference_image_url") else "t2v"
            scene["status"] = "generating"
            
            # Dispatch to Wan 2.2 adapter
            result = await self.wan_adapter.generate_scene(
                scene_id=scene["scene_id"],
                visual_prompt=scene["visual_prompt"],
                reference_image_url=scene.get("reference_image_url"),
                duration=float(scene.get("duration", 5.0)),
                resolution=resolution,
                fps=fps,
                generation_mode=gen_mode
            )

            if result["status"] == "completed":
                scene["status"] = "completed"
                scene["video_clip_url"] = result["video_url"]
                completed_count += 1
            elif result["status"] == "queued":
                scene["status"] = "queued"
                logs.append({
                    "agent": "VideoAgent",
                    "action": "scene_queued",
                    "message": f"Scene {scene['scene_index']} persisted in durable queue: {result.get('reason')}",
                    "timestamp": "now"
                })
            else:
                scene["status"] = "failed"
                scene["retry_count"] = scene.get("retry_count", 0) + 1
                logs.append({
                    "agent": "VideoAgent",
                    "action": "scene_failed",
                    "message": f"Scene {scene['scene_index']} failed generation (Attempt {scene['retry_count']}).",
                    "timestamp": "now"
                })

        pct = 50 + int((completed_count / max(1, total_count)) * 25)
        all_completed = completed_count == total_count
        
        return {
            "scenes": scenes,
            "current_agent": "VideoAgent",
            "current_step": "video_scenes_rendered" if all_completed else "video_in_progress",
            "progress_percentage": min(75, pct),
            "logs": logs
        }
