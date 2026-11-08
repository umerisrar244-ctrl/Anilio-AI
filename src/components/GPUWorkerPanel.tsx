import React, { useState } from 'react';
import {
  Server,
  Cpu,
  Activity,
  HardDrive,
  RefreshCw,
  Power,
  CheckCircle,
  AlertCircle,
  Copy,
  Terminal,
} from 'lucide-react';
import { GPUWorkerState } from '../types';

interface GPUWorkerPanelProps {
  gpuState: GPUWorkerState | null;
  onToggleGPU: () => Promise<void>;
  onRefresh: () => Promise<void>;
}

export const GPUWorkerPanel: React.FC<GPUWorkerPanelProps> = ({
  gpuState,
  onToggleGPU,
  onRefresh,
}) => {
  const [copied, setCopied] = useState(false);

  const copyWorkerCommand = () => {
    navigator.clipboard.writeText('python -m workers.gpu_worker_wan22');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isOnline = gpuState?.online ?? false;

  return (
    <div className="space-y-6">
      {/* Overview & Live Status */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`inline-block w-2.5 h-2.5 rounded-full ${
                  isOnline ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Wan 2.2 TI2V-5B Worker Node
              </span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              {isOnline ? gpuState?.device_name : 'GPU Worker Offline (Jobs Queued in Supabase)'}
            </h2>
            <p className="text-xs text-slate-400 max-w-xl">
              Decoupled GPU execution layer. Free-first architecture prevents paid GPU locks and queues tasks safely when offline.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              className="p-2 text-slate-400 hover:text-white rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
              title="Refresh GPU Health"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onToggleGPU}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors shadow-sm min-h-[40px] ${
                isOnline
                  ? 'bg-amber-600/30 text-amber-200 border border-amber-600/50 hover:bg-amber-600/50'
                  : 'bg-emerald-600 text-white hover:bg-emerald-500'
              }`}
            >
              <Power className="w-4 h-4" />
              <span>{isOnline ? 'Simulate Worker Offline' : 'Bring Worker Online'}</span>
            </button>
          </div>
        </div>

        {/* Real Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
              <span>Total VRAM</span>
            </div>
            <div className="text-base font-bold font-mono text-white tabular-nums">
              {isOnline ? `${gpuState?.total_vram_gb} GB` : '0.0 GB'}
            </div>
            <div className="text-[10px] text-slate-400">Min 16GB required</div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Free VRAM</span>
            </div>
            <div className="text-base font-bold font-mono text-white tabular-nums">
              {isOnline ? `${gpuState?.free_vram_gb} GB` : '0.0 GB'}
            </div>
            <div className="text-[10px] text-emerald-400/90 font-medium">
              {isOnline ? 'Sufficient for 720p/24' : 'Worker disconnected'}
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-amber-400" />
              <span>Model Weights</span>
            </div>
            <div className="text-base font-bold text-white truncate">
              {gpuState?.model || 'Wan 2.2 5B'}
            </div>
            <div className="text-[10px] text-slate-400">bfloat16 precision</div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-sky-400" />
              <span>Parallel Scenes</span>
            </div>
            <div className="text-base font-bold font-mono text-white tabular-nums">
              {isOnline ? `${gpuState?.max_parallel} Max` : 'Queue Only'}
            </div>
            <div className="text-[10px] text-slate-400">Controlled batching</div>
          </div>
        </div>
      </div>

      {/* Free-First Resource Management Architecture */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 lg:p-6 space-y-4">
        <h3 className="text-sm font-bold text-white tracking-tight">
          Decoupled Free-First Architecture Breakdown
        </h3>
        <p className="text-xs text-slate-400">
          The system separates the CPU orchestrator from the GPU worker to ensure 100% reliability in free and temporary cloud tiers:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="text-xs font-bold text-indigo-400 uppercase">
              1. Agent CPU Service
            </div>
            <p className="text-xs text-slate-300">
              Runs FastAPI, LangGraph, Anilio Brain, Story Agent, and Character/Voice logic. Always-on, low memory footprint.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="text-xs font-bold text-emerald-400 uppercase">
              2. Ephemeral GPU Worker
            </div>
            <p className="text-xs text-slate-300">
              Hosts Wan 2.2 TI2V-5B. Connects from temporary Colab or RunPod spot instance. When worker drops, orchestrator queues jobs without crashing.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="text-xs font-bold text-sky-400 uppercase">
              3. Supabase DB & Storage
            </div>
            <p className="text-xs text-slate-300">
              Durable state storage with PGMQ queues, RLS security policies, and S3-compatible storage buckets for final MP4 outputs.
            </p>
          </div>
        </div>
      </div>

      {/* Standalone Worker Instructions */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 lg:p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            <Terminal className="w-4 h-4 text-indigo-400" />
            <span>Launch Standalone GPU Worker on Remote Node</span>
          </h3>
          <button
            onClick={copyWorkerCommand}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>

        <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg font-mono text-xs text-slate-300 space-y-1">
          <div className="text-slate-500"># On your GPU machine or Google Colab session:</div>
          <div>export WORKER_PORT=8001</div>
          <div>export WAN22_MODEL_PATH="Wan-AI/Wan2.1-T2V-1.4B"</div>
          <div className="text-indigo-400 font-semibold">python -m workers.gpu_worker_wan22</div>
        </div>
      </div>
    </div>
  );
};
