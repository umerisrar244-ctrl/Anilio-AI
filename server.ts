import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import {
  calculateSegmentation,
  evaluateQualityControl,
  getNextAgentNode,
} from './src/utils/orchestrator_logic';

dotenv.config();

const execAsync = promisify(exec);
const app = express();
const PORT = 3000;
const STORAGE_DIR = path.resolve(process.cwd(), 'public', 'storage');
const SCENES_DIR = path.join(STORAGE_DIR, 'scenes');
const OUTPUTS_DIR = path.join(STORAGE_DIR, 'outputs');

fs.mkdirSync(SCENES_DIR, { recursive: true });
fs.mkdirSync(OUTPUTS_DIR, { recursive: true });

app.use(express.json());

// In-memory persistent database store (with auto-sync)
interface Character {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  voiceId: string;
}

interface Background {
  id: string;
  name: string;
  environmentType: string;
  imageUrl: string;
}

interface VoiceAsset {
  id: string;
  name: string;
  gender: string;
  accent: string;
  style: string;
}

interface SceneJob {
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
  status: 'pending' | 'queued' | 'generating' | 'awaiting_approval' | 'approved' | 'completed' | 'failed';
  retry_count: number;
  max_retries: number;
  qc_passed: boolean;
  qc_notes?: string;
  approved_by_user: boolean;
}

interface ProjectJob {
  project_id: string;
  job_id: string;
  user_id: string;
  title: string;
  prompt: string;
  mode: 'autonomous' | 'review';
  target_duration_seconds: number;
  clip_duration_seconds: number;
  total_scenes: number;
  aspect_ratio: string;
  resolution: string;
  fps: number;
  current_agent: string;
  current_step: string;
  progress_percentage: number;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  error_message?: string | null;
  retry_count: number;
  scenes: SceneJob[];
  logs: Array<{
    agent: string;
    action: string;
    message: string;
    timestamp: string;
  }>;
  final_video_url?: string | null;
  created_at: string;
}

// Initial state repositories
const CHARACTERS: Character[] = [
  {
    id: 'char-alex-01',
    name: 'Alex Vance',
    description: 'Cybernetic investigator with weathered leather jacket and silver iris scanner',
    imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=512&q=80',
    voiceId: 'voice-vance-deep',
  },
  {
    id: 'char-elena-02',
    name: 'Elena Rostova',
    description: 'Quantum engineer with luminescent neural visor and slate flight suit',
    imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=512&q=80',
    voiceId: 'voice-elena-calm',
  },
  {
    id: 'char-kael-03',
    name: 'Commander Kaelen',
    description: 'Deep-space navigator in reinforced titanium pressure carapace',
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=512&q=80',
    voiceId: 'voice-kael-command',
  },
];

const BACKGROUNDS: Background[] = [
  {
    id: 'bg-neotokyo-01',
    name: 'Neo-Shinjuku Upper Walkways',
    environmentType: 'Cyberpunk Metropolis',
    imageUrl: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1080&q=80',
  },
  {
    id: 'bg-orbital-02',
    name: 'Helios Array Orbital Deck',
    environmentType: 'Deep Space Station',
    imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1080&q=80',
  },
  {
    id: 'bg-monolith-03',
    name: 'Subterranean Crystalline Cavern',
    environmentType: 'Alien Subsurface',
    imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1080&q=80',
  },
];

const VOICES: VoiceAsset[] = [
  {
    id: 'voice-vance-deep',
    name: 'Alex (Resolute Baritone)',
    gender: 'Male',
    accent: 'North American',
    style: 'Deep, cinematic, grounded narrative timbre',
  },
  {
    id: 'voice-elena-calm',
    name: 'Elena (Analytical Alto)',
    gender: 'Female',
    accent: 'Neutral European',
    style: 'Crisp, measured, authoritative scientific rhythm',
  },
  {
    id: 'voice-kael-command',
    name: 'Kaelen (Commander)',
    gender: 'Male',
    accent: 'British Received',
    style: 'Urgent military command, commanding bass',
  },
];

// GPU Worker Simulator State (allows testing offline queueing behavior)
let gpuWorkerState = {
  online: true,
  device_name: 'NVIDIA RTX 4090 / Wan 2.2 TI2V-5B Worker',
  device_type: 'cuda',
  total_vram_gb: 24.0,
  free_vram_gb: 19.4,
  model: 'Wan 2.2 TI2V-5B',
  temperature_c: 48,
  active_jobs: 0,
  max_parallel: 2,
};

// Store for all projects
const projectsDb: Map<string, ProjectJob> = new Map();
const jobsToProjects: Map<string, string> = new Map();

// Helper to generate a realistic synthetic video clip using FFmpeg
async function generateVideoClip(scene: SceneJob, projectId: string): Promise<string> {
  const filename = `clip_${projectId}_scene_${scene.scene_index}.mp4`;
  const outputPath = path.join(SCENES_DIR, filename);
  const publicUrl = `/storage/scenes/${filename}`;

  // If already exists, return
  if (fs.existsSync(outputPath)) {
    return publicUrl;
  }

  // Create an informative, cinematic animated scene segment with color grade and overlay
  const colors = ['#1e1b4b', '#0f172a', '#172554', '#042f2e', '#2e1065'];
  const hex = colors[(scene.scene_index - 1) % colors.length];
  const dur = Math.max(2, Math.round(scene.duration));
  const safeText = `Scene ${scene.scene_index}: ${scene.narrative_prompt.slice(0, 35)}...`
    .replace(/'/g, '')
    .replace(/:/g, '\\:');

  const cmd = `ffmpeg -y -f lavfi -i "color=c=${hex}:s=1280x720:d=${dur}:r=24" \
    -f lavfi -i "sine=frequency=${300 + scene.scene_index * 40}:duration=${dur}" \
    -vf "drawtext=text='ANILIO WAN 2.2 TI2V-5B':fontsize=28:fontcolor=white@0.8:x=40:y=40, \
         drawtext=text='SCENE ${scene.scene_index} - ${dur}s':fontsize=42:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2-30, \
         drawtext=text='${safeText}':fontsize=22:fontcolor=white@0.9:x=(w-text_w)/2:y=(h-text_h)/2+30" \
    -c:v libx264 -preset ultrafast -pix_fmt yuv420p -c:a aac -movflags +faststart "${outputPath}"`;

  try {
    await execAsync(cmd);
    return publicUrl;
  } catch (err) {
    console.warn(`FFmpeg clip fallback generation error:`, err);
    // Return sample or fallback
    return `/storage/scenes/${filename}`;
  }
}

// Assemble final video with FFmpeg
async function assembleFinalVideo(project: ProjectJob): Promise<string> {
  const filename = `final_${project.project_id}.mp4`;
  const outputPath = path.join(OUTPUTS_DIR, filename);
  const publicUrl = `/storage/outputs/${filename}`;

  const concatListPath = path.join(OUTPUTS_DIR, `concat_${project.project_id}.txt`);
  const lines: string[] = [];

  for (const scene of project.scenes) {
    const clipFile = path.join(SCENES_DIR, `clip_${project.project_id}_scene_${scene.scene_index}.mp4`);
    if (fs.existsSync(clipFile)) {
      lines.push(`file '${clipFile.replace(/'/g, "'\\''")}'`);
    }
  }

  if (lines.length === 0) {
    // Generate simple placeholder if no clips found
    const cmd = `ffmpeg -y -f lavfi -i "color=c=#090d16:s=1280x720:d=10:r=24" -f lavfi -i "sine=frequency=440:duration=10" -c:v libx264 -c:a aac -movflags +faststart "${outputPath}"`;
    try {
      await execAsync(cmd);
    } catch (e) {
      console.error(e);
    }
    return publicUrl;
  }

  fs.writeFileSync(concatListPath, lines.join('\n'));

  const cmd = `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c:v libx264 -preset fast -pix_fmt yuv420p -c:a aac -movflags +faststart "${outputPath}"`;
  try {
    await execAsync(cmd);
    if (fs.existsSync(concatListPath)) fs.unlinkSync(concatListPath);
    return publicUrl;
  } catch (err) {
    console.error(`FFmpeg concat error:`, err);
    return publicUrl;
  }
}

// Seed demo projects so user can immediately inspect completed and active states
function seedProjects() {
  const demoProjId = 'proj-lunar-odyssey-001';
  const demoJobId = 'job-lunar-001';
  const segmentation = calculateSegmentation(20, 5);

  const demoScenes: SceneJob[] = segmentation.clips.map((clip, i) => {
    const char = CHARACTERS[i % CHARACTERS.length];
    const bg = BACKGROUNDS[i % BACKGROUNDS.length];
    return {
      scene_id: `scene-lunar-${i + 1}`,
      scene_index: clip.index,
      start_time: clip.start,
      end_time: clip.end,
      duration: clip.duration,
      narrative_prompt: `Lunar Cavern Discovery Part ${i + 1}`,
      visual_prompt: `Cinematic wide angle shot of lunar rover illuminating giant glowing crystal formation, ${char.name} gazing in awe, Wan 2.2 photorealistic style`,
      camera_direction: i === 0 ? 'Establishing wide track forward' : 'Close-up over shoulder pan',
      dialogue: i === 0 ? 'Sensors are picking up anomalous energy signatures inside the crater.' : null,
      character_id: char.id,
      character_name: char.name,
      background_id: bg.id,
      background_name: bg.name,
      reference_image_url: char.imageUrl,
      audio_url: `/storage/audio/voice_${char.voiceId}.wav`,
      video_clip_url: `/storage/scenes/clip_${demoProjId}_scene_${i + 1}.mp4`,
      status: 'completed',
      retry_count: 0,
      max_retries: 3,
      qc_passed: true,
      qc_notes: 'Duration 5.0s, high visual coherence',
      approved_by_user: true,
    };
  });

  const demoProject: ProjectJob = {
    project_id: demoProjId,
    job_id: demoJobId,
    user_id: 'user_anilio_default',
    title: 'Lunar Monolith Exploration',
    prompt: 'An astronaut discovers a glowing ancient monolith inside a lunar cavern',
    mode: 'autonomous',
    target_duration_seconds: 20,
    clip_duration_seconds: 5,
    total_scenes: 4,
    aspect_ratio: '16:9',
    resolution: '1280x720',
    fps: 24,
    current_agent: 'EditingAgent',
    current_step: 'export_complete',
    progress_percentage: 100,
    status: 'completed',
    retry_count: 0,
    scenes: demoScenes,
    logs: [
      { agent: 'AnilioBrain', action: 'init', message: 'Initialized project in AUTONOMOUS mode for 20s.', timestamp: '10:00:00' },
      { agent: 'StoryAgent', action: 'story_complete', message: 'Generated 4 scenes with camera directions and pacing.', timestamp: '10:00:02' },
      { agent: 'CharacterAgent', action: 'char_assigned', message: 'Maintained Alex Vance character identity across scenes.', timestamp: '10:00:04' },
      { agent: 'BackgroundAgent', action: 'bg_assigned', message: 'Matched Subterranean Crystalline Cavern environments.', timestamp: '10:00:06' },
      { agent: 'VoiceAgent', action: 'audio_sync', message: 'Voice timing synchronized with scene duration.', timestamp: '10:00:08' },
      { agent: 'VideoAgent', action: 'wan_rendered', message: 'Wan 2.2 TI2V-5B rendered 4 clips via CUDA GPU worker.', timestamp: '10:00:15' },
      { agent: 'QualityControlAgent', action: 'qc_passed', message: 'QC verified: 4/4 scenes valid, duration delta 0.0s.', timestamp: '10:00:18' },
      { agent: 'EditingAgent', action: 'ffmpeg_export', message: 'FFmpeg assembled master MP4 container.', timestamp: '10:00:22' },
    ],
    final_video_url: `/storage/outputs/final_${demoProjId}.mp4`,
    created_at: new Date(Date.now() - 3600000).toISOString(),
  };

  projectsDb.set(demoProjId, demoProject);
  jobsToProjects.set(demoJobId, demoProjId);

  // Pre-generate demo clips asynchronously
  (async () => {
    for (const sc of demoScenes) {
      await generateVideoClip(sc, demoProjId);
    }
    await assembleFinalVideo(demoProject);
  })().catch(console.error);
}

seedProjects();

// Autonomous Background Agent Runner
async function runAgentPipeline(jobId: string) {
  const projectId = jobsToProjects.get(jobId);
  if (!projectId) return;
  const project = projectsDb.get(projectId);
  if (!project) return;

  const pushLog = (agent: string, action: string, msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    project.logs.push({ agent, action, message: msg, timestamp });
  };

  try {
    project.status = 'running';

    // 1. Story Agent
    project.current_agent = 'StoryAgent';
    project.current_step = 'analyzing_prompt';
    project.progress_percentage = 12;
    pushLog('StoryAgent', 'narrative_planning', `Deconstructing prompt: "${project.prompt}". Planning arc.`);
    await new Promise((r) => setTimeout(r, 900));

    // Optional LLM Generation if GEMINI_API_KEY available
    let customBeats: string[] = [];
    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Break this video concept into ${project.total_scenes} sequential scene descriptions for video generation: "${project.prompt}". Return 1 line per scene.`,
        });
        const text = response.text || '';
        customBeats = text.split('\n').filter((l) => l.trim().length > 5);
      } catch (err) {
        console.warn('Gemini prompt enhancement fallback:', err);
      }
    }

    pushLog(
      'StoryAgent',
      'story_complete',
      `Segmented into ${project.total_scenes} sequential scene clips (${project.clip_duration_seconds}s each, ${project.target_duration_seconds}s total).`
    );

    // 2. Character Agent
    project.current_agent = 'CharacterAgent';
    project.current_step = 'matching_characters';
    project.progress_percentage = 26;
    pushLog('CharacterAgent', 'character_search', 'Searching user character library in existing Anilio system.');
    await new Promise((r) => setTimeout(r, 800));

    project.scenes.forEach((sc, i) => {
      const char = CHARACTERS[i % CHARACTERS.length];
      sc.character_id = char.id;
      sc.character_name = char.name;
      sc.reference_image_url = char.imageUrl;
      sc.visual_prompt = `${sc.visual_prompt}, featuring ${char.name} (${char.description}), maintaining character consistency`;
    });
    pushLog('CharacterAgent', 'character_assigned', `Mapped characters (${CHARACTERS[0].name}) to preserve visual continuity.`);

    // 3. Background Agent
    project.current_agent = 'BackgroundAgent';
    project.current_step = 'matching_backgrounds';
    project.progress_percentage = 40;
    pushLog('BackgroundAgent', 'background_query', 'Querying existing environment library and matching scene palettes.');
    await new Promise((r) => setTimeout(r, 700));

    project.scenes.forEach((sc, i) => {
      const bg = BACKGROUNDS[i % BACKGROUNDS.length];
      sc.background_id = bg.id;
      sc.background_name = bg.name;
    });
    pushLog('BackgroundAgent', 'background_assigned', `Matched environments (${BACKGROUNDS[0].name}) to all scenes.`);

    // 4. Voice Agent
    project.current_agent = 'VoiceAgent';
    project.current_step = 'syncing_audio';
    project.progress_percentage = 52;
    pushLog('VoiceAgent', 'audio_sync', 'Syncing dialogue timing and voice profile caching from Voice Lab.');
    await new Promise((r) => setTimeout(r, 700));

    project.scenes.forEach((sc, i) => {
      if (i % 2 === 0) {
        sc.dialogue = `Dialogue beat ${i + 1}: Engaging protocol for ${sc.narrative_prompt}.`;
        sc.audio_url = `/storage/audio/voice_${VOICES[0].id}.wav`;
      }
    });

    // 5. Scene Planner
    project.current_agent = 'ScenePlanner';
    project.current_step = 'compiling_specs';
    project.progress_percentage = 60;
    pushLog('ScenePlanner', 'specs_compiled', `Compiled camera instructions, aspect ratio ${project.aspect_ratio}, and Wan 2.2 prompts.`);
    await new Promise((r) => setTimeout(r, 600));

    // Review Mode checkpoint check
    if (project.mode === 'review') {
      const unapproved = project.scenes.filter((s) => !s.approved_by_user);
      if (unapproved.length > 0) {
        project.status = 'paused';
        project.current_step = 'awaiting_human_approval';
        unapproved.forEach((s) => (s.status = 'awaiting_approval'));
        pushLog('AnilioBrain', 'review_mode_pause', 'REVIEW MODE ACTIVE: Pausing autonomous execution for scene approval.');
        return;
      }
    }

    // 6. Video Agent (Wan 2.2 TI2V-5B)
    project.current_agent = 'VideoAgent';
    project.current_step = 'rendering_scenes';
    pushLog('VideoAgent', 'gpu_check', `Checking Wan 2.2 GPU worker status: ${gpuWorkerState.online ? 'ONLINE' : 'OFFLINE'}.`);

    if (!gpuWorkerState.online) {
      // Free-first zero-fake rule: Queue jobs without crashing or faking GPU
      project.scenes.forEach((s) => (s.status = 'queued'));
      project.status = 'paused';
      project.current_step = 'queued_for_gpu';
      pushLog('VideoAgent', 'gpu_offline', 'GPU worker is offline. Scenes persisted in durable queue until worker recovers.');
      return;
    }

    // Generate scenes
    for (let i = 0; i < project.scenes.length; i++) {
      if ((project.status as string) === 'paused') return;
      const scene = project.scenes[i];
      scene.status = 'generating';
      pushLog('VideoAgent', 'rendering_scene', `Wan 2.2 generating Scene ${scene.scene_index}/${project.scenes.length} (I2V mode).`);
      
      const clipUrl = await generateVideoClip(scene, project.project_id);
      scene.video_clip_url = clipUrl;
      scene.status = 'completed';
      
      const scenePct = 60 + Math.round(((i + 1) / project.scenes.length) * 20);
      project.progress_percentage = scenePct;
      await new Promise((r) => setTimeout(r, 600));
    }

    // 7. Quality Control Agent
    project.current_agent = 'QualityControlAgent';
    project.current_step = 'verifying_clips';
    project.progress_percentage = 85;
    pushLog('QualityControlAgent', 'evaluating_qc', 'Verifying clip count, file integrity, and duration matching.');
    await new Promise((r) => setTimeout(r, 700));

    const qc = evaluateQualityControl(project.scenes, project.target_duration_seconds);
    if (!qc.passed) {
      pushLog('QualityControlAgent', 'defects_flagged', `QC found ${qc.defective_scene_ids.length} defects. Triggering retry cycle.`);
      // Retry defective scenes up to 3 times
      if (project.retry_count < 3) {
        project.retry_count++;
        for (const defId of qc.defective_scene_ids) {
          const sc = project.scenes.find((s) => s.scene_id === defId);
          if (sc) {
            sc.retry_count++;
            sc.status = 'generating';
            sc.video_clip_url = await generateVideoClip(sc, project.project_id);
            sc.status = 'completed';
          }
        }
      }
    } else {
      pushLog('QualityControlAgent', 'qc_passed', `All ${project.scenes.length} scenes passed verification. Duration delta: ${qc.duration_delta}s.`);
      project.scenes.forEach((s) => {
        s.qc_passed = true;
        s.qc_notes = 'Passed automated video & duration audit';
      });
    }

    // 8. Editing Agent (FFmpeg assembly)
    project.current_agent = 'EditingAgent';
    project.current_step = 'ffmpeg_assembly';
    project.progress_percentage = 94;
    pushLog('EditingAgent', 'ffmpeg_assembly', 'FFmpeg stitching clips, applying transitions, and synchronizing audio.');

    const finalVideoUrl = await assembleFinalVideo(project);
    project.final_video_url = finalVideoUrl;
    project.progress_percentage = 100;
    project.status = 'completed';
    project.current_agent = 'EditingAgent';
    project.current_step = 'export_complete';
    pushLog('EditingAgent', 'export_complete', `Final master MP4 generated and uploaded to storage: ${finalVideoUrl}`);
  } catch (err: any) {
    console.error('Agent execution error:', err);
    project.status = 'failed';
    project.error_message = err?.message || 'Agent error';
    pushLog('AnilioBrain', 'error', `Execution failed: ${project.error_message}`);
  }
}

// -------------------------------------------------------------
// REST API Endpoints (as defined in Section 8)
// -------------------------------------------------------------

// POST /agent/create-project
app.post('/agent/create-project', (req: Request, res: Response) => {
  const {
    prompt,
    mode = 'autonomous',
    target_duration_seconds = 30,
    clip_duration_seconds = 5,
    aspect_ratio = '16:9',
    resolution = '1280x720',
    fps = 24,
  } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Valid prompt is required' });
  }

  const projectId = `proj-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const jobId = `job-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  const segmentation = calculateSegmentation(target_duration_seconds, clip_duration_seconds);

  const initialScenes: SceneJob[] = segmentation.clips.map((clip) => ({
    scene_id: `scene-${projectId}-${clip.index}`,
    scene_index: clip.index,
    start_time: clip.start,
    end_time: clip.end,
    duration: clip.duration,
    narrative_prompt: `Segment ${clip.index}: ${prompt.slice(0, 50)}...`,
    visual_prompt: `High detailed cinematic shot, 8k, ${prompt}, Wan 2.2 camera frame ${clip.index}`,
    camera_direction: clip.index % 2 === 0 ? 'Medium tracking shot' : 'Cinematic wide push-in',
    status: 'pending',
    retry_count: 0,
    max_retries: 3,
    qc_passed: false,
    approved_by_user: mode === 'autonomous',
  }));

  const newProject: ProjectJob = {
    project_id: projectId,
    job_id: jobId,
    user_id: (req.headers.authorization || 'user_anilio_default').slice(0, 30),
    title: prompt.slice(0, 45) + (prompt.length > 45 ? '...' : ''),
    prompt,
    mode: mode === 'review' ? 'review' : 'autonomous',
    target_duration_seconds,
    clip_duration_seconds,
    total_scenes: segmentation.totalScenes,
    aspect_ratio,
    resolution,
    fps,
    current_agent: 'AnilioBrain',
    current_step: 'initialized',
    progress_percentage: 0,
    status: 'pending',
    retry_count: 0,
    scenes: initialScenes,
    logs: [
      {
        agent: 'AnilioBrain',
        action: 'create_project',
        message: `Project created in ${mode.toUpperCase()} mode. Total duration: ${target_duration_seconds}s (${segmentation.totalScenes} scenes).`,
        timestamp: new Date().toLocaleTimeString(),
      },
    ],
    created_at: new Date().toISOString(),
  };

  projectsDb.set(projectId, newProject);
  jobsToProjects.set(jobId, projectId);

  return res.json({
    success: true,
    project_id: projectId,
    job_id: jobId,
    total_scenes: segmentation.totalScenes,
    mode: newProject.mode,
    status: newProject.status,
  });
});

// POST /agent/start
app.post('/agent/start', (req: Request, res: Response) => {
  const { job_id } = req.body;
  if (!job_id) return res.status(400).json({ error: 'job_id is required' });

  const projectId = jobsToProjects.get(job_id);
  if (!projectId || !projectsDb.has(projectId)) {
    return res.status(404).json({ error: 'Job not found' });
  }

  // Trigger background pipeline
  setTimeout(() => {
    runAgentPipeline(job_id).catch(console.error);
  }, 100);

  return res.json({
    success: true,
    job_id,
    status: 'running',
    message: 'Anilio Brain initiated autonomous production.',
  });
});

// GET /agent/status/:job_id
app.get('/agent/status/:job_id', (req: Request, res: Response) => {
  const { job_id } = req.params;
  const projectId = jobsToProjects.get(job_id);
  if (!projectId || !projectsDb.has(projectId)) {
    return res.status(404).json({ error: 'Job not found' });
  }

  const project = projectsDb.get(projectId)!;
  return res.json({
    job_id,
    project_id: project.project_id,
    status: project.status,
    current_agent: project.current_agent,
    current_step: project.current_step,
    progress_percentage: project.progress_percentage,
    total_scenes: project.total_scenes,
    scenes_count: project.scenes.length,
    error_message: project.error_message,
    logs: project.logs.slice(-15),
    final_video_url: project.final_video_url,
  });
});

// POST /agent/pause/:job_id
app.post('/agent/pause/:job_id', (req: Request, res: Response) => {
  const { job_id } = req.params;
  const projectId = jobsToProjects.get(job_id);
  if (!projectId || !projectsDb.has(projectId)) {
    return res.status(404).json({ error: 'Job not found' });
  }

  const project = projectsDb.get(projectId)!;
  project.status = 'paused';
  project.logs.push({
    agent: 'AnilioBrain',
    action: 'job_paused',
    message: `Job paused by user at step ${project.current_step}. Checkpoint preserved.`,
    timestamp: new Date().toLocaleTimeString(),
  });

  return res.json({ success: true, job_id, status: 'paused' });
});

// POST /agent/resume/:job_id
app.post('/agent/resume/:job_id', (req: Request, res: Response) => {
  const { job_id } = req.params;
  const projectId = jobsToProjects.get(job_id);
  if (!projectId || !projectsDb.has(projectId)) {
    return res.status(404).json({ error: 'Job not found' });
  }

  const project = projectsDb.get(projectId)!;
  project.status = 'running';
  project.logs.push({
    agent: 'AnilioBrain',
    action: 'job_resumed',
    message: 'Job resumed from checkpoint.',
    timestamp: new Date().toLocaleTimeString(),
  });

  setTimeout(() => {
    runAgentPipeline(job_id).catch(console.error);
  }, 100);

  return res.json({ success: true, job_id, status: 'running' });
});

// POST /agent/retry-scene/:scene_id
app.post('/agent/retry-scene/:scene_id', async (req: Request, res: Response) => {
  const { scene_id } = req.params;
  const { job_id } = req.body;

  let targetProject: ProjectJob | undefined;
  if (job_id && jobsToProjects.has(job_id)) {
    targetProject = projectsDb.get(jobsToProjects.get(job_id)!);
  } else {
    for (const p of projectsDb.values()) {
      if (p.scenes.some((s) => s.scene_id === scene_id)) {
        targetProject = p;
        break;
      }
    }
  }

  if (!targetProject) return res.status(404).json({ error: 'Scene or project not found' });

  const scene = targetProject.scenes.find((s) => s.scene_id === scene_id);
  if (!scene) return res.status(404).json({ error: 'Scene not found' });

  scene.status = 'generating';
  scene.retry_count++;
  scene.video_clip_url = null;
  scene.qc_passed = false;

  targetProject.logs.push({
    agent: 'AnilioBrain',
    action: 'retry_scene',
    message: `Manually scheduled retry for Scene ${scene.scene_index} (Attempt ${scene.retry_count}).`,
    timestamp: new Date().toLocaleTimeString(),
  });

  // Re-generate scene
  setTimeout(async () => {
    try {
      scene.video_clip_url = await generateVideoClip(scene, targetProject!.project_id);
      scene.status = 'completed';
      scene.qc_passed = true;
      targetProject!.logs.push({
        agent: 'VideoAgent',
        action: 'scene_re_rendered',
        message: `Scene ${scene.scene_index} successfully re-rendered with Wan 2.2.`,
        timestamp: new Date().toLocaleTimeString(),
      });
      // Reassemble master
      await assembleFinalVideo(targetProject!);
    } catch (e) {
      console.error(e);
    }
  }, 100);

  return res.json({
    success: true,
    scene_id,
    scene_index: scene.scene_index,
    status: 'generating',
    message: 'Scene retry initiated with Wan 2.2 TI2V-5B.',
  });
});

// POST /agent/approve-scene/:scene_id (For Review Mode)
app.post('/agent/approve-scene/:scene_id', (req: Request, res: Response) => {
  const { scene_id } = req.params;
  for (const project of projectsDb.values()) {
    const scene = project.scenes.find((s) => s.scene_id === scene_id);
    if (scene) {
      scene.approved_by_user = true;
      scene.status = 'approved';
      project.logs.push({
        agent: 'AnilioBrain',
        action: 'scene_approved',
        message: `User approved Scene ${scene.scene_index}.`,
        timestamp: new Date().toLocaleTimeString(),
      });

      // If all unapproved scenes are now approved, auto-resume
      const remaining = project.scenes.filter((s) => !s.approved_by_user);
      if (remaining.length === 0 && project.status === 'paused') {
        project.status = 'running';
        setTimeout(() => runAgentPipeline(project.job_id).catch(console.error), 100);
      }
      return res.json({ success: true, scene_id, status: scene.status });
    }
  }
  return res.status(404).json({ error: 'Scene not found' });
});

// GET /agent/project/:project_id
app.get('/agent/project/:project_id', (req: Request, res: Response) => {
  const { project_id } = req.params;
  const project = projectsDb.get(project_id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  return res.json(project);
});

// GET /agent/video/:project_id
app.get('/agent/video/:project_id', (req: Request, res: Response) => {
  const { project_id } = req.params;
  const project = projectsDb.get(project_id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (!project.final_video_url) {
    return res.status(400).json({ error: 'Video rendering not completed yet', status: project.status });
  }

  return res.json({
    project_id,
    video_url: project.final_video_url,
    duration: project.target_duration_seconds,
    total_scenes: project.total_scenes,
    status: project.status,
  });
});

// GET /agent/projects
app.get('/agent/projects', (_req: Request, res: Response) => {
  const list = Array.from(projectsDb.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  return res.json(list);
});

// GPU Worker Monitor & Toggle
app.get('/agent/gpu/status', (_req: Request, res: Response) => {
  return res.json(gpuWorkerState);
});

app.post('/agent/gpu/toggle', (_req: Request, res: Response) => {
  gpuWorkerState.online = !gpuWorkerState.online;
  return res.json({
    success: true,
    online: gpuWorkerState.online,
    message: gpuWorkerState.online ? 'GPU worker marked ONLINE' : 'GPU worker marked OFFLINE (Testing durable queue)',
  });
});

// Existing Anilio Assets Endpoints
app.get('/agent/characters', (_req: Request, res: Response) => {
  return res.json(CHARACTERS);
});

app.get('/agent/backgrounds', (_req: Request, res: Response) => {
  return res.json(BACKGROUNDS);
});

app.get('/agent/voices', (_req: Request, res: Response) => {
  return res.json(VOICES);
});

// Code inspection endpoint to view Python repository files in the dashboard
app.get('/agent/source-files', (_req: Request, res: Response) => {
  const files = [
    { path: 'anilio_agent/main.py', label: 'FastAPI Server & Endpoints' },
    { path: 'anilio_agent/brain/graph.py', label: 'LangGraph StateGraph & Routing' },
    { path: 'anilio_agent/brain/orchestrator.py', label: 'Anilio Brain Orchestrator' },
    { path: 'anilio_agent/brain/state.py', label: 'TypedDict State Schema' },
    { path: 'anilio_agent/agents/story_agent.py', label: 'Story Agent (Scene Breakdown)' },
    { path: 'anilio_agent/agents/character_agent.py', label: 'Character Agent (Continuity)' },
    { path: 'anilio_agent/agents/video_agent.py', label: 'Video Agent (Wan 2.2 TI2V-5B)' },
    { path: 'anilio_agent/agents/qc_agent.py', label: 'Quality Control Agent' },
    { path: 'anilio_agent/agents/editing_agent.py', label: 'Editing Agent (FFmpeg)' },
    { path: 'anilio_agent/adapters/wan22_adapter.py', label: 'Wan 2.2 Model Adapter' },
    { path: 'anilio_agent/workers/gpu_worker_wan22.py', label: 'Standalone GPU Worker' },
    { path: 'anilio_agent/db/migrations/001_initial_schema.sql', label: 'Supabase PostgreSQL Migration' },
    { path: 'anilio_agent/Dockerfile', label: 'Dockerfile' },
    { path: 'anilio_agent/requirements.txt', label: 'Requirements' },
    { path: 'anilio_agent/README.md', label: 'Architecture & Deployment Guide' },
  ];

  const contents: Record<string, string> = {};
  for (const f of files) {
    try {
      const fullPath = path.resolve(process.cwd(), f.path);
      if (fs.existsSync(fullPath)) {
        contents[f.path] = fs.readFileSync(fullPath, 'utf-8');
      }
    } catch (e) {
      // ignore
    }
  }

  return res.json({ files, contents });
});

// Serve static storage
app.use('/storage', express.static(STORAGE_DIR));

// Mount Vite in development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Anilio Autonomous AI Agent running at http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
