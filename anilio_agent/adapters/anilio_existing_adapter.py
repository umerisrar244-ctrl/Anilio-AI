"""
Existing Anilio Application Adapter.
Connects the autonomous agent to existing Animorra/Anilio AI backend APIs:
Character library, Background library, Voice Lab, and Scene approval workflows.
Reuses existing assets without duplicating generation or recreating existing systems.
"""
import os
import logging
from typing import Dict, Any, List, Optional
import httpx

logger = logging.getLogger("anilio.existing_app")

class AnilioExistingAdapter:
    def __init__(self, base_url: Optional[str] = None, api_token: Optional[str] = None):
        self.base_url = base_url or os.getenv("ANILIO_EXISTING_API_URL", "https://api.animorra.ai/v1")
        self.api_token = api_token or os.getenv("ANILIO_EXISTING_API_TOKEN", "")
        self.headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json",
            "User-Agent": "AnilioAutonomousAgent/1.0"
        }

    async def get_existing_characters(self, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Queries existing character library from user's Anilio account."""
        if not self.api_token:
            return []
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(f"{self.base_url}/characters", headers=self.headers, params={"user_id": user_id})
                if res.status_code == 200:
                    return res.json().get("characters", [])
        except Exception as e:
            logger.warning("Existing Anilio character query failed: %s", str(e))
        return []

    async def get_existing_backgrounds(self, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Queries existing background image library from user's Anilio account."""
        if not self.api_token:
            return []
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(f"{self.base_url}/backgrounds", headers=self.headers, params={"user_id": user_id})
                if res.status_code == 200:
                    return res.json().get("backgrounds", [])
        except Exception as e:
            logger.warning("Existing Anilio background query failed: %s", str(e))
        return []

    async def notify_scene_review_required(self, project_id: str, scene_id: str, preview_url: str) -> bool:
        """Pushes scene review event into existing Anilio scene approval workflow."""
        if not self.api_token:
            return False
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.post(
                    f"{self.base_url}/review-queue",
                    headers=self.headers,
                    json={
                        "project_id": project_id,
                        "scene_id": scene_id,
                        "preview_url": preview_url,
                        "status": "awaiting_approval"
                    }
                )
                return res.status_code in [200, 201]
        except Exception as e:
            logger.warning("Failed notifying existing review queue: %s", str(e))
            return False
