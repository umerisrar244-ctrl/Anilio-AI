import React from 'react';
import { Cpu, Film, Layers, Server, Terminal } from 'lucide-react';
import { GPUWorkerState } from '../types';

interface MobileNavProps {
  activeTab: 'monitor' | 'projects' | 'scenes' | 'gpu' | 'assets' | 'api';
  setActiveTab: (tab: 'monitor' | 'projects' | 'scenes' | 'gpu' | 'assets' | 'api') => void;
  gpuState: GPUWorkerState | null;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeTab,
  setActiveTab,
  gpuState,
}) => {
  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 px-2 py-1.5"
    >
      <div className="grid grid-cols-5 items-center h-14">
        <button
          onClick={() => setActiveTab('monitor')}
          className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] rounded-lg transition-colors ${
            activeTab === 'monitor' ? 'text-indigo-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Cpu className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 tracking-tight">Brain</span>
        </button>

        <button
          onClick={() => setActiveTab('projects')}
          className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] rounded-lg transition-colors ${
            activeTab === 'projects' ? 'text-indigo-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Film className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 tracking-tight">Projects</span>
        </button>

        <button
          onClick={() => setActiveTab('scenes')}
          className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] rounded-lg transition-colors ${
            activeTab === 'scenes' ? 'text-indigo-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 tracking-tight">Scenes</span>
        </button>

        <button
          onClick={() => setActiveTab('gpu')}
          className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] rounded-lg transition-colors relative ${
            activeTab === 'gpu' ? 'text-indigo-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Server className="w-5 h-5" />
            <span
              className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${
                gpuState?.online ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Wan GPU</span>
        </button>

        <button
          onClick={() => setActiveTab('api')}
          className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] rounded-lg transition-colors ${
            activeTab === 'api' ? 'text-indigo-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Terminal className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 tracking-tight">API</span>
        </button>
      </div>
    </nav>
  );
};
