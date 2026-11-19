import React, { useMemo } from 'react';
import {
  ActivityTimelineChart,
  HorizontalBarChart,
  SeverityDonutChart,
  type TimelinePoint,
} from '../components/Charts';
import { useSecurity } from '../context/SecurityContext';
import { THREAT_CATEGORIES, type Severity } from '../types/security';

const SEVERITY_COLORS: Record<Severity, string> = {
  Critical: '#E11D48',
  High: '#D97706',
  Medium: '#0284C7',
  Low: '#64748B',
};

export const AnalyticsView: React.FC = () => {
  const { threats, analyses, scanHistory, setActiveNav } = useSecurity();

  const severityData = useMemo(
    () =>
      (['Critical', 'High', 'Medium', 'Low'] as Severity[]).map((severity) => ({
        severity,
        count: threats.filter((t) => t.severity === severity).length,
        color: SEVERITY_COLORS[severity],
      })),
    [threats]
  );

  const categoryData = useMemo(
    () =>
      THREAT_CATEGORIES.map((cat, i) => ({
        label: cat,
        value: threats.filter((t) => t.category === cat).length,
        color: ['#2563EB', '#06B6D4', '#6366F1', '#8B5CF6', '#0EA5E9', '#3B82F6', '#14B8A6', '#64748B'][i % 8],
      })).sort((a, b) => b.value - a.value),
    [threats]
  );

  const resolutionData = useMemo(
    () => [
      {
        label: 'Resolved',
        value: threats.filter((t) => t.status === 'Resolved').length,
        color: '#10B981',
      },
      {
        label: 'Investigating',
        value: threats.filter((t) => t.status === 'Investigating').length,
        color: '#F59E0B',
      },
      {
        label: 'Open / Unresolved',
        value: threats.filter((t) => t.status === 'Open').length,
        color: '#E11D48',
      },
    ],
    [threats]
  );

  const aiResultsData = useMemo(
    () => [
      {
        label: 'Gemini AI Analyses',
        value: analyses.filter((a) => a.analysisMode === 'gemini-ai').length,
        color: '#06B6D4',
      },
      {
        label: 'Rules-Based Demo Analyses',
        value: analyses.filter((a) => a.analysisMode === 'rules-based-demo').length,
        color: '#6366F1',
      },
      {
        label: 'Converted to Threat Record',
        value: analyses.filter((a) => Boolean(a.convertedThreatId)).length,
        color: '#2563EB',
      },
    ],
    [analyses]
  );

  const scannerFindingsData = useMemo(() => {
    const counts = new Map<string, number>();
    scanHistory.forEach((rep) => {
      rep.findings.forEach((f) => {
        counts.set(f.category, (counts.get(f.category) ?? 0) + 1);
      });
    });
    return Array.from(counts.entries())
      .map(([label, value], i) => ({
        label,
        value,
        color: ['#2563EB', '#06B6D4', '#8B5CF6', '#F59E0B', '#E11D48'][i % 5],
      }))
      .sort((a, b) => b.value - a.value);
  }, [scanHistory]);

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
      .slice(-10)
      .map(([label, v]) => ({
        label,
        count: v.count,
        criticalOrHigh: v.criticalOrHigh,
      }));
  }, [threats]);

  const avgConfidence = useMemo(() => {
    if (analyses.length === 0) return 0;
    return Math.round(analyses.reduce((s, a) => s + a.confidence, 0) / analyses.length);
  }, [analyses]);

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800/80">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Security Analytics &amp; Telemetry Breakdown
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Interactive visualizations computed live from stored threats, AI analyses, and Security Scanner reports.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white/90 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400">Stored Threats</div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {threats.length}
          </div>
        </div>
        <div className="p-4 rounded-xl bg-white/90 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400">Resolution Rate</div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            {threats.length > 0
              ? `${Math.round((threats.filter((t) => t.status === 'Resolved').length / threats.length) * 100)}%`
              : '0%'}
          </div>
        </div>
        <div className="p-4 rounded-xl bg-white/90 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400">Avg AI Confidence</div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-cyan-600 dark:text-cyan-400">
            {avgConfidence}%
          </div>
        </div>
        <div className="p-4 rounded-xl bg-white/90 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400">Scanner Findings</div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-blue-600 dark:text-blue-400">
            {scanHistory.reduce((acc, s) => acc + s.findings.length, 0)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="p-5 rounded-xl bg-white/90 dark:bg-slate-900/70 glass-panel border border-slate-200 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4">
            Threats by Severity
          </h2>
          <SeverityDonutChart
            data={severityData}
            onSelectSeverity={() => setActiveNav('threats')}
          />
        </section>

        <section className="p-5 rounded-xl bg-white/90 dark:bg-slate-900/70 glass-panel border border-slate-200 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4">
            Resolved vs. Unresolved Threats
          </h2>
          <HorizontalBarChart
            data={resolutionData}
            emptyMessage="No threat status data recorded."
          />
        </section>

        <section className="p-5 rounded-xl bg-white/90 dark:bg-slate-900/70 glass-panel border border-slate-200 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4">
            Threats by Category
          </h2>
          <HorizontalBarChart data={categoryData} />
        </section>

        <section className="p-5 rounded-xl bg-white/90 dark:bg-slate-900/70 glass-panel border border-slate-200 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4">
            Threats Over Time
          </h2>
          <ActivityTimelineChart points={timelinePoints} />
        </section>

        <section className="p-5 rounded-xl bg-white/90 dark:bg-slate-900/70 glass-panel border border-slate-200 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4">
            AI Analysis Results Breakdown
          </h2>
          <HorizontalBarChart
            data={aiResultsData}
            emptyMessage="No AI or rules-based analyses recorded yet."
          />
        </section>

        <section className="p-5 rounded-xl bg-white/90 dark:bg-slate-900/70 glass-panel border border-slate-200 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4">
            Security Scanner Findings by Category
          </h2>
          <HorizontalBarChart
            data={scannerFindingsData}
            emptyMessage="No Security Scanner findings recorded yet."
          />
        </section>
      </div>
    </div>
  );
};
