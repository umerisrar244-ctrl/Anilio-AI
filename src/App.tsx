import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { MobileNav } from './components/MobileNav';
import { BrainMonitor } from './components/BrainMonitor';
import { SceneStudio } from './components/SceneStudio';
import { GPUWorkerPanel } from './components/GPUWorkerPanel';
import { AssetLibraryPanel } from './components/AssetLibraryPanel';
import { ApiConsole } from './components/ApiConsole';
import { ProjectsList } from './components/ProjectsList';
import { CreateProjectModal } from './components/CreateProjectModal';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { ProjectJob, SceneJob, GPUWorkerState, Character, Background, VoiceAsset } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'monitor' | 'projects' | 'scenes' | 'gpu' | 'assets' | 'api'>('monitor');
  const [projects, setProjects] = useState<ProjectJob[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [gpuState, setGpuState] = useState<GPUWorkerState | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [backgrounds, setBackgrounds] = useState<Background[]>([]);
  const [voices, setVoices] = useState<VoiceAsset[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [videoModal, setVideoModal] = useState<{
    isOpen: boolean;
    url: string;
    title: string;
    project?: ProjectJob | null;
    scene?: SceneJob | null;
  }>({
    isOpen: false,
    url: '',
    title: '',
  });

  // Load initial data
  const fetchData = async () => {
    try {
      const [projRes, gpuRes, charRes, bgRes, voiceRes] = await Promise.all([
        fetch('/agent/projects').then((r) => r.json()),
        fetch('/agent/gpu/status').then((r) => r.json()),
        fetch('/agent/characters').then((r) => r.json()),
        fetch('/agent/backgrounds').then((r) => r.json()),
        fetch('/agent/voices').then((r) => r.json()),
      ]);

      if (Array.isArray(projRes)) {
        setProjects(projRes);
        if (!selectedProjectId && projRes.length > 0) {
          setSelectedProjectId(projRes[0].project_id);
        }
      }
      setGpuState(gpuRes);
      if (Array.isArray(charRes)) setCharacters(charRes);
      if (Array.isArray(bgRes)) setBackgrounds(bgRes);
      if (Array.isArray(voiceRes)) setVoices(voiceRes);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Poll active project for real-time state updates
  useEffect(() => {
    const timer = setInterval(async () => {
      if (!selectedProjectId) return;
      try {
        const res = await fetch(`/agent/project/${selectedProjectId}`);
        if (res.ok) {
          const updated: ProjectJob = await res.json();
          setProjects((prev) =>
            prev.map((p) => (p.project_id === updated.project_id ? updated : p))
          );
        }
      } catch (err) {
        // silent
      }
    }, 1500);

    return () => clearInterval(timer);
  }, [selectedProjectId]);

  const activeProject = projects.find((p) => p.project_id === selectedProjectId) || projects[0] || null;

  // Actions
  const handleCreateProject = async (data: {
    prompt: string;
    mode: 'autonomous' | 'review';
    target_duration_seconds: number;
    clip_duration_seconds: number;
    aspect_ratio: string;
    resolution: string;
    fps: number;
  }) => {
    try {
      const createRes = await fetch('/agent/create-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const createJson = await createRes.json();
      if (!createJson.success) throw new Error(createJson.error);

      // Immediately launch pipeline
      await fetch('/agent/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: createJson.job_id }),
      });

      setSelectedProjectId(createJson.project_id);
      setActiveTab('monitor');
      await fetchData();
    } catch (err) {
      console.error('Project creation failed:', err);
    }
  };

  const handlePause = async (jobId: string) => {
    try {
      await fetch(`/agent/pause/${jobId}`, { method: 'POST' });
      await fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleResume = async (jobId: string) => {
    try {
      await fetch(`/agent/resume/${jobId}`, { method: 'POST' });
      await fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartProject = async (jobId: string) => {
    try {
      await fetch('/agent/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId }),
      });
      setActiveTab('monitor');
      await fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRetryScene = async (sceneId: string) => {
    if (!activeProject) return;
    try {
      await fetch(`/agent/retry-scene/${sceneId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: activeProject.job_id }),
      });
      await fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleApproveScene = async (sceneId: string) => {
    try {
      await fetch(`/agent/approve-scene/${sceneId}`, { method: 'POST' });
      await fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleGPU = async () => {
    try {
      const res = await fetch('/agent/gpu/toggle', { method: 'POST' });
      const data = await res.json();
      if (data.success && gpuState) {
        setGpuState({ ...gpuState, online: data.online });
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white pb-16 md:pb-6">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenCreate={() => setIsCreateOpen(true)}
        gpuState={gpuState}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6">
        {activeTab === 'monitor' && (
          <BrainMonitor
            project={activeProject}
            onPause={handlePause}
            onResume={handleResume}
            onOpenVideo={(p) =>
              setVideoModal({
                isOpen: true,
                url: p.final_video_url || '',
                title: p.title,
                project: p,
              })
            }
            onViewScenes={() => setActiveTab('scenes')}
          />
        )}

        {activeTab === 'projects' && (
          <ProjectsList
            projects={projects}
            selectedProjectId={selectedProjectId}
            onSelectProject={(id) => {
              setSelectedProjectId(id);
              setActiveTab('monitor');
            }}
            onOpenCreate={() => setIsCreateOpen(true)}
            onStartProject={handleStartProject}
            onWatchVideo={(p) =>
              setVideoModal({
                isOpen: true,
                url: p.final_video_url || '',
                title: p.title,
                project: p,
              })
            }
          />
        )}

        {activeTab === 'scenes' && (
          <SceneStudio
            project={activeProject}
            onRetryScene={handleRetryScene}
            onApproveScene={handleApproveScene}
            onPreviewClip={(sc) =>
              setVideoModal({
                isOpen: true,
                url: sc.video_clip_url || '',
                title: `Scene ${sc.scene_index}: ${sc.narrative_prompt}`,
                project: activeProject,
                scene: sc,
              })
            }
          />
        )}

        {activeTab === 'gpu' && (
          <GPUWorkerPanel
            gpuState={gpuState}
            onToggleGPU={handleToggleGPU}
            onRefresh={async () => {
              const res = await fetch('/agent/gpu/status');
              setGpuState(await res.json());
            }}
          />
        )}

        {activeTab === 'assets' && (
          <AssetLibraryPanel
            characters={characters}
            backgrounds={backgrounds}
            voices={voices}
          />
        )}

        {activeTab === 'api' && <ApiConsole />}
      </main>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <MobileNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        gpuState={gpuState}
      />

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateProject}
      />

      {/* Fullscreen Video Player Modal */}
      <VideoPlayerModal
        isOpen={videoModal.isOpen}
        onClose={() => setVideoModal({ ...videoModal, isOpen: false })}
        videoUrl={videoModal.url}
        title={videoModal.title}
        project={videoModal.project}
        scene={videoModal.scene}
      />
    </div>
  );
}
