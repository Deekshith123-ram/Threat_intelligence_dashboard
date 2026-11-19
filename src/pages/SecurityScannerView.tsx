import React, { useRef, useState } from 'react';
import {
  FileText,
  FileWarning,
  PlusCircle,
  ScanSearch,
  ShieldAlert,
  Upload,
} from 'lucide-react';
import { SeverityLabel } from '../components/SeverityBadge';
import { useSecurity } from '../context/SecurityContext';
import { SAMPLE_LOG_PRESETS } from '../data/demoData';
import type { ScanReport } from '../types/security';
import {
  ALLOWED_SCAN_EXTENSIONS,
  scanLogContent,
  validateScanFile,
} from '../utils/scannerEngine';

export const SecurityScannerView: React.FC = () => {
  const { scanHistory, saveScanReport, promoteFindingToThreat, openThreatInManager } =
    useSecurity();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [sourceName, setSourceName] = useState('pasted_security_sample.log');
  const [sourceType, setSourceType] = useState<'pasted-log' | 'uploaded-file'>('pasted-log');
  const [fileSize, setFileSize] = useState(0);
  const [content, setContent] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeReport, setActiveReport] = useState<ScanReport | null>(
    scanHistory[0] ?? null
  );
  const [promotedIds, setPromotedIds] = useState<Record<string, string>>({});

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateScanFile(file);
    if (validationError) {
      setErrorMsg(validationError);
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      setContent(text);
      setSourceName(file.name);
      setSourceType('uploaded-file');
      setFileSize(file.size);
    };
    reader.onerror = () => {
      setErrorMsg('Failed to read uploaded file as UTF-8 plain text.');
    };
    reader.readAsText(file);
  };

  const handleRunScan = async () => {
    setErrorMsg(null);
    if (content.trim().length === 0) {
      setErrorMsg('Paste sample security logs or upload a .txt, .csv, or .log file first.');
      return;
    }

    const report = scanLogContent({
      content,
      sourceName: sourceName.trim() || 'pasted_security_sample.log',
      sourceType,
      fileSizeBytes: fileSize || new Blob([content]).size,
    });

    await saveScanReport(report);
    setActiveReport(report);
  };

  const handlePromote = async (findingId: string) => {
    if (!activeReport) return;
    const finding = activeReport.findings.find((f) => f.id === findingId);
    if (!finding) return;
    const created = await promoteFindingToThreat(finding, activeReport.sourceName);
    setPromotedIds((prev) => ({ ...prev, [findingId]: created.id }));
  };

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800/80">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Safe Defensive Log Scanner
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Inspect pasted log excerpts or uploaded plain-text files (.txt, .csv, .log) for suspicious authentication, privilege, phishing, and execution patterns.
        </p>
      </div>

      {/* Explicit Safety Boundary */}
      <div className="px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2.5">
        <FileWarning className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
        <span>
          <strong>Educational Sample-Log Analysis Only:</strong> Uploaded files are treated strictly as untrusted plain text (max 2 MB, extensions {ALLOWED_SCAN_EXTENSIONS.join(', ')}), never executed, and never transmitted to external scanners. CyberGuard Mini does not scan live external IPs, websites, or third-party networks.
        </span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Scanner Input */}
        <section className="xl:col-span-5 p-5 rounded-xl bg-white/90 dark:bg-slate-900/70 glass-panel border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Input Log Content
            </h2>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload .txt / .csv / .log</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.csv,.log,text/plain,text/csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {SAMPLE_LOG_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setContent(preset.logText);
                  setSourceName(`${preset.id}.log`);
                  setSourceType('pasted-log');
                  setFileSize(0);
                  setErrorMsg(null);
                }}
                className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer whitespace-nowrap"
              >
                Sample: {preset.label}
              </button>
            ))}
          </div>

          <div>
            <label
              htmlFor="scanner-source-name"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Log Source Label
            </label>
            <input
              id="scanner-source-name"
              type="text"
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor="scanner-textarea"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Untrusted Plain-Text Log Buffer
            </label>
            <textarea
              id="scanner-textarea"
              rows={9}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setSourceType('pasted-log');
              }}
              placeholder="Paste sample auth, proxy, email gateway, or Sysmon log text here..."
              className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200">
              {errorMsg}
            </div>
          )}

          <button
            type="button"
            onClick={() => void handleRunScan()}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
          >
            <ScanSearch className="w-4 h-4" />
            <span>Scan Log Content &amp; Generate Report</span>
          </button>
        </section>

        {/* Scanner Report Output */}
        <section className="xl:col-span-7 p-5 rounded-xl bg-white/90 dark:bg-slate-900/70 glass-panel border border-slate-200 dark:border-slate-800">
          {!activeReport ? (
            <div className="h-full min-h-[340px] flex flex-col items-center justify-center text-center px-6">
              <FileText className="w-10 h-10 text-blue-500 mb-3" />
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                No Scan Report Selected
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mt-1">
                Paste sample logs or upload an allowed plain-text log file to detect suspicious patterns and generate a scan report.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white font-mono">
                    {activeReport.sourceName}
                  </h2>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums mt-0.5">
                    {activeReport.id} · {activeReport.linesScanned} lines ·{' '}
                    {activeReport.fileSizeBytes} bytes ·{' '}
                    {new Date(activeReport.scannedAt).toLocaleString()}
                  </div>
                </div>
                <SeverityLabel severity={activeReport.overallSeverity} />
              </div>

              <p className="text-sm text-slate-700 dark:text-slate-200">{activeReport.summary}</p>

              {activeReport.findings.length === 0 ? (
                <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200">
                  No suspicious rule matches were identified in this log sample.
                </div>
              ) : (
                <div className="space-y-3">
                  {activeReport.findings.map((f) => {
                    const linkedThreatId = promotedIds[f.id];
                    return (
                      <div
                        key={f.id}
                        className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-sm font-semibold text-slate-900 dark:text-white">
                            {f.ruleName}
                          </div>
                          <SeverityLabel severity={f.severity} />
                        </div>

                        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                          Category: {f.category} · Line {f.lineNumber}
                          {f.mitreId ? ` · MITRE ${f.mitreId}` : ''}
                        </div>

                        <pre className="p-2 rounded bg-slate-900 text-cyan-300 text-[11px] font-mono overflow-x-auto whitespace-pre-wrap">
                          {f.matchedText}
                        </pre>

                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          {f.explanation}
                        </p>
                        <p className="text-xs text-slate-700 dark:text-slate-200">
                          <strong>Defensive Action:</strong> {f.recommendation}
                        </p>

                        <div className="pt-1">
                          {linkedThreatId ? (
                            <button
                              type="button"
                              onClick={() => openThreatInManager(linkedThreatId)}
                              className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                              <span>Saved as Threat {linkedThreatId} — Open</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void handlePromote(f.id)}
                              className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-cyan-400 hover:underline cursor-pointer"
                            >
                              <PlusCircle className="w-3.5 h-3.5" />
                              <span>Save Finding as Threat Record</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Scan History Table */}
      {scanHistory.length > 0 && (
        <section className="p-5 rounded-xl bg-white/90 dark:bg-slate-900/70 glass-panel border border-slate-200 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3">
            Scan Report History ({scanHistory.length})
          </h2>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {scanHistory.map((rep) => (
              <button
                key={rep.id}
                type="button"
                onClick={() => setActiveReport(rep)}
                className={`w-full py-2.5 px-3 -mx-1 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-left transition-colors cursor-pointer ${
                  activeReport?.id === rep.id
                    ? 'bg-blue-50/70 dark:bg-blue-950/30'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div>
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100 font-mono">
                    {rep.sourceName}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                    {rep.id} · {rep.findings.length} finding(s) · {rep.linesScanned} lines ·{' '}
                    {new Date(rep.scannedAt).toLocaleString()}
                  </div>
                </div>
                <SeverityLabel severity={rep.overallSeverity} />
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
