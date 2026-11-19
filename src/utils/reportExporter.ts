import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MITRE_CATALOG } from '../data/mitreCatalog';
import type { AIAnalysisResult, ThreatRecord } from '../types/security';

export interface ReportExportOptions {
  reportTitle: string;
  analystName: string;
  includeResolved: boolean;
  includeAnalyses: boolean;
  includeMitre: boolean;
  threats: ThreatRecord[];
  analyses: AIAnalysisResult[];
}

function escapeCsvCell(value: string): string {
  const safe = value.replace(/\r?\n/g, ' ');
  if (safe.includes(',') || safe.includes('"') || safe.includes('\n')) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export function exportThreatsCSV(threats: ThreatRecord[], filename = 'cyberguard-mini-threats.csv'): void {
  const headers = [
    'ID',
    'Title',
    'Category',
    'Severity',
    'Status',
    'Source Indicator',
    'Detected At',
    'Description',
    'Recommended Action',
    'Notes',
    'Data Type',
  ];

  const rows = threats.map((t) => [
    t.id,
    t.title,
    t.category,
    t.severity,
    t.status,
    t.sourceIndicator,
    t.detectedAt,
    t.description,
    t.recommendedAction,
    t.notes,
    t.isDemo ? 'Simulated Demo' : 'Analyst Record',
  ]);

  const csvContent = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((r) => r.map((c) => escapeCsvCell(String(c ?? ''))).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportSecurityPDF(options: ReportExportOptions): void {
  const {
    reportTitle,
    analystName,
    includeResolved,
    includeAnalyses,
    includeMitre,
    threats,
    analyses,
  } = options;

  const filteredThreats = includeResolved
    ? threats
    : threats.filter((t) => t.status !== 'Resolved');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const reportDate = new Date().toLocaleString();

  // Branded Dark Navy Header Strip
  doc.setFillColor(6, 10, 19);
  doc.rect(0, 0, pageWidth, 84, 'F');

  doc.setFillColor(37, 99, 235);
  doc.rect(0, 81, pageWidth, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('CyberGuard Mini', 40, 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184);
  doc.text('AI-Powered Threat Intelligence & Security Monitoring System', 40, 54);

  doc.setFontSize(9);
  doc.text(`Generated: ${reportDate}`, pageWidth - 40, 36, { align: 'right' });
  doc.text(`Analyst: ${analystName || 'SOC Capstone Analyst'}`, pageWidth - 40, 52, { align: 'right' });

  // Title & Executive Summary
  let y = 112;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(reportTitle || 'Security Operations Incident Report', 40, y);

  y += 20;
  const counts = {
    total: filteredThreats.length,
    critical: filteredThreats.filter((t) => t.severity === 'Critical').length,
    high: filteredThreats.filter((t) => t.severity === 'High').length,
    medium: filteredThreats.filter((t) => t.severity === 'Medium').length,
    low: filteredThreats.filter((t) => t.severity === 'Low').length,
    resolved: filteredThreats.filter((t) => t.status === 'Resolved').length,
    open: filteredThreats.filter((t) => t.status !== 'Resolved').length,
  };

  const hasDemo = filteredThreats.some((t) => t.isDemo);
  const summaryLines = [
    `This report summarizes ${counts.total} stored threat record(s) (${counts.open} active, ${counts.resolved} resolved) and ${includeAnalyses ? analyses.length : 0} recorded AI/heuristic analysis assessment(s).`,
    `Critical findings: ${counts.critical} | High: ${counts.high} | Medium: ${counts.medium} | Low: ${counts.low}.`,
    hasDemo
      ? 'Notice: Dataset includes clearly marked simulated educational incidents for demonstration purposes.'
      : 'All included records reflect analyst-logged or analyzed entries.',
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  const wrappedSummary = doc.splitTextToSize(summaryLines.join(' '), pageWidth - 80);
  doc.text(wrappedSummary, 40, y);
  y += wrappedSummary.length * 14 + 10;

  // Severity Breakdown Table
  autoTable(doc, {
    startY: y,
    head: [['Severity Level', 'Count', 'Active / Open', 'Resolved']],
    body: (['Critical', 'High', 'Medium', 'Low'] as const).map((sev) => {
      const subset = filteredThreats.filter((t) => t.severity === sev);
      return [
        sev,
        String(subset.length),
        String(subset.filter((t) => t.status !== 'Resolved').length),
        String(subset.filter((t) => t.status === 'Resolved').length),
      ];
    }),
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: [30, 41, 59] },
    margin: { left: 40, right: 40 },
  });

  // Threat Details Table
  const afterSummaryY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 90;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('Threat Details & Defensive Recommendations', 40, afterSummaryY + 24);

  autoTable(doc, {
    startY: afterSummaryY + 32,
    head: [['ID', 'Title', 'Category', 'Severity', 'Status', 'Indicator', 'Recommended Action']],
    body:
      filteredThreats.length > 0
        ? filteredThreats.map((t) => [
            t.id,
            t.isDemo ? `${t.title} [Simulated]` : t.title,
            t.category,
            t.severity,
            t.status,
            t.sourceIndicator || '-',
            t.recommendedAction || '-',
          ])
        : [['-', 'No matching threat records stored.', '-', '-', '-', '-', '-']],
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 62 },
      1: { cellWidth: 105 },
      2: { cellWidth: 65 },
      3: { cellWidth: 46 },
      4: { cellWidth: 52 },
      5: { cellWidth: 72 },
      6: { cellWidth: 'auto' },
    },
    margin: { left: 40, right: 40 },
  });

  // AI Analysis Findings
  if (includeAnalyses && analyses.length > 0) {
    const afterThreatsY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 400;
    let nextY = afterThreatsY + 26;
    if (nextY > 720) {
      doc.addPage();
      nextY = 48;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('AI & Heuristic Analysis Findings', 40, nextY);

    autoTable(doc, {
      startY: nextY + 8,
      head: [['ID', 'Incident', 'Mode', 'Severity', 'Confidence', 'Primary Recommendations']],
      body: analyses.slice(0, 10).map((a) => [
        a.id,
        a.incidentTitle,
        a.analysisMode === 'gemini-ai' ? 'Gemini AI' : 'Rules-Based Demo',
        a.severity,
        `${a.confidence}%`,
        a.recommendedActions.slice(0, 2).join(' '),
      ]),
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
      margin: { left: 40, right: 40 },
    });
  }

  // MITRE ATT&CK References
  if (includeMitre) {
    const matchedMitre = MITRE_CATALOG.filter((entry) =>
      filteredThreats.some(
        (t) =>
          entry.relatedCategories.includes(t.category) ||
          entry.keywords.some((kw) => `${t.title} ${t.description}`.toLowerCase().includes(kw))
      )
    );
    if (matchedMitre.length > 0) {
      const prevY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 500;
      let nextY = prevY + 26;
      if (nextY > 720) {
        doc.addPage();
        nextY = 48;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text('Analytical MITRE ATT&CK References (Suggested Mappings)', 40, nextY);

      autoTable(doc, {
        startY: nextY + 8,
        head: [['Technique ID', 'Tactic', 'Technique Name', 'Defensive Mitigation']],
        body: matchedMitre.map((m) => [
          m.techniqueId,
          m.tactic,
          m.techniqueName,
          m.mitigations[0] || '',
        ]),
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontSize: 8 },
        bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
        margin: { left: 40, right: 40 },
      });
    }
  }

  doc.save(`cyberguard-mini-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}
