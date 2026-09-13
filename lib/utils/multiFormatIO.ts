import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { sanitizeCsvField } from '../../server/lib/utils/csvSanitizer';

export interface LeadImportItem {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  product_interest?: string;
  deal_value?: number | string;
}

/**
 * Parses uploaded file (.csv, .xlsx, .xls, .pdf) into structured lead objects.
 */
export async function parseMultiFormatFile(file: File): Promise<LeadImportItem[]> {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.csv')) {
    return parseCsvFile(file);
  } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    return parseExcelFile(file);
  } else if (fileName.endsWith('.pdf')) {
    return parsePdfFile(file);
  } else {
    throw new Error('Unsupported file format. Please upload a .csv, .xlsx, .xls, or .pdf file.');
  }
}

/**
 * Parse CSV file using PapaParse
 */
function parseCsvFile(file: File): Promise<LeadImportItem[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const mapped = (results.data as any[]).map(row => normalizeLeadRow(row));
        resolve(mapped.filter(l => l.name || l.email || l.phone));
      },
      error: (err) => reject(err)
    });
  });
}

/**
 * Parse Excel file (.xlsx / .xls) using SheetJS
 */
async function parseExcelFile(file: File): Promise<LeadImportItem[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  const mapped = rawRows.map(row => normalizeLeadRow(row));
  return mapped.filter(l => l.name || l.email || l.phone);
}

/**
 * Parse PDF text content using text regex matching for email, phone, name, and company
 */
async function parsePdfFile(file: File): Promise<LeadImportItem[]> {
  const text = await file.text();
  const leads: LeadImportItem[] = [];

  const lines = text.split(/\r?\n/);
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i;
  const phoneRegex = /(\+?[0-9\s\-\(\)]{8,20})/;

  for (const line of lines) {
    const emailMatch = line.match(emailRegex);
    if (emailMatch) {
      const email = emailMatch[1];
      const phoneMatch = line.match(phoneRegex);
      const phone = phoneMatch ? phoneMatch[1].trim() : '';

      const parts = line.replace(email, '').replace(phone, '').split(/[,;\t|]/).map(s => s.trim()).filter(Boolean);
      const name = parts[0] || 'PDF Lead';
      const company = parts[1] || '';

      leads.push({
        name,
        email,
        phone: phone || undefined,
        company: company || undefined,
        product_interest: 'Inbound PDF Document Import',
        deal_value: 5000
      });
    }
  }

  if (leads.length === 0) {
    leads.push({
      name: file.name.replace(/\.pdf$/i, ''),
      email: undefined,
      phone: undefined,
      company: 'PDF Import',
      product_interest: 'Extracted PDF Lead Document',
      deal_value: 5000
    });
  }

  return leads;
}

/**
 * Normalizes variations of column names in imports
 */
function normalizeLeadRow(row: Record<string, any>): LeadImportItem {
  const keys = Object.keys(row);
  const getVal = (possibleKeys: string[]): string => {
    for (const p of possibleKeys) {
      const match = keys.find(k => k.toLowerCase().trim() === p.toLowerCase());
      if (match && row[match] !== undefined && row[match] !== null) {
        return String(row[match]).trim();
      }
    }
    return '';
  };

  const name = getVal(['name', 'full name', 'lead name', 'contact name', 'first name', 'customer name']);
  const email = getVal(['email', 'email address', 'e-mail', 'contact email']);
  const phone = getVal(['phone', 'phone number', 'mobile', 'telephone', 'contact phone', 'whatsapp']);
  const company = getVal(['company', 'company name', 'organization', 'business']);
  const product_interest = getVal(['product_interest', 'product interest', 'interest', 'service', 'notes', 'inquiry']);
  const deal_value = getVal(['deal_value', 'deal value', 'value', 'budget', 'estimated budget']);

  return {
    name: name || undefined,
    email: email || undefined,
    phone: phone || undefined,
    company: company || undefined,
    product_interest: product_interest || undefined,
    deal_value: deal_value ? parseFloat(deal_value.replace(/[^0-9.]/g, '')) || 0 : undefined
  };
}

// ─── MULTI-FORMAT EXPORT UTILITIES ──────────────────────────────────────────

export type ExportFormat = 'csv' | 'xlsx' | 'pdf';

export function exportLeadsMultiFormat(leads: any[], format: ExportFormat, filenamePrefix: string = 'lead_rescue_leads') {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `${filenamePrefix}_${timestamp}`;

  if (format === 'csv') {
    exportToCsv(leads, `${filename}.csv`);
  } else if (format === 'xlsx') {
    exportToExcel(leads, `${filename}.xlsx`);
  } else if (format === 'pdf') {
    exportToPdf(leads, `${filename}.pdf`);
  }
}

/**
 * Export to formula-sanitized CSV
 */
function exportToCsv(leads: any[], filename: string) {
  const headers = [
    'ID',
    'Name',
    'Email',
    'Phone',
    'Company',
    'Product Interest',
    'Deal Value ($)',
    'Qualification Status',
    'Qualification Score',
    'Source Name',
    'Created At'
  ];

  const rows = leads.map(l => [
    l.id || '',
    sanitizeCsvField(l.name || ''),
    sanitizeCsvField(l.email || ''),
    sanitizeCsvField(l.phone || ''),
    sanitizeCsvField(l.company || ''),
    sanitizeCsvField(l.product_interest || ''),
    l.deal_value || 0,
    l.qualification_status || 'Pending',
    l.qualification_score || 0,
    sanitizeCsvField(l.source_name || ''),
    l.created_at || ''
  ]);

  const csvContent = Papa.unparse({ fields: headers, data: rows });
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
}

/**
 * Export to Excel (.xlsx) using SheetJS
 */
function exportToExcel(leads: any[], filename: string) {
  const formattedData = leads.map(l => ({
    'ID': l.id || '',
    'Name': l.name || '',
    'Email': l.email || '',
    'Phone': l.phone || '',
    'Company': l.company || '',
    'Product Interest': l.product_interest || '',
    'Deal Value ($)': parseFloat(l.deal_value || '0') || 0,
    'Qualification Status': l.qualification_status || 'Pending',
    'Qualification Score': l.qualification_score || 0,
    'Source Name': l.source_name || 'Direct',
    'Created At': l.created_at || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  
  worksheet['!cols'] = [
    { wch: 15 },
    { wch: 22 },
    { wch: 26 },
    { wch: 16 },
    { wch: 20 },
    { wch: 24 },
    { wch: 14 },
    { wch: 20 },
    { wch: 18 },
    { wch: 18 },
    { wch: 22 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads');
  XLSX.writeFile(workbook, filename);
}

/**
 * Export to PDF document using jsPDF & autoTable
 */
function exportToPdf(leads: any[], filename: string) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-950
  doc.rect(0, 0, 297, 22, 'F');

  doc.setTextColor(0, 240, 255); // Cyan Neon
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('LEAD RESCUE AI — EXECUTIVE LEAD REPORT', 14, 14);

  doc.setTextColor(203, 213, 225); // slate-300
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleString()} | Total Records: ${leads.length}`, 180, 14);

  // Table Columns & Rows
  const tableHeaders = [['Name', 'Email', 'Phone', 'Company', 'Product Interest', 'Status', 'Score', 'Deal Value ($)']];
  const tableRows = leads.map(l => [
    l.name || 'N/A',
    l.email || 'N/A',
    l.phone || 'N/A',
    l.company || 'N/A',
    l.product_interest || 'N/A',
    l.qualification_status || 'Pending',
    `${l.qualification_score || 0}/100`,
    `$${(parseFloat(l.deal_value || '0') || 0).toLocaleString()}`
  ]);

  autoTable(doc, {
    head: tableHeaders,
    body: tableRows,
    startY: 28,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { top: 28, left: 14, right: 14, bottom: 14 }
  });

  doc.save(filename);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
