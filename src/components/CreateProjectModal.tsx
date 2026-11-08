import React, { useState } from 'react';
import { X, Sparkles, Film, Clock, Sliders, Shield } from 'lucide-react';
import { calculateSegmentation } from '../utils/orchestrator_logic';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    prompt: string;
    mode: 'autonomous' | 'review';
    target_duration_seconds: number;
    clip_duration_seconds: number;
    aspect_ratio: string;
    resolution: string;
    fps: number;
  }) => Promise<void>;
}

const PRESET_PROMPTS = [
  'An astronaut explores a luminescent crystal cave on an uncharted moon, discovering an ancient humming monolith.',
  'Cyberpunk detective Alex Vance stalks a rogue android courier through the neon rain of Neo-Shinjuku upper walkways.',
  'A deep-sea submersible navigates hydrothermal vents at 4,000 meters depth, encountering a bioluminescent colossal creature.',
  'An ancient samurai meditates beside a misty mountain shrine as cherry blossom petals drift across a golden sunset.',
];

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [prompt, setPrompt] = useState(PRESET_PROMPTS[0]);
  const [mode, setMode] = useState<'autonomous' | 'review'>('autonomous');
  const [targetDuration, setTargetDuration] = useState<number>(30);
  const [clipDuration, setClipDuration] = useState<number>(5);
  const [aspectRatio, setAspectRatio] = useState<string>('16:9');
  const [resolution, setResolution] = useState<string>('1280x720');
  const [fps, setFps] = useState<number>(24);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const segmentation = calculateSegmentation(targetDuration, clipDuration);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        prompt,
        mode,
        target_duration_seconds: targetDuration,
        clip_duration_seconds: clipDuration,
        aspect_ratio: aspectRatio,
        resolution,
        fps,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                New Autonomous Video Project
              </h2>
              <p className="text-xs text-slate-400">
                Anilio Brain will orchestrate Story, Assets, Wan 2.2, QC, and FFmpeg.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Prompt Input */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              Video Concept Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder="Describe your video idea, plot, atmosphere, and visual narrative..."
              required
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
            />
            {/* Presets */}
            <div className="space-y-1">
              <span className="text-[11px] text-slate-500">Quick test prompts:</span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_PROMPTS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPrompt(p)}
                    className="text-[11px] px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-left truncate max-w-xs"
                  >
                    Preset {idx + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Operating Mode: Autonomous vs Review */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              Workflow Operating Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode('autonomous')}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  mode === 'autonomous'
                    ? 'border-indigo-500 bg-indigo-950/30 text-white'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Autonomous Mode</span>
                  <span className="text-[10px] text-indigo-400 font-semibold uppercase">Default</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Agent proceeds through Story, Wan 2.2, QC, and FFmpeg automatically to final MP4.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setMode('review')}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  mode === 'review'
                    ? 'border-indigo-500 bg-indigo-950/30 text-white'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Review Mode</span>
                  <Shield className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Preserves existing Anilio scene approval workflow. Pauses for human check.
                </p>
              </button>
            </div>
          </div>

          {/* Duration & Segmentation */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Long-Form Video Engine Duration</span>
              </span>
              <span className="text-xs font-mono font-bold text-indigo-400 tabular-nums">
                {targetDuration >= 60
                  ? `${Math.floor(targetDuration / 60)}m ${targetDuration % 60}s`
                  : `${targetDuration}s`}
              </span>
            </div>

            {/* Duration Presets up to 30 mins (1800s) */}
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
              {[
                { label: '15s', val: 15 },
                { label: '30s', val: 30 },
                { label: '60s', val: 60 },
                { label: '2m', val: 120 },
                { label: '5m', val: 300 },
                { label: '15m', val: 900 },
                { label: '30m', val: 1800 },
              ].map((d) => (
                <button
                  key={d.val}
                  type="button"
                  onClick={() => setTargetDuration(d.val)}
                  className={`py-1.5 px-2 text-xs rounded-lg font-medium transition-colors ${
                    targetDuration === d.val
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'bg-slate-800/80 text-slate-400 hover:text-white'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            {/* Scene Segmentation Calculation */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs text-slate-400">
              <span>Segmented Clip Length: {clipDuration}s</span>
              <span className="text-white font-semibold">
                Will generate <span className="text-indigo-400 font-mono font-bold tabular-nums">{segmentation.totalScenes}</span> scenes
              </span>
            </div>
          </div>

          {/* Technical Specs: Aspect Ratio, Resolution, FPS */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Aspect Ratio
              </label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="16:9">16:9 Widescreen</option>
                <option value="9:16">9:16 Vertical (Shorts/Reels)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Resolution
              </label>
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="1280x720">720p HD (Wan 2.2 Native)</option>
                <option value="1920x1080">1080p FHD (Upscaled)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Frame Rate
              </label>
              <select
                value={fps}
                onChange={(e) => setFps(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value={24}>24 FPS (Cinematic)</option>
                <option value={30}>30 FPS (Standard)</option>
                <option value={16}>16 FPS (Fast Preview)</option>
              </select>
            </div>
          </div>

          {/* Submit CTA */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !prompt.trim()}
              className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-[0.99] transition-all disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isSubmitting ? 'Initializing Brain...' : 'Launch Anilio Brain Video Production'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
