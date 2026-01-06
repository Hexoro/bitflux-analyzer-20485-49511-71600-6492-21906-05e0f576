// Chart export utilities for exporting charts as images and data

import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';

export class ChartExporter {
  /**
   * Export a DOM element as PNG image
   */
  static async toPNG(element: HTMLElement, filename: string): Promise<void> {
    try {
      const canvas = await html2canvas(element, {
        backgroundColor: '#000000',
        scale: 2, // Higher quality
      });
      
      canvas.toBlob((blob) => {
        if (blob) {
          saveAs(blob, filename);
        }
      });
    } catch (error) {
      console.error('Failed to export chart as PNG:', error);
      throw error;
    }
  }

  /**
   * Export chart data as CSV
   */
  static toCSV(data: any[], filename: string): void {
    if (!data || data.length === 0) {
      console.error('No data to export');
      return;
    }

    // Get headers from first object
    const headers = Object.keys(data[0]);
    
    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape commas and quotes
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, filename);
  }

  /**
   * Export chart data as JSON
   */
  static toJSON(data: any[], filename: string): void {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    saveAs(blob, filename);
  }

  /**
   * Export SVG element as SVG file
   */
  static toSVG(svgElement: SVGElement, filename: string): void {
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    saveAs(blob, filename);
  }
}
