/**
 * Pure logic calculations and invariants for Anilio Brain Orchestrator.
 */

export interface SceneSegment {
  scene_index: number;
  start_time: number;
  end_time: number;
  duration: number;
  narrative_prompt: string;
  visual_prompt: string;
  camera_direction: string;
}

export interface QCResult {
  passed: boolean;
  total_scenes_expected: number;
  total_scenes_valid: number;
  missing_scene_indices: number[];
  defective_scene_ids: string[];
  total_video_duration: number;
  target_duration: number;
  duration_delta: number;
}

/**
 * Calculates long-form video segmentation into discrete clips (up to 30 minutes / 1800s).
 */
export function calculateSegmentation(
  targetDurationSeconds: number,
  clipDurationSeconds: number = 5
): { totalScenes: number; clips: { index: number; start: number; end: number; duration: number }[] } {
  const safeTarget = Math.max(5, Math.min(1800, targetDurationSeconds));
  const safeClip = Math.max(2, Math.min(15, clipDurationSeconds));
  const totalScenes = Math.ceil(safeTarget / safeClip);
  
  const clips = [];
  for (let i = 0; i < totalScenes; i++) {
    const start = i * safeClip;
    const end = Math.min(safeTarget, (i + 1) * safeClip);
    clips.push({
      index: i + 1,
      start,
      end,
      duration: Math.round((end - start) * 100) / 100,
    });
  }

  return { totalScenes, clips };
}

/**
 * Validates quality control parameters across rendered scenes.
 */
export function evaluateQualityControl(
  scenes: Array<{
    scene_id: string;
    scene_index: number;
    duration: number;
    status: string;
    video_clip_url?: string | null;
    dialogue?: string | null;
    audio_url?: string | null;
  }>,
  targetDuration: number,
  toleranceSeconds: number = 1.0
): QCResult {
  const total_scenes_expected = scenes.length;
  const missing_scene_indices: number[] = [];
  const defective_scene_ids: string[] = [];
  let total_video_duration = 0;

  for (const scene of scenes) {
    if (!scene.video_clip_url || scene.status !== 'completed') {
      missing_scene_indices.push(scene.scene_index);
      defective_scene_ids.push(scene.scene_id);
      continue;
    }

    total_video_duration += scene.duration;

    if (scene.dialogue && !scene.audio_url) {
      defective_scene_ids.push(scene.scene_id);
    }
  }

  const duration_delta = Math.round(Math.abs(total_video_duration - targetDuration) * 100) / 100;
  const passed =
    missing_scene_indices.length === 0 &&
    defective_scene_ids.length === 0 &&
    duration_delta <= toleranceSeconds;

  return {
    passed,
    total_scenes_expected,
    total_scenes_valid: total_scenes_expected - defective_scene_ids.length,
    missing_scene_indices,
    defective_scene_ids,
    total_video_duration: Math.round(total_video_duration * 100) / 100,
    target_duration: targetDuration,
    duration_delta,
  };
}

/**
 * Determines next LangGraph node transition given current state and mode.
 */
export function getNextAgentNode(
  currentNode: string,
  mode: 'autonomous' | 'review',
  unapprovedScenesCount: number,
  qcPassed: boolean,
  retryCount: number
): { nextNode: string; shouldPause: boolean } {
  switch (currentNode) {
    case 'story_agent':
      return { nextNode: 'character_agent', shouldPause: false };
    case 'character_agent':
      return { nextNode: 'background_agent', shouldPause: false };
    case 'background_agent':
      return { nextNode: 'voice_agent', shouldPause: false };
    case 'voice_agent':
      return { nextNode: 'scene_planner', shouldPause: false };
    case 'scene_planner':
      if (mode === 'review' && unapprovedScenesCount > 0) {
        return { nextNode: 'scene_planner', shouldPause: true }; // Pause for human review
      }
      return { nextNode: 'video_agent', shouldPause: false };
    case 'video_agent':
      return { nextNode: 'qc_agent', shouldPause: false };
    case 'qc_agent':
      if (!qcPassed) {
        if (retryCount < 3) {
          return { nextNode: 'video_agent', shouldPause: false }; // Retry defective scenes
        }
        return { nextNode: 'failed', shouldPause: true };
      }
      return { nextNode: 'editing_agent', shouldPause: false };
    case 'editing_agent':
      return { nextNode: 'completed', shouldPause: false };
    default:
      return { nextNode: 'completed', shouldPause: false };
  }
}
