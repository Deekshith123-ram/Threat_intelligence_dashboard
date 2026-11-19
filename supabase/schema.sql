-- CyberGuard Mini PostgreSQL / Supabase Schema
-- Safe for classroom capstone demonstration and production persistence.
-- Run this SQL inside your Supabase SQL Editor.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Threats table
CREATE TABLE IF NOT EXISTS public.threats (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('Critical', 'High', 'Medium', 'Low')),
  source_indicator TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('Open', 'Investigating', 'Resolved')) DEFAULT 'Open',
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recommended_action TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_threats_severity ON public.threats (severity);
CREATE INDEX IF NOT EXISTS idx_threats_status ON public.threats (status);
CREATE INDEX IF NOT EXISTS idx_threats_detected_at ON public.threats (detected_at DESC);

-- 2. AI Analyses table
CREATE TABLE IF NOT EXISTS public.analyses (
  id TEXT PRIMARY KEY,
  incident_title TEXT NOT NULL,
  raw_log TEXT NOT NULL,
  context TEXT NOT NULL DEFAULT '',
  classification TEXT NOT NULL,
  threat_category TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('Critical', 'High', 'Medium', 'Low')),
  confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  confidence_explanation TEXT NOT NULL,
  indicators_found JSONB NOT NULL DEFAULT '[]'::jsonb,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  technical_explanation TEXT NOT NULL,
  recommended_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  false_positives_and_uncertainty TEXT NOT NULL,
  mitre_mappings JSONB NOT NULL DEFAULT '[]'::jsonb,
  analysis_mode TEXT NOT NULL CHECK (analysis_mode IN ('gemini-ai', 'rules-based-demo')),
  converted_threat_id TEXT REFERENCES public.threats(id) ON DELETE SET NULL,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analyses_analyzed_at ON public.analyses (analyzed_at DESC);

-- 3. Security Alerts table
CREATE TABLE IF NOT EXISTS public.alerts (
  id TEXT PRIMARY KEY,
  threat_id TEXT REFERENCES public.threats(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('Critical', 'High', 'Medium', 'Low')),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_is_read ON public.alerts (is_read);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON public.alerts (created_at DESC);

-- 4. Security Scanner History table
CREATE TABLE IF NOT EXISTS public.scan_history (
  id TEXT PRIMARY KEY,
  source_name TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('pasted-log', 'uploaded-file')),
  file_size_bytes INTEGER NOT NULL DEFAULT 0,
  lines_scanned INTEGER NOT NULL DEFAULT 0,
  overall_severity TEXT NOT NULL CHECK (overall_severity IN ('Critical', 'High', 'Medium', 'Low', 'Info')),
  findings JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary TEXT NOT NULL,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scan_history_scanned_at ON public.scan_history (scanned_at DESC);

-- Row Level Security (RLS)
ALTER TABLE public.threats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_history ENABLE ROW LEVEL SECURITY;

-- Server-side access uses SUPABASE_SERVICE_ROLE_KEY (which bypasses RLS safely on the Node.js backend).
-- Deny anonymous direct browser access by default, or allow authenticated SOC analysts if Supabase Auth is added later:
CREATE POLICY "Authenticated read threats" ON public.threats FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write threats" ON public.threats FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated read analyses" ON public.analyses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write analyses" ON public.analyses FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated read alerts" ON public.alerts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write alerts" ON public.alerts FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated read scan_history" ON public.scan_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write scan_history" ON public.scan_history FOR ALL TO authenticated USING (true) WITH CHECK (true);
