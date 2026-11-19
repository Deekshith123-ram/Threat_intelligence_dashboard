import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { createDemoDataset } from '../data/demoData';
import type {
  AIAnalysisResult,
  NavSection,
  ScannerFinding,
  ScanReport,
  SecurityAlert,
  Severity,
  SystemStatus,
  ThreatCategory,
  ThreatRecord,
  ThreatStatus,
} from '../types/security';

const STORAGE_KEYS = {
  threats: 'cyberguard_mini_threats_v1',
  analyses: 'cyberguard_mini_analyses_v1',
  alerts: 'cyberguard_mini_alerts_v1',
  scans: 'cyberguard_mini_scans_v1',
  theme: 'cyberguard_mini_theme_v1',
} as const;

export type ThemeMode = 'dark' | 'light';

export interface ThreatDraft {
  title: string;
  description: string;
  category: ThreatCategory;
  severity: Severity;
  sourceIndicator: string;
  status: ThreatStatus;
  recommendedAction: string;
  notes: string;
  detectedAt?: string;
  isDemo?: boolean;
}

interface SecurityContextValue {
  threats: ThreatRecord[];
  analyses: AIAnalysisResult[];
  alerts: SecurityAlert[];
  scanHistory: ScanReport[];
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  systemStatus: SystemStatus;
  refreshStatus: () => Promise<void>;
  isLoading: boolean;
  storageNotice: string | null;
  activeNav: NavSection;
  setActiveNav: (nav: NavSection) => void;
  focusedThreatId: string | null;
  setFocusedThreatId: (id: string | null) => void;
  openThreatInManager: (threatId: string) => void;
  addThreat: (draft: ThreatDraft) => Promise<ThreatRecord>;
  updateThreat: (record: ThreatRecord) => Promise<void>;
  deleteThreat: (id: string) => Promise<void>;
  toggleResolveThreat: (id: string) => Promise<void>;
  saveAnalysis: (analysis: AIAnalysisResult) => Promise<void>;
  convertAnalysisToThreat: (analysisId: string) => Promise<ThreatRecord | null>;
  saveScanReport: (report: ScanReport) => Promise<void>;
  promoteFindingToThreat: (finding: ScannerFinding, sourceName: string) => Promise<ThreatRecord>;
  markAlertRead: (alertId: string, isRead: boolean) => Promise<void>;
  markAllAlertsRead: () => Promise<void>;
  loadDemoData: () => Promise<void>;
  resetDemoData: () => Promise<void>;
  clearAllData: () => Promise<void>;
  importWorkspaceData: (rawJson: string) => Promise<{ ok: boolean; message: string }>;
}

const SecurityContext = createContext<SecurityContextValue | null>(null);

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export const SecurityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [threats, setThreats] = useState<ThreatRecord[]>(() =>
    readLocal<ThreatRecord[]>(STORAGE_KEYS.threats, [])
  );
  const [analyses, setAnalyses] = useState<AIAnalysisResult[]>(() =>
    readLocal<AIAnalysisResult[]>(STORAGE_KEYS.analyses, [])
  );
  const [alerts, setAlerts] = useState<SecurityAlert[]>(() =>
    readLocal<SecurityAlert[]>(STORAGE_KEYS.alerts, [])
  );
  const [scanHistory, setScanHistory] = useState<ScanReport[]>(() =>
    readLocal<ScanReport[]>(STORAGE_KEYS.scans, [])
  );

  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.theme);
    return saved === 'light' ? 'light' : 'dark';
  });

  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    geminiConfigured: false,
    geminiModel: 'gemini-4-hydrogen',
    supabaseConfigured: false,
    storageMode: 'localstorage-demo',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [storageNotice, setStorageNotice] = useState<string | null>(null);
  const [activeNav, setActiveNav] = useState<NavSection>('dashboard');
  const [focusedThreatId, setFocusedThreatId] = useState<string | null>(null);

  // Sync Tailwind v4 .dark class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(STORAGE_KEYS.theme, theme);
  }, [theme]);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  // Persist local cache whenever collections update
  useEffect(() => {
    writeLocal(STORAGE_KEYS.threats, threats);
  }, [threats]);

  useEffect(() => {
    writeLocal(STORAGE_KEYS.analyses, analyses);
  }, [analyses]);

  useEffect(() => {
    writeLocal(STORAGE_KEYS.alerts, alerts);
  }, [alerts]);

  useEffect(() => {
    writeLocal(STORAGE_KEYS.scans, scanHistory);
  }, [scanHistory]);

  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const status = (await res.json()) as SystemStatus;
        setSystemStatus(status);
        if (status.supabaseConfigured) {
          const dbRes = await fetch('/api/db/state');
          if (dbRes.ok) {
            const payload = await dbRes.json();
            setThreats(payload.threats ?? []);
            setAnalyses(payload.analyses ?? []);
            setAlerts(payload.alerts ?? []);
            setScanHistory(payload.scanHistory ?? []);
            setStorageNotice(null);
          } else {
            setStorageNotice('Supabase configured, but query fell back to browser localStorage.');
          }
        }
      }
    } catch {
      // Offline or local-only mode: retain localStorage gracefully
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const syncSupabase = useCallback(
    async (path: string, method: 'POST' | 'DELETE', body?: unknown) => {
      if (!systemStatus.supabaseConfigured) return;
      try {
        await fetch(path, {
          method,
          headers: body ? { 'Content-Type': 'application/json' } : undefined,
          body: body ? JSON.stringify(body) : undefined,
        });
      } catch {
        // Keep UI responsive and local cache intact if network temporarily drops
      }
    },
    [systemStatus.supabaseConfigured]
  );

  const maybeCreateAlertForThreat = useCallback(
    async (threat: ThreatRecord): Promise<SecurityAlert | null> => {
      if (threat.severity !== 'Critical' && threat.severity !== 'High') {
        return null;
      }
      const alert: SecurityAlert = {
        id: `ALT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
        threatId: threat.id,
        title: `${threat.severity} Threat Detected: ${threat.title}`,
        message: `${threat.category} (${threat.sourceIndicator || 'No source indicator'}) — ${threat.recommendedAction || threat.description}`,
        severity: threat.severity,
        isRead: false,
        isDemo: threat.isDemo,
        createdAt: new Date().toISOString(),
      };
      setAlerts((prev) => [alert, ...prev]);
      await syncSupabase('/api/db/alerts', 'POST', alert);
      return alert;
    },
    [syncSupabase]
  );

  const openThreatInManager = useCallback((threatId: string) => {
    setFocusedThreatId(threatId);
    setActiveNav('threats');
  }, []);

  const addThreat = useCallback(
    async (draft: ThreatDraft): Promise<ThreatRecord> => {
      const record: ThreatRecord = {
        id: `THR-${Date.now().toString(36).toUpperCase()}`,
        title: draft.title.trim(),
        description: draft.description.trim(),
        category: draft.category,
        severity: draft.severity,
        sourceIndicator: draft.sourceIndicator.trim(),
        status: draft.status,
        detectedAt: draft.detectedAt || new Date().toISOString(),
        recommendedAction: draft.recommendedAction.trim(),
        notes: draft.notes.trim(),
        isDemo: draft.isDemo,
      };
      setThreats((prev) => [record, ...prev]);
      await syncSupabase('/api/db/threats', 'POST', record);
      await maybeCreateAlertForThreat(record);
      return record;
    },
    [maybeCreateAlertForThreat, syncSupabase]
  );

  const updateThreat = useCallback(
    async (record: ThreatRecord) => {
      setThreats((prev) => prev.map((t) => (t.id === record.id ? record : t)));
      await syncSupabase('/api/db/threats', 'POST', record);

      const hasExistingAlert = alerts.some((a) => a.threatId === record.id);
      if (!hasExistingAlert && (record.severity === 'Critical' || record.severity === 'High')) {
        await maybeCreateAlertForThreat(record);
      }
    },
    [alerts, maybeCreateAlertForThreat, syncSupabase]
  );

  const deleteThreat = useCallback(
    async (id: string) => {
      setThreats((prev) => prev.filter((t) => t.id !== id));
      setAlerts((prev) => prev.filter((a) => a.threatId !== id));
      await syncSupabase(`/api/db/threats/${encodeURIComponent(id)}`, 'DELETE');
    },
    [syncSupabase]
  );

  const toggleResolveThreat = useCallback(
    async (id: string) => {
      const target = threats.find((t) => t.id === id);
      if (!target) return;
      const updated: ThreatRecord = {
        ...target,
        status: target.status === 'Resolved' ? 'Open' : 'Resolved',
      };
      setThreats((prev) => prev.map((t) => (t.id === id ? updated : t)));
      await syncSupabase('/api/db/threats', 'POST', updated);
    },
    [syncSupabase, threats]
  );

  const saveAnalysis = useCallback(
    async (analysis: AIAnalysisResult) => {
      setAnalyses((prev) => [analysis, ...prev]);
      await syncSupabase('/api/db/analyses', 'POST', analysis);
    },
    [syncSupabase]
  );

  const convertAnalysisToThreat = useCallback(
    async (analysisId: string): Promise<ThreatRecord | null> => {
      const analysis = analyses.find((a) => a.id === analysisId);
      if (!analysis) return null;

      if (analysis.convertedThreatId) {
        const existing = threats.find((t) => t.id === analysis.convertedThreatId);
        if (existing) return existing;
      }

      const created = await addThreat({
        title: analysis.incidentTitle || analysis.classification,
        description: analysis.technicalExplanation,
        category: analysis.threatCategory,
        severity: analysis.severity,
        sourceIndicator: analysis.indicatorsFound[0] || 'Analyzed Log Telemetry',
        status: 'Open',
        recommendedAction: analysis.recommendedActions.join(' '),
        notes: `Converted from ${analysis.analysisMode === 'gemini-ai' ? 'Gemini AI' : 'Rules-Based Demo'} analysis (${analysis.id}, confidence ${analysis.confidence}%). ${analysis.falsePositivesAndUncertainty}`,
        isDemo: analysis.isDemo,
      });

      const updatedAnalysis: AIAnalysisResult = {
        ...analysis,
        convertedThreatId: created.id,
      };
      setAnalyses((prev) => prev.map((a) => (a.id === analysisId ? updatedAnalysis : a)));
      await syncSupabase('/api/db/analyses', 'POST', updatedAnalysis);
      return created;
    },
    [addThreat, analyses, syncSupabase, threats]
  );

  const saveScanReport = useCallback(
    async (report: ScanReport) => {
      setScanHistory((prev) => [report, ...prev]);
      await syncSupabase('/api/db/scans', 'POST', report);
    },
    [syncSupabase]
  );

  const promoteFindingToThreat = useCallback(
    async (finding: ScannerFinding, sourceName: string): Promise<ThreatRecord> => {
      return addThreat({
        title: `${finding.ruleName} in ${sourceName}`,
        description: `${finding.explanation} Matched excerpt: ${finding.matchedText}`,
        category: finding.category,
        severity: finding.severity,
        sourceIndicator: `${sourceName}:L${finding.lineNumber}`,
        status: 'Open',
        recommendedAction: finding.recommendation,
        notes: finding.mitreId
          ? `Promoted from Security Scanner finding. Analytical MITRE reference: ${finding.mitreId}.`
          : 'Promoted from Security Scanner finding.',
      });
    },
    [addThreat]
  );

  const markAlertRead = useCallback(
    async (alertId: string, isRead: boolean) => {
      const target = alerts.find((a) => a.id === alertId);
      if (!target) return;
      const updated = { ...target, isRead };
      setAlerts((prev) => prev.map((a) => (a.id === alertId ? updated : a)));
      await syncSupabase('/api/db/alerts', 'POST', updated);
    },
    [alerts, syncSupabase]
  );

  const markAllAlertsRead = useCallback(async () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })));
    if (systemStatus.supabaseConfigured) {
      await syncSupabase('/api/db/alerts/mark-all-read', 'POST');
    }
  }, [syncSupabase, systemStatus.supabaseConfigured]);

  const loadDemoData = useCallback(async () => {
    const demo = createDemoDataset();
    setThreats((prev) => {
      const nonDemo = prev.filter((t) => !t.isDemo);
      return [...demo.threats, ...nonDemo];
    });
    setAnalyses((prev) => {
      const nonDemo = prev.filter((a) => !a.isDemo);
      return [...demo.analyses, ...nonDemo];
    });
    setAlerts((prev) => {
      const nonDemo = prev.filter((a) => !a.isDemo);
      return [...demo.alerts, ...nonDemo];
    });
    setScanHistory((prev) => {
      const nonDemo = prev.filter((s) => !s.isDemo);
      return [...demo.scanHistory, ...nonDemo];
    });
    await syncSupabase('/api/db/bulk-sync', 'POST', { ...demo, replace: false });
  }, [syncSupabase]);

  const resetDemoData = useCallback(async () => {
    const demo = createDemoDataset();
    setThreats(demo.threats);
    setAnalyses(demo.analyses);
    setAlerts(demo.alerts);
    setScanHistory(demo.scanHistory);
    await syncSupabase('/api/db/bulk-sync', 'POST', { ...demo, replace: true });
  }, [syncSupabase]);

  const clearAllData = useCallback(async () => {
    setThreats([]);
    setAnalyses([]);
    setAlerts([]);
    setScanHistory([]);
    await syncSupabase('/api/db/bulk-sync', 'POST', {
      threats: [],
      analyses: [],
      alerts: [],
      scanHistory: [],
      replace: true,
    });
  }, [syncSupabase]);

  const importWorkspaceData = useCallback(
    async (rawJson: string): Promise<{ ok: boolean; message: string }> => {
      try {
        const parsed = JSON.parse(rawJson);
        if (!Array.isArray(parsed.threats)) {
          return { ok: false, message: 'Invalid backup JSON: missing threats array.' };
        }
        const nextThreats = parsed.threats as ThreatRecord[];
        const nextAnalyses = Array.isArray(parsed.analyses) ? (parsed.analyses as AIAnalysisResult[]) : [];
        const nextAlerts = Array.isArray(parsed.alerts) ? (parsed.alerts as SecurityAlert[]) : [];
        const nextScans = Array.isArray(parsed.scanHistory) ? (parsed.scanHistory as ScanReport[]) : [];

        setThreats(nextThreats);
        setAnalyses(nextAnalyses);
        setAlerts(nextAlerts);
        setScanHistory(nextScans);
        await syncSupabase('/api/db/bulk-sync', 'POST', {
          threats: nextThreats,
          analyses: nextAnalyses,
          alerts: nextAlerts,
          scanHistory: nextScans,
          replace: true,
        });
        return { ok: true, message: `Imported ${nextThreats.length} threat record(s) successfully.` };
      } catch (err) {
        return {
          ok: false,
          message: err instanceof Error ? err.message : 'Failed to parse JSON backup.',
        };
      }
    },
    [syncSupabase]
  );

  return (
    <SecurityContext.Provider
      value={{
        threats,
        analyses,
        alerts,
        scanHistory,
        theme,
        setTheme,
        toggleTheme,
        systemStatus,
        refreshStatus,
        isLoading,
        storageNotice,
        activeNav,
        setActiveNav,
        focusedThreatId,
        setFocusedThreatId,
        openThreatInManager,
        addThreat,
        updateThreat,
        deleteThreat,
        toggleResolveThreat,
        saveAnalysis,
        convertAnalysisToThreat,
        saveScanReport,
        promoteFindingToThreat,
        markAlertRead,
        markAllAlertsRead,
        loadDemoData,
        resetDemoData,
        clearAllData,
        importWorkspaceData,
      }}
    >
      {children}
    </SecurityContext.Provider>
  );
};

export function useSecurity(): SecurityContextValue {
  const ctx = useContext(SecurityContext);
  if (!ctx) {
    throw new Error('useSecurity must be used inside SecurityProvider');
  }
  return ctx;
}
