import type { ThreatCategory } from '../types/security';

export interface MitreTechniqueEntry {
  techniqueId: string;
  tactic: string;
  techniqueName: string;
  explanation: string;
  mitigations: string[];
  relatedCategories: ThreatCategory[];
  keywords: string[];
}

export const MITRE_CATALOG: MitreTechniqueEntry[] = [
  {
    techniqueId: 'T1110',
    tactic: 'Credential Access',
    techniqueName: 'Brute Force',
    explanation:
      'Adversaries may use repetitive authentication guesses or credential stuffing lists to gain access to valid accounts when lockout or rate limits are absent.',
    mitigations: [
      'Enforce multi-factor authentication (MFA) across SSH, VPN, and identity portals.',
      'Apply progressive account lockout and IP rate-limiting on authentication endpoints.',
      'Disable password-based SSH authentication in favor of hardware-backed keys.',
    ],
    relatedCategories: ['Brute Force', 'Credential Abuse'],
    keywords: ['brute', 'failed password', '4625', 'invalid user', 'ssh', 'credential stuffing'],
  },
  {
    techniqueId: 'T1566',
    tactic: 'Initial Access',
    techniqueName: 'Phishing',
    explanation:
      'Adversaries send deceptive emails or spoofed login links to trick users into revealing credentials or executing malicious attachments.',
    mitigations: [
      'Enforce strict SPF, DKIM, and DMARC quarantine/reject policies.',
      'Deploy FIDO2/WebAuthn phishing-resistant MFA for corporate identities.',
      'Strip or sandbox untrusted attachments and rewrite external lookalike links.',
    ],
    relatedCategories: ['Phishing'],
    keywords: ['phish', 'spf=fail', 'dkim', 'dmarc', 'lookalike', 'spoof', 'payroll-verify'],
  },
  {
    techniqueId: 'T1078',
    tactic: 'Initial Access / Defense Evasion',
    techniqueName: 'Valid Accounts',
    explanation:
      'Adversaries leverage compromised or anomalous legitimate credentials to bypass perimeter controls and blend in with normal user sessions.',
    mitigations: [
      'Monitor impossible travel, new ASN logins, and off-hours session creation.',
      'Enforce conditional access policies requiring compliant managed devices.',
      'Rotate dormant service account credentials and enforce least privilege.',
    ],
    relatedCategories: ['Anomalous Access', 'Credential Abuse'],
    keywords: ['impossible travel', 'off-hours', 'valid account', 'session', 'geo', 'token'],
  },
  {
    techniqueId: 'T1059',
    tactic: 'Execution',
    techniqueName: 'Command and Scripting Interpreter',
    explanation:
      'Adversaries abuse PowerShell, Bash, Python, or Windows Command Shell to execute obfuscated payloads and automate post-exploitation tasks.',
    mitigations: [
      'Enable PowerShell Script Block Logging and Constrained Language Mode.',
      'Restrict unsigned script execution via AppLocker or application allowlisting.',
      'Alert on base64-encoded command arguments and curl-to-shell pipes.',
    ],
    relatedCategories: ['Malware Indicator'],
    keywords: ['powershell', 'encodedcommand', '-enc', 'bash', 'curl', 'wget', 'script'],
  },
  {
    techniqueId: 'T1548',
    tactic: 'Privilege Escalation',
    techniqueName: 'Abuse Elevation Control Mechanism',
    explanation:
      'Adversaries circumvent UAC, sudoers policies, or group memberships to elevate execution from standard user context to root or SYSTEM.',
    mitigations: [
      'Audit /etc/sudoers and privileged group memberships via automated configuration checks.',
      'Require re-authentication and MFA for sudo or administrative elevation.',
      'Monitor Event ID 4672 and unexpected wheel/sudo group additions.',
    ],
    relatedCategories: ['Privilege Escalation'],
    keywords: ['sudo', 'sudoers', 'wheel', 'usermod', 'privilege', 'uac', '4672', 'setuid'],
  },
  {
    techniqueId: 'T1003',
    tactic: 'Credential Access',
    techniqueName: 'OS Credential Dumping',
    explanation:
      'Adversaries attempt to extract password hashes, Kerberos tickets, or plaintext secrets from LSASS memory, SAM, or /etc/shadow.',
    mitigations: [
      'Enable Credential Guard and LSA Protection (RunAsPPL) on Windows endpoints.',
      'Alert on non-system processes requesting SeDebugPrivilege or LSASS memory handles.',
      'Restrict read permissions on /etc/shadow and credential vaults.',
    ],
    relatedCategories: ['Malware Indicator', 'Credential Abuse'],
    keywords: ['mimikatz', 'lsass', 'sedebugprivilege', '/etc/shadow', 'credential dump'],
  },
  {
    techniqueId: 'T1041',
    tactic: 'Exfiltration',
    techniqueName: 'Exfiltration Over C2 Channel',
    explanation:
      'Adversaries stage compressed archives or database dumps and transfer sensitive records outside the network boundary over encrypted egress channels.',
    mitigations: [
      'Monitor unusual outbound byte spikes and unauthorized cloud sync tooling.',
      'Apply egress firewall allowlists for database and staging servers.',
      'Implement Data Loss Prevention (DLP) rules on bulk export pipelines.',
    ],
    relatedCategories: ['Data Exfiltration'],
    keywords: ['exfil', 'mysqldump', 'pg_dump', 'bulk export', 'rclone', 'outbound'],
  },
  {
    techniqueId: 'T1190',
    tactic: 'Initial Access',
    techniqueName: 'Exploit Public-Facing Application',
    explanation:
      'Adversaries probe internet-facing web endpoints using path traversal, SQL injection, or unpatched service exploits.',
    mitigations: [
      'Deploy parameterized queries and strict path canonicalization.',
      'Place public endpoints behind a Web Application Firewall (WAF) and apply timely patches.',
      'Run automated static/dynamic checks in CI before deployment.',
    ],
    relatedCategories: ['Anomalous Access', 'Configuration Risk'],
    keywords: ['../', 'union select', 'sqli', 'traversal', 'waf', 'public-facing'],
  },
];
