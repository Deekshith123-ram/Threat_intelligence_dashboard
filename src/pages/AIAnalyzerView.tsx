import React, { useState } from 'react';
import {
  AlertCircle,
  BrainCircuit,
  CheckCircle2,
  Loader2,
  PlusCircle,
  ShieldAlert,
  WifiOff,
} from 'lucide-react';
import { SeverityLabel } from '../components/SeverityBadge';
import { useSecurity } from '../context/SecurityContext';
import { SAMPLE_LOG_PRESETS } from '../data/demoData';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import type { AIAnalysisResult } from '../types/security';
import { runRulesBasedAnalysis } from '../utils/analyzerRules';

export const AIAnalyzerView: React.FC = () => {
  const {
    analyses,
    saveAnalysis,
    convertAnalysisToThreat,
    openThreatInManager,
    systemStatus,
  } = useSecurity();
  const isOnline = useOnlineStatus();

  const [incidentTitle, setIncidentTitle] = useState('');
  const [context, setContext] = useState('');
  const [logText, setLogText] = useState('');
  const [activeResult, setActiveResult] = useState<AIAnalysisResult | null>(
    analyses[0] ?? null
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [canFallbackDemo, setCanFallbackDemo] = useState(false);
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);
  const [convertedBanner, setConvertedBanner] = useState<string | null>(null);

  const loadPreset = (presetId: string) => {
    const preset = SAMPLE_LOG_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setIncidentTitle(preset.title);
    setContext(preset.context);
    setLogText(preset.logText);
    setErrorMsg(null);
    setNoticeMsg(null);
  };

  const handleAnalyze = async (forceRulesDemo = false) => {
    if (logText.trim().length < 5) {
      setErrorMsg('Enter at least 5 characters of security log telemetry to analyze.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMsg(null);
    setNoticeMsg(null);
    setCanFallbackDemo(false);
    setConvertedBanner(null);

    if (!isOnline && !forceRulesDemo) {
      setIsAnalyzing(false);
      setErrorMsg(
        'Device is offline. Live Gemini AI analysis requires internet connectivity and does not run offline. You may run the local Rules-Based Demonstration parser instead.'
      );
      setCanFallbackDemo(true);
      return;
    }

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logText,
          incidentTitle,
          context,
          forceRulesDemo,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setErrorMsg(payload.error || 'Analysis failed.');
        setCanFallbackDemo(Boolean(payload.canUseRulesFallback));
        return;
      }

      const result = payload.analysis as AIAnalysisResult;
      await saveAnalysis(result);
      setActiveResult(result);
      if (payload.notice) {
        setNoticeMsg(payload.notice);
      }
    } catch {
      if (forceRulesDemo) {
        const localFallback = runRulesBasedAnalysis(
          { logText, incidentTitle, context },
          'Server unreachable; executed local Rules-Based Demonstration Mode.'
        );
        await saveAnalysis(localFallback);
        setActiveResult(localFallback);
      } else {
        setErrorMsg(
          'Unable to reach the server-side AI endpoint. Check network connectivity or use Rules-Based Demonstration Mode.'
        );
        setCanFallbackDemo(true);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConvert = async (analysisId: string) => {
    const threat = await convertAnalysisToThreat(analysisId);
    if (threat) {
      setActiveResult((prev) =>
        prev && prev.id === analysisId ? { ...prev, convertedThreatId: threat.id } : prev
      );
      setConvertedBanner(threat.id);
    }
  };

  const displayed = activeResult ?? analyses[0] ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800/80">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            AI Threat Analyzer
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Submit security logs to our server-side {systemStatus.geminiModel} endpoint for structured evidence triage and MITRE ATT&amp;CK suggestions.
          </p>
        </div>

        <div className="text-xs font-mono text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 whitespace-nowrap shrink-0">
          {!isOnline
            ? 'Offline · AI Unavailable'
            : systemStatus.geminiConfigured
              ? `Server AI Ready (${systemStatus.geminiModel})`
              : 'Rules-Based Demo Mode (No Gemini Key)'}
        </div>
      </div>

      {!isOnline && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>
            You are offline. Gemini AI analysis requires an active server connection and does not work offline. Only local rules-based demonstration parsing is available while disconnected.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Input Panel */}
        <section className="xl:col-span-5 p-5 rounded-xl bg-white/90 dark:bg-slate-900/70 glass-panel border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Log Submission
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Sample Presets:
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {SAMPLE_LOG_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => loadPreset(preset.id)}
                className="px-2.5 py-1.5 text-xs font-medium rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer whitespace-nowrap"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <div>
              <label
                htmlFor="analyzer-title"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Incident Title (Optional)
              </label>
              <input
                id="analyzer-title"
                type="text"
                value={incidentTitle}
                onChange={(e) => setIncidentTitle(e.target.value)}
                placeholder="e.g. Repeated SSH Auth Failures on Bastion"
                className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="analyzer-context"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Environment / Analyst Context (Optional)
              </label>
              <input
                id="analyzer-context"
                type="text"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="e.g. Production gateway, external traffic expected on port 443"
                className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="analyzer-logs"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Security Log Text
              </label>
              <textarea
                id="analyzer-logs"
                rows={9}
                value={logText}
                onChange={(e) => setLogText(e.target.value)}
                placeholder="Paste syslog, firewall, auth, Sysmon, or mail gateway log lines here..."
                className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
              {canFallbackDemo && (
                <button
                  type="button"
                  onClick={() => void handleAnalyze(true)}
                  className="px-3 py-1.5 text-xs font-medium rounded-md bg-rose-600 text-white hover:bg-rose-700 cursor-pointer"
                >
                  Run Rules-Based Demonstration Analysis
                </button>
              )}
            </div>
          )}

          {noticeMsg && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200">
              {noticeMsg}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              type="button"
              disabled={isAnalyzing}
              onClick={() => void handleAnalyze(false)}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              {isAnalyzing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <BrainCircuit className="w-4 h-4" />
              )}
              <span>{isAnalyzing ? 'Analyzing Telemetry...' : 'Analyse Threat'}</span>
            </button>

            <button
              type="button"
              disabled={isAnalyzing}
              onClick={() => void handleAnalyze(true)}
              className="px-3.5 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              title="Run deterministic heuristic demo parser without calling Gemini"
            >
              Rules Demo
            </button>
          </div>
        </section>

        {/* Right Analysis Output Panel */}
        <section className="xl:col-span-7 p-5 rounded-xl bg-white/90 dark:bg-slate-900/70 glass-panel border border-slate-200 dark:border-slate-800">
          {!displayed ? (
            <div className="h-full min-h-[360px] flex flex-col items-center justify-center text-center px-6">
              <BrainCircuit className="w-10 h-10 text-blue-500 mb-3" />
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                No Analysis Selected
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mt-1">
                Select a sample log preset or paste security telemetry on the left and click Analyse Threat to inspect structured findings.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Honest Mode Disclaimer */}
              <div
                className={`px-3.5 py-2.5 rounded-lg border text-xs flex flex-wrap items-center justify-between gap-2 ${
                  displayed.analysisMode === 'gemini-ai'
                    ? 'bg-cyan-50/70 dark:bg-cyan-950/30 border-cyan-200 dark:border-cyan-800/60 text-cyan-900 dark:text-cyan-200'
                    : 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'
                }`}
              >
                <span>
                  {displayed.analysisMode === 'gemini-ai'
                    ? `Generated by Server-Side Gemini AI (${systemStatus.geminiModel})`
                    : 'Rules-Based Demonstration Mode — Deterministic heuristic analysis (not Gemini AI output)'}
                </span>
                <span className="font-mono tabular-nums">
                  {new Date(displayed.analyzedAt).toLocaleString()}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {displayed.classification}
                  </h2>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono">{displayed.id}</span>
                    <span aria-hidden="true">·</span>
                    <span>{displayed.threatCategory}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      Confidence: {displayed.confidence}%
                    </span>
                  </div>
                </div>
                <SeverityLabel severity={displayed.severity} />
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                <div className="font-semibold text-slate-900 dark:text-white">
                  Confidence Assessment &amp; Uncertainty
                </div>
                <p>{displayed.confidenceExplanation}</p>
                <p className="text-slate-500 dark:text-slate-400 pt-1">
                  <strong>False Positives / Caveats:</strong> {displayed.falsePositivesAndUncertainty}
                </p>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                  Technical Explanation
                </h3>
                <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                  {displayed.technicalExplanation}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                    Indicators Found
                  </h3>
                  {displayed.indicatorsFound.length === 0 ? (
                    <p className="text-xs text-slate-500">None extracted.</p>
                  ) : (
                    <ul className="space-y-1 text-xs font-mono text-slate-700 dark:text-slate-200">
                      {displayed.indicatorsFound.map((ind, i) => (
                        <li key={i} className="truncate">
                          • {ind}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                    Supporting Evidence
                  </h3>
                  <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                    {displayed.evidence.map((ev, i) => (
                      <li key={i}>• {ev}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                  Recommended Defensive Actions
                </h3>
                <ul className="space-y-1.5 text-sm text-slate-700 dark:text-slate-200">
                  {displayed.recommendedActions.map((act, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{act}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                  MITRE ATT&amp;CK Analytical Suggestions (Not Definitive Proof)
                </h3>
                {displayed.mitreMappings.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    Insufficient evidence in log excerpt to map a MITRE ATT&amp;CK technique reliably.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {displayed.mitreMappings.map((m, i) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs"
                      >
                        <div className="font-semibold text-slate-900 dark:text-white">
                          <span className="font-mono text-blue-600 dark:text-cyan-400">
                            {m.techniqueId}
                          </span>{' '}
                          · {m.techniqueName}{' '}
                          <span className="font-normal text-slate-500">({m.tactic})</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 mt-0.5">{m.rationale}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                {displayed.convertedThreatId || convertedBanner ? (
                  <button
                    type="button"
                    onClick={() =>
                      openThreatInManager(displayed.convertedThreatId || convertedBanner!)
                    }
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg cursor-pointer"
                  >
                    <ShieldAlert className="w-4 h-4" />
                    <span>
                      Saved as Threat {displayed.convertedThreatId || convertedBanner} — View in Threat Manager
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleConvert(displayed.id)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Convert to Threat Record</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Saved Analysis History */}
      {analyses.length > 0 && (
        <section className="p-5 rounded-xl bg-white/90 dark:bg-slate-900/70 glass-panel border border-slate-200 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3">
            Saved Analysis History ({analyses.length})
          </h2>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {analyses.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveResult(item);
                  setConvertedBanner(item.convertedThreatId ?? null);
                }}
                className={`w-full py-2.5 px-3 -mx-1 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-left transition-colors cursor-pointer ${
                  displayed?.id === item.id
                    ? 'bg-blue-50/70 dark:bg-blue-950/30'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                    {item.incidentTitle}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                    {item.id} · {item.analysisMode === 'gemini-ai' ? 'Gemini AI' : 'Rules Demo'} ·{' '}
                    {item.confidence}% conf. · {new Date(item.analyzedAt).toLocaleString()}
                  </div>
                </div>
                <SeverityLabel severity={item.severity} />
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
