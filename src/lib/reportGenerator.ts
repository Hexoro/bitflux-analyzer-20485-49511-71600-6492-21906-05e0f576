/**
 * Report Generator - Creates professional PDF reports for jobs, batch jobs, and comprehensive analysis
 * Uses jsPDF for PDF generation with enhanced formatting
 */

import jsPDF from 'jspdf';
import { Job, JobExecutionResult } from './jobManagerV2';
import { BinaryMetrics } from './binaryMetrics';

export interface JobReport {
  job: Job;
  generatedAt: Date;
}

export interface BatchReport {
  batchId: string;
  jobs: Job[];
  generatedAt: Date;
}

export interface SequenceData {
  sequence: string;
  count: number;
  positions: number[];
  meanDistance?: number;
  varianceDistance?: number;
  color?: string;
}

export interface BoundaryData {
  sequence: string;
  description: string;
  positions: number[];
  color?: string;
}

export interface PartitionData {
  id: string;
  startIndex: number;
  endIndex: number;
  bits: string;
  stats: {
    totalBits: number;
    entropy: number;
    onePercent: number;
    zeroPercent: number;
    meanRunLength: number;
  };
}

export interface HistoryEntry {
  id: string;
  timestamp: Date;
  description: string;
  bits?: string;
  stats?: {
    totalBits: number;
    zeroCount: number;
    oneCount: number;
    entropy: number;
  };
}

export interface ComprehensiveAnalysisReport {
  fileName: string;
  bits: string;
  metrics: Record<string, number>;
  anomalies: Array<{ name: string; position: number; length: number; severity: string; description?: string }>;
  sequences: SequenceData[];
  boundaries: BoundaryData[];
  partitions: PartitionData[];
  history: HistoryEntry[];
  generatedAt: Date;
}

// PDF styling constants
const COLORS = {
  primary: [0, 132, 255] as [number, number, number],
  secondary: [100, 100, 100] as [number, number, number],
  success: [34, 197, 94] as [number, number, number],
  warning: [234, 179, 8] as [number, number, number],
  danger: [239, 68, 68] as [number, number, number],
  muted: [128, 128, 128] as [number, number, number],
  dark: [30, 30, 30] as [number, number, number],
};

function drawHeader(doc: jsPDF, title: string, subtitle?: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header background
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 20, 25);
  
  // Subtitle
  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(156, 163, 175);
    doc.text(subtitle, 20, 35);
  }
  
  // Logo/brand
  doc.setFontSize(10);
  doc.setTextColor(100, 200, 255);
  doc.text('BSEE', pageWidth - 30, 25);
  
  doc.setTextColor(0, 0, 0);
  return 50;
}

function drawSectionHeader(doc: jsPDF, y: number, title: string, icon?: string): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  doc.setFillColor(241, 245, 249);
  doc.rect(15, y - 5, pageWidth - 30, 12, 'F');
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text(title.toUpperCase(), 20, y + 3);
  
  doc.setTextColor(0, 0, 0);
  return y + 15;
}

function drawKeyValue(doc: jsPDF, y: number, key: string, value: string, margin = 20): number {
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.secondary);
  doc.text(key, margin, y);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(value, margin + 45, y);
  
  return y + 6;
}

function drawStatBox(doc: jsPDF, x: number, y: number, width: number, height: number, label: string, value: string, color: [number, number, number] = COLORS.primary) {
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(x, y, width, height, 3, 3, 'F');
  
  doc.setDrawColor(...color);
  doc.setLineWidth(0.5);
  doc.roundedRect(x, y, width, height, 3, 3, 'S');
  
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  doc.text(label, x + width / 2, y + 10, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...color);
  doc.text(value, x + width / 2, y + 22, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
}

function checkPageBreak(doc: jsPDF, y: number, needed: number = 30): number {
  if (y > 260 - needed) {
    doc.addPage();
    return 20;
  }
  return y;
}

function formatNumber(value: number, decimals = 4): string {
  if (typeof value !== 'number' || isNaN(value)) return 'N/A';
  return value.toFixed(decimals);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Generate a professional PDF report for a single job
 */
export function generateJobReport(job: Job): Blob {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  let y = drawHeader(doc, 'Job Execution Report', `Job: ${job.name}`);
  
  // Summary stats boxes
  const boxWidth = 40;
  const boxHeight = 28;
  const boxGap = 5;
  const startX = 20;
  
  const completed = job.results.filter(r => r.success).length;
  const failed = job.results.filter(r => !r.success).length;
  const avgScore = job.results.length > 0 
    ? job.results.reduce((sum, r) => sum + (r.totalScore || 0), 0) / job.results.length 
    : 0;
  
  drawStatBox(doc, startX, y, boxWidth, boxHeight, 'Status', job.status.toUpperCase(), 
    job.status === 'completed' ? COLORS.success : job.status === 'failed' ? COLORS.danger : COLORS.warning);
  drawStatBox(doc, startX + boxWidth + boxGap, y, boxWidth, boxHeight, 'Progress', `${job.progress}%`, COLORS.primary);
  drawStatBox(doc, startX + (boxWidth + boxGap) * 2, y, boxWidth, boxHeight, 'Completed', `${completed}/${job.results.length}`, COLORS.success);
  drawStatBox(doc, startX + (boxWidth + boxGap) * 3, y, boxWidth, boxHeight, 'Avg Score', formatNumber(avgScore, 3), COLORS.primary);
  
  y += boxHeight + 15;
  
  // Job Information Section
  y = drawSectionHeader(doc, y, 'Job Information');
  
  y = drawKeyValue(doc, y, 'Job Name:', job.name);
  y = drawKeyValue(doc, y, 'Priority:', job.priority);
  y = drawKeyValue(doc, y, 'Data File:', job.dataFileName);
  y = drawKeyValue(doc, y, 'Created:', job.createdAt.toLocaleString());
  y = drawKeyValue(doc, y, 'Started:', job.startTime?.toLocaleString() || 'N/A');
  y = drawKeyValue(doc, y, 'Completed:', job.endTime?.toLocaleString() || 'N/A');
  
  if (job.tags && job.tags.length > 0) {
    y = drawKeyValue(doc, y, 'Tags:', job.tags.join(', '));
  }
  
  y += 10;
  
  // Strategies Section
  y = checkPageBreak(doc, y);
  y = drawSectionHeader(doc, y, 'Strategies');
  
  doc.setFontSize(9);
  job.presets.forEach((preset, idx) => {
    y = checkPageBreak(doc, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    doc.text(`${idx + 1}. ${preset.strategyName}`, 25, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.muted);
    doc.text(`(${preset.iterations} iteration${preset.iterations !== 1 ? 's' : ''})`, 100, y);
    y += 7;
  });
  
  y += 10;
  
  // Results Section
  if (job.results.length > 0) {
    y = checkPageBreak(doc, y, 50);
    y = drawSectionHeader(doc, y, 'Execution Results');
    
    job.results.forEach((result, idx) => {
      y = checkPageBreak(doc, y, 40);
      
      // Result card background
      doc.setFillColor(result.success ? 240 : 254, result.success ? 253 : 242, result.success ? 244 : 242);
      doc.roundedRect(20, y - 3, pageWidth - 40, 30, 2, 2, 'F');
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...(result.success ? COLORS.success : COLORS.danger));
      doc.text(`${idx + 1}. ${result.strategyName}`, 25, y + 5);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.dark);
      doc.text(`Success: ${result.success ? 'Yes' : 'No'}`, 25, y + 13);
      doc.text(`Duration: ${result.totalDuration.toFixed(2)}ms`, 80, y + 13);
      if (result.totalScore !== undefined) {
        doc.text(`Score: ${formatNumber(result.totalScore, 4)}`, 135, y + 13);
      }
      
      if (result.error) {
        doc.setTextColor(...COLORS.danger);
        doc.text(`Error: ${result.error.slice(0, 60)}${result.error.length > 60 ? '...' : ''}`, 25, y + 21);
      }
      
      y += 35;
    });
  }
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 285);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 40, 285);
    doc.text('BSEE - Binary Stream Analysis Environment', pageWidth / 2, 285, { align: 'center' });
  }
  
  return doc.output('blob');
}

/**
 * Generate a professional PDF report for a batch of jobs
 */
export function generateBatchReport(batchId: string, jobs: Job[]): Blob {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  let y = drawHeader(doc, 'Batch Job Report', `Batch ID: ${batchId}`);
  
  // Summary stats
  const completed = jobs.filter(j => j.status === 'completed').length;
  const failed = jobs.filter(j => j.status === 'failed').length;
  const pending = jobs.filter(j => j.status === 'pending').length;
  const running = jobs.filter(j => j.status === 'running').length;
  
  const boxWidth = 35;
  const boxHeight = 28;
  const boxGap = 5;
  const startX = 20;
  
  drawStatBox(doc, startX, y, boxWidth, boxHeight, 'Total', `${jobs.length}`, COLORS.primary);
  drawStatBox(doc, startX + boxWidth + boxGap, y, boxWidth, boxHeight, 'Completed', `${completed}`, COLORS.success);
  drawStatBox(doc, startX + (boxWidth + boxGap) * 2, y, boxWidth, boxHeight, 'Failed', `${failed}`, COLORS.danger);
  drawStatBox(doc, startX + (boxWidth + boxGap) * 3, y, boxWidth, boxHeight, 'Running', `${running}`, COLORS.warning);
  drawStatBox(doc, startX + (boxWidth + boxGap) * 4, y, boxWidth, boxHeight, 'Pending', `${pending}`, COLORS.muted);
  
  y += boxHeight + 15;
  
  // Progress bar
  const progressWidth = pageWidth - 40;
  const progressHeight = 8;
  doc.setFillColor(229, 231, 235);
  doc.roundedRect(20, y, progressWidth, progressHeight, 2, 2, 'F');
  
  if (jobs.length > 0) {
    const completedWidth = (completed / jobs.length) * progressWidth;
    doc.setFillColor(...COLORS.success);
    doc.roundedRect(20, y, completedWidth, progressHeight, 2, 2, 'F');
    
    const failedWidth = (failed / jobs.length) * progressWidth;
    doc.setFillColor(...COLORS.danger);
    doc.rect(20 + completedWidth, y, failedWidth, progressHeight, 'F');
  }
  
  y += 20;
  
  // Job Details Section
  y = drawSectionHeader(doc, y, 'Job Details');
  
  jobs.forEach((job, idx) => {
    y = checkPageBreak(doc, y, 50);
    
    // Job card
    const cardHeight = 35;
    const statusColor = job.status === 'completed' ? COLORS.success : 
                       job.status === 'failed' ? COLORS.danger : 
                       job.status === 'running' ? COLORS.warning : COLORS.muted;
    
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(20, y, pageWidth - 40, cardHeight, 2, 2, 'F');
    
    // Status indicator
    doc.setFillColor(...statusColor);
    doc.roundedRect(20, y, 4, cardHeight, 2, 2, 'F');
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    doc.text(`${idx + 1}. ${job.name}`, 30, y + 10);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.muted);
    doc.text(`File: ${job.dataFileName}`, 30, y + 18);
    doc.text(`Status: ${job.status.toUpperCase()}`, 30, y + 26);
    doc.text(`Progress: ${job.progress}%`, 90, y + 26);
    doc.text(`Priority: ${job.priority}`, 140, y + 26);
    
    if (job.results.length > 0) {
      const successCount = job.results.filter(r => r.success).length;
      doc.text(`Results: ${successCount}/${job.results.length} successful`, pageWidth - 80, y + 18);
    }
    
    y += cardHeight + 5;
  });
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 285);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 40, 285);
    doc.text('BSEE - Binary Stream Analysis Environment', pageWidth / 2, 285, { align: 'center' });
  }
  
  return doc.output('blob');
}

/**
 * Generate a comprehensive professional analysis report PDF
 */
export function generateAnalysisReport(
  fileName: string,
  bits: string,
  metrics: Record<string, number>,
  anomalies: Array<{ name: string; position: number; length: number; severity: string; description?: string }>,
  sequences: SequenceData[],
  boundaries: BoundaryData[],
  partitions?: PartitionData[],
  history?: HistoryEntry[]
): Blob {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  let y = drawHeader(doc, 'Binary Data Analysis Report', `File: ${fileName}`);
  
  // File statistics
  const stats = BinaryMetrics.analyze(bits);
  const balance = bits.length > 0 ? stats.oneCount / bits.length : 0;
  const transitions = bits.split('').reduce((count, bit, i) => 
    i > 0 && bit !== bits[i - 1] ? count + 1 : count, 0);
  
  // Summary stat boxes
  const boxWidth = 32;
  const boxHeight = 26;
  const boxGap = 4;
  const startX = 15;
  
  drawStatBox(doc, startX, y, boxWidth, boxHeight, 'Total Bits', bits.length.toLocaleString(), COLORS.primary);
  drawStatBox(doc, startX + boxWidth + boxGap, y, boxWidth, boxHeight, 'Bytes', formatBytes(bits.length / 8), COLORS.primary);
  drawStatBox(doc, startX + (boxWidth + boxGap) * 2, y, boxWidth, boxHeight, 'Ones', stats.oneCount.toLocaleString(), COLORS.success);
  drawStatBox(doc, startX + (boxWidth + boxGap) * 3, y, boxWidth, boxHeight, 'Zeros', stats.zeroCount.toLocaleString(), COLORS.muted);
  drawStatBox(doc, startX + (boxWidth + boxGap) * 4, y, boxWidth, boxHeight, 'Entropy', formatNumber(stats.entropy, 4), COLORS.warning);
  
  y += boxHeight + 15;
  
  // Quick Stats Section
  y = drawSectionHeader(doc, y, 'Quick Statistics');
  
  const quickStats = [
    ['Balance (1s):', `${(balance * 100).toFixed(2)}%`],
    ['Transitions:', `${transitions} (${((transitions / (bits.length - 1)) * 100).toFixed(1)}%)`],
    ['Mean Run Length:', formatNumber(stats.meanRunLength, 2)],
    ['Longest 0-Run:', stats.longestZeroRun ? `${stats.longestZeroRun.length} bits @ ${stats.longestZeroRun.start}` : 'N/A'],
    ['Longest 1-Run:', stats.longestOneRun ? `${stats.longestOneRun.length} bits @ ${stats.longestOneRun.start}` : 'N/A'],
  ];
  
  quickStats.forEach(([label, value]) => {
    y = drawKeyValue(doc, y, label, value);
  });
  
  y += 10;
  
  // Computed Metrics Section
  y = checkPageBreak(doc, y, 60);
  y = drawSectionHeader(doc, y, `Computed Metrics (${Object.keys(metrics).length})`);
  
  doc.setFontSize(8);
  const metricEntries = Object.entries(metrics);
  const metricsPerRow = 3;
  const metricWidth = (pageWidth - 40) / metricsPerRow;
  
  for (let i = 0; i < Math.min(metricEntries.length, 30); i += metricsPerRow) {
    y = checkPageBreak(doc, y, 15);
    
    for (let j = 0; j < metricsPerRow && i + j < metricEntries.length; j++) {
      const [name, value] = metricEntries[i + j];
      const x = 20 + j * metricWidth;
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.muted);
      doc.text(name.slice(0, 18), x, y);
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.dark);
      doc.text(formatNumber(value as number, 4), x, y + 5);
    }
    y += 12;
  }
  
  if (metricEntries.length > 30) {
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...COLORS.muted);
    doc.text(`... and ${metricEntries.length - 30} more metrics`, 20, y);
    y += 8;
  }
  
  y += 10;
  
  // Anomalies Section
  y = checkPageBreak(doc, y, 40);
  y = drawSectionHeader(doc, y, `Detected Anomalies (${anomalies.length})`);
  
  if (anomalies.length === 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...COLORS.muted);
    doc.text('No anomalies detected.', 20, y);
    y += 10;
  } else {
    anomalies.slice(0, 15).forEach((anomaly, idx) => {
      y = checkPageBreak(doc, y, 20);
      
      const severityColor = anomaly.severity === 'high' ? COLORS.danger :
                           anomaly.severity === 'medium' ? COLORS.warning : COLORS.success;
      
      doc.setFillColor(...severityColor);
      doc.circle(24, y - 1.5, 2, 'F');
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.dark);
      doc.text(`${idx + 1}. ${anomaly.name}`, 30, y);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.muted);
      doc.text(`Position: ${anomaly.position} | Length: ${anomaly.length} | Severity: ${anomaly.severity}`, 30, y + 5);
      
      if (anomaly.description) {
        doc.text(anomaly.description.slice(0, 80), 30, y + 10);
        y += 5;
      }
      
      y += 12;
    });
    
    if (anomalies.length > 15) {
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...COLORS.muted);
      doc.text(`... and ${anomalies.length - 15} more anomalies`, 20, y);
      y += 8;
    }
  }
  
  // Sequences Section
  doc.addPage();
  y = 20;
  y = drawSectionHeader(doc, y, `Found Sequences (${sequences.length})`);
  
  if (sequences.length === 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...COLORS.muted);
    doc.text('No sequences have been searched for.', 20, y);
    y += 10;
  } else {
    sequences.slice(0, 20).forEach((seq, idx) => {
      y = checkPageBreak(doc, y, 25);
      
      // Sequence card
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(20, y - 3, pageWidth - 40, 20, 2, 2, 'F');
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.primary);
      doc.text(`#${idx + 1}`, 25, y + 4);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.dark);
      const patternDisplay = seq.sequence.length > 32 ? seq.sequence.slice(0, 32) + '...' : seq.sequence;
      doc.text(patternDisplay, 40, y + 4);
      
      doc.setTextColor(...COLORS.muted);
      doc.text(`${seq.count} occurrences | ${seq.sequence.length} bits`, 25, y + 12);
      
      if (seq.meanDistance !== undefined) {
        doc.text(`Mean distance: ${formatNumber(seq.meanDistance, 2)}`, 100, y + 12);
      }
      
      y += 25;
    });
    
    if (sequences.length > 20) {
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...COLORS.muted);
      doc.text(`... and ${sequences.length - 20} more sequences`, 20, y);
      y += 8;
    }
  }
  
  y += 10;
  
  // Boundaries Section
  y = checkPageBreak(doc, y, 40);
  y = drawSectionHeader(doc, y, `Detected Boundaries (${boundaries.length})`);
  
  if (boundaries.length === 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...COLORS.muted);
    doc.text('No boundaries defined.', 20, y);
    y += 10;
  } else {
    boundaries.slice(0, 15).forEach((boundary, idx) => {
      y = checkPageBreak(doc, y, 15);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.dark);
      doc.text(`${idx + 1}. ${boundary.description}`, 25, y);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.muted);
      const seqDisplay = boundary.sequence.length > 24 ? boundary.sequence.slice(0, 24) + '...' : boundary.sequence;
      doc.text(`Pattern: ${seqDisplay} | ${boundary.positions.length} occurrence(s)`, 25, y + 5);
      
      y += 12;
    });
  }
  
  // Partitions Section
  if (partitions && partitions.length > 0) {
    y = checkPageBreak(doc, y, 40);
    y = drawSectionHeader(doc, y, `Partitions (${partitions.length})`);
    
    partitions.slice(0, 10).forEach((partition, idx) => {
      y = checkPageBreak(doc, y, 20);
      
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(20, y - 3, pageWidth - 40, 16, 2, 2, 'F');
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.primary);
      doc.text(`Partition ${idx + 1}`, 25, y + 4);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.dark);
      doc.text(`Range: ${partition.startIndex} - ${partition.endIndex}`, 70, y + 4);
      doc.text(`${partition.stats.totalBits} bits`, 140, y + 4);
      
      doc.setTextColor(...COLORS.muted);
      doc.text(`Entropy: ${formatNumber(partition.stats.entropy, 4)} | Balance: ${formatNumber(partition.stats.onePercent, 1)}%`, 25, y + 10);
      
      y += 20;
    });
    
    if (partitions.length > 10) {
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...COLORS.muted);
      doc.text(`... and ${partitions.length - 10} more partitions`, 20, y);
      y += 8;
    }
  }
  
  // History Section
  if (history && history.length > 0) {
    doc.addPage();
    y = 20;
    y = drawSectionHeader(doc, y, `Edit History (${history.length} entries)`);
    
    history.slice(0, 25).forEach((entry, idx) => {
      y = checkPageBreak(doc, y, 15);
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.muted);
      doc.text(new Date(entry.timestamp).toLocaleString(), 20, y);
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.dark);
      doc.text(entry.description.slice(0, 60), 75, y);
      
      if (entry.stats) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.muted);
        doc.text(`${entry.stats.totalBits} bits | H=${formatNumber(entry.stats.entropy, 3)}`, 160, y);
      }
      
      y += 8;
    });
    
    if (history.length > 25) {
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...COLORS.muted);
      doc.text(`... and ${history.length - 25} more history entries`, 20, y);
    }
  }
  
  // Data Sample Section
  doc.addPage();
  y = 20;
  y = drawSectionHeader(doc, y, 'Data Sample (First 1024 bits)');
  
  doc.setFontSize(7);
  doc.setFont('courier', 'normal');
  doc.setTextColor(...COLORS.dark);
  
  const sample = bits.slice(0, 1024);
  const charsPerLine = 80;
  for (let i = 0; i < sample.length; i += charsPerLine) {
    y = checkPageBreak(doc, y, 10);
    doc.text(`${i.toString(16).padStart(4, '0').toUpperCase()}: ${sample.slice(i, i + charsPerLine)}`, 20, y);
    y += 5;
  }
  
  if (bits.length > 1024) {
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...COLORS.muted);
    doc.text(`... ${bits.length - 1024} more bits`, 20, y + 5);
  }
  
  // Footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.muted);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 285);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 40, 285);
    doc.text('BSEE - Binary Stream Analysis Environment', pageWidth / 2, 285, { align: 'center' });
  }
  
  return doc.output('blob');
}

/**
 * Download a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
