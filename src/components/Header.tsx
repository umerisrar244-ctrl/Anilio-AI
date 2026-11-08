import React from 'react';
import { Cpu, Plus, Sparkles, Server } from 'lucide-react';
import { GPUWorkerState } from '../types';

interface HeaderProps {
  activeTab: 'monitor' | 'projects' | 'scenes' | 'gpu' | 'assets' | 'api';
  setActiveTab: (tab: 'monitor' | 'projects' | 'scenes' | 'gpu' | 'assets' | 'api') => void;
  onOpenCreate: () => void;
  gpuState: GPUWorkerState | null;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenCreate,
  gpuState,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 lg:gap-8">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-500/20">
            <Cpu className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-base lg:text-lg font-bold tracking-tight text-white whitespace-nowrap">
              Anilio Brain
            </span>
            <span className="text-[11px] text-slate-400 font-medium -mt-0.5">
              Autonomous Video Agent
            </span>
          </div>
        </div>

        {/* Zone 2: 4–5 clean single-line text navigation links (Desktop) */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
          <button
            onClick={() => setActiveTab('monitor')}
            className={`whitespace-nowrap transition-colors py-1 ${
              activeTab === 'monitor'
                ? 'text-white border-b-2 border-indigo-500 font-semibold'
                : 'hover:text-slate-200'
            }`}
          >
            Orchestrator
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`whitespace-nowrap transition-colors py-1 ${
              activeTab === 'projects'
                ? 'text-white border-b-2 border-indigo-500 font-semibold'
                : 'hover:text-slate-200'
            }`}
          >
            Projects
          </button>
          <button
            onClick={() => setActiveTab('scenes')}
            className={`whitespace-nowrap transition-colors py-1 ${
              activeTab === 'scenes'
                ? 'text-white border-b-2 border-indigo-500 font-semibold'
                : 'hover:text-slate-200'
            }`}
          >
            Scene Studio
          </button>
          <button
            onClick={() => setActiveTab('gpu')}
            className={`whitespace-nowrap transition-colors py-1 flex items-center gap-1.5 ${
              activeTab === 'gpu'
                ? 'text-white border-b-2 border-indigo-500 font-semibold'
                : 'hover:text-slate-200'
            }`}
          >
            <span>Wan 2.2 GPU</span>
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                gpuState?.online ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
          </button>
          <button
            onClick={() => setActiveTab('assets')}
            className={`whitespace-nowrap transition-colors py-1 ${
              activeTab === 'assets'
                ? 'text-white border-b-2 border-indigo-500 font-semibold'
                : 'hover:text-slate-200'
            }`}
          >
            Library
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`whitespace-nowrap transition-colors py-1 ${
              activeTab === 'api'
                ? 'text-white border-b-2 border-indigo-500 font-semibold'
                : 'hover:text-slate-200'
            }`}
          >
            API & Code
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenCreate}
            className="flex items-center gap-2 px-3.5 py-2 text-xs lg:text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 active:scale-[0.98] transition-all shadow-sm shadow-indigo-600/30 whitespace-nowrap min-h-[40px]"
          >
            <Plus className="w-4 h-4" />
            <span>Create Project</span>
          </button>
        </div>
      </div>
    </header>
  );
};
