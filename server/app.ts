import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { runRulesBasedAnalysis } from '../src/utils/analyzerRules.js';
import type {
  AIAnalysisResult,
  ScanReport,
  SecurityAlert,
  Severity,
  ThreatCategory,
  ThreatRecord,
} from '../src/types/security.js';

const GEMINI_MODEL = 'gemini-4-hydrogen';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    return null;
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const VALID_SEVERITIES: Severity[] = ['Critical', 'High', 'Medium', 'Low'];
const VALID_CATEGORIES: ThreatCategory[] = [
  'Brute Force',
  'Phishing',
  'Privilege Escalation',
  'Malware Indicator',
  'Anomalous Access',
  'Credential Abuse',
  'Data Exfiltration',
  'Configuration Risk',
];

function sanitizeSeverity(val: unknown): Severity {
  if (typeof val === 'string' && VALID_SEVERITIES.includes(val as Severity)) {
    return val as Severity;
  }
  return 'Medium';
}

function sanitizeCategory(val: unknown): ThreatCategory {
  if (typeof val === 'string' && VALID_CATEGORIES.includes(val as ThreatCategory)) {
    return val as ThreatCategory;
  }
  return 'Anomalous Access';
}

export function createApiRouter() {
  const router = express.Router();
  router.use(express.json({ limit: '2mb' }));

  router.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'cyberguard-mini', timestamp: new Date().toISOString() });
  });

  router.get('/status', (_req, res) => {
    const geminiConfigured = Boolean(
      process.env.GEMINI_API_KEY?.trim() && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
    );
    const supabaseConfigured = Boolean(
      process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    );
    res.json({
      geminiConfigured,
      geminiModel: GEMINI_MODEL,
      supabaseConfigured,
      storageMode: supabaseConfigured ? 'supabase-postgres' : 'localstorage-demo',
    });
  });

  // Server-side AI Threat Analyzer
  router.post('/analyze', async (req, res) => {
    const { logText, incidentTitle, context, forceRulesDemo } = req.body ?? {};
    if (typeof logText !== 'string' || logText.trim().length < 5) {
      res.status(400).json({ error: 'Please provide security log text (minimum 5 characters).' });
      return;
    }

    if (forceRulesDemo) {
      const demoResult = runRulesBasedAnalysis(
        { logText, incidentTitle, context },
        'Rules-Based Demonstration Mode selected explicitly.'
      );
      res.json({ analysis: demoResult });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      const demoResult = runRulesBasedAnalysis(
        { logText, incidentTitle, context },
        'GEMINI_API_KEY is not configured on the server; using deterministic Rules-Based Demonstration Mode.'
      );
      res.json({
        analysis: demoResult,
        notice: 'Gemini API key unavailable; returned clearly labelled rules-based demonstration analysis.',
      });
      return;
    }

    try {
      const prompt = [
        'Analyze the following security log excerpt for a Security Operations Center (SOC) analyst.',
        incidentTitle ? `Incident Title Provided: ${incidentTitle}` : '',
        context ? `Additional Context: ${context}` : '',
        'Security Log Telemetry:',
        '```',
        logText.slice(0, 12000),
        '```',
        '',
        'Requirements:',
        '1. Identify suspicious security indicators (IPs, domains, usernames, processes, hashes).',
        '2. Choose the closest threatCategory from: Brute Force, Phishing, Privilege Escalation, Malware Indicator, Anomalous Access, Credential Abuse, Data Exfiltration, Configuration Risk.',
        '3. Determine severity: Critical, High, Medium, or Low.',
        '4. Estimate confidence (0-100) honestly. Never claim certainty where evidence is insufficient or ambiguous.',
        '5. List concrete evidence quotes from the log, recommended defensive actions, and possible false positives / uncertainty.',
        '6. Suggest relevant MITRE ATT&CK techniques ONLY where evidence in the log supports them (analytical suggestion, not proof).',
      ]
        .filter(Boolean)
        .join('\n');

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          systemInstruction:
            'You are a senior SOC cybersecurity analyst. Provide objective, evidence-grounded threat triage. Never fabricate log lines that are not present in the input. Always note uncertainty and false-positive possibilities when telemetry is incomplete.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              classification: { type: Type.STRING },
              threatCategory: { type: Type.STRING },
              severity: { type: Type.STRING },
              confidence: { type: Type.INTEGER },
              confidenceExplanation: { type: Type.STRING },
              indicatorsFound: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              evidence: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              technicalExplanation: { type: Type.STRING },
              recommendedActions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              falsePositivesAndUncertainty: { type: Type.STRING },
              mitreMappings: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    tactic: { type: Type.STRING },
                    techniqueId: { type: Type.STRING },
                    techniqueName: { type: Type.STRING },
                    rationale: { type: Type.STRING },
                  },
                  required: ['tactic', 'techniqueId', 'techniqueName', 'rationale'],
                },
              },
            },
            required: [
              'classification',
              'threatCategory',
              'severity',
              'confidence',
              'confidenceExplanation',
              'indicatorsFound',
              'evidence',
              'technicalExplanation',
              'recommendedActions',
              'falsePositivesAndUncertainty',
              'mitreMappings',
            ],
          },
        },
      });

      const rawText = (response.text ?? '').trim();
      const parsed = JSON.parse(rawText);

      const analysis: AIAnalysisResult = {
        id: `ANL-${Date.now().toString(36).toUpperCase()}`,
        incidentTitle:
          typeof incidentTitle === 'string' && incidentTitle.trim()
            ? incidentTitle.trim()
            : String(parsed.classification || 'Analyzed Security Telemetry'),
        rawLog: logText,
        context: typeof context === 'string' ? context.trim() : '',
        classification: String(parsed.classification || 'Security Telemetry Assessment'),
        threatCategory: sanitizeCategory(parsed.threatCategory),
        severity: sanitizeSeverity(parsed.severity),
        confidence: Math.max(0, Math.min(100, Number(parsed.confidence) || 50)),
        confidenceExplanation: String(parsed.confidenceExplanation || 'Confidence derived from available log context.'),
        indicatorsFound: Array.isArray(parsed.indicatorsFound) ? parsed.indicatorsFound.map(String) : [],
        evidence: Array.isArray(parsed.evidence) ? parsed.evidence.map(String) : [],
        technicalExplanation: String(parsed.technicalExplanation || ''),
        recommendedActions: Array.isArray(parsed.recommendedActions) ? parsed.recommendedActions.map(String) : [],
        falsePositivesAndUncertainty: String(parsed.falsePositivesAndUncertainty || ''),
        mitreMappings: Array.isArray(parsed.mitreMappings)
          ? parsed.mitreMappings.map((m: Record<string, unknown>) => ({
              tactic: String(m.tactic || ''),
              techniqueId: String(m.techniqueId || ''),
              techniqueName: String(m.techniqueName || ''),
              rationale: String(m.rationale || ''),
            }))
          : [],
        analysisMode: 'gemini-ai',
        analyzedAt: new Date().toISOString(),
      };

      res.json({ analysis });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gemini analysis request failed.';
      res.status(502).json({
        error: `Gemini API request failed: ${message}`,
        canUseRulesFallback: true,
      });
    }
  });

  // Supabase PostgreSQL persistence routes (server-side only, zero exposed service keys)
  router.get('/db/state', async (_req, res) => {
    const sb = getSupabaseClient();
    if (!sb) {
      res.status(503).json({ fallback: true, error: 'Supabase is not configured.' });
      return;
    }

    try {
      const [threatsRes, analysesRes, alertsRes, scansRes] = await Promise.all([
        sb.from('threats').select('*').order('detected_at', { ascending: false }),
        sb.from('analyses').select('*').order('analyzed_at', { ascending: false }),
        sb.from('alerts').select('*').order('created_at', { ascending: false }),
        sb.from('scan_history').select('*').order('scanned_at', { ascending: false }),
      ]);

      if (threatsRes.error) throw threatsRes.error;
      if (analysesRes.error) throw analysesRes.error;
      if (alertsRes.error) throw alertsRes.error;
      if (scansRes.error) throw scansRes.error;

      const threats: ThreatRecord[] = (threatsRes.data ?? []).map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        category: row.category,
        severity: row.severity,
        sourceIndicator: row.source_indicator,
        status: row.status,
        detectedAt: row.detected_at,
        recommendedAction: row.recommended_action,
        notes: row.notes,
        isDemo: row.is_demo,
      }));

      const analyses: AIAnalysisResult[] = (analysesRes.data ?? []).map((row) => ({
        id: row.id,
        incidentTitle: row.incident_title,
        rawLog: row.raw_log,
        context: row.context,
        classification: row.classification,
        threatCategory: row.threat_category,
        severity: row.severity,
        confidence: row.confidence,
        confidenceExplanation: row.confidence_explanation,
        indicatorsFound: row.indicators_found ?? [],
        evidence: row.evidence ?? [],
        technicalExplanation: row.technical_explanation,
        recommendedActions: row.recommended_actions ?? [],
        falsePositivesAndUncertainty: row.false_positives_and_uncertainty,
        mitreMappings: row.mitre_mappings ?? [],
        analysisMode: row.analysis_mode,
        convertedThreatId: row.converted_threat_id ?? undefined,
        isDemo: row.is_demo,
        analyzedAt: row.analyzed_at,
      }));

      const alerts: SecurityAlert[] = (alertsRes.data ?? []).map((row) => ({
        id: row.id,
        threatId: row.threat_id,
        title: row.title,
        message: row.message,
        severity: row.severity,
        isRead: row.is_read,
        isDemo: row.is_demo,
        createdAt: row.created_at,
      }));

      const scanHistory: ScanReport[] = (scansRes.data ?? []).map((row) => ({
        id: row.id,
        sourceName: row.source_name,
        sourceType: row.source_type,
        fileSizeBytes: row.file_size_bytes,
        linesScanned: row.lines_scanned,
        overallSeverity: row.overall_severity,
        findings: row.findings ?? [],
        summary: row.summary,
        isDemo: row.is_demo,
        scannedAt: row.scanned_at,
      }));

      res.json({ threats, analyses, alerts, scanHistory });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load Supabase data.';
      res.status(500).json({ error: msg });
    }
  });

  router.post('/db/threats', async (req, res) => {
    const sb = getSupabaseClient();
    if (!sb) {
      res.status(503).json({ fallback: true });
      return;
    }
    const t: ThreatRecord = req.body;
    const { error } = await sb.from('threats').upsert({
      id: t.id,
      title: t.title,
      description: t.description,
      category: t.category,
      severity: t.severity,
      source_indicator: t.sourceIndicator,
      status: t.status,
      detected_at: t.detectedAt,
      recommended_action: t.recommendedAction,
      notes: t.notes,
      is_demo: Boolean(t.isDemo),
      updated_at: new Date().toISOString(),
    });
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ ok: true });
  });

  router.delete('/db/threats/:id', async (req, res) => {
    const sb = getSupabaseClient();
    if (!sb) {
      res.status(503).json({ fallback: true });
      return;
    }
    const { error } = await sb.from('threats').delete().eq('id', req.params.id);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ ok: true });
  });

  router.post('/db/analyses', async (req, res) => {
    const sb = getSupabaseClient();
    if (!sb) {
      res.status(503).json({ fallback: true });
      return;
    }
    const a: AIAnalysisResult = req.body;
    const { error } = await sb.from('analyses').upsert({
      id: a.id,
      incident_title: a.incidentTitle,
      raw_log: a.rawLog,
      context: a.context,
      classification: a.classification,
      threat_category: a.threatCategory,
      severity: a.severity,
      confidence: a.confidence,
      confidence_explanation: a.confidenceExplanation,
      indicators_found: a.indicatorsFound,
      evidence: a.evidence,
      technical_explanation: a.technicalExplanation,
      recommended_actions: a.recommendedActions,
      false_positives_and_uncertainty: a.falsePositivesAndUncertainty,
      mitre_mappings: a.mitreMappings,
      analysis_mode: a.analysisMode,
      converted_threat_id: a.convertedThreatId ?? null,
      is_demo: Boolean(a.isDemo),
      analyzed_at: a.analyzedAt,
    });
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ ok: true });
  });

  router.post('/db/alerts', async (req, res) => {
    const sb = getSupabaseClient();
    if (!sb) {
      res.status(503).json({ fallback: true });
      return;
    }
    const al: SecurityAlert = req.body;
    const { error } = await sb.from('alerts').upsert({
      id: al.id,
      threat_id: al.threatId,
      title: al.title,
      message: al.message,
      severity: al.severity,
      is_read: al.isRead,
      is_demo: Boolean(al.isDemo),
      created_at: al.createdAt,
    });
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ ok: true });
  });

  router.post('/db/alerts/mark-all-read', async (_req, res) => {
    const sb = getSupabaseClient();
    if (!sb) {
      res.status(503).json({ fallback: true });
      return;
    }
    const { error } = await sb.from('alerts').update({ is_read: true }).eq('is_read', false);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ ok: true });
  });

  router.post('/db/scans', async (req, res) => {
    const sb = getSupabaseClient();
    if (!sb) {
      res.status(503).json({ fallback: true });
      return;
    }
    const s: ScanReport = req.body;
    const { error } = await sb.from('scan_history').upsert({
      id: s.id,
      source_name: s.sourceName,
      source_type: s.sourceType,
      file_size_bytes: s.fileSizeBytes,
      lines_scanned: s.linesScanned,
      overall_severity: s.overallSeverity,
      findings: s.findings,
      summary: s.summary,
      is_demo: Boolean(s.isDemo),
      scanned_at: s.scannedAt,
    });
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ ok: true });
  });

  router.post('/db/bulk-sync', async (req, res) => {
    const sb = getSupabaseClient();
    if (!sb) {
      res.status(503).json({ fallback: true });
      return;
    }
    const { threats = [], analyses = [], alerts = [], scanHistory = [], replace = false } = req.body ?? {};
    try {
      if (replace) {
        await sb.from('alerts').delete().neq('id', '');
        await sb.from('analyses').delete().neq('id', '');
        await sb.from('scan_history').delete().neq('id', '');
        await sb.from('threats').delete().neq('id', '');
      }

      if (threats.length > 0) {
        const { error } = await sb.from('threats').upsert(
          threats.map((t: ThreatRecord) => ({
            id: t.id,
            title: t.title,
            description: t.description,
            category: t.category,
            severity: t.severity,
            source_indicator: t.sourceIndicator,
            status: t.status,
            detected_at: t.detectedAt,
            recommended_action: t.recommendedAction,
            notes: t.notes,
            is_demo: Boolean(t.isDemo),
          }))
        );
        if (error) throw error;
      }

      if (analyses.length > 0) {
        const { error } = await sb.from('analyses').upsert(
          analyses.map((a: AIAnalysisResult) => ({
            id: a.id,
            incident_title: a.incidentTitle,
            raw_log: a.rawLog,
            context: a.context,
            classification: a.classification,
            threat_category: a.threatCategory,
            severity: a.severity,
            confidence: a.confidence,
            confidence_explanation: a.confidenceExplanation,
            indicators_found: a.indicatorsFound,
            evidence: a.evidence,
            technical_explanation: a.technicalExplanation,
            recommended_actions: a.recommendedActions,
            false_positives_and_uncertainty: a.falsePositivesAndUncertainty,
            mitre_mappings: a.mitreMappings,
            analysis_mode: a.analysisMode,
            converted_threat_id: a.convertedThreatId ?? null,
            is_demo: Boolean(a.isDemo),
            analyzed_at: a.analyzedAt,
          }))
        );
        if (error) throw error;
      }

      if (alerts.length > 0) {
        const { error } = await sb.from('alerts').upsert(
          alerts.map((al: SecurityAlert) => ({
            id: al.id,
            threat_id: al.threatId,
            title: al.title,
            message: al.message,
            severity: al.severity,
            is_read: al.isRead,
            is_demo: Boolean(al.isDemo),
            created_at: al.createdAt,
          }))
        );
        if (error) throw error;
      }

      if (scanHistory.length > 0) {
        const { error } = await sb.from('scan_history').upsert(
          scanHistory.map((s: ScanReport) => ({
            id: s.id,
            source_name: s.sourceName,
            source_type: s.sourceType,
            file_size_bytes: s.fileSizeBytes,
            lines_scanned: s.linesScanned,
            overall_severity: s.overallSeverity,
            findings: s.findings,
            summary: s.summary,
            is_demo: Boolean(s.isDemo),
            scanned_at: s.scannedAt,
          }))
        );
        if (error) throw error;
      }

      res.json({ ok: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Bulk sync failed.';
      res.status(500).json({ error: msg });
    }
  });

  return router;
}
