import React, { useMemo, useState } from 'react';
import { ExternalLink, Info, Shield } from 'lucide-react';
import { useSecurity } from '../context/SecurityContext';
import { MITRE_CATALOG } from '../data/mitreCatalog';

export const MitreAttackView: React.FC = () => {
  const { threats, analyses, scanHistory, openThreatInManager } = useSecurity();
  const [onlyMatched, setOnlyMatched] = useState(false);
  const [tacticFilter, setTacticFilter] = useState('All');

  const tactics = useMemo(
    () => ['All', ...Array.from(new Set(MITRE_CATALOG.map((m) => m.tactic)))],
    []
  );

  const enriched = useMemo(() => {
    return MITRE_CATALOG.map((entry) => {
      const matchedThreats = threats.filter((t) => {
        const hay = `${t.title} ${t.description} ${t.notes}`.toLowerCase();
        return (
          entry.relatedCategories.includes(t.category) ||
          entry.keywords.some((kw) => hay.includes(kw))
        );
      });

      const matchedAnalyses = analyses.filter(
        (a) =>
          a.mitreMappings.some((m) => m.techniqueId === entry.techniqueId) ||
          entry.relatedCategories.includes(a.threatCategory)
      );

      const matchedScans = scanHistory.filter((s) =>
        s.findings.some((f) => f.mitreId === entry.techniqueId)
      );

      return {
        ...entry,
        matchedThreats,
        matchedAnalyses,
        matchedScans,
        hasEvidence:
          matchedThreats.length > 0 ||
          matchedAnalyses.length > 0 ||
          matchedScans.length > 0,
      };
    }).filter((item) => {
      if (tacticFilter !== 'All' && item.tactic !== tacticFilter) return false;
      if (onlyMatched && !item.hasEvidence) return false;
      return true;
    });
  }, [threats, analyses, scanHistory, onlyMatched, tacticFilter]);

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800/80">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          MITRE ATT&amp;CK Analytical Mapping
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Reference tactics, technique explanations, and defensive mitigations mapped strictly where stored findings provide supporting evidence.
        </p>
      </div>

      <div className="px-4 py-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 text-xs text-indigo-950 dark:text-indigo-200 flex items-start gap-2.5">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-indigo-600 dark:text-indigo-400" />
        <span>
          <strong>Analytical Guidance:</strong> MITRE ATT&amp;CK mappings shown here are analytical suggestions derived from observed indicators and log categories—not definitive proof of a confirmed intrusion. Techniques without supporting evidence in your stored records show zero linked findings.
        </span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 items-center">
          <select
            aria-label="Filter by tactic"
            value={tacticFilter}
            onChange={(e) => setTacticFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
          >
            {tactics.map((tac) => (
              <option key={tac} value={tac}>
                {tac === 'All' ? 'All Tactics' : tac}
              </option>
            ))}
          </select>

          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <input
              type="checkbox"
              checked={onlyMatched}
              onChange={(e) => setOnlyMatched(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Only techniques with evidence in current records</span>
          </label>
        </div>

        <div className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
          Showing {enriched.length} technique(s)
        </div>
      </div>

      {enriched.length === 0 ? (
        <div className="p-8 rounded-xl bg-white/90 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-center text-sm text-slate-500 dark:text-slate-400">
          No MITRE ATT&amp;CK techniques have supporting evidence under the selected filter. Load Demo Data or analyze a security log first.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {enriched.map((item) => (
            <article
              key={item.techniqueId}
              className="p-5 rounded-xl bg-white/90 dark:bg-slate-900/70 glass-panel border border-slate-200 dark:border-slate-800 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-mono text-blue-600 dark:text-cyan-400">
                    {item.techniqueId} · {item.tactic}
                  </div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    {item.techniqueName}
                  </h2>
                </div>
                <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  {item.matchedThreats.length + item.matchedAnalyses.length + item.matchedScans.length}{' '}
                  evidence link(s)
                </span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {item.explanation}
              </p>

              <div>
                <h3 className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Defensive Mitigations
                </h3>
                <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-200">
                  {item.mitigations.map((mit, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{mit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Related Stored Findings
                </div>
                {!item.hasEvidence ? (
                  <p className="text-xs text-slate-500">
                    No stored threats, AI analyses, or scans currently match this technique.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {item.matchedThreats.slice(0, 3).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => openThreatInManager(t.id)}
                        className="w-full flex items-center justify-between gap-2 text-xs text-blue-600 dark:text-cyan-400 hover:underline text-left cursor-pointer"
                      >
                        <span className="truncate">
                          <span className="font-mono">{t.id}</span> · {t.title}
                        </span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </button>
                    ))}
                    {item.matchedAnalyses.slice(0, 2).map((a) => (
                      <div
                        key={a.id}
                        className="text-xs text-slate-600 dark:text-slate-300 truncate"
                      >
                        Analysis <span className="font-mono">{a.id}</span> · {a.incidentTitle}
                      </div>
                    ))}
                    {item.matchedScans.slice(0, 2).map((s) => (
                      <div
                        key={s.id}
                        className="text-xs text-slate-600 dark:text-slate-300 truncate"
                      >
                        Scan <span className="font-mono">{s.id}</span> · {s.sourceName}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
