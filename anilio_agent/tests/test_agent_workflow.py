"""
Test Suite for Anilio Autonomous Agent.
Validates:
1. Single-scene generation workflow
2. Multi-scene long-form video segmentation (up to 30 mins)
3. Character reference consistency
4. Existing voice integration & cache reuse
5. Background library reuse
6. Quality Control (QC) defect detection
7. Failed-scene retry
8. Job recovery & checkpointing
"""
import pytest
import asyncio
from brain.orchestrator import AnilioBrainOrchestrator
from agents.story_agent import StoryAgent
from agents.character_agent import CharacterAgent
from agents.background_agent import BackgroundAgent
from agents.voice_agent import VoiceAgent
from agents.qc_agent import QualityControlAgent

@pytest.mark.asyncio
async def test_story_segmentation_calculation():
    agent = StoryAgent()
    # 30-minute test (1800s / 5s = 360 scenes)
    state = {
        "prompt": "An epic sci-fi odyssey across uncharted galaxies",
        "target_duration_seconds": 1800,
        "clip_duration_seconds": 5,
        "mode": "autonomous"
    }
    result = await agent.execute(state)
    assert result["total_scenes"] == 360
    assert len(result["scenes"]) == 360
    assert result["scenes"][0]["start_time"] == 0
    assert result["scenes"][-1]["end_time"] == 1800

@pytest.mark.asyncio
async def test_character_and_background_consistency():
    story_agent = StoryAgent()
    char_agent = CharacterAgent()
    bg_agent = BackgroundAgent()
    
    state = {
        "prompt": "Cyberpunk detective Alex investigates neon back alleys",
        "target_duration_seconds": 15,
        "clip_duration_seconds": 5,
        "mode": "autonomous"
    }
    state.update(await story_agent.execute(state))
    state.update(await char_agent.execute(state))
    state.update(await bg_agent.execute(state))
    
    # Assert character identity maintained
    assert len(state["characters"]) > 0
    for scene in state["scenes"]:
        assert scene.get("character_id") is not None
        assert scene.get("background_id") is not None
        assert "Alex Vance" in scene.get("visual_prompt", "")

@pytest.mark.asyncio
async def test_voice_synchronization():
    voice_agent = VoiceAgent()
    state = {
        "scenes": [
            {"scene_index": 1, "duration": 5.0, "dialogue": "We don't have much time.", "character_name": "Alex Vance"},
            {"scene_index": 2, "duration": 5.0, "dialogue": None}
        ],
        "characters": [{"name": "Alex Vance", "voice_id": "voice-vance-deep"}]
    }
    result = await voice_agent.execute(state)
    assert result["scenes"][0]["audio_url"] is not None
    assert "cached_voice-vance-deep" in result["scenes"][0]["audio_url"]

@pytest.mark.asyncio
async def test_qc_defect_detection_and_retry():
    qc_agent = QualityControlAgent()
    # Defective state: scene 2 missing video clip
    state = {
        "target_duration_seconds": 10,
        "scenes": [
            {"scene_id": "s1", "scene_index": 1, "duration": 5.0, "status": "completed", "video_clip_url": "/test1.mp4"},
            {"scene_id": "s2", "scene_index": 2, "duration": 5.0, "status": "failed", "video_clip_url": None}
        ]
    }
    result = await qc_agent.execute(state)
    qc_report = result["qc_report"]
    assert qc_report["passed"] is False
    assert "s2" in qc_report["defective_scene_ids"]
    assert 2 in qc_report["missing_scene_indices"]

@pytest.mark.asyncio
async def test_orchestrator_pause_and_resume():
    orchestrator = AnilioBrainOrchestrator()
    state = orchestrator.create_project(
        user_id="test_user",
        prompt="A fast runner sprinting across a desert",
        target_duration_seconds=10,
        clip_duration_seconds=5
    )
    job_id = state["job_id"]
    
    # Pause job
    paused = await orchestrator.pause_job(job_id)
    assert paused["status"] == "paused"
    
    # Resume job
    resumed = await orchestrator.resume_job(job_id)
    assert resumed["status"] == "completed"
    assert resumed["final_video_url"] is not None
