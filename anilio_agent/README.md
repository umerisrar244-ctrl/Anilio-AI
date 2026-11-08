# Anilio Autonomous AI Agent System

An independent, open-source backend orchestrator for the **Anilio AI** video production ecosystem.
Powered by **LangGraph**, **FastAPI**, **Supabase**, **Wan 2.2 TI2V-5B**, and **FFmpeg**, this system autonomously transforms simple text prompts into full multi-scene narrative video projects and master MP4 deliveries.

---

## 1. System Architecture

```text
User Prompt
    │
    ▼
[Anilio Brain Central Orchestrator] (LangGraph StateGraph)
    │
    ├──▶ [Story Agent]          -> Generates narrative script & segments clips (up to 30 mins)
    ├──▶ [Character Agent]      -> Searches library, reuses portraits, maintains visual identity
    ├──▶ [Background Agent]     -> Queries existing environments, matches scene aesthetics
    ├──▶ [Voice Agent]          -> Syncs dialogue timing, reuses cached voices from Voice Lab
    ├──▶ [Scene Planner]        -> Compiles camera directions, seeds & Wan 2.2 prompts
    │       │
    │       ├── (Review Mode)  -> Pauses for user approval if enabled
    │       └── (Autonomous)   -> Directly proceeds
    │
    ├──▶ [Video Agent]          -> Dispatches Wan 2.2 TI2V-5B (I2V / T2V), tracks per-scene jobs
    ├──▶ [Quality Control]      -> Validates scene count, missing clips, audio/video duration
    │       │
    │       └── (QC Defect?)   -> Automatically triggers targeted scene retry (up to 3x)
    │
    └──▶ [Editing Agent]        -> FFmpeg pipeline: concatenates clips, overlays audio, renders MP4
            │
            ▼
    [Supabase Storage]          -> Final MP4 video URL returned to user
```

---

## 2. Core Capabilities

### A. Long-Form Video Engine (Up to 30 Minutes)
- **Automatic Scene Segmentation**: Divides lengthy productions into modular, manageable segments (e.g., 5-second clips; a 30-minute video decomposes into ~360 clips).
- **Persistent Job State**: Every scene is an independent job in Supabase (`anilio_scene_jobs`). Never sends a 30-minute monolithic prompt to a foundation model.
- **Scene-Level Progress & Resumption**: Interrupted jobs resume exactly from the latest checkpoint without re-generating completed scenes.

### B. Modular Wan 2.2 TI2V-5B Adapter
- **Zero-Fake Guarantee**: Verifies real CUDA VRAM (minimum 16GB VRAM for Wan 2.2 TI2V-5B) and worker ping. If GPU worker is offline, tasks are preserved in the durable queue (`queued` state) with clear diagnostics.
- **Dual Generation Modes**: Automatically uses Image-to-Video (I2V) when reference images exist from Character/Background agents, or Text-to-Video (T2V) when generating open-world camera shots.
- **Replaceable Interface**: Model adapter adheres to `Wan22Adapter` protocol, allowing drop-in upgrades without changing the AI agent logic.

### C. Free-First Resource Decoupling
- **Agent CPU Service**: Runs cheaply on any lightweight server (Render free tier, Cloud Run, VPS, local machine).
- **Video GPU Worker**: Can run ephemerally on a local GPU (RTX 3090/4090) or temporary cloud instances (Google Colab with ngrok/localtunnel, RunPod spot instances, Modal).

---

## 3. Quick Start & Setup

### Requirements
- Python 3.10+
- FFmpeg 4.4+ (`sudo apt install ffmpeg`)
- Supabase project (Free tier supported)

### Local Development
```bash
# 1. Clone & create virtual environment
cd anilio_agent
python3 -m venv venv
source venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# Edit .env with your Supabase credentials

# 4. Apply Database Migrations
# Run the SQL migration in db/migrations/001_initial_schema.sql in your Supabase SQL Editor.

# 5. Start the FastAPI Orchestrator
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 4. API Specification

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/agent/create-project` | Initialize new video project with target duration & prompt |
| `POST` | `/agent/start` | Start autonomous LangGraph execution |
| `GET` | `/agent/status/{job_id}` | Real-time agent status, active agent node, and progress |
| `POST` | `/agent/pause/{job_id}` | Pause running job and commit checkpoint |
| `POST` | `/agent/resume/{job_id}` | Resume paused or interrupted job from checkpoint |
| `POST` | `/agent/retry-scene/{scene_id}` | Retry an individual defective scene |
| `GET` | `/agent/project/{project_id}` | Complete project metadata and scene list |
| `GET` | `/agent/video/{project_id}` | Retrieve final rendered MP4 video URL |
| `GET` | `/agent/gpu/health` | Check Wan 2.2 GPU worker memory & availability |

### Example cURL: Create & Start Project
```bash
# 1. Create project
curl -X POST http://localhost:8000/agent/create-project \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "An astronaut discovers a glowing ancient monolith inside a lunar cavern",
    "mode": "autonomous",
    "target_duration_seconds": 30,
    "clip_duration_seconds": 5,
    "aspect_ratio": "16:9",
    "resolution": "1280x720",
    "fps": 24
  }'

# Response returns {"project_id": "...", "job_id": "..."}

# 2. Start autonomous execution
curl -X POST http://localhost:8000/agent/start \
  -H "Content-Type: application/json" \
  -d '{"job_id": "<JOB_ID>"}'
```

---

## 5. Standalone GPU Worker Setup (Google Colab / RunPod / Local)

To run the Wan 2.2 GPU Worker on a separate GPU node:
```bash
# On GPU instance:
export WORKER_PORT=8001
export WAN22_MODEL_PATH="Wan-AI/Wan2.1-T2V-1.4B"
python -m workers.gpu_worker_wan22
```

In your orchestrator `.env`, point `WAN22_WORKER_URL` to your GPU worker URL (e.g. `https://xxxx.ngrok-free.app` or `http://10.0.0.5:8001`).

---

## 6. Running Tests
```bash
pytest tests/test_agent_workflow.py -v
```
