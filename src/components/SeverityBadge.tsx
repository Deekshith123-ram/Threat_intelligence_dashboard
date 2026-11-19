import React from 'react';
import { AlertOctagon, AlertTriangle, CheckCircle2, Info, ShieldAlert } from 'lucide-react';
import type { Severity, ThreatStatus } from '../types/security';

export const SeverityLabel: React.FC<{ severity: Severity | 'Info' }> = ({ severity }) => {
  const styles: Record<Severity | 'Info', string> = {
    Critical:
      'text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-300 dark:bg-rose-950/50 dark:border-rose-800/70',
    High:
      'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/50 dark:border-amber-800/70',
    Medium:
      'text-sky-700 bg-sky-50 border-sky-200 dark:text-sky-300 dark:bg-sky-950/50 dark:border-sky-800/70',
    Low:
      'text-slate-700 bg-slate-100 border-slate-200 dark:text-slate-300 dark:bg-slate-800/70 dark:border-slate-700',
    Info:
      'text-indigo-700 bg-indigo-50 border-indigo-200 dark:text-indigo-300 dark:bg-indigo-950/50 dark:border-indigo-800/70',
  };

  const Icon =
    severity === 'Critical'
      ? AlertOctagon
      : severity === 'High'
        ? ShieldAlert
        : severity === 'Medium'
          ? AlertTriangle
          : Info;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium border rounded-md whitespace-nowrap shrink-0 ${styles[severity]}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{severity}</span>
    </span>
  );
};

export const StatusLabel: React.FC<{ status: ThreatStatus }> = ({ status }) => {
  const styles: Record<ThreatStatus, string> = {
    Open: 'text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-300 dark:bg-rose-950/40 dark:border-rose-800/60',
    Investigating:
      'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-800/60',
    Resolved:
      'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800/60',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium border rounded-md whitespace-nowrap shrink-0 ${styles[status]}`}
    >
      {status === 'Resolved' && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
      <span>{status}</span>
    </span>
  );
};
