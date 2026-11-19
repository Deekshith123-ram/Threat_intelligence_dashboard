import React, { useMemo, useState } from 'react';
import { ExternalLink, Globe, Hash, Network, Search } from 'lucide-react';
import { useSecurity } from '../context/SecurityContext';
import type { ThreatCategory, ThreatRecord } from '../types/security';

interface SyntheticIndicator {
  id: string;
  type: 'IP Address' | 'Domain' | 'SHA-256 Hash';
  value: string;
  category: ThreatCategory;
  confidence: string;
  evidence: string;
  isSyntheticSample: boolean;
  associatedThreats: ThreatRecord[];
}

const EDUCATIONAL_IOC_SEED: Array<Omit<SyntheticIndicator, 'associatedThreats'>> = [
  {
    id: 'IOC-IP-01',
    type: 'IP Address',
    value: '198.51.100.42',
    category: 'Brute Force',
    confidence: 'High (85% — RFC 5737 Documentation Sample)',
    evidence: 'Observed across repeated simulated SSH authentication failures on bastion-01.',
    isSyntheticSample: true,
  },
  {
    id: 'IOC-IP-02',
    type: 'IP Address',
    value: '203.0.113.88',
    category: 'Malware Indicator',
    confidence: 'High (88% — RFC 5737 Documentation Sample)',
    evidence: 'Target destination in simulated encoded PowerShell outbound callback.',
    isSyntheticSample: true,
  },
  {
    id: 'IOC-IP-03',
    type: 'IP Address',
    value: '203.0.113.190',
    category: 'Credential Abuse',
    confidence: 'Medium (68% — RFC 5737 Documentation Sample)',
    evidence: 'Flagged in simulated impossible-travel SSO anomaly.',
    isSyntheticSample: true,
  },
  {
    id: 'IOC-DOM-01',
    type: 'Domain',
    value: 'payroll-verify.example',
    category: 'Phishing',
    confidence: 'High (82% — Reserved .example Domain)',
    evidence: 'Referenced in spoofed HR payroll reset email sample with SPF/DKIM failure.',
    isSyntheticSample: true,
  },
  {
    id: 'IOC-DOM-02',
    type: 'Domain',
    value: 'update-cdn-check.test',
    category: 'Phishing',
    confidence: 'Medium (60% — Reserved .test Domain)',
    evidence: 'Observed in simulated DNS TXT lookup anomaly from lab subnet.',
    isSyntheticSample: true,
  },
  {
    id: 'IOC-HASH-01',
    type: 'SHA-256 Hash',
    value: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    category: 'Malware Indicator',
    confidence: 'Medium (65% — Synthetic Empty-Payload Test SHA-256)',
    evidence: 'Used safely in classroom drill for file-hash IOC matching without real malware.',
    isSyntheticSample: true,
  },
];

export const ThreatIntelligenceView: React.FC = () => {
  const { threats, openThreatInManager } = useSecurity();
  const [typeFilter, setTypeFilter] = useState<'All' | 'IP Address' | 'Domain' | 'SHA-256 Hash'>('All');
  const [query, setQuery] = useState('');

  const indicators = useMemo<SyntheticIndicator[]>(() => {
    const map = new Map<string, SyntheticIndicator>();

    EDUCATIONAL_IOC_SEED.forEach((seed) => {
      const associated = threats.filter(
        (t) =>
          t.sourceIndicator.toLowerCase().includes(seed.value.slice(0, 14).toLowerCase()) ||
          t.description.toLowerCase().includes(seed.value.slice(0, 14).toLowerCase())
      );
      map.set(seed.value.toLowerCase(), { ...seed, associatedThreats: associated });
    });

    // Also dynamically index indicators from user-added threats
    threats.forEach((t) => {
      const ind = t.sourceIndicator.trim();
      if (!ind) return;
      const lower = ind.toLowerCase();
      if (map.has(lower)) {
        const existing = map.get(lower)!;
        if (!existing.associatedThreats.some((a) => a.id === t.id)) {
          existing.associatedThreats.push(t);
        }
        return;
      }

      const isIp = /\b(?:\d{1,3}\.){3}\d{1,3}\b/.test(ind);
      const isHash = /^[a-f0-9]{24,64}$/i.test(ind);
      const isDomain = !isIp && !isHash && /\.[a-z]{2,}$/i.test(ind);
      if (!isIp && !isHash && !isDomain) return;

      map.set(lower, {
        id: `IOC-USR-${t.id}`,
        type: isIp ? 'IP Address' : isHash ? 'SHA-256 Hash' : 'Domain',
        value: ind,
        category: t.category,
        confidence: t.isDemo ? 'Simulated Record Indicator' : 'Analyst-Recorded Indicator',
        evidence: t.description.slice(0, 140),
        isSyntheticSample: Boolean(t.isDemo),
        associatedThreats: [t],
      });
    });

    return Array.from(map.values()).filter((item) => {
      if (typeFilter !== 'All' && item.type !== typeFilter) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        return (
          item.value.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.evidence.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [threats, typeFilter, query]);

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800/80">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Threat Intelligence &amp; IOC Directory
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Indicators of Compromise correlated across safe educational datasets and your active incident records.
        </p>
      </div>

      <div className="px-4 py-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 text-xs text-blue-900 dark:text-blue-200">
        <strong>Synthetic Educational Notice:</strong> Default IPs use IANA RFC 5737 documentation ranges (<code className="font-mono">192.0.2.0/24</code>, <code className="font-mono">198.51.100.0/24</code>, <code className="font-mono">203.0.113.0/24</code>), reserved <code className="font-mono">.example/.test</code> domains, and non-malicious test hashes. These are not real-world threat feeds.
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-wrap gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          {(['All', 'IP Address', 'Domain', 'SHA-256 Hash'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setTypeFilter(tab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                typeFilter === tab
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter IP, domain, hash..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {indicators.map((ioc) => {
          const Icon =
            ioc.type === 'IP Address'
              ? Network
              : ioc.type === 'Domain'
                ? Globe
                : Hash;
          return (
            <div
              key={ioc.id}
              className="p-5 rounded-xl bg-white/90 dark:bg-slate-900/70 glass-panel border border-slate-200 dark:border-slate-800 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Icon className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>{ioc.type}</span>
                    <span aria-hidden="true">·</span>
                    <span>{ioc.category}</span>
                  </div>
                  <div className="mt-1 font-mono text-sm font-semibold text-slate-900 dark:text-white break-all">
                    {ioc.value}
                  </div>
                </div>
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
                  {ioc.isSyntheticSample ? 'Synthetic Sample' : 'Local Record'}
                </span>
              </div>

              <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                <div>
                  <strong>Confidence:</strong> {ioc.confidence}
                </div>
                <div>
                  <strong>Evidence:</strong> {ioc.evidence}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                  Associated Incident Records ({ioc.associatedThreats.length})
                </div>
                {ioc.associatedThreats.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    No stored incidents currently reference this indicator. Load Demo Data or add a threat with this indicator to link them.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {ioc.associatedThreats.map((t) => (
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
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
