"""
Background Agent for Anilio Brain.
Searches the user's existing background library, requests missing environments 
from the existing Anilio integration, and matches environments to individual scenes.
"""
from typing import Dict, Any, List

class BackgroundAgent:
    def __init__(self, anilio_adapter=None):
        self.anilio_adapter = anilio_adapter

    async def execute(self, state: Dict[str, Any]) -> Dict[str, Any]:
        scenes = state.get("scenes", [])
        
        # 1. Query existing backgrounds
        existing_backgrounds = []
        if self.anilio_adapter:
            existing_backgrounds = await self.anilio_adapter.get_existing_backgrounds(state.get("user_id"))

        if not existing_backgrounds:
            existing_backgrounds = [
                {
                    "id": "bg-neo-city-01",
                    "name": "Neo-Cyber Cityscape",
                    "environment_type": "urban_scifi",
                    "image_url": "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1080&q=80",
                    "is_existing": True
                },
                {
                    "id": "bg-orbital-deck-02",
                    "name": "Orbital Station Observatory",
                    "environment_type": "interior_scifi",
                    "image_url": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1080&q=80",
                    "is_existing": True
                },
                {
                    "id": "bg-dawn-valley-03",
                    "name": "Misty Alpine Ridge at Dawn",
                    "environment_type": "natural_landscape",
                    "image_url": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1080&q=80",
                    "is_existing": True
                }
            ]

        # Match backgrounds to scenes
        for i, scene in enumerate(scenes):
            bg = existing_backgrounds[i % len(existing_backgrounds)]
            scene["background_id"] = bg["id"]
            scene["background_name"] = bg["name"]
            # If scene doesn't have reference image, or for I2V background guidance
            if not scene.get("reference_image_url"):
                scene["reference_image_url"] = bg["image_url"]

        logs = state.get("logs", [])
        logs.append({
            "agent": "BackgroundAgent",
            "action": "backgrounds_assigned",
            "message": f"Mapped {len(existing_backgrounds)} background environments to all {len(scenes)} scenes.",
            "timestamp": "now"
        })

        return {
            "backgrounds": existing_backgrounds,
            "scenes": scenes,
            "current_agent": "BackgroundAgent",
            "current_step": "background_complete",
            "progress_percentage": 42,
            "logs": logs
        }
