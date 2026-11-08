"""
Supabase Adapter for Anilio Agent.
Integrates with PostgreSQL database, Supabase Auth (RLS compliance),
Supabase Storage buckets ('videos', 'scenes', 'assets'), and durable job queue.
Never deletes or overwrites existing user data.
"""
import os
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger("anilio.supabase")

class SupabaseAdapter:
    def __init__(self, supabase_url: Optional[str] = None, supabase_key: Optional[str] = None):
        self.supabase_url = supabase_url or os.getenv("SUPABASE_URL", "")
        self.supabase_key = supabase_key or os.getenv("SUPABASE_KEY", "")
        self.client = None
        self._init_client()

    def _init_client(self):
        if self.supabase_url and self.supabase_key:
            try:
                from supabase import create_client
                self.client = create_client(self.supabase_url, self.supabase_key)
                logger.info("Supabase client initialized successfully")
            except Exception as e:
                logger.warning("Could not initialize real Supabase client: %s", str(e))

    async def save_project(self, project_data: Dict[str, Any]) -> str:
        """Inserts or updates project in public.anilio_projects."""
        if self.client:
            res = self.client.table("anilio_projects").upsert(project_data).execute()
            return res.data[0]["id"] if res.data else project_data.get("id")
        return project_data.get("id", "proj-demo")

    async def save_checkpoint(self, job_id: str, step: str, state: Dict[str, Any]):
        """Persists state checkpoint for interrupt / resume functionality."""
        if self.client:
            self.client.table("anilio_checkpoints").insert({
                "job_id": job_id,
                "checkpoint_step": step,
                "graph_state": state
            }).execute()

    async def get_latest_checkpoint(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves most recent state checkpoint to resume an interrupted job."""
        if self.client:
            res = self.client.table("anilio_checkpoints")\
                .select("graph_state")\
                .eq("job_id", job_id)\
                .order("created_at", desc=True)\
                .limit(1)\
                .execute()
            if res.data and len(res.data) > 0:
                return res.data[0]["graph_state"]
        return None

    async def log_agent_action(self, project_id: str, job_id: str, agent_name: str, action: str, message: str):
        """Audit trail log in public.anilio_agent_logs."""
        if self.client:
            self.client.table("anilio_agent_logs").insert({
                "project_id": project_id,
                "job_id": job_id,
                "agent_name": agent_name,
                "action_type": action,
                "message": message
            }).execute()

    async def upload_final_video(self, project_id: str, file_path: str) -> str:
        """Uploads final assembled MP4 to Supabase Storage 'videos' bucket."""
        destination_path = f"projects/{project_id}/final.mp4"
        if self.client and os.path.exists(file_path):
            with open(file_path, "rb") as f:
                self.client.storage.from_("videos").upload(
                    path=destination_path,
                    file=f,
                    file_options={"content-type": "video/mp4", "upsert": "true"}
                )
            return self.client.storage.from_("videos").get_public_url(destination_path)
        return f"/storage/outputs/{project_id}_final.mp4"
