/**
 * Report Generator - Creates PDF reports for jobs, batch jobs, and analysis
 * Uses jsPDF for PDF generation
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

export interface AnalysisReport {
  fileName: string;
  bits: string;
  metrics: Record<string, number>;
  anomalies: Array<{ name: string; position: number; length: number; severity: string }>;
  sequences: Array<{ pattern: string; count: number; positions: number[] }>;
  boundaries: Array<{ position: number; type: string }>;
  generatedAt: Date;
}

/**
 * Generate a PDF report for a single job
 */
export function generateJobReport(job: Job): Blob {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;
  const lineHeight = 7;
  const margin = 20;

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Job Execution Report', pageWidth / 2, y, { align: 'center' });
  y += 15;

  // Job Info Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Job Information', margin, y);
  y += lineHeight;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const jobInfo = [
    ['Job Name:', job.name],
    ['Status:', job.status.toUpperCase()],
    ['Priority:', job.priority],
    ['Data File:', job.dataFileName],
    ['Created:', job.createdAt.toLocaleString()],
    ['Started:', job.startTime?.toLocaleString() || 'N/A'],
    ['Completed:', job.endTime?.toLocaleString() || 'N/A'],
    ['Progress:', `${job.progress}%`],
  ];

  jobInfo.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(value), margin + 40, y);
    y += lineHeight;
  });

  y += 5;

  // Strategies Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Strategies', margin, y);
  y += lineHeight;

  doc.setFontSize(10);
  job.presets.forEach((preset, idx) => {
    doc.setFont('helvetica', 'normal');
    doc.text(`${idx + 1}. ${preset.strategyName} (${preset.iterations} iterations)`, margin + 5, y);
    y += lineHeight;
  });

  y += 5;

  // Results Section
  if (job.results.length > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Execution Results', margin, y);
    y += lineHeight;

    doc.setFontSize(10);
    job.results.forEach((result, idx) => {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.text(`Result ${idx + 1}: ${result.strategyName}`, margin, y);
      y += lineHeight;

      doc.setFont('helvetica', 'normal');
      doc.text(`  Success: ${result.success ? 'Yes' : 'No'}`, margin, y);
      y += lineHeight;
      doc.text(`  Duration: ${result.totalDuration.toFixed(2)}ms`, margin, y);
      y += lineHeight;
      if (result.totalScore !== undefined) {
        doc.text(`  Score: ${result.totalScore.toFixed(4)}`, margin, y);
        y += lineHeight;
      }
      if (result.totalOperations !== undefined) {
        doc.text(`  Operations: ${result.totalOperations}`, margin, y);
        y += lineHeight;
      }
      if (result.error) {
        doc.setTextColor(255, 0, 0);
        doc.text(`  Error: ${result.error}`, margin, y);
        doc.setTextColor(0, 0, 0);
        y += lineHeight;
      }
      y += 3;
    });
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text(`Generated on ${new Date().toLocaleString()}`, margin, 285);
  doc.text('BSEE - Binary Stream Analysis Environment', pageWidth - margin, 285, { align: 'right' });

  return doc.output('blob');
}

/**
 * Generate a PDF report for a batch of jobs
 */
export function generateBatchReport(batchId: string, jobs: Job[]): Blob {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;
  const lineHeight = 7;
  const margin = 20;

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Batch Job Report', pageWidth / 2, y, { align: 'center' });
  y += 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Batch ID: ${batchId}`, pageWidth / 2, y, { align: 'center' });
  y += 15;

  // Summary
  const completed = jobs.filter(j => j.status === 'completed').length;
  const failed = jobs.filter(j => j.status === 'failed').length;
  const pending = jobs.filter(j => j.status === 'pending').length;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Batch Summary', margin, y);
  y += lineHeight;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Jobs: ${jobs.length}`, margin, y);
  y += lineHeight;
  doc.text(`Completed: ${completed}`, margin, y);
  y += lineHeight;
  doc.text(`Failed: ${failed}`, margin, y);
  y += lineHeight;
  doc.text(`Pending: ${pending}`, margin, y);
  y += 10;

  // Individual Jobs
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Job Details', margin, y);
  y += lineHeight;

  jobs.forEach((job, idx) => {
    if (y > 240) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`${idx + 1}. ${job.name}`, margin, y);
    y += lineHeight;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const statusColor = job.status === 'completed' ? [0, 128, 0] : 
                       job.status === 'failed' ? [255, 0, 0] : [128, 128, 128];
    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.text(`  Status: ${job.status.toUpperCase()}`, margin, y);
    doc.setTextColor(0, 0, 0);
    y += lineHeight;

    doc.text(`  File: ${job.dataFileName}`, margin, y);
    y += lineHeight;
    doc.text(`  Progress: ${job.progress}%`, margin, y);
    y += lineHeight;
    doc.text(`  Strategies: ${job.presets.map(p => p.strategyName).join(', ')}`, margin, y);
    y += lineHeight;

    if (job.results.length > 0) {
      const successCount = job.results.filter(r => r.success).length;
      const avgScore = job.results.reduce((sum, r) => sum + (r.totalScore || 0), 0) / job.results.length;
      doc.text(`  Results: ${successCount}/${job.results.length} successful, Avg Score: ${avgScore.toFixed(4)}`, margin, y);
      y += lineHeight;
    }

    y += 5;
  });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text(`Generated on ${new Date().toLocaleString()}`, margin, 285);
  doc.text('BSEE - Binary Stream Analysis Environment', pageWidth - margin, 285, { align: 'right' });

  return doc.output('blob');
}

/**
 * Generate a comprehensive analysis report PDF
 */
export function generateAnalysisReport(
  fileName: string,
  bits: string,
  metrics: Record<string, number>,
  anomalies: Array<{ name: string; position: number; length: number; severity: string }>,
  sequences: Array<{ pattern: string; count: number; positions: number[] }>,
  boundaries: Array<{ position: number; type: string }>
): Blob {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;
  const lineHeight = 6;
  const margin = 20;

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Binary Data Analysis Report', pageWidth / 2, y, { align: 'center' });
  y += 15;

  // File Info
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('File Information', margin, y);
  y += lineHeight;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`File Name: ${fileName}`, margin, y);
  y += lineHeight;
  doc.text(`Total Bits: ${bits.length}`, margin, y);
  y += lineHeight;
  doc.text(`Size: ${(bits.length / 8).toFixed(0)} bytes`, margin, y);
  y += 10;

  // Quick Stats
  const stats = BinaryMetrics.analyze(bits);
  const balance = bits.length > 0 ? stats.oneCount / bits.length : 0;
  const transitions = bits.split('').reduce((count, bit, i) => 
    i > 0 && bit !== bits[i - 1] ? count + 1 : count, 0);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Quick Statistics', margin, y);
  y += lineHeight;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const quickStats = [
    ['Ones:', stats.oneCount.toString()],
    ['Zeros:', stats.zeroCount.toString()],
    ['Balance:', `${(balance * 100).toFixed(2)}%`],
    ['Entropy:', stats.entropy.toFixed(4)],
    ['Transitions:', transitions.toString()],
    ['Mean Run Length:', stats.meanRunLength.toFixed(2)],
  ];

  quickStats.forEach(([label, value]) => {
    doc.text(`${label} ${value}`, margin, y);
    y += lineHeight;
  });
  y += 5;

  // Metrics Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Computed Metrics', margin, y);
  y += lineHeight;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const metricEntries = Object.entries(metrics).slice(0, 30);
  metricEntries.forEach(([name, value]) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    const displayValue = typeof value === 'number' ? value.toFixed(6) : String(value);
    doc.text(`${name}: ${displayValue}`, margin, y);
    y += lineHeight;
  });

  if (Object.keys(metrics).length > 30) {
    doc.text(`... and ${Object.keys(metrics).length - 30} more metrics`, margin, y);
    y += lineHeight;
  }

  // Anomalies Section
  doc.addPage();
  y = 20;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Detected Anomalies', margin, y);
  y += lineHeight;

  if (anomalies.length === 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('No anomalies detected.', margin, y);
    y += lineHeight;
  } else {
    doc.setFontSize(9);
    anomalies.slice(0, 20).forEach((anomaly, idx) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.text(`${idx + 1}. ${anomaly.name}`, margin, y);
      y += lineHeight;
      doc.setFont('helvetica', 'normal');
      doc.text(`   Position: ${anomaly.position}, Length: ${anomaly.length}, Severity: ${anomaly.severity}`, margin, y);
      y += lineHeight;
    });
  }

  // Sequences Section
  y += 10;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Detected Sequences', margin, y);
  y += lineHeight;

  if (sequences.length === 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('No repeating sequences detected.', margin, y);
    y += lineHeight;
  } else {
    doc.setFontSize(9);
    sequences.slice(0, 15).forEach((seq, idx) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.setFont('helvetica', 'normal');
      const patternDisplay = seq.pattern.length > 32 ? seq.pattern.slice(0, 32) + '...' : seq.pattern;
      doc.text(`${idx + 1}. Pattern: ${patternDisplay} (${seq.count} occurrences)`, margin, y);
      y += lineHeight;
    });
  }

  // Boundaries Section
  y += 10;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Detected Boundaries', margin, y);
  y += lineHeight;

  if (boundaries.length === 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('No structural boundaries detected.', margin, y);
  } else {
    doc.setFontSize(9);
    boundaries.slice(0, 20).forEach((boundary, idx) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.setFont('helvetica', 'normal');
      doc.text(`${idx + 1}. Position ${boundary.position} - ${boundary.type}`, margin, y);
      y += lineHeight;
    });
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text(`Generated on ${new Date().toLocaleString()}`, margin, 285);
  doc.text('BSEE - Binary Stream Analysis Environment', pageWidth - margin, 285, { align: 'right' });

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
