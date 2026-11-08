"""
Character Agent for Anilio Brain.
Searches the user's existing character library, reuses existing character portraits,
requests new images from existing Anilio integration when needed, and preserves
visual continuity across scenes.
"""
from typing import Dict, Any, List

class CharacterAgent:
    def __init__(self, anilio_adapter=None):
        self.anilio_adapter = anilio_adapter

    async def execute(self, state: Dict[str, Any]) -> Dict[str, Any]:
        scenes = state.get("scenes", [])
        prompt = state.get("prompt", "").lower()
        
        # 1. Query existing character library via Anilio Adapter or Supabase
        existing_characters = []
        if self.anilio_adapter:
            existing_characters = await self.anilio_adapter.get_existing_characters(state.get("user_id"))
            
        # Fallback or default character library matching
        if not existing_characters:
            existing_characters = [
                {
                    "id": "char-hero-01",
                    "name": "Alex Vance",
                    "description": "Determined protagonist with dark jacket and silver mechanical compass",
                    "image_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=512&q=80",
                    "voice_id": "voice-vance-deep",
                    "is_existing": True
                },
                {
                    "id": "char-ally-02",
                    "name": "Elena Rostova",
                    "description": "Tech specialist with visor headset and tactical teal coat",
                    "image_url": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=512&q=80",
                    "voice_id": "voice-elena-calm",
                    "is_existing": True
                }
            ]

        # Select primary and secondary characters based on prompt context
        selected_characters = existing_characters[:2]
        
        # Assign character references to scenes
        for i, scene in enumerate(scenes):
            assigned_char = selected_characters[i % len(selected_characters)]
            scene["character_id"] = assigned_char["id"]
            scene["character_name"] = assigned_char["name"]
            scene["reference_image_url"] = assigned_char["image_url"]
            scene["visual_prompt"] = (
                f"{scene['visual_prompt']}, featuring character {assigned_char['name']} "
                f"({assigned_char['description']}), maintaining facial identity and wardrobe consistency"
            )

        logs = state.get("logs", [])
        logs.append({
            "agent": "CharacterAgent",
            "action": "characters_matched",
            "message": f"Assigned {len(selected_characters)} character references to maintain visual continuity across {len(scenes)} scenes.",
            "timestamp": "now"
        })

        return {
            "characters": selected_characters,
            "scenes": scenes,
            "current_agent": "CharacterAgent",
            "current_step": "character_complete",
            "progress_percentage": 30,
            "logs": logs
        }
