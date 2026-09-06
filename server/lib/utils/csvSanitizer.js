/**
 * server/lib/utils/csvSanitizer.js
 * Sanitizes fields against CSV / Spreadsheet Formula Injection (Formula Injection / OWASP CSV Injection).
 * Prevents execution of arbitrary code when opening CSV files in Excel or Google Sheets.
 */

/**
 * Sanitizes a single cell value against CSV formula injection.
 * If the value starts with =, +, -, @, \t, or \r, it is prefixed with a single quote (').
 * @param {any} value 
 * @returns {string}
 */
function sanitizeCsvField(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Neutralize formula injection triggers
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

/**
 * Converts an array of lead objects into a formula-sanitized CSV string.
 * @param {Array<Object>} rows 
 * @returns {string}
 */
function formatLeadsToCsv(rows) {
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
    'Stage Name',
    'Source Name',
    'Created At'
  ];

  const csvRows = [headers.join(',')];

  for (const row of rows) {
    const fields = [
      row.id,
      row.name,
      row.email,
      row.phone,
      row.company,
      row.product_interest,
      row.deal_value,
      row.qualification_status,
      row.qualification_score,
      row.stage_name,
      row.source_name,
      row.created_at
    ];

    const escaped = fields.map(field => {
      const sanitized = sanitizeCsvField(field);
      // Double quote escaping for CSV standard
      const cell = String(sanitized).replace(/"/g, '""');
      return `"${cell}"`;
    });

    csvRows.push(escaped.join(','));
  }

  return csvRows.join('\r\n');
}

module.exports = {
  sanitizeCsvField,
  formatLeadsToCsv
};
