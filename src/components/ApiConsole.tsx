import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Play,
  Copy,
  Check,
  FileCode,
  Download,
  FolderTree,
  ExternalLink,
} from 'lucide-react';

interface FileInfo {
  path: string;
  label: string;
}

export const ApiConsole: React.FC = () => {
  const [subTab, setSubTab] = useState<'tester' | 'code' | 'migrations'>('tester');
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('GET /agent/projects');
  const [requestBody, setRequestBody] = useState<string>('');
  const [apiResponse, setApiResponse] = useState<string>('Click "Send Request" to test endpoint live.');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusCode, setStatusCode] = useState<number | null>(null);

  // Code inspection state
  const [sourceFiles, setSourceFiles] = useState<FileInfo[]>([]);
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [activeFile, setActiveFile] = useState<string>('anilio_agent/main.py');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/agent/source-files')
      .then((r) => r.json())
      .then((data) => {
        if (data.files) setSourceFiles(data.files);
        if (data.contents) setFileContents(data.contents);
      })
      .catch(console.error);
  }, []);

  const ENDPOINTS = [
    {
      id: 'GET /agent/projects',
      method: 'GET',
      path: '/agent/projects',
      desc: 'List all video projects with progress and status',
      defaultBody: '',
    },
    {
      id: 'POST /agent/create-project',
      method: 'POST',
      path: '/agent/create-project',
      desc: 'Initialize new autonomous video project with segmentation',
      defaultBody: JSON.stringify(
        {
          prompt: 'A cyberpunk runner escapes corporate drones across wet neon rooftops',
          mode: 'autonomous',
          target_duration_seconds: 15,
          clip_duration_seconds: 5,
          aspect_ratio: '16:9',
          resolution: '1280x720',
          fps: 24,
        },
        null,
        2
      ),
    },
    {
      id: 'GET /agent/gpu/status',
      method: 'GET',
      path: '/agent/gpu/status',
      desc: 'Check Wan 2.2 TI2V-5B GPU worker VRAM and worker health',
      defaultBody: '',
    },
    {
      id: 'POST /agent/gpu/toggle',
      method: 'POST',
      path: '/agent/gpu/toggle',
      desc: 'Simulate worker offline/online state to test queueing',
      defaultBody: '',
    },
    {
      id: 'GET /agent/characters',
      method: 'GET',
      path: '/agent/characters',
      desc: 'Query existing Anilio character asset library',
      defaultBody: '',
    },
  ];

  const handleSelectEndpoint = (epId: string) => {
    setSelectedEndpoint(epId);
    const ep = ENDPOINTS.find((e) => e.id === epId);
    if (ep) {
      setRequestBody(ep.defaultBody);
      setApiResponse('Ready to send.');
      setStatusCode(null);
    }
  };

  const handleSendRequest = async () => {
    const ep = ENDPOINTS.find((e) => e.id === selectedEndpoint);
    if (!ep) return;

    setIsLoading(true);
    setStatusCode(null);
    try {
      const options: RequestInit = {
        method: ep.method,
        headers: { 'Content-Type': 'application/json' },
      };
      if (ep.method === 'POST' && requestBody) {
        options.body = requestBody;
      }

      const res = await fetch(ep.path, options);
      setStatusCode(res.status);
      const data = await res.json();
      setApiResponse(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setApiResponse(`Request Failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (fileContents[activeFile]) {
      navigator.clipboard.writeText(fileContents[activeFile]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadFile = () => {
    const content = fileContents[activeFile];
    if (!content) return;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFile.split('/').pop() || 'download.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Mode Tabs */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 lg:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              API Console & Source Repository
            </h2>
            <p className="text-xs text-slate-400">
              Test all REST endpoints against the live server or inspect the full Python LangGraph backend codebase.
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg self-start">
            <button
              onClick={() => setSubTab('tester')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                subTab === 'tester'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Live API Tester
            </button>
            <button
              onClick={() => setSubTab('code')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                subTab === 'code'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Python Repository ({sourceFiles.length} files)
            </button>
            <button
              onClick={() => {
                setSubTab('code');
                setActiveFile('anilio_agent/db/migrations/001_initial_schema.sql');
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                subTab === 'migrations'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Supabase SQL
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Tab 1: Live Interactive API Tester */}
      {subTab === 'tester' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Endpoint Selector */}
          <div className="lg:col-span-4 space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              Select REST Endpoint
            </label>
            <div className="space-y-1.5">
              {ENDPOINTS.map((ep) => {
                const isSelected = selectedEndpoint === ep.id;
                return (
                  <button
                    key={ep.id}
                    onClick={() => handleSelectEndpoint(ep.id)}
                    className={`w-full p-3 rounded-lg border text-left transition-colors flex flex-col gap-1 ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-950/30'
                        : 'border-slate-800 bg-slate-900/50 hover:bg-slate-900 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          ep.method === 'GET'
                            ? 'bg-sky-950 text-sky-400 border border-sky-800/80'
                            : 'bg-emerald-950 text-emerald-400 border border-emerald-800/80'
                        }`}
                      >
                        {ep.method}
                      </span>
                      <span className="text-xs font-mono text-white font-medium">
                        {ep.path}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-1">
                      {ep.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Request & Response Box */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 lg:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white font-mono">
                  {selectedEndpoint}
                </span>
                <button
                  onClick={handleSendRequest}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors shadow-sm disabled:opacity-50 min-h-[36px]"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>{isLoading ? 'Sending...' : 'Send Request'}</span>
                </button>
              </div>

              {/* Request Payload Editor (if POST) */}
              {selectedEndpoint.startsWith('POST') && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-medium text-slate-400">
                    Request Payload (JSON)
                  </span>
                  <textarea
                    value={requestBody}
                    onChange={(e) => setRequestBody(e.target.value)}
                    rows={6}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg font-mono text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              {/* Response Viewer */}
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-400">
                    Response Output
                  </span>
                  {statusCode !== null && (
                    <span
                      className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                        statusCode >= 200 && statusCode < 300
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-rose-950 text-rose-400 border border-rose-800'
                      }`}
                    >
                      Status {statusCode}
                    </span>
                  )}
                </div>
                <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg font-mono text-xs text-slate-300 max-h-72 overflow-y-auto whitespace-pre-wrap">
                  {apiResponse}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Python Code & Migrations Viewer */}
      {subTab === 'code' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* File Explorer Tree */}
          <div className="lg:col-span-4 bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-white tracking-tight">
              <FolderTree className="w-4 h-4 text-indigo-400" />
              <span>anilio_agent/ Package Files</span>
            </div>

            <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
              {sourceFiles.map((f) => {
                const isSelected = activeFile === f.path;
                return (
                  <button
                    key={f.path}
                    onClick={() => setActiveFile(f.path)}
                    className={`w-full p-2 rounded-lg text-left text-xs font-mono transition-colors flex flex-col ${
                      isSelected
                        ? 'bg-indigo-950/60 text-white font-semibold border border-indigo-800/80'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <span className="truncate">{f.path}</span>
                    <span className="text-[10px] text-slate-500 font-sans mt-0.5">
                      {f.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Code Viewer Panel */}
          <div className="lg:col-span-8 bg-slate-900/70 border border-slate-800 rounded-xl p-4 lg:p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 font-mono text-xs text-white">
                <FileCode className="w-4 h-4 text-indigo-400" />
                <span>{activeFile}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-300 hover:text-white rounded bg-slate-800 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={handleDownloadFile}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-white rounded bg-indigo-600 hover:bg-indigo-500 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>
            </div>

            <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-slate-200 overflow-x-auto max-h-[500px] leading-relaxed">
              {fileContents[activeFile] || 'Loading file content...'}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
