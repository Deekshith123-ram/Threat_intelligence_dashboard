import type { ScannerFinding, ScanReport, Severity, ThreatCategory } from '../types/security';

export const ALLOWED_SCAN_EXTENSIONS = ['.txt', '.csv', '.log'] as const;
export const MAX_SCAN_FILE_BYTES = 2 * 1024 * 1024; // 2 MB safe cap

interface DetectionRule {
  name: string;
  category: ThreatCategory;
  severity: Severity;
  regex: RegExp;
  minLineHits?: number;
  explanation: string;
  recommendation: string;
  mitreId?: string;
}

const DETECTION_RULES: DetectionRule[] = [
  {
    name: 'Repeated Failed Authentication',
    category: 'Brute Force',
    severity: 'High',
    regex: /failed password|authentication failure|invalid user|login failed|eventid[=:\s]*4625|401 unauthorized/i,
    minLineHits: 3,
    explanation: 'Multiple failed login attempts detected across log lines, characteristic of password guessing or credential stuffing.',
    recommendation: 'Enable rate-limiting / fail2ban, inspect targeted usernames, and verify whether any login succeeded afterward.',
    mitreId: 'T1110',
  },
  {
    name: 'Suspicious Off-Hours or Impossible Travel Auth',
    category: 'Anomalous Access',
    severity: 'Medium',
    regex: /impossible travel|geo[-_ ]?anomaly|unusual location|off[-_ ]?hours login|new device login|mfa bypassed|token replay/i,
    explanation: 'Authentication telemetry indicates anomalous location, timing, or session token reuse.',
    recommendation: 'Verify login legitimacy with the account owner and revoke active refresh tokens if unconfirmed.',
    mitreId: 'T1078',
  },
  {
    name: 'Unusual Privilege Escalation Event',
    category: 'Privilege Escalation',
    severity: 'High',
    regex: /usermod\s+-aG\s+(sudo|wheel|admin)|visudo|\/etc\/sudoers|SeDebugPrivilege|PrivilegeUse|chmod\s+\+s|sudo:\s+.*COMMAND=.*(bash|sh|su\b)/i,
    explanation: 'Detected administrative group modification, sudoers change, or elevated shell invocation.',
    recommendation: 'Confirm against change management records and audit all commands executed under elevated privileges.',
    mitreId: 'T1548',
  },
  {
    name: 'Phishing & Spoofing Indicators',
    category: 'Phishing',
    severity: 'High',
    regex: /spf=fail|dkim=fail|dmarc=fail|credential[-_ ]?harvest|lookalike|urgent[-_ ]?password[-_ ]?reset|payroll[-_ ]?verify/i,
    explanation: 'Email or proxy log contains authentication failures (SPF/DKIM/DMARC) or deceptive credential-lure patterns.',
    recommendation: 'Quarantine related emails, block the sender domain, and check for recipient click-through activity.',
    mitreId: 'T1566',
  },
  {
    name: 'Malware Execution & Payload Keywords',
    category: 'Malware Indicator',
    severity: 'Critical',
    regex: /mimikatz|powershell\s+.*(-enc|-encodedcommand)|cobalt\s*strike|meterpreter|ransom(ware)?|curl\s+.*\|\s*(ba)?sh|wget\s+http.*\/tmp\//i,
    explanation: 'High-risk malware tooling, encoded script execution, or remote shell download-and-execute pattern detected.',
    recommendation: 'Isolate the endpoint immediately, preserve forensic artifacts, and inspect process ancestry.',
    mitreId: 'T1059',
  },
  {
    name: 'Unexpected Access / Injection Pattern',
    category: 'Anomalous Access',
    severity: 'Medium',
    regex: /\.\.\/\.\.\/|\/etc\/shadow|union\s+select\s+|xp_cmdshell|<script>alert\(|bulk[-_ ]?export|pg_dump|mysqldump/i,
    explanation: 'Detected directory traversal, sensitive system file probing, SQL injection signature, or bulk database dump.',
    recommendation: 'Review web/database access controls, sanitize request inputs, and confirm whether export was authorized.',
    mitreId: 'T1190',
  },
];

const SEVERITY_RANK: Record<Severity | 'Info', number> = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
  Info: 0,
};

export function validateScanFile(file: File): string | null {
  const lowerName = file.name.toLowerCase();
  const validExt = ALLOWED_SCAN_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  if (!validExt) {
    return `Unsupported file type. Only ${ALLOWED_SCAN_EXTENSIONS.join(', ')} plain-text log files are permitted.`;
  }
  if (file.size > MAX_SCAN_FILE_BYTES) {
    return `File exceeds the 2 MB safety limit (${(file.size / (1024 * 1024)).toFixed(2)} MB).`;
  }
  if (file.size === 0) {
    return 'The uploaded file is empty.';
  }
  return null;
}

export function scanLogContent(params: {
  content: string;
  sourceName: string;
  sourceType: 'pasted-log' | 'uploaded-file';
  fileSizeBytes?: number;
}): ScanReport {
  const { content, sourceName, sourceType } = params;
  const lines = content.split(/\r?\n/);
  const findings: ScannerFinding[] = [];

  for (const rule of DETECTION_RULES) {
    const matchedLines: Array<{ lineNumber: number; text: string }> = [];
    lines.forEach((line, index) => {
      if (line.trim() && rule.regex.test(line)) {
        matchedLines.push({ lineNumber: index + 1, text: line.trim().slice(0, 220) });
      }
    });

    const threshold = rule.minLineHits ?? 1;
    if (matchedLines.length >= threshold) {
      if (rule.minLineHits && rule.minLineHits > 1) {
        findings.push({
          id: `FND-${Date.now().toString(36)}-${findings.length + 1}`,
          ruleName: `${rule.name} (${matchedLines.length} hits)`,
          category: rule.category,
          severity: matchedLines.length >= 6 ? 'Critical' : rule.severity,
          lineNumber: matchedLines[0].lineNumber,
          matchedText: matchedLines
            .slice(0, 3)
            .map((m) => `L${m.lineNumber}: ${m.text}`)
            .join(' | '),
          explanation: `${rule.explanation} Matched ${matchedLines.length} times (first at line ${matchedLines[0].lineNumber}).`,
          recommendation: rule.recommendation,
          mitreId: rule.mitreId,
        });
      } else {
        matchedLines.slice(0, 8).forEach((m) => {
          findings.push({
            id: `FND-${Date.now().toString(36)}-${findings.length + 1}`,
            ruleName: rule.name,
            category: rule.category,
            severity: rule.severity,
            lineNumber: m.lineNumber,
            matchedText: m.text,
            explanation: rule.explanation,
            recommendation: rule.recommendation,
            mitreId: rule.mitreId,
          });
        });
      }
    }
  }

  let overallSeverity: Severity | 'Info' = 'Info';
  for (const f of findings) {
    if (SEVERITY_RANK[f.severity] > SEVERITY_RANK[overallSeverity]) {
      overallSeverity = f.severity;
    }
  }

  const summary =
    findings.length === 0
      ? `Scanned ${lines.length} lines in "${sourceName}". No suspicious pattern rules matched.`
      : `Scanned ${lines.length} lines in "${sourceName}" and flagged ${findings.length} suspicious pattern match(es) (highest severity: ${overallSeverity}).`;

  return {
    id: `SCN-${Date.now().toString(36).toUpperCase()}`,
    sourceName,
    sourceType,
    fileSizeBytes: params.fileSizeBytes ?? new Blob([content]).size,
    linesScanned: lines.length,
    overallSeverity,
    findings,
    summary,
    scannedAt: new Date().toISOString(),
  };
}
