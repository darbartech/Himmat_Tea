import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Download, Printer, FileText } from 'lucide-react';
import { Button } from './ui/button';

export interface ExportOptions {
  title?: string;
  filename?: string;
}

export const exportToPDF = async (
  t: (key: string, params?: any) => string,
  element: HTMLElement,
  options: ExportOptions = {}
) => {
  try {
    const { title = 'Document', filename = 'document' } = options;
    
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const imgWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`${filename}-${Date.now()}.pdf`);
  } catch (error) {
    console.error('PDF export failed:', error);
    alert(t('dashboard.exports.pdfFailed'));
  }
};

export const exportToCSV = (
  t: (key: string, params?: any) => string,
  data: any[],
  options: ExportOptions = {}
) => {
  try {
    const { filename = 'data' } = options;
    
    if (!data.length) {
      alert(t('dashboard.exports.noData'));
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          const stringValue = value !== null && value !== undefined ? String(value) : '';
          return `"${stringValue.replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('CSV export failed:', error);
    alert(t('dashboard.exports.csvFailed'));
  }
};

export const printElement = (
  element: HTMLElement,
  options: ExportOptions = {}
) => {
  const { title = 'Document' } = options;
  
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 20px;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        @media print {
          @page { margin: 10mm; }
        }
      </style>
    </head>
    <body>
      ${element.outerHTML}
    </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };
};

export const ExportButtons = ({
  onExportPDF,
  onExportCSV,
  onPrint,
  disabled = false,
}: {
  onExportPDF?: () => void;
  onExportCSV?: () => void;
  onPrint?: () => void;
  disabled?: boolean;
}) => {
  return (
    <div className="flex flex-wrap gap-2">
      {onPrint && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onPrint}
          disabled={disabled}
        >
          <Printer className="h-4 w-4 mr-1.5" />
          Print
        </Button>
      )}
      {onExportPDF && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onExportPDF}
          disabled={disabled}
        >
          <FileText className="h-4 w-4 mr-1.5" />
          Export PDF
        </Button>
      )}
      {onExportCSV && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onExportCSV}
          disabled={disabled}
        >
          <Download className="h-4 w-4 mr-1.5" />
          Export CSV
        </Button>
      )}
    </div>
  );
};
