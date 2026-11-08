import React, { useState } from 'react';
import { Users, Image as ImageIcon, Music, Check, ExternalLink } from 'lucide-react';
import { Character, Background, VoiceAsset } from '../types';

interface AssetLibraryPanelProps {
  characters: Character[];
  backgrounds: Background[];
  voices: VoiceAsset[];
}

export const AssetLibraryPanel: React.FC<AssetLibraryPanelProps> = ({
  characters,
  backgrounds,
  voices,
}) => {
  const [subTab, setSubTab] = useState<'characters' | 'backgrounds' | 'voices'>('characters');

  return (
    <div className="space-y-6">
      {/* Header & Sub-Tabs */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 lg:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Existing Anilio Integration Library
            </h2>
            <p className="text-xs text-slate-400">
              The agent reuses existing characters, backgrounds, and Voice Lab assets via secure adapters without regenerating them.
            </p>
          </div>

          {/* Clean Segmented Tab Control */}
          <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg self-start">
            <button
              onClick={() => setSubTab('characters')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                subTab === 'characters'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Characters ({characters.length})
            </button>
            <button
              onClick={() => setSubTab('backgrounds')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                subTab === 'backgrounds'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Backgrounds ({backgrounds.length})
            </button>
            <button
              onClick={() => setSubTab('voices')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                subTab === 'voices'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Voice Lab ({voices.length})
            </button>
          </div>
        </div>
      </div>

      {/* Characters View */}
      {subTab === 'characters' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {characters.map((char) => (
            <div
              key={char.id}
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3 flex flex-col justify-between"
            >
              <div className="flex items-start gap-3">
                <img
                  src={char.imageUrl}
                  alt={char.name}
                  className="w-14 h-14 rounded-lg object-cover border border-slate-700 shrink-0"
                />
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    {char.name}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2">
                    {char.description}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span className="font-mono text-[11px]">ID: {char.id}</span>
                <span className="text-indigo-400 font-medium">Reused via Adapter</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Backgrounds View */}
      {subTab === 'backgrounds' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {backgrounds.map((bg) => (
            <div
              key={bg.id}
              className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden space-y-3"
            >
              <div className="aspect-video bg-slate-950 relative overflow-hidden">
                <img
                  src={bg.imageUrl}
                  alt={bg.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[10px] text-white font-medium">
                  {bg.environmentType}
                </div>
              </div>

              <div className="p-4 pt-1 space-y-1">
                <h3 className="text-sm font-bold text-white tracking-tight">
                  {bg.name}
                </h3>
                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                  <span className="font-mono text-[11px]">{bg.id}</span>
                  <span className="text-emerald-400 font-medium">Cached Environment</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Voices View */}
      {subTab === 'voices' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {voices.map((voice) => (
            <div
              key={voice.id}
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-950/80 text-indigo-400 border border-indigo-800/60 flex items-center justify-center shrink-0">
                  <Music className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    {voice.name}
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    {voice.gender} · {voice.accent}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-300 italic">
                "{voice.style}"
              </p>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span className="font-mono text-[11px]">{voice.id}</span>
                <span className="text-emerald-400 font-medium">Synced Dialogue</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
