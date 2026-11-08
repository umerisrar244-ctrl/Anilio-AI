import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Film,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Video,
  FileEdit,
  Music,
  Users,
  Image as ImageIcon,
} from 'lucide-react';
import { ProjectJob } from '../types';

interface BrainMonitorProps {
  project: ProjectJob | null;
  onPause: (jobId: string) => void;
  onResume: (jobId: string) => void;
  onOpenVideo: (project: ProjectJob) => void;
  onViewScenes: () => void;
}

const AGENT_NODES = [
  { id: 'StoryAgent', name: 'Story Agent', desc: 'Narrative & Scene Splitting', icon: Film },
  { id: 'CharacterAgent', name: 'Character Agent', desc: 'Library Lookup & Consistency', icon: Users },
  { id: 'BackgroundAgent', name: 'Background Agent', desc: 'Environment Matching', icon: ImageIcon },
  { id: 'VoiceAgent', name: 'Voice Agent', desc: 'Voice Lab Sync & Caching', icon: Music },
  { id: 'ScenePlanner', name: 'Scene Planner', desc: 'Camera, Prompts & Specs', icon: Sparkles },
  { id: 'VideoAgent', name: 'Video Agent', desc: 'Wan 2.2 TI2V-5B Generation', icon: Video },
  { id: 'QualityControlAgent', name: 'QC Agent', desc: 'Integrity & Duration Audit', icon: ShieldCheck },
  { id: 'EditingAgent', name: 'Editing Agent', desc: 'FFmpeg Concatenation & Master', icon: FileEdit },
];

export const BrainMonitor: React.FC<BrainMonitorProps> = ({
  project,
  onPause,
  onResume,
  onOpenVideo,
  onViewScenes,
}) => {
  if (!project) {
    return (
      <div className="p-8 text-center bg-slate-900/40 rounded-xl border border-slate-800">
        <p className="text-slate-400 text-sm">No active project selected. Create or select a project to monitor.</p>
      </div>
    );
  }

  const isRunning = project.status === 'running';
  const isPaused = project.status === 'paused';
  const isCompleted = project.status === 'completed';

  // Determine current active node index
  const activeNodeIdx = AGENT_NODES.findIndex(
    (n) => n.id.toLowerCase() === project.current_agent.toLowerCase()
  );

  return (
    <div className="space-y-6">
      {/* Top Banner / Project Overview */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 lg:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
              <span className="font-semibold text-indigo-400 uppercase tracking-wider">
                {project.mode} Mode
              </span>
              <span>·</span>
              <span className="font-mono tabular-nums">{project.total_scenes} Scenes</span>
              <span>·</span>
              <span className="font-mono tabular-nums">{project.target_duration_seconds}s Total</span>
              <span>·</span>
              <span>{project.resolution}</span>
              <span>·</span>
              <span>{project.fps} FPS</span>
            </div>
            <h2 className="text-lg lg:text-xl font-bold text-white tracking-tight">
              {project.title}
            </h2>
            <p className="text-xs text-slate-400 line-clamp-2 max-w-2xl">
              {project.prompt}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {isRunning && (
              <button
                onClick={() => onPause(project.job_id)}
                className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-amber-200 bg-amber-950/60 border border-amber-800/80 rounded-lg hover:bg-amber-900/60 transition-colors min-h-[40px]"
              >
                <Pause className="w-4 h-4" />
                <span>Pause Project</span>
              </button>
            )}

            {isPaused && (
              <button
                onClick={() => onResume(project.job_id)}
                className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-emerald-200 bg-emerald-950/60 border border-emerald-800/80 rounded-lg hover:bg-emerald-900/60 transition-colors min-h-[40px]"
              >
                <Play className="w-4 h-4" />
                <span>Resume Production</span>
              </button>
            )}

            {isCompleted && project.final_video_url && (
              <button
                onClick={() => onOpenVideo(project)}
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors shadow-sm shadow-indigo-600/30 min-h-[40px]"
              >
                <Play className="w-4 h-4" />
                <span>Watch Final Video</span>
              </button>
            )}

            <button
              onClick={onViewScenes}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 bg-slate-800/80 border border-slate-700/80 rounded-lg hover:bg-slate-700 transition-colors min-h-[40px]"
            >
              <Film className="w-4 h-4" />
              <span>Inspect Scenes ({project.scenes.length})</span>
            </button>
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div className="mt-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium">
              Current Agent:{' '}
              <span className="text-white font-semibold">
                {project.current_agent} ({project.current_step.replace(/_/g, ' ')})
              </span>
            </span>
            <span className="font-mono tabular-nums font-semibold text-indigo-400">
              {project.progress_percentage}%
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all duration-500 rounded-full"
              style={{ width: `${project.progress_percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* LangGraph StateGraph Visualizer */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 lg:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-white tracking-tight">
              Anilio Brain · LangGraph Orchestrator Flow
            </h3>
            <p className="text-xs text-slate-400">
              LangGraph state machine graph with autonomous routing, review checkpointing, and QC retries.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            State: <span className="text-white capitalize">{project.status}</span>
          </span>
        </div>

        {/* Horizontal Node Flow (Responsive Grid / Flex) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 pt-2">
          {AGENT_NODES.map((node, index) => {
            const Icon = node.icon;
            const isCurrent = activeNodeIdx === index && isRunning;
            const isPassed = isCompleted || activeNodeIdx > index;

            return (
              <div
                key={node.id}
                className={`relative p-3 rounded-lg border transition-all ${
                  isCurrent
                    ? 'border-indigo-500 bg-indigo-950/40 text-white shadow-sm shadow-indigo-500/20'
                    : isPassed
                    ? 'border-emerald-800/60 bg-emerald-950/20 text-slate-200'
                    : 'border-slate-800 bg-slate-900/50 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`w-7 h-7 rounded-md flex items-center justify-center ${
                      isCurrent
                        ? 'bg-indigo-600 text-white'
                        : isPassed
                        ? 'bg-emerald-900/80 text-emerald-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] font-mono tabular-nums text-slate-400">
                    0{index + 1}
                  </span>
                </div>
                <div className="text-xs font-semibold tracking-tight text-white line-clamp-1">
                  {node.name}
                </div>
                <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                  {node.desc}
                </div>
              </div>
            );
          })}
        </div>

        {/* Conditional Branches Note */}
        <div className="text-xs text-slate-400 border-t border-slate-800/80 pt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-indigo-400 font-medium">Graph Routing:</span>
          <span>Story → Character → Background → Voice → Scene Planner</span>
          <span className="text-slate-400">·</span>
          <span>
            [Review Mode: <span className="text-slate-300">{project.mode === 'review' ? 'Enabled' : 'Bypassed'}</span>]
          </span>
          <span className="text-slate-400">·</span>
          <span>Video Agent (Wan 2.2) → Quality Control</span>
          <span className="text-slate-400">·</span>
          <span>[QC Failure: Automatic Scene Retry (max 3)]</span>
          <span className="text-slate-400">·</span>
          <span>FFmpeg Assembly → Supabase Storage</span>
        </div>
      </div>

      {/* Live Agent Logs Stream */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 lg:p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            <span>Execution Audit Trail</span>
            <span className="text-xs font-normal text-slate-400">
              ({project.logs.length} events)
            </span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            {isRunning ? 'Live Streaming' : 'Complete'}
          </span>
        </div>

        <div className="max-h-64 overflow-y-auto space-y-1.5 font-mono text-xs pr-1">
          {project.logs.slice().reverse().map((log, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2.5 py-1.5 px-2.5 rounded bg-slate-950/60 border border-slate-800/60"
            >
              <span className="text-slate-400 tabular-nums shrink-0">
                {log.timestamp}
              </span>
              <span className="text-indigo-400 font-semibold shrink-0">
                [{log.agent}]
              </span>
              <span className="text-slate-300 flex-1 break-words">
                {log.message}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
