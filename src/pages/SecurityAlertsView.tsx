import React, { useMemo, useState } from 'react';
import { Bell, CheckCheck, ExternalLink, MailOpen } from 'lucide-react';
import { SeverityLabel } from '../components/SeverityBadge';
import { useSecurity } from '../context/SecurityContext';
import type { Severity } from '../types/security';

export const SecurityAlertsView: React.FC = () => {
  const { alerts, markAlertRead, markAllAlertsRead, openThreatInManager } = useSecurity();
  const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [severityFilter, setSeverityFilter] = useState<'All' | Severity>('All');

  const filtered = useMemo(() => {
    return alerts.filter((a) => {
      if (readFilter === 'unread' && a.isRead) return false;
      if (readFilter === 'read' && !a.isRead) return false;
      if (severityFilter !== 'All' && a.severity !== severityFilter) return false;
      return true;
    });
  }, [alerts, readFilter, severityFilter]);

  const unreadCount = alerts.filter((a) => !a.isRead).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800/80">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Security Alerts Centre
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Automatically triggered whenever a High or Critical threat record is created or promoted from analysis.
          </p>
        </div>

        <button
          type="button"
          disabled={unreadCount === 0}
          onClick={() => void markAllAlertsRead()}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <CheckCheck className="w-4 h-4" />
          <span>Mark All Read ({unreadCount})</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          {(['all', 'unread', 'read'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setReadFilter(tab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors cursor-pointer ${
                readFilter === tab
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <select
          aria-label="Filter alerts by severity"
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value as 'All' | Severity)}
          className="px-3 py-2 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
        >
          <option value="All">All Severities</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="p-10 rounded-xl bg-white/90 dark:bg-slate-900/70 glass-panel border border-slate-200 dark:border-slate-800 text-center">
          <Bell className="w-9 h-9 mx-auto text-slate-400 mb-3" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            No Alerts Match Current Filters
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Add a High or Critical threat in Threat Manager or load demo data to inspect alert workflows.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-xl glass-panel border transition-colors ${
                alert.isRead
                  ? 'bg-white/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/80'
                  : 'bg-white dark:bg-slate-900/90 border-blue-300 dark:border-blue-700/70'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityLabel severity={alert.severity} />
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      {alert.id}
                    </span>
                    <span aria-hidden="true" className="text-slate-400">
                      ·
                    </span>
                    <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      {new Date(alert.createdAt).toLocaleString()}
                    </span>
                    {!alert.isRead && (
                      <>
                        <span aria-hidden="true" className="text-slate-400">
                          ·
                        </span>
                        <span className="text-xs font-semibold text-blue-600 dark:text-cyan-400">
                          Unread
                        </span>
                      </>
                    )}
                    {alert.isDemo && (
                      <>
                        <span aria-hidden="true" className="text-slate-400">
                          ·
                        </span>
                        <span className="text-xs text-slate-500">Simulated</span>
                      </>
                    )}
                  </div>

                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    {alert.title}
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {alert.message}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => openThreatInManager(alert.threatId)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer whitespace-nowrap"
                  >
                    <span>Open {alert.threatId}</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>

                  <button
                    type="button"
                    onClick={() => void markAlertRead(alert.id, !alert.isRead)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer whitespace-nowrap"
                  >
                    <MailOpen className="w-3.5 h-3.5" />
                    <span>{alert.isRead ? 'Mark Unread' : 'Mark Read'}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
