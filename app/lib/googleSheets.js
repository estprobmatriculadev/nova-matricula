import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID || '19TpaU9BOA7SZ85cfLDs0AkW1_XhdoFssT1SXZIQrOus';
const TAB_NAME = process.env.GOOGLE_SHEET_TAB_NAME || ''; // If empty, defaults to first tab

// Helper to check if credentials are configured
export function isSheetsConfigured() {
  return !!(
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
    (
      (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL) &&
      process.env.GOOGLE_PRIVATE_KEY
    )
  );
}

function getPrivateKey() {
  let key = process.env.GOOGLE_PRIVATE_KEY || '';
  
  // Clean surrounding quotes
  if (key.startsWith('"') && key.endsWith('"')) {
    key = key.slice(1, -1);
  }
  if (key.startsWith("'") && key.endsWith("'")) {
    key = key.slice(1, -1);
  }
  
  // Replace literal escaped newlines if present
  key = key.replace(/\\n/g, '\n');

  // Detect header type
  let isRsa = false;
  let cleanKey = key;
  if (key.includes('RSA PRIVATE KEY')) {
    isRsa = true;
    cleanKey = cleanKey
      .replace('-----BEGIN RSA PRIVATE KEY-----', '')
      .replace('-----END RSA PRIVATE KEY-----', '');
  } else {
    cleanKey = cleanKey
      .replace('-----BEGIN PRIVATE KEY-----', '')
      .replace('-----END PRIVATE KEY-----', '');
  }

  // Strip all whitespaces, carriage returns, and newlines
  const base64Data = cleanKey.replace(/\s+/g, '');

  // Re-wrap the base64 data to 64-char lines
  const lines = [];
  if (isRsa) {
    lines.push('-----BEGIN RSA PRIVATE KEY-----');
  } else {
    lines.push('-----BEGIN PRIVATE KEY-----');
  }

  for (let i = 0; i < base64Data.length; i += 64) {
    lines.push(base64Data.substring(i, i + 64));
  }

  if (isRsa) {
    lines.push('-----END RSA PRIVATE KEY-----');
  } else {
    lines.push('-----END PRIVATE KEY-----');
  }

  return lines.join('\n');
}

// Centralized auth helper — supports full JSON or individual env vars
function getAuth(scopes) {
  let credentials;
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    } catch (e) {
      console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON:', e);
    }
  }
  if (!credentials) {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = getPrivateKey();
    credentials = { client_email: email, private_key: privateKey };
  }
  return new google.auth.GoogleAuth({ credentials, scopes });
}

// Columns order as in MATRICULA_6_CHAMAMENTO - DATA.csv
export const HEADERS_ORDER = [
  'nome_cursista',
  'e-mail',
  'modalidade',
  'componente',
  'turma',
  'dia_da_semana',
  'horario_inicial',
  'horario_fim',
  'turno',
  'ano_formativo',
  'nome_formador',
  'cpf_formador',
  'tutor_responsavel',
  'email_tutor',
  'e-mail_formador',
  'Link Classroom',
  'nre_tutor',
  'e-mail_nre',
  'id_classroom',
  'cgm',
  'rg',
  'periodo_ini',
  'chamamento',
  'nre_exe',
  'munic_exe',
  'componente_conc',
  'nre_formador',
  'telefone_tutor',
  'telefone_formador',
  'telefone_cursista',
  'rg_formador',
  'componente_formador',
  'cpf_cursista',
  'observacoes_cursista',
  'observacoes_formador',
  'observacoes_tutor',
  'observacoes_turma',
  'cod_cursista',
  'possui_acessibilidade',
  'tipo_deficiencia',
  'necessidades_especificas',
  'outras_necessidades'
];

export async function appendEnrollmentToSheets(student) {
  if (!isSheetsConfigured()) {
    console.warn('Google Sheets is not configured. Skipping sync.');
    return { success: false, reason: 'NOT_CONFIGURED' };
  }

  try {
    const auth = getAuth(['https://www.googleapis.com/auth/spreadsheets']);
    const sheets = google.sheets({ version: 'v4', auth });


    // Map student object to ordered array of values
    const rowValues = HEADERS_ORDER.map(header => {
      // Handle key matches in different casings or formats
      if (header === 'Link Classroom') {
        return student['Link Classroom'] || student['Link_Classroom'] || '';
      }
      if (header === 'e-mail_formador') {
        return student['e-mail_formador'] || student['email_formador'] || '';
      }
      if (header === 'e-mail_nre') {
        return student['e-mail_nre'] || student['email_nre'] || '';
      }
      return student[header] || '';
    });

    const range = TAB_NAME ? `${TAB_NAME}!A:AL` : 'A:AL';

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [rowValues]
      }
    });

    return { success: true, updatedCells: response.data.updates.updatedCells };
  } catch (error) {
    console.error('Error appending enrollment to Google Sheets:', error);
    return { success: false, error: error.message };
  }
}

export async function getEnrollmentsFromSheets() {
  if (!isSheetsConfigured()) {
    return [];
  }
  try {
    const auth = getAuth(['https://www.googleapis.com/auth/spreadsheets.readonly']);
    const sheets = google.sheets({ version: 'v4', auth });
    const range = TAB_NAME ? `${TAB_NAME}!A:AL` : 'A:AL';

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) {
      return [];
    }

    const headers = rows[0]; // first row is headers
    const studentRows = rows.slice(1);

    // Map rows back to objects matching schema
    return studentRows.map(row => {
      const student = {};
      HEADERS_ORDER.forEach((header, index) => {
        student[header] = row[index] || '';
      });
      // Ensure CPF field is cleaned for robust matching
      if (student.cpf_cursista) {
        student.cpf_cursista = student.cpf_cursista.toString().replace(/\D/g, '');
      }
      return student;
    });
  } catch (error) {
    console.error('Error fetching enrollments from Google Sheets:', error);
    return [];
  }
}

export async function getCapacitiesFromSheets() {
  if (!isSheetsConfigured()) {
    return {};
  }
  try {
    const auth = getAuth(['https://www.googleapis.com/auth/spreadsheets.readonly']);
    const sheets = google.sheets({ version: 'v4', auth });

    // Read from 'Capacidades' sheet tab
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Capacidades!A:B'
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return {};
    }

    const capacities = {};
    rows.forEach(row => {
      const key = row[0];
      const cap = parseInt(row[1], 10);
      if (key && !isNaN(cap)) {
        capacities[key] = cap;
      }
    });
    return capacities;
  } catch (error) {
    // If sheet 'Capacidades' does not exist yet, catch and return empty config
    console.warn("Could not read 'Capacidades' tab (it might not exist yet):", error.message);
    return {};
  }
}

export async function saveCapacityToSheets(classKey, capacity) {
  if (!isSheetsConfigured()) {
    return { success: false, reason: 'NOT_CONFIGURED' };
  }
  try {
    const auth = getAuth(['https://www.googleapis.com/auth/spreadsheets']);
    const sheets = google.sheets({ version: 'v4', auth });

    // Fetch existing rows to find if key already exists
    let rows = [];
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Capacidades!A:B'
      });
      rows = response.data.values || [];
    } catch (e) {
      console.warn('Creating first row in Capacidades tab. Error reading:', e.message);
    }

    const rowIndex = rows.findIndex(row => row[0] === classKey);

    if (rowIndex !== -1) {
      // Key found, update existing row
      // Note: Google Sheets API rows are 1-indexed, so index 0 is row 1
      const updateRange = `Capacidades!B${rowIndex + 1}`;
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: updateRange,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[capacity]]
        }
      });
    } else {
      // Key not found, append new row
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Capacidades!A:B',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [[classKey, capacity]]
        }
      });
    }
    return { success: true };
  } catch (error) {
    console.error('Error saving class capacity to Google Sheets:', error);
    return { success: false, error: error.message };
  }
}
