import React, { useRef, useState } from 'react';
import {
  BrainCircuit,
  CheckCircle2,
  Database,
  Download,
  Moon,
  RefreshCw,
  RotateCcw,
  Sun,
  Trash2,
  Upload,
} from 'lucide-react';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { useSecurity } from '../context/SecurityContext';

export const SettingsView: React.FC = () => {
  const {
    theme,
    setTheme,
    systemStatus,
    refreshStatus,
    threats,
    analyses,
    alerts,
    scanHistory,
    loadDemoData,
    resetDemoData,
    clearAllData,
    importWorkspaceData,
  } = useSecurity();

  const fileRef = useRef<HTMLInputElement | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const handleExportBackup = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      application: 'CyberGuard Mini',
      threats,
      analyses,
      alerts,
      scanHistory,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cyberguard-mini-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setFeedback('Workspace JSON backup downloaded.');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const res = await importWorkspaceData(text);
      setFeedback(res.message);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800/80">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Settings &amp; System Diagnostics
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Configure appearance, manage simulated demonstration records, export data backups, and verify backend connectivity.
        </p>
      </div>

      {feedback && (
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Theme & PWA */}
        <section className="p-5 rounded-xl bg-white/90 dark:bg-slate-900/70 glass-panel border border-slate-200 dark:border-slate-800 space-y-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Appearance &amp; Mobile App (PWA)
          </h2>

          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-slate-900 dark:text-white">Color Theme</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Switch between Dark SOC Mode and Light Presentation Mode
              </div>
            </div>

            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Dark</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
                  theme === 'light'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Light</span>
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-slate-900 dark:text-white">
                Android / Desktop PWA Installation
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Standalone manifest + offline shell caching (AI requires network)
              </div>
            </div>
            <PWAInstallButton variant="card" />
          </div>
        </section>

        {/* Connection Status */}
        <section className="p-5 rounded-xl bg-white/90 dark:bg-slate-900/70 glass-panel border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Server Integration Status
            </h2>
            <button
              type="button"
              onClick={() => {
                void refreshStatus();
                setFeedback('Refreshed server integration status.');
              }}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-cyan-400 hover:underline cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Re-check</span>
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Database className="w-4 h-4 text-blue-500 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">
                    Database Persistence
                  </div>
                  <div className="text-slate-500 dark:text-slate-400">
                    {systemStatus.supabaseConfigured
                      ? 'Supabase PostgreSQL connected via server API'
                      : 'Supabase env vars not configured — using browser localStorage Demo Storage'}
                  </div>
                </div>
              </div>
              <span className="font-mono font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                {systemStatus.supabaseConfigured ? 'PostgreSQL' : 'Local Demo'}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <BrainCircuit className="w-4 h-4 text-cyan-500 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">
                    AI Threat Analysis Engine
                  </div>
                  <div className="text-slate-500 dark:text-slate-400">
                    {systemStatus.geminiConfigured
                      ? `Server-side Gemini SDK active (${systemStatus.geminiModel})`
                      : 'GEMINI_API_KEY not set — Rules-Based Demonstration Mode active'}
                  </div>
                </div>
              </div>
              <span className="font-mono font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                {systemStatus.geminiConfigured ? 'Gemini Ready' : 'Rules Demo'}
              </span>
            </div>
          </div>
        </section>

        {/* Demo Data & Backup */}
        <section className="p-5 rounded-xl bg-white/90 dark:bg-slate-900/70 glass-panel border border-slate-200 dark:border-slate-800 space-y-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Demo Data &amp; Workspace Export
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Load 12 synthetic educational cybersecurity incidents for live presentation, reset to baseline, or export/import workspace JSON.
          </p>

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={async () => {
                await loadDemoData();
                setFeedback('Loaded 12 synthetic demo incidents, analyses, alerts, and scan reports.');
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Load Demo Data</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                await resetDemoData();
                setFeedback('Workspace reset to the 12-incident synthetic demo baseline.');
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Demo</span>
            </button>

            <button
              type="button"
              onClick={handleExportBackup}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import JSON</span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImportBackup}
              className="hidden"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
            {confirmClear ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-rose-600 dark:text-rose-400">
                  Clear all threats, analyses, alerts, and scan history?
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    await clearAllData();
                    setConfirmClear(false);
                    setFeedback('All workspace records cleared.');
                  }}
                  className="px-3 py-1.5 text-xs font-medium bg-rose-600 text-white rounded-md cursor-pointer"
                >
                  Confirm Clear
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-md cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All Data</span>
              </button>
            )}
          </div>
        </section>

        {/* About Project */}
        <section className="p-5 rounded-xl bg-white/90 dark:bg-slate-900/70 glass-panel border border-slate-200 dark:border-slate-800 space-y-3">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            About CyberGuard Mini
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            <strong>CyberGuard Mini — AI-Powered Threat Intelligence &amp; Security Monitoring System</strong> is a college cybersecurity internship capstone platform built with React, TypeScript, Node.js, server-side Gemini AI, optional Supabase PostgreSQL persistence, and PWA support.
          </p>
          <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400 list-disc pl-4">
            <li>No sign-in gate required for live classroom walkthroughs.</li>
            <li>All AI and database keys remain strictly server-side.</li>
            <li>Log scanner operates strictly on untrusted plain-text excerpts; never scans external networks or executes uploaded files.</li>
            <li>Simulated demo records and rules-based heuristic outputs are always transparently labelled.</li>
          </ul>
        </section>
      </div>
    </div>
  );
};
