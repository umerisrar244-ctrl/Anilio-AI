"""
State definition for Anilio Brain LangGraph Orchestrator.
Maintains comprehensive project execution context across all specialized agents.
"""
from typing import TypedDict, List, Dict, Any, Optional
from enum import Enum

class ProjectMode(str, Enum):
    AUTONOMOUS = "autonomous"
    REVIEW = "review"

class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class SceneStatus(str, Enum):
    PENDING = "pending"
    QUEUED = "queued"
    GENERATING = "generating"
    AWAITING_APPROVAL = "awaiting_approval"
    APPROVED = "approved"
    REJECTED = "rejected"
    COMPLETED = "completed"
    FAILED = "failed"

class CharacterReference(TypedDict, total=False):
    id: str
    name: str
    description: str
    image_url: str
    voice_id: Optional[str]
    is_existing: bool

class BackgroundReference(TypedDict, total=False):
    id: str
    name: str
    environment_type: str
    image_url: str
    is_existing: bool

class ScenePlan(TypedDict, total=False):
    scene_id: str
    scene_index: int
    start_time: float
    end_time: float
    duration: float
    narrative_prompt: str
    visual_prompt: str
    camera_direction: str
    dialogue: Optional[str]
    character_id: Optional[str]
    character_name: Optional[str]
    background_id: Optional[str]
    background_name: Optional[str]
    reference_image_url: Optional[str]
    audio_url: Optional[str]
    video_clip_url: Optional[str]
    status: str
    retry_count: int
    max_retries: int
    qc_passed: bool
    qc_notes: Optional[str]
    approved_by_user: bool

class QCVerification(TypedDict, total=False):
    total_scenes_expected: int
    total_scenes_valid: int
    missing_scene_indices: List[int]
    defective_scene_ids: List[str]
    total_video_duration: float
    target_duration: float
    duration_delta: float
    audio_sync_ok: bool
    passed: bool
    details: str

class AnilioBrainState(TypedDict, total=False):
    # Core Project Identifiers
    project_id: str
    job_id: str
    user_id: str
    prompt: str
    title: str
    mode: str # 'autonomous' or 'review'
    
    # Timing & Long-Form Engine Parameters (Supports up to 30 mins)
    target_duration_seconds: int # e.g. 30s up to 1800s (30m)
    clip_duration_seconds: int   # default 5s
    total_scenes: int            # e.g. 6 scenes or 360 scenes for 30m
    aspect_ratio: str           # "16:9" or "9:16"
    resolution: str             # "1280x720" or "1920x1080"
    fps: int                    # 24 or 30
    
    # Agent Artifacts
    story_script: Dict[str, Any]
    characters: List[CharacterReference]
    backgrounds: List[BackgroundReference]
    voice_assignments: Dict[str, Any]
    scenes: List[ScenePlan]
    
    # Execution Tracking & Checkpointing
    current_agent: str
    current_step: str
    progress_percentage: int
    status: str
    error_message: Optional[str]
    retry_count: int
    active_scene_index: int
    
    # QC & Final Output
    qc_report: Optional[QCVerification]
    final_video_url: Optional[str]
    final_file_path: Optional[str]
    logs: List[Dict[str, Any]]
