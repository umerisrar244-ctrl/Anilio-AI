-- Migration 001: Initial Supabase Schema for Anilio Autonomous AI Agent
-- Supports: Projects, Video Jobs, Scene Jobs, Checkpoints, Agent Logs, Assets, and PGMQ Queues

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable PGMQ for durable job processing if extension available, otherwise fallback table
CREATE SCHEMA IF NOT EXISTS pgmq;

-- 2. Enums
DO $$ BEGIN
    CREATE TYPE project_mode AS ENUM ('autonomous', 'review');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE job_status AS ENUM ('pending', 'running', 'paused', 'completed', 'failed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE scene_status AS ENUM ('pending', 'queued', 'generating', 'awaiting_approval', 'approved', 'rejected', 'completed', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Projects Table
CREATE TABLE IF NOT EXISTS public.anilio_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    prompt TEXT NOT NULL,
    mode project_mode DEFAULT 'autonomous',
    target_duration_seconds INTEGER NOT NULL DEFAULT 30, -- Supports up to 1800 (30 mins)
    clip_duration_seconds INTEGER NOT NULL DEFAULT 5,
    total_scenes INTEGER NOT NULL DEFAULT 6,
    aspect_ratio VARCHAR(10) NOT NULL DEFAULT '16:9',
    resolution VARCHAR(20) NOT NULL DEFAULT '1280x720',
    fps INTEGER NOT NULL DEFAULT 24,
    status job_status DEFAULT 'pending',
    final_video_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Video Jobs Table (Central Orchestration Job)
CREATE TABLE IF NOT EXISTS public.anilio_video_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.anilio_projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    current_agent VARCHAR(50) NOT NULL DEFAULT 'anilio_brain',
    current_step VARCHAR(50) NOT NULL DEFAULT 'init',
    status job_status DEFAULT 'pending',
    progress_percentage INTEGER DEFAULT 0,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    state_payload JSONB DEFAULT '{}'::jsonb, -- Full LangGraph state checkpoint
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Scene Jobs Table (Individual Wan 2.2 Segment Jobs)
CREATE TABLE IF NOT EXISTS public.anilio_scene_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.anilio_projects(id) ON DELETE CASCADE,
    video_job_id UUID REFERENCES public.anilio_video_jobs(id) ON DELETE CASCADE,
    scene_index INTEGER NOT NULL,
    start_time_seconds NUMERIC(6,2) NOT NULL,
    end_time_seconds NUMERIC(6,2) NOT NULL,
    duration_seconds NUMERIC(6,2) NOT NULL DEFAULT 5.0,
    narrative_prompt TEXT NOT NULL,
    visual_prompt TEXT NOT NULL,
    camera_direction VARCHAR(255),
    dialogue TEXT,
    speaker_character_id UUID,
    background_id UUID,
    reference_image_url TEXT,
    audio_url TEXT,
    video_clip_url TEXT,
    model_name VARCHAR(50) DEFAULT 'Wan 2.2 TI2V-5B',
    generation_mode VARCHAR(20) DEFAULT 'i2v', -- 'i2v' or 't2v'
    status scene_status DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    error_log TEXT,
    qc_passed BOOLEAN DEFAULT FALSE,
    qc_notes TEXT,
    approved_by_user BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Agent Execution History & Audit Logs
CREATE TABLE IF NOT EXISTS public.anilio_agent_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.anilio_projects(id) ON DELETE CASCADE,
    job_id UUID REFERENCES public.anilio_video_jobs(id) ON DELETE CASCADE,
    agent_name VARCHAR(50) NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    severity VARCHAR(20) DEFAULT 'info',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Asset Libraries (Compatible with existing Anilio assets)
CREATE TABLE IF NOT EXISTS public.anilio_characters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,
    voice_id VARCHAR(100),
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.anilio_backgrounds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    environment_type VARCHAR(50),
    image_url TEXT NOT NULL,
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.anilio_voice_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    voice_name VARCHAR(100) NOT NULL,
    gender VARCHAR(20),
    accent VARCHAR(50),
    sample_audio_url TEXT,
    provider VARCHAR(50) DEFAULT 'elevenlabs',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Checkpoints Table for Resume/Interrupt
CREATE TABLE IF NOT EXISTS public.anilio_checkpoints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES public.anilio_video_jobs(id) ON DELETE CASCADE,
    checkpoint_step VARCHAR(50) NOT NULL,
    graph_state JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Durable Queue Table (PGMQ Fallback / Queue mechanism)
CREATE TABLE IF NOT EXISTS public.anilio_job_queue (
    msg_id BIGSERIAL PRIMARY KEY,
    queue_name VARCHAR(64) NOT NULL DEFAULT 'video_generation_queue',
    message JSONB NOT NULL,
    vt TIMESTAMPTZ DEFAULT NOW(), -- Visibility time
    enqueued_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Row Level Security (RLS)
ALTER TABLE public.anilio_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anilio_video_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anilio_scene_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anilio_agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anilio_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anilio_backgrounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anilio_voice_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anilio_checkpoints ENABLE ROW LEVEL SECURITY;

-- Project RLS Policies
CREATE POLICY "Users can manage own projects"
    ON public.anilio_projects
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own video jobs"
    ON public.anilio_video_jobs
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can access scene jobs of own projects"
    ON public.anilio_scene_jobs
    FOR ALL
    USING (project_id IN (SELECT id FROM public.anilio_projects WHERE user_id = auth.uid()));

CREATE POLICY "Users can access logs of own projects"
    ON public.anilio_agent_logs
    FOR ALL
    USING (project_id IN (SELECT id FROM public.anilio_projects WHERE user_id = auth.uid()));

CREATE POLICY "Users can access own characters"
    ON public.anilio_characters
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can access own backgrounds"
    ON public.anilio_backgrounds
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can access own voices"
    ON public.anilio_voice_assets
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_user ON public.anilio_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_video_jobs_project ON public.anilio_video_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_scene_jobs_project ON public.anilio_scene_jobs(project_id, scene_index);
CREATE INDEX IF NOT EXISTS idx_scene_jobs_status ON public.anilio_scene_jobs(status);
CREATE INDEX IF NOT EXISTS idx_agent_logs_project ON public.anilio_agent_logs(project_id, created_at DESC);
