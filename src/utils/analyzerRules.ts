import type {
  AIAnalysisResult,
  MitreMappingSuggestion,
  Severity,
  ThreatCategory,
} from '../types/security';

export interface AnalyzeRequestPayload {
  logText: string;
  incidentTitle?: string;
  context?: string;
}

/**
 * Deterministic rules-based heuristic analyzer used ONLY when Gemini AI
 * is unavailable or unconfigured. Always tagged as 'rules-based-demo'.
 */
export function runRulesBasedAnalysis(
  payload: AnalyzeRequestPayload,
  reasonNote = 'Gemini API is not configured or unavailable; deterministic rules-based demonstration parser used.'
): AIAnalysisResult {
  const text = payload.logText.trim();
  const lower = text.toLowerCase();
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

  const indicators = new Set<string>();
  const ipMatches = text.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g) || [];
  ipMatches.slice(0, 6).forEach((ip) => indicators.add(`IP: ${ip}`));

  const domainMatches =
    text.match(/\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:example|test|invalid|com|net|org|io|ru|cn|xyz|top)\b/gi) || [];
  domainMatches.slice(0, 5).forEach((d) => indicators.add(`Domain: ${d}`));

  const hashMatches = text.match(/\b[a-f0-9]{32,64}\b/gi) || [];
  hashMatches.slice(0, 3).forEach((h) => indicators.add(`Hash: ${h.slice(0, 20)}...`));

  const userMatches = text.match(/(?:user|account|uid|login)[=:\s]+([a-z0-9_.-]+)/gi) || [];
  userMatches.slice(0, 4).forEach((u) => indicators.add(u.trim()));

  let threatCategory: ThreatCategory = 'Anomalous Access';
  let severity: Severity = 'Low';
  let classification = 'Unclassified Log Activity (Rules-Based Review)';
  let confidence = 38;
  const evidence: string[] = [];
  const recommendedActions: string[] = [];
  const mitreMappings: MitreMappingSuggestion[] = [];

  const failedAuthCount = (lower.match(/failed password|authentication failure|invalid user|4625|login failed|unauthorized/g) || []).length;
  const hasPrivEsc = /sudo|visudo|usermod|wheel|sudoers|sedebugprivilege|privilege|chmod \+s|setuid|4672/.test(lower);
  const hasPhishing = /phish|spf=fail|dkim=fail|dmarc=fail|lookalike|credential harvest|reset-password|urgent verify|invoice-login/.test(lower);
  const hasMalware = /mimikatz|powershell.*-enc|encodedcommand|ransom|cobalt|beacon|meterpreter|\/tmp\/.*\.(sh|elf|bin)|wget\s+http|curl\s+.*\|\s*(sh|bash)/.test(lower);
  const hasExfil = /exfil|bulk export|mysqldump|pg_dump|archive.*upload|rclone|scp\s+.*@|large outbound/.test(lower);

  if (hasMalware) {
    threatCategory = 'Malware Indicator';
    severity = 'Critical';
    classification = 'Suspected Malicious Execution / Payload Indicator';
    confidence = 78;
    evidence.push('Matched high-risk execution or tooling keywords (e.g., encoded PowerShell, credential dumper, or remote shell pipe).');
    recommendedActions.push(
      'Isolate the affected host from network segments pending forensic triage.',
      'Capture volatile memory and inspect parent/child process trees.',
      'Verify file hashes against approved software inventories.'
    );
    mitreMappings.push({
      tactic: 'Execution',
      techniqueId: 'T1059',
      techniqueName: 'Command and Scripting Interpreter',
      rationale: 'Log contains shell/scripting execution keywords often observed in payload staging.',
    });
  } else if (hasPrivEsc) {
    threatCategory = 'Privilege Escalation';
    severity = 'High';
    classification = 'Unusual Privilege Elevation or Account Modification';
    confidence = 72;
    evidence.push('Detected privilege group modification, sudoers alteration, or elevated token assignment events.');
    recommendedActions.push(
      'Validate whether the privilege change corresponds to an approved change ticket.',
      'Audit recent sudo/admin commands executed by the target principal.',
      'Revoke temporary elevated privileges and enforce MFA on administrative sessions.'
    );
    mitreMappings.push({
      tactic: 'Privilege Escalation',
      techniqueId: 'T1548',
      techniqueName: 'Abuse Elevation Control Mechanism',
      rationale: 'Observed privilege escalation or sudoers-related event markers.',
    });
  } else if (hasPhishing) {
    threatCategory = 'Phishing';
    severity = 'High';
    classification = 'Potential Phishing / Email Authentication Failure';
    confidence = 70;
    evidence.push('Log references email authentication failures (SPF/DKIM/DMARC) or deceptive credential verification lures.');
    recommendedActions.push(
      'Quarantine matching messages and block the sender domain at the secure email gateway.',
      'Check mail logs to identify any recipients who clicked links or submitted credentials.',
      'Reset sessions and enforce phishing-resistant MFA for affected users.'
    );
    mitreMappings.push({
      tactic: 'Initial Access',
      techniqueId: 'T1566',
      techniqueName: 'Phishing',
      rationale: 'Email authentication failure or lure keywords present in submitted telemetry.',
    });
  } else if (hasExfil) {
    threatCategory = 'Data Exfiltration';
    severity = 'High';
    classification = 'Potential Bulk Data Transfer / Staging Activity';
    confidence = 66;
    evidence.push('Detected bulk dump, archive staging, or unexpected outbound file transfer patterns.');
    recommendedActions.push(
      'Inspect outbound proxy/firewall byte counts for the referenced source host.',
      'Verify whether a scheduled backup or authorized data engineering job explains the transfer.',
      'Temporarily restrict egress permissions for the associated service account.'
    );
    mitreMappings.push({
      tactic: 'Exfiltration',
      techniqueId: 'T1041',
      techniqueName: 'Exfiltration Over C2 Channel',
      rationale: 'Observed bulk staging or outbound transfer keywords; requires byte-volume confirmation.',
    });
  } else if (failedAuthCount >= 3) {
    threatCategory = 'Brute Force';
    severity = failedAuthCount >= 6 ? 'High' : 'Medium';
    classification = 'Repeated Authentication Failures / Brute-Force Pattern';
    confidence = Math.min(82, 55 + failedAuthCount * 4);
    evidence.push(`Observed ${failedAuthCount} failed authentication markers across ${lines.length} log line(s).`);
    recommendedActions.push(
      'Apply temporary rate-limiting or IP block rules for the offending source address.',
      'Check if any successful login immediately followed the failed attempts.',
      'Verify account lockout thresholds and enforce MFA.'
    );
    mitreMappings.push({
      tactic: 'Credential Access',
      techniqueId: 'T1110',
      techniqueName: 'Brute Force',
      rationale: 'Multiple consecutive failed login indicators observed in log excerpt.',
    });
  } else if (lines.length >= 1 && /401|403|denied|unusual|off-hours|geo|impossible travel|\.\.\//.test(lower)) {
    threatCategory = 'Anomalous Access';
    severity = 'Medium';
    classification = 'Suspicious Access Pattern Requiring Analyst Verification';
    confidence = 54;
    evidence.push('Log contains access denial codes, path traversal sequences, or unusual session context.');
    recommendedActions.push(
      'Correlate the timestamp and source IP with baseline user login history.',
      'Confirm whether the request originated from an expected corporate VPN or test scanner.'
    );
    mitreMappings.push({
      tactic: 'Initial Access',
      techniqueId: 'T1078',
      techniqueName: 'Valid Accounts',
      rationale: 'Anomalous authentication or authorization telemetry flagged for review.',
    });
  } else {
    evidence.push(
      lines.length > 0
        ? `Scanned ${lines.length} log line(s); no definitive high-severity signature matched.`
        : 'Minimal log context provided.'
    );
    recommendedActions.push(
      'Provide additional surrounding log lines, process arguments, or network metadata for higher confidence.',
      'Monitor the associated source indicator over the next 24 hours for recurrence.'
    );
  }

  return {
    id: `ANL-${Date.now().toString(36).toUpperCase()}`,
    incidentTitle: payload.incidentTitle?.trim() || classification,
    rawLog: payload.logText,
    context: payload.context?.trim() || '',
    classification,
    threatCategory,
    severity,
    confidence,
    confidenceExplanation: `${reasonNote} Confidence (${confidence}%) reflects deterministic keyword and pattern density rather than full semantic reasoning.`,
    indicatorsFound: Array.from(indicators),
    evidence,
    technicalExplanation:
      lines.length < 2
        ? 'Input is brief, limiting contextual correlation. Rules-based heuristics inspected authentication, execution, privilege, phishing, and transfer markers.'
        : `Rules-based heuristic engine evaluated ${lines.length} log entries. Matched category "${threatCategory}" with ${severity} priority based on indicator density.`,
    recommendedActions,
    falsePositivesAndUncertainty:
      'Rules-based demonstration mode relies on static signatures and cannot verify business authorization, maintenance windows, or authorized red-team exercises. Treat findings as preliminary triage.',
    mitreMappings,
    analysisMode: 'rules-based-demo',
    analyzedAt: new Date().toISOString(),
  };
}
