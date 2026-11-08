export type ProjectMode = 'autonomous' | 'review';
export type JobStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type SceneStatus = 'pending' | 'queued' | 'generating' | 'awaiting_approval' | 'approved' | 'completed' | 'failed';

export interface Character {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  voiceId: string;
}

export interface Background {
  id: string;
  name: string;
  environmentType: string;
  imageUrl: string;
}

export interface VoiceAsset {
  id: string;
  name: string;
  gender: string;
  accent: string;
  style: string;
}

export interface SceneJob {
  scene_id: string;
  scene_index: number;
  start_time: number;
  end_time: number;
  duration: number;
  narrative_prompt: string;
  visual_prompt: string;
  camera_direction: string;
  dialogue?: string | null;
  character_id?: string;
  character_name?: string;
  background_id?: string;
  background_name?: string;
  reference_image_url?: string;
  audio_url?: string;
  video_clip_url?: string | null;
  status: SceneStatus;
  retry_count: number;
  max_retries: number;
  qc_passed: boolean;
  qc_notes?: string;
  approved_by_user: boolean;
}

export interface AgentLog {
  agent: string;
  action: string;
  message: string;
  timestamp: string;
}

export interface ProjectJob {
  project_id: string;
  job_id: string;
  user_id: string;
  title: string;
  prompt: string;
  mode: ProjectMode;
  target_duration_seconds: number;
  clip_duration_seconds: number;
  total_scenes: number;
  aspect_ratio: string;
  resolution: string;
  fps: number;
  current_agent: string;
  current_step: string;
  progress_percentage: number;
  status: JobStatus;
  error_message?: string | null;
  retry_count: number;
  scenes: SceneJob[];
  logs: AgentLog[];
  final_video_url?: string | null;
  created_at: string;
}

export interface GPUWorkerState {
  online: boolean;
  device_name: string;
  device_type: string;
  total_vram_gb: number;
  free_vram_gb: number;
  model: string;
  temperature_c: number;
  active_jobs: number;
  max_parallel: number;
}
