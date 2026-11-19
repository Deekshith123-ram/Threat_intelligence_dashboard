import React, { useMemo, useState } from 'react';
import { FileDown, FileSpreadsheet, Printer } from 'lucide-react';
import { SeverityLabel, StatusLabel } from '../components/SeverityBadge';
import { useSecurity } from '../context/SecurityContext';
import { exportSecurityPDF, exportThreatsCSV } from '../utils/reportExporter';

export const ReportGeneratorView: React.FC = () => {
  const { threats, analyses } = useSecurity();
  const [reportTitle, setReportTitle] = useState(
    'CyberGuard Mini — SOC Capstone Security Report'
  );
  const [analystName, setAnalystName] = useState('SOC Intern Analyst');
  const [includeResolved, setIncludeResolved] = useState(true);
  const [includeAnalyses, setIncludeAnalyses] = useState(true);
  const [includeMitre, setIncludeMitre] = useState(true);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  const scopedThreats = useMemo(
    () => (includeResolved ? threats : threats.filter((t) => t.status !== 'Resolved')),
    [includeResolved, threats]
  );

  const handleExportPDF = () => {
    exportSecurityPDF({
      reportTitle,
      analystName,
      includeResolved,
      includeAnalyses,
      includeMitre,
      threats,
      analyses,
    });
    setStatusFeedback(`PDF report exported (${scopedThreats.length} threat record(s)).`);
  };

  const handleExportCSV = () => {
    exportThreatsCSV(scopedThreats);
    setStatusFeedback(`CSV dataset exported (${scopedThreats.length} threat record(s)).`);
  };

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800/80">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Security Report Generator
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Export executive PDF briefings and structured CSV datasets derived directly from your active threat records and AI analyses.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Configuration Panel */}
        <section className="xl:col-span-4 p-5 rounded-xl bg-white/90 dark:bg-slate-900/70 glass-panel border border-slate-200 dark:border-slate-800 space-y-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Report Configuration
          </h2>

          <div>
            <label
              htmlFor="rep-title"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Report Title
            </label>
            <input
              id="rep-title"
              type="text"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor="rep-analyst"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Prepared By
            </label>
            <input
              id="rep-analyst"
              type="text"
              value={analystName}
              onChange={(e) => setAnalystName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="space-y-2.5 pt-1 text-xs text-slate-700 dark:text-slate-300">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeResolved}
                onChange={(e) => setIncludeResolved(e.target.checked)}
                className="rounded border-slate-300 text-blue-600"
              />
              <span>Include Resolved Threats</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeAnalyses}
                onChange={(e) => setIncludeAnalyses(e.target.checked)}
                className="rounded border-slate-300 text-blue-600"
              />
              <span>Include AI / Heuristic Analysis Findings</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeMitre}
                onChange={(e) => setIncludeMitre(e.target.checked)}
                className="rounded border-slate-300 text-blue-600"
              />
              <span>Include MITRE ATT&amp;CK References</span>
            </label>
          </div>

          <div className="space-y-2.5 pt-2">
            <button
              type="button"
              onClick={handleExportPDF}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
            >
              <FileDown className="w-4 h-4" />
              <span>Export PDF Report</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export CSV Dataset</span>
            </button>
          </div>

          {statusFeedback && (
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200">
              {statusFeedback}
            </div>
          )}
        </section>

        {/* Live Report Preview */}
        <section className="xl:col-span-8 p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="text-xs font-mono text-blue-600 dark:text-cyan-400">
                CyberGuard Mini · Executive Summary Preview
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                {reportTitle}
              </h2>
            </div>
            <div className="text-xs font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Printer className="w-3.5 h-3.5" />
              <span>{new Date().toLocaleDateString()}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            {[
              { label: 'Total Findings', val: scopedThreats.length },
              { label: 'Critical', val: scopedThreats.filter((t) => t.severity === 'Critical').length },
              { label: 'High', val: scopedThreats.filter((t) => t.severity === 'High').length },
              { label: 'Medium', val: scopedThreats.filter((t) => t.severity === 'Medium').length },
              { label: 'Low', val: scopedThreats.filter((t) => t.severity === 'Low').length },
            ].map((b) => (
              <div
                key={b.label}
                className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              >
                <div className="text-[11px] text-slate-500 dark:text-slate-400">{b.label}</div>
                <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
                  {b.val}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Included Threat Details ({scopedThreats.length})
            </h3>
            {scopedThreats.length === 0 ? (
              <p className="text-xs text-slate-500">
                No threat records in current scope. Add records or Load Demo Data before exporting.
              </p>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800 max-h-80 overflow-y-auto pr-1">
                {scopedThreats.map((t) => (
                  <div
                    key={t.id}
                    className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                        {t.title} {t.isDemo ? '(Simulated)' : ''}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 truncate">
                        {t.recommendedAction || t.description}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <SeverityLabel severity={t.severity} />
                      <StatusLabel status={t.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
