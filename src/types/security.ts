export type Severity = 'Critical' | 'High' | 'Medium' | 'Low';

export type ThreatStatus = 'Open' | 'Investigating' | 'Resolved';

export type ThreatCategory =
  | 'Brute Force'
  | 'Phishing'
  | 'Privilege Escalation'
  | 'Malware Indicator'
  | 'Anomalous Access'
  | 'Credential Abuse'
  | 'Data Exfiltration'
  | 'Configuration Risk';

export const THREAT_CATEGORIES: ThreatCategory[] = [
  'Brute Force',
  'Phishing',
  'Privilege Escalation',
  'Malware Indicator',
  'Anomalous Access',
  'Credential Abuse',
  'Data Exfiltration',
  'Configuration Risk',
];

export const SEVERITIES: Severity[] = ['Critical', 'High', 'Medium', 'Low'];

export interface ThreatRecord {
  id: string;
  title: string;
  description: string;
  category: ThreatCategory;
  severity: Severity;
  sourceIndicator: string;
  status: ThreatStatus;
  detectedAt: string;
  recommendedAction: string;
  notes: string;
  isDemo?: boolean;
}

export interface MitreMappingSuggestion {
  tactic: string;
  techniqueId: string;
  techniqueName: string;
  rationale: string;
}

export type AnalysisMode = 'gemini-ai' | 'rules-based-demo';

export interface AIAnalysisResult {
  id: string;
  incidentTitle: string;
  rawLog: string;
  context: string;
  classification: string;
  threatCategory: ThreatCategory;
  severity: Severity;
  confidence: number;
  confidenceExplanation: string;
  indicatorsFound: string[];
  evidence: string[];
  technicalExplanation: string;
  recommendedActions: string[];
  falsePositivesAndUncertainty: string;
  mitreMappings: MitreMappingSuggestion[];
  analysisMode: AnalysisMode;
  convertedThreatId?: string;
  isDemo?: boolean;
  analyzedAt: string;
}

export interface SecurityAlert {
  id: string;
  threatId: string;
  title: string;
  message: string;
  severity: Severity;
  isRead: boolean;
  isDemo?: boolean;
  createdAt: string;
}

export interface ScannerFinding {
  id: string;
  ruleName: string;
  category: ThreatCategory;
  severity: Severity;
  lineNumber: number;
  matchedText: string;
  explanation: string;
  recommendation: string;
  mitreId?: string;
}

export interface ScanReport {
  id: string;
  sourceName: string;
  sourceType: 'pasted-log' | 'uploaded-file';
  fileSizeBytes: number;
  linesScanned: number;
  overallSeverity: Severity | 'Info';
  findings: ScannerFinding[];
  summary: string;
  isDemo?: boolean;
  scannedAt: string;
}

export interface SystemStatus {
  geminiConfigured: boolean;
  geminiModel: string;
  supabaseConfigured: boolean;
  storageMode: 'supabase-postgres' | 'localstorage-demo';
}

export type NavSection =
  | 'dashboard'
  | 'analyzer'
  | 'scanner'
  | 'threats'
  | 'intelligence'
  | 'mitre'
  | 'alerts'
  | 'analytics'
  | 'reports'
  | 'settings';
