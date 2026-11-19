import React, { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  Database,
  Plus,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import {
  ActivityTimelineChart,
  HorizontalBarChart,
  SeverityDonutChart,
  type TimelinePoint,
} from '../components/Charts';
import { SeverityLabel, StatusLabel } from '../components/SeverityBadge';
import { useSecurity } from '../context/SecurityContext';
import { THREAT_CATEGORIES, type Severity } from '../types/security';

const SEVERITY_COLORS: Record<Severity, string> = {
  Critical: '#E11D48',
  High: '#D97706',
  Medium: '#0284C7',
  Low: '#64748B',
};

const CATEGORY_COLORS = [
  '#2563EB',
  '#06B6D4',
  '#6366F1',
  '#8B5CF6',
  '#0EA5E9',
  '#3B82F6',
  '#14B8A6',
  '#64748B',
];

export const DashboardView: React.FC = () => {
  const {
    threats,
    analyses,
    alerts,
    loadDemoData,
    setActiveNav,
    openThreatInManager,
  } = useSecurity();

  const stats = useMemo(() => {
    return {
      total: threats.length,
      critical: threats.filter((t) => t.severity === 'Critical').length,
      high: threats.filter((t) => t.severity === 'High').length,
      medium: threats.filter((t) => t.severity === 'Medium').length,
      low: threats.filter((t) => t.severity === 'Low').length,
      resolved: threats.filter((t) => t.status === 'Resolved').length,
    };
  }, [threats]);

  const severityChartData = useMemo(
    () =>
      (['Critical', 'High', 'Medium', 'Low'] as Severity[]).map((severity) => ({
        severity,
        count: threats.filter((t) => t.severity === severity).length,
        color: SEVERITY_COLORS[severity],
      })),
    [threats]
  );

  const categoryChartData = useMemo(
    () =>
      THREAT_CATEGORIES.map((category, idx) => ({
        label: category,
        value: threats.filter((t) => t.category === category).length,
        color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
      })).sort((a, b) => b.value - a.value),
    [threats]
  );

  const timelinePoints = useMemo<TimelinePoint[]>(() => {
    const grouped = new Map<string, { count: number; criticalOrHigh: number; ts: number }>();
    threats.forEach((t) => {
      const date = new Date(t.detectedAt);
      const dayKey = Number.isNaN(date.getTime())
        ? 'Unknown'
        : date.toISOString().slice(5, 10);
      const existing = grouped.get(dayKey) ?? {
        count: 0,
        criticalOrHigh: 0,
        ts: date.getTime() || 0,
      };
      existing.count += 1;
      if (t.severity === 'Critical' || t.severity === 'High') {
        existing.criticalOrHigh += 1;
      }
      grouped.set(dayKey, existing);
    });

    return Array.from(grouped.entries())
      .sort((a, b) => a[1].ts - b[1].ts)
      .slice(-8)
      .map(([label, v]) => ({
        label,
        count: v.count,
        criticalOrHigh: v.criticalOrHigh,
      }));
  }, [threats]);

  const recentIncidents = useMemo(
    () =>
      [...threats]
        .sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime())
        .slice(0, 5),
    [threats]
  );

  const recentAnalyses = useMemo(
    () =>
      [...analyses]
        .sort((a, b) => new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime())
        .slice(0, 4),
    [analyses]
  );

  const hasDemoRecords = threats.some((t) => t.isDemo);
  const unreadAlertsCount = alerts.filter((a) => !a.isRead).length;

  return (
    <div className="space-y-6">
      {/* Top Action / Context Strip */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800/80">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white text-balance">
            Security Operations Overview
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            All metrics and charts derive strictly from stored threat records, analyses, and scan reports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {threats.length === 0 ? (
            <button
              type="button"
              onClick={() => void loadDemoData()}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Database className="w-4 h-4" />
              <span>Load Demo Data</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void loadDemoData()}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{hasDemoRecords ? 'Reload Demo Set' : 'Load Demo Data'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveNav('analyzer')}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <BrainCircuit className="w-3.5 h-3.5 text-cyan-500" />
            <span>Analyze Log</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveNav('threats')}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Threat</span>
          </button>
        </div>
      </div>

      {/* Clearly labelled simulated demo notice when demo records are active */}
      {hasDemoRecords && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 text-xs text-blue-900 dark:text-blue-200">
          <span>
            <strong>Simulated Demo Dataset Active:</strong> Records tagged <em>Simulated</em> are synthetic educational incidents for demonstration. No live network telemetry is fabricated.
          </span>
          <button
            type="button"
            onClick={() => setActiveNav('settings')}
            className="font-medium underline underline-offset-2 whitespace-nowrap shrink-0 hover:text-blue-700 dark:hover:text-cyan-300 cursor-pointer"
          >
            Manage Demo Data
          </button>
        </div>
      )}

      {/* 6 KPI Stat Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Threats', value: stats.total, tone: 'text-slate-900 dark:text-white' },
          { label: 'Critical', value: stats.critical, tone: 'text-rose-600 dark:text-rose-400' },
          { label: 'High Severity', value: stats.high, tone: 'text-amber-600 dark:text-amber-400' },
          { label: 'Medium Severity', value: stats.medium, tone: 'text-sky-600 dark:text-sky-400' },
          { label: 'Low Severity', value: stats.low, tone: 'text-slate-600 dark:text-slate-300' },
          { label: 'Resolved', value: stats.resolved, tone: 'text-emerald-600 dark:text-emerald-400' },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="p-4 rounded-xl bg-white/90 dark:bg-slate-900/70 glass-panel border border-slate-200 dark:border-slate-800"
          >
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {kpi.label}
            </div>
            <div className={`mt-2 text-3xl font-bold font-mono tabular-nums ${kpi.tone}`}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State CTA if no records */}
      {threats.length === 0 ? (
        <div className="rounded-xl bg-white/90 dark:bg-slate-900/70 glass-panel border border-slate-200 dark:border-slate-800 p-8 text-center">
          <ShieldCheck className="w-10 h-10 mx-auto text-blue-500 mb-3" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Workspace Ready — No Threat Records Stored Yet
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto mt-1.5">
            Load the 12 synthetic capstone demonstration incidents to explore charts and workflows immediately, or analyze a security log with the AI Threat Analyzer.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => void loadDemoData()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
            >
              <Database className="w-4 h-4" />
              <span>Load Demo Data (12 Incidents)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveNav('analyzer')}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <BrainCircuit className="w-4 h-4" />
              <span>Open AI Threat Analyzer</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Charts Row 1: Severity Distribution + Category Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="p-5 rounded-xl bg-white/90 dark:bg-slate-900/70 glass-panel border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                    Threat Severity Distribution
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Click a severity segment to inspect records in Threat Manager
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveNav('analytics')}
                  className="text-xs font-medium text-blue-600 dark:text-cyan-400 hover:underline cursor-pointer"
                >
                  Full Analytics
                </button>
              </div>
              <SeverityDonutChart
                data={severityChartData}
                onSelectSeverity={() => setActiveNav('threats')}
              />
            </section>

            <section className="p-5 rounded-xl bg-white/90 dark:bg-slate-900/70 glass-panel border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                    Threats by Category
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Breakdown across stored threat classifications
                  </p>
                </div>
                <span className="font-mono tabular-nums text-xs text-slate-500 dark:text-slate-400">
                  {categoryChartData.filter((c) => c.value > 0).length} active categories
                </span>
              </div>
              <HorizontalBarChart
                data={categoryChartData}
                onSelectLabel={() => setActiveNav('threats')}
              />
            </section>
          </div>

          {/* Threat Activity Timeline */}
          <section className="p-5 rounded-xl bg-white/90 dark:bg-slate-900/70 glass-panel border border-slate-200 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Threat Activity Timeline
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Incident volume grouped by detection date across stored records
                </p>
              </div>
              {unreadAlertsCount > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveNav('alerts')}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 hover:underline cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span className="font-mono tabular-nums">{unreadAlertsCount}</span> unread alert(s)
                </button>
              )}
            </div>
            <ActivityTimelineChart points={timelinePoints} />
          </section>

          {/* Recent Incidents + Recent AI Analyses */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <section className="xl:col-span-2 p-5 rounded-xl bg-white/90 dark:bg-slate-900/70 glass-panel border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Recent Security Incidents
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveNav('threats')}
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-cyan-400 hover:underline cursor-pointer"
                >
                  <span>View All</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {recentIncidents.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => openThreatInManager(t.id)}
                    className="w-full py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 px-2 -mx-2 rounded-lg transition-colors cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        <span className="truncate">{t.title}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-mono">{t.id}</span>
                        <span aria-hidden="true">·</span>
                        <span>{t.category}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">{t.sourceIndicator || 'No indicator'}</span>
                        {t.isDemo && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-blue-600 dark:text-cyan-400">Simulated</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <SeverityLabel severity={t.severity} />
                      <StatusLabel status={t.status} />
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section className="p-5 rounded-xl bg-white/90 dark:bg-slate-900/70 glass-panel border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Recent AI Analyses
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveNav('analyzer')}
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-cyan-400 hover:underline cursor-pointer"
                >
                  <span>Analyze</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {recentAnalyses.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                  No AI analyses saved yet. Submit a security log in the AI Threat Analyzer.
                </div>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-slate-800">
                  {recentAnalyses.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setActiveNav('analyzer')}
                      className="w-full py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 px-2 -mx-2 rounded-lg transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {a.incidentTitle}
                        </span>
                        <SeverityLabel severity={a.severity} />
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        <span>{a.analysisMode === 'gemini-ai' ? 'Gemini AI' : 'Rules Demo'}</span>
                        <span aria-hidden="true">·</span>
                        <span>{a.confidence}% conf.</span>
                        <span aria-hidden="true">·</span>
                        <span>{new Date(a.analyzedAt).toLocaleDateString()}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
};
