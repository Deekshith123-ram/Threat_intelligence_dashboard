import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Edit3,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { SeverityLabel, StatusLabel } from '../components/SeverityBadge';
import { type ThreatDraft, useSecurity } from '../context/SecurityContext';
import {
  SEVERITIES,
  THREAT_CATEGORIES,
  type Severity,
  type ThreatCategory,
  type ThreatRecord,
  type ThreatStatus,
} from '../types/security';

const EMPTY_DRAFT: ThreatDraft = {
  title: '',
  description: '',
  category: 'Brute Force',
  severity: 'High',
  sourceIndicator: '',
  status: 'Open',
  recommendedAction: '',
  notes: '',
};

export const ThreatManagerView: React.FC = () => {
  const {
    threats,
    addThreat,
    updateThreat,
    deleteThreat,
    toggleResolveThreat,
    focusedThreatId,
    setFocusedThreatId,
  } = useSecurity();

  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'All' | Severity>('All');
  const [categoryFilter, setCategoryFilter] = useState<'All' | ThreatCategory>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | ThreatStatus>('All');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const [selectedThreat, setSelectedThreat] = useState<ThreatRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ThreatDraft>(EMPTY_DRAFT);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (focusedThreatId) {
      const match = threats.find((t) => t.id === focusedThreatId);
      if (match) {
        setSelectedThreat(match);
      }
      setFocusedThreatId(null);
    }
  }, [focusedThreatId, setFocusedThreatId, threats]);

  // Keep selectedThreat synced when underlying record updates or resolves
  useEffect(() => {
    if (selectedThreat) {
      const latest = threats.find((t) => t.id === selectedThreat.id) ?? null;
      setSelectedThreat(latest);
    }
  }, [threats, selectedThreat]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return threats
      .filter((t) => {
        if (severityFilter !== 'All' && t.severity !== severityFilter) return false;
        if (categoryFilter !== 'All' && t.category !== categoryFilter) return false;
        if (statusFilter !== 'All' && t.status !== statusFilter) return false;
        if (q) {
          const hay = `${t.id} ${t.title} ${t.description} ${t.sourceIndicator} ${t.notes}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const diff = new Date(a.detectedAt).getTime() - new Date(b.detectedAt).getTime();
        return sortOrder === 'newest' ? -diff : diff;
      });
  }, [threats, searchQuery, severityFilter, categoryFilter, statusFilter, sortOrder]);

  const openAddModal = () => {
    setEditingId(null);
    setForm(EMPTY_DRAFT);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (t: ThreatRecord) => {
    setEditingId(t.id);
    setForm({
      title: t.title,
      description: t.description,
      category: t.category,
      severity: t.severity,
      sourceIndicator: t.sourceIndicator,
      status: t.status,
      recommendedAction: t.recommendedAction,
      notes: t.notes,
      detectedAt: t.detectedAt,
      isDemo: t.isDemo,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.title.trim().length < 3) {
      setFormError('Threat title must be at least 3 characters.');
      return;
    }
    if (form.description.trim().length < 5) {
      setFormError('Please provide a brief description of the threat.');
      return;
    }

    if (editingId) {
      const existing = threats.find((t) => t.id === editingId);
      if (existing) {
        await updateThreat({
          ...existing,
          ...form,
          title: form.title.trim(),
          description: form.description.trim(),
          sourceIndicator: form.sourceIndicator.trim(),
          recommendedAction: form.recommendedAction.trim(),
          notes: form.notes.trim(),
        });
      }
    } else {
      const created = await addThreat(form);
      setSelectedThreat(created);
    }

    setIsModalOpen(false);
  };

  const handleConfirmDelete = async (id: string) => {
    await deleteThreat(id);
    setConfirmDeleteId(null);
    if (selectedThreat?.id === id) {
      setSelectedThreat(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800/80">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Threat Manager
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Create, triage, resolve, and audit threat records. High and Critical entries automatically generate Security Alerts.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Threat</span>
        </button>
      </div>

      {/* Filters & Search Bar */}
      <div className="p-4 rounded-xl bg-white/90 dark:bg-slate-900/70 glass-panel border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="relative lg:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ID, title, indicator, notes..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
          />
        </div>

        <select
          aria-label="Filter by severity"
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value as 'All' | Severity)}
          className="px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
        >
          <option value="All">All Severities</option>
          {SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by category"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as 'All' | ThreatCategory)}
          className="px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
        >
          <option value="All">All Categories</option>
          {THREAT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'All' | ThreatStatus)}
            className="flex-1 px-2.5 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
          >
            <option value="All">All Statuses</option>
            <option value="Open">Open</option>
            <option value="Investigating">Investigating</option>
            <option value="Resolved">Resolved</option>
          </select>

          <select
            aria-label="Sort by date"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
            className="px-2.5 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>
      </div>

      {/* Main Table + Detail Drawer Split */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className={`${selectedThreat ? 'xl:col-span-7' : 'xl:col-span-12'} rounded-xl bg-white/90 dark:bg-slate-900/70 glass-panel border border-slate-200 dark:border-slate-800 overflow-hidden`}>
          {filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">
              No threat records match the active filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-4">Threat</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Severity</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Detected</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  {filtered.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedThreat(t)}
                      className={`cursor-pointer transition-colors ${
                        selectedThreat?.id === t.id
                          ? 'bg-blue-50/70 dark:bg-blue-950/30'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                          {t.title}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                          {t.id} · {t.sourceIndicator || 'No indicator'}
                          {t.isDemo ? ' · Simulated' : ''}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {t.category}
                      </td>
                      <td className="py-3 px-3">
                        <SeverityLabel severity={t.severity} />
                      </td>
                      <td className="py-3 px-3">
                        <StatusLabel status={t.status} />
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {new Date(t.detectedAt).toLocaleDateString()}
                      </td>
                      <td
                        className="py-3 px-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => void toggleResolveThreat(t.id)}
                            title={t.status === 'Resolved' ? 'Reopen threat' : 'Mark resolved'}
                            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                          >
                            {t.status === 'Resolved' ? (
                              <RotateCcw className="w-3.5 h-3.5" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(t)}
                            title="Edit threat"
                            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(t.id)}
                            title="Delete threat"
                            className="p-1.5 rounded hover:bg-rose-100 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Threat Detail Inspector */}
        {selectedThreat && (
          <aside className="xl:col-span-5 p-5 rounded-xl bg-white/90 dark:bg-slate-900/70 glass-panel border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  {selectedThreat.id}
                  {selectedThreat.isDemo ? ' · Simulated Demo Record' : ''}
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedThreat.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedThreat(null)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                aria-label="Close threat details"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <SeverityLabel severity={selectedThreat.severity} />
              <StatusLabel status={selectedThreat.status} />
              <span className="text-xs text-slate-600 dark:text-slate-300">
                {selectedThreat.category}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-xs">
              <div>
                <div className="text-slate-500 dark:text-slate-400">Source Indicator</div>
                <div className="font-mono text-slate-900 dark:text-slate-100 mt-0.5 break-all">
                  {selectedThreat.sourceIndicator || 'Not specified'}
                </div>
              </div>
              <div>
                <div className="text-slate-500 dark:text-slate-400">Detection Timestamp</div>
                <div className="font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
                  {new Date(selectedThreat.detectedAt).toLocaleString()}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Description
              </h3>
              <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                {selectedThreat.description}
              </p>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Recommended Action
              </h3>
              <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                {selectedThreat.recommendedAction || 'No action specified yet.'}
              </p>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Analyst Notes
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                {selectedThreat.notes || 'No analyst notes recorded.'}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void toggleResolveThreat(selectedThreat.id)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
              >
                {selectedThreat.status === 'Resolved' ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reopen Threat</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Mark Resolved</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => openEditModal(selectedThreat)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteId(selectedThreat.id)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* Add / Edit Threat Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingId ? `Edit Threat ${editingId}` : 'Add New Threat Record'}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Threat Title
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Unauthorized Admin Login Attempt"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value as ThreatCategory })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    {THREAT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Severity
                  </label>
                  <select
                    value={form.severity}
                    onChange={(e) => setForm({ ...form, severity: e.target.value as Severity })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    {SEVERITIES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value as ThreatStatus })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="Open">Open</option>
                    <option value="Investigating">Investigating</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Source Indicator (IP, Domain, Hash, Host)
                </label>
                <input
                  type="text"
                  value={form.sourceIndicator}
                  onChange={(e) => setForm({ ...form, sourceIndicator: e.target.value })}
                  placeholder="e.g. 198.51.100.42 or suspicious-login.example"
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  required
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Recommended Action
                </label>
                <input
                  type="text"
                  value={form.recommendedAction}
                  onChange={(e) => setForm({ ...form, recommendedAction: e.target.value })}
                  placeholder="e.g. Rotate service credentials and enforce MFA"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Analyst Notes
                </label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              {formError && (
                <div className="text-xs text-rose-600 dark:text-rose-400">{formError}</div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
                >
                  {editingId ? 'Save Changes' : 'Create Threat Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Delete Threat Record?
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Are you sure you want to permanently remove <span className="font-mono">{confirmDeleteId}</span> and any linked alerts?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmDelete(confirmDeleteId)}
                className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
