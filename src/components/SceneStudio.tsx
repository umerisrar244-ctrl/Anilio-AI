import React from 'react';
import {
  RotateCcw,
  CheckCircle2,
  Clock,
  Video,
  Play,
  Check,
  User,
  Image as ImageIcon,
  Camera,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';
import { ProjectJob, SceneJob } from '../types';

interface SceneStudioProps {
  project: ProjectJob | null;
  onRetryScene: (sceneId: string) => void;
  onApproveScene: (sceneId: string) => void;
  onPreviewClip: (scene: SceneJob) => void;
}

export const SceneStudio: React.FC<SceneStudioProps> = ({
  project,
  onRetryScene,
  onApproveScene,
  onPreviewClip,
}) => {
  if (!project) {
    return (
      <div className="p-8 text-center bg-slate-900/40 rounded-xl border border-slate-800">
        <p className="text-slate-400 text-sm">Select a project to inspect its scene sequence.</p>
      </div>
    );
  }

  const scenes = project.scenes || [];
  const completedScenes = scenes.filter((s) => s.status === 'completed').length;
  const pendingScenes = scenes.filter((s) => s.status !== 'completed').length;

  return (
    <div className="space-y-6">
      {/* Top Bar Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/70 border border-slate-800 rounded-xl p-4 lg:p-6">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight">
            Scene Studio & Review Queue
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
            <span>{project.title}</span>
            <span>·</span>
            <span className="font-mono tabular-nums">{completedScenes}/{scenes.length} Scenes Rendered</span>
            <span>·</span>
            <span className="capitalize">{project.mode} Mode</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-xs text-slate-400">Total Duration</div>
            <div className="text-sm font-bold font-mono text-white tabular-nums">
              {project.target_duration_seconds}s
            </div>
          </div>
        </div>
      </div>

      {/* Scenes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scenes.map((scene) => {
          const isDone = scene.status === 'completed';
          const isGenerating = scene.status === 'generating';
          const isAwaitingApproval = scene.status === 'awaiting_approval';
          const isFailed = scene.status === 'failed';
          const isQueued = scene.status === 'queued';

          return (
            <div
              key={scene.scene_id}
              className={`rounded-xl border bg-slate-900/80 flex flex-col justify-between overflow-hidden transition-all ${
                isDone
                  ? 'border-slate-800 hover:border-slate-700'
                  : isGenerating
                  ? 'border-indigo-500 shadow-sm shadow-indigo-500/20'
                  : isAwaitingApproval
                  ? 'border-amber-500/80'
                  : isFailed
                  ? 'border-rose-600/80'
                  : 'border-slate-800/80'
              }`}
            >
              {/* Scene Card Header */}
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-white">
                      Scene {scene.scene_index}
                    </span>
                    <span className="text-xs font-mono text-slate-400 tabular-nums">
                      {scene.start_time}s – {scene.end_time}s ({scene.duration}s)
                    </span>
                  </div>

                  {/* Status Indicator */}
                  <span
                    className={`text-[11px] font-semibold capitalize ${
                      isDone
                        ? 'text-emerald-400'
                        : isGenerating
                        ? 'text-indigo-400'
                        : isAwaitingApproval
                        ? 'text-amber-400'
                        : isFailed
                        ? 'text-rose-400'
                        : isQueued
                        ? 'text-amber-300'
                        : 'text-slate-400'
                    }`}
                  >
                    {scene.status.replace(/_/g, ' ')}
                  </span>
                </div>

                {/* Video Clip Preview or Placeholder */}
                <div className="relative aspect-video bg-slate-950 rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center group">
                  {scene.video_clip_url && isDone ? (
                    <>
                      <video
                        src={scene.video_clip_url}
                        className="w-full h-full object-cover"
                        preload="metadata"
                      />
                      <button
                        onClick={() => onPreviewClip(scene)}
                        className="absolute inset-0 bg-black/40 group-hover:bg-black/20 flex items-center justify-center text-white transition-all"
                        aria-label={`Play scene ${scene.scene_index}`}
                      >
                        <div className="w-10 h-10 rounded-full bg-indigo-600/90 group-hover:bg-indigo-600 flex items-center justify-center shadow-lg transition-transform group-hover:scale-105">
                          <Play className="w-4 h-4 fill-white ml-0.5" />
                        </div>
                      </button>
                    </>
                  ) : (
                    <div className="text-center p-4 space-y-1">
                      <Video className="w-6 h-6 text-slate-600 mx-auto" />
                      <div className="text-xs text-slate-400 font-medium">
                        {isGenerating
                          ? 'Wan 2.2 Rendering...'
                          : isQueued
                          ? 'Queued (Awaiting GPU)'
                          : 'Pending Generation'}
                      </div>
                    </div>
                  )}

                  {/* Generation Mode Tag */}
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[10px] font-mono text-slate-300 uppercase">
                    {scene.reference_image_url ? 'I2V (Reference)' : 'T2V'}
                  </div>
                </div>

                {/* Character & Background References */}
                <div className="space-y-1.5 pt-1 text-xs text-slate-400">
                  {scene.character_name && (
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="text-slate-200 font-medium truncate">
                        {scene.character_name}
                      </span>
                    </div>
                  )}

                  {scene.background_name && (
                    <div className="flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="text-slate-300 truncate">
                        {scene.background_name}
                      </span>
                    </div>
                  )}

                  <div className="flex items-start gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="text-[11px] text-slate-400 line-clamp-1">
                      {scene.camera_direction}
                    </span>
                  </div>

                  {scene.dialogue && (
                    <div className="flex items-start gap-1.5 bg-slate-950/70 p-2 rounded border border-slate-800/80">
                      <MessageSquare className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span className="text-[11px] text-slate-300 italic line-clamp-2">
                        "{scene.dialogue}"
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons / Review Workflow */}
              <div className="px-4 py-3 bg-slate-950/50 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <button
                  onClick={() => onRetryScene(scene.scene_id)}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry Clip</span>
                </button>

                {isAwaitingApproval && (
                  <button
                    onClick={() => onApproveScene(scene.scene_id)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-white px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve Scene</span>
                  </button>
                )}

                {scene.qc_passed && (
                  <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>QC Verified</span>
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
