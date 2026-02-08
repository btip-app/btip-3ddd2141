import jsPDF from 'jspdf';

interface CopilotAnalysis {
  riskLevel: string;
  confidence: number;
  summary: string;
  evidence: string[];
  recommendations: string[];
  linkedIncidents: { id: string; title: string; severity: number }[];
}

export function exportCopilotPdf(query: string, analysis: CopilotAnalysis, timestamp: string) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let y = 20;

  const addText = (text: string, size: number, style: 'normal' | 'bold' = 'normal', color: [number, number, number] = [0, 0, 0]) => {
    doc.setFontSize(size);
    doc.setFont('helvetica', style);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, maxWidth);
    if (y + lines.length * size * 0.5 > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      y = 20;
    }
    doc.text(lines, margin, y);
    y += lines.length * size * 0.45 + 4;
  };

  const addLine = () => {
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
  };

  // Header
  addText('BTIP COPILOT — INTELLIGENCE ASSESSMENT', 14, 'bold');
  addText(`Generated: ${new Date().toISOString()} | Classification: INTERNAL`, 8, 'normal', [120, 120, 120]);
  addLine();

  // Query
  addText('QUERY', 10, 'bold', [80, 80, 80]);
  addText(query, 11, 'normal');
  y += 4;

  // Risk Assessment
  addText('RISK ASSESSMENT', 10, 'bold', [80, 80, 80]);
  const riskColor: [number, number, number] = 
    analysis.riskLevel === 'critical' ? [220, 38, 38] :
    analysis.riskLevel === 'high' ? [234, 88, 12] :
    analysis.riskLevel === 'medium' ? [202, 138, 4] : [34, 139, 34];
  addText(`Risk Level: ${analysis.riskLevel.toUpperCase()}  |  Confidence: ${analysis.confidence}%`, 11, 'bold', riskColor);
  y += 2;

  // Summary
  addText('SUMMARY', 10, 'bold', [80, 80, 80]);
  addText(analysis.summary, 10, 'normal');
  y += 2;
  addLine();

  // Evidence
  addText(`EVIDENCE (${analysis.evidence.length})`, 10, 'bold', [80, 80, 80]);
  analysis.evidence.forEach((item, i) => {
    addText(`${i + 1}. ${item}`, 9, 'normal');
  });
  y += 2;
  addLine();

  // Recommendations
  addText(`RECOMMENDATIONS (${analysis.recommendations.length})`, 10, 'bold', [80, 80, 80]);
  analysis.recommendations.forEach((item, i) => {
    addText(`${i + 1}. ${item}`, 9, 'normal');
  });

  if (analysis.linkedIncidents.length > 0) {
    y += 2;
    addLine();
    addText(`LINKED INCIDENTS (${analysis.linkedIncidents.length})`, 10, 'bold', [80, 80, 80]);
    analysis.linkedIncidents.forEach(inc => {
      addText(`• ${inc.title} (Severity: ${inc.severity}/5)`, 9, 'normal');
    });
  }

  // Footer
  y += 8;
  addLine();
  addText('⚠ DECISION-SUPPORT ONLY — This is not a guarantee of safety. Validate before operational use.', 7, 'normal', [150, 150, 150]);
  addText('BTIP CONFIDENTIAL — For authorized personnel only', 7, 'normal', [150, 150, 150]);

  doc.save(`btip-analysis-${timestamp.replace(/:/g, '')}-${Date.now()}.pdf`);
}
