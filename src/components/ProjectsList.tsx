import React from 'react';
import {
  Film,
  Play,
  Clock,
  Layers,
  CheckCircle2,
  AlertCircle,
  Pause,
  RotateCcw,
  Plus,
} from 'lucide-react';
import { ProjectJob } from '../types';

interface ProjectsListProps {
  projects: ProjectJob[];
  selectedProjectId: string | null;
  onSelectProject: (projectId: string) => void;
  onOpenCreate: () => void;
  onStartProject: (jobId: string) => void;
  onWatchVideo: (project: ProjectJob) => void;
}

export const ProjectsList: React.FC<ProjectsListProps> = ({
  projects,
  selectedProjectId,
  onSelectProject,
  onOpenCreate,
  onStartProject,
  onWatchVideo,
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/70 border border-slate-800 rounded-xl p-4 lg:p-6">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight">
            Video Projects Repository
          </h2>
          <p className="text-xs text-slate-400">
            Autonomous video projects and manual review pipelines.
          </p>
        </div>

        <button
          onClick={onOpenCreate}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors self-start sm:self-auto shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((p) => {
          const isSelected = selectedProjectId === p.project_id;
          const isCompleted = p.status === 'completed';
          const isRunning = p.status === 'running';
          const isPaused = p.status === 'paused';
          const isPending = p.status === 'pending';

          return (
            <div
              key={p.project_id}
              onClick={() => onSelectProject(p.project_id)}
              className={`rounded-xl border p-4 bg-slate-900/70 space-y-4 cursor-pointer transition-all ${
                isSelected
                  ? 'border-indigo-500 shadow-sm shadow-indigo-500/20'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Header & Status */}
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="font-semibold text-indigo-400 uppercase">
                      {p.mode}
                    </span>
                    <span>·</span>
                    <span className="font-mono tabular-nums">
                      {new Date(p.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white tracking-tight line-clamp-1">
                    {p.title}
                  </h3>
                </div>

                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded capitalize ${
                    isCompleted
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : isRunning
                      ? 'bg-indigo-950 text-indigo-400 border border-indigo-800 animate-pulse'
                      : isPaused
                      ? 'bg-amber-950 text-amber-400 border border-amber-800'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {p.status}
                </span>
              </div>

              {/* Prompt Snippet */}
              <p className="text-xs text-slate-400 line-clamp-2">
                {p.prompt}
              </p>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                <div>
                  <div className="text-[10px] text-slate-500">Duration</div>
                  <div className="font-mono font-semibold text-slate-200 tabular-nums">
                    {p.target_duration_seconds}s
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-500">Scenes</div>
                  <div className="font-mono font-semibold text-slate-200 tabular-nums">
                    {p.total_scenes} clips
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-500">Progress</div>
                  <div className="font-mono font-semibold text-indigo-400 tabular-nums">
                    {p.progress_percentage}%
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                {isCompleted && p.final_video_url ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onWatchVideo(p);
                    }}
                    className="flex items-center gap-1.5 text-xs font-semibold text-white px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition-colors w-full justify-center"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Watch Final MP4</span>
                  </button>
                ) : isPending ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartProject(p.job_id);
                    }}
                    className="flex items-center gap-1.5 text-xs font-semibold text-white px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 transition-colors w-full justify-center"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Launch Production</span>
                  </button>
                ) : (
                  <div className="text-xs text-slate-400 font-mono flex items-center justify-between w-full">
                    <span>Agent: {p.current_agent}</span>
                    <span className="text-indigo-400 font-semibold">Active</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
