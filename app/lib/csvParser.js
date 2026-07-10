import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import iconv from 'iconv-lite';

// Paths to data files in the project (defined literally for Vercel/webpack tracing)
const TUTORES_PATH = path.join(process.cwd(), 'data', 'csv', 'tutores.csv');
const NOMEADOS_PATH = path.join(process.cwd(), 'data', 'csv', 'Nomeados_6_chamamento.csv');
const MATRICULA_PATH = path.join(process.cwd(), 'data', 'csv', 'MATRICULA_6_CHAMAMENTO - DATA.csv');
const MODELO_PATH = path.join(process.cwd(), 'data', 'csv', 'MODELO_PLANILHA_ENSALAMENTO.csv');
const TURMAS_PATH = path.join(process.cwd(), 'data', 'csv', 'TURMAS_ATUALIZADAS.csv');

// Helper to normalize strings (remove accents, trim, uppercase)
export function normalizeString(str) {
  if (!str) return '';
  return str
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

// Helper to convert Excel Serial Date (e.g. 46056) to 'DD/MM/YYYY'
function formatExcelDate(val) {
  if (!val) return '';
  const trimmed = val.toString().trim();
  if (/^\d+$/.test(trimmed)) {
    const serial = parseInt(trimmed, 10);
    // Excel erroneously treats 1900 as a leap year, so we offset differently for serial > 59
    const days = serial - (serial > 59 ? 2 : 1);
    const date = new Date(1900, 0, 1 + days);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
  return trimmed;
}

// Helper to convert Excel Serial Time (e.g. 0,645833333) to 'HH:MM'
function formatExcelTime(val) {
  if (!val) return '';
  const trimmed = val.toString().trim().replace(',', '.');
  if (/^0\.\d+$/.test(trimmed)) {
    const fraction = parseFloat(trimmed);
    const totalSeconds = Math.round(fraction * 24 * 3600);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }
  // If it has seconds like '08:00:00', trim them to '08:00'
  if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return trimmed.substring(0, 5);
  }
  return trimmed;
}

// Helper to extract or fix Google Classroom ID to avoid Excel's E+11 scientific notation
function formatClassroomId(idVal, classroomUrl) {
  const url = (classroomUrl || '').toString().trim();
  
  // Try to extract directly from Classroom URL first (completely safe from Excel truncation)
  // Example: https://classroom.google.com/c/ODQ5NzU5OTkwNTQz -> ODQ5NzU5OTkwNTQz -> decodes to 849759990543
  if (url) {
    const match = url.match(/\/c\/([a-zA-Z0-9]+)/);
    if (match && match[1]) {
      try {
        const decoded = Buffer.from(match[1], 'base64').toString('utf-8');
        // Check if the decoded value is a numeric ID
        if (/^\d+$/.test(decoded)) {
          return decoded;
        }
      } catch (err) {
        // Fallback
      }
    }
  }

  if (!idVal) return '';
  const trimmed = idVal.toString().trim().replace(',', '.');
  
  // If in scientific notation (e.g. 8.4976E+11)
  if (/^[+-]?\d+(\.\d+)?[eE][+-]?\d+$/.test(trimmed)) {
    const num = Number(trimmed);
    if (!isNaN(num)) {
      return Math.round(num).toString();
    }
  }

  return trimmed;
}


// 1. Parse Tutores (UTF-8, comma separated)
export function parseTutores() {
  try {
    if (!fs.existsSync(TUTORES_PATH)) {
      console.error('tutores.csv not found at', TUTORES_PATH);
      return [];
    }
    const content = fs.readFileSync(TUTORES_PATH, 'utf-8');
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    return records.map(r => ({
      tutor_responsavel: r.tutor_responsavel || '',
      rg:        r.rg        || '',
      cpf:       r.cpf       || '',
      email_adm: r.email_adm || '',
      email_educ: r.email_educ || '',
      nre_tutor: r.nre_tutor || '',
      // CSV column is 'e-mail_nre' (with hyphen) — must read with bracket notation
      email_nre: r['e-mail_nre'] || r.email_nre || '',
      telefone:  r.telefone  || '',
      observacoes: r.observacoes || ''
    }));
  } catch (error) {
    console.error('Error parsing tutores.csv:', error);
    return [];
  }
}

// 2. Parse Nomeados (Latin1/Windows-1252, semicolon separated)
export function parseNomeados() {
  try {
    if (!fs.existsSync(NOMEADOS_PATH)) {
      console.error('Nomeados_6_chamamento.csv not found at', NOMEADOS_PATH);
      return [];
    }
    // Read raw buffer and decode from win1252 (Latin1) to handle special chars correctly
    const buffer = fs.readFileSync(NOMEADOS_PATH);
    const content = iconv.decode(buffer, 'win1252');
    
    const records = parse(content, {
      columns: true,
      delimiter: ';',
      skip_empty_lines: true,
      trim: true
    });

    return records
      .filter(r => (r.NOME || '').trim() !== '' && (r.CPF || '').trim() !== '')
      .map(r => ({
        nre: r.NRE || '',
        vaga: r.VAGA || '',
      nome: r.NOME || '',
      insc: r.INSC || '',
      class: r.CLASS || '',
      conc: r.CONC || '',
      meta_4: r['META 4'] || '',
      data_ingresso: r['Data de Ingresso'] || '',
      edital: r.EDITAL || '',
      decreto: r.DECRETO || '',
      dioe: r.DIOE || '',
      rg: r.RG || '',
      uf: r.UF || '',
      cpf: r.CPF || '',
      ja_possui_padrao: r['J POSSUI PADRO SEED'] || r['J POSSUI PADRAO SEED'] || '',
      prorrogacao_posse: r['PRORROGAO DE POSSE'] || r['PRORROGAÇAO DE POSSE'] || '',
      prorrogacao_exercicio: r['PRORROGAO DE EXERCICIO'] || r['PRORROGAÇAO DE EXERCICIO'] || '',
      posse_exercicio: r['POSSE E EXERCICIO'] || '',
      acumulo_cargos: r['ACMULO DE CARGOS'] || r['ACUMULO DE CARGOS'] || '',
      desistente: r.DESISTENTE || '',
      data_exercicio: r['DATA DE EXERCCIO'] || r['DATA DE EXERCÍCIO'] || '',
      enviados_seap: r['ENVIADOS  SEAP'] || r['ENVIADOS A SEAP'] || '',
      observacao: r['OBSERVAO'] || r['OBSERVAÇÃO'] || ''
    }));
  } catch (error) {
    console.error('Error parsing Nomeados_6_chamamento.csv:', error);
    return [];
  }
}

// 3. Parse Matricula (win1252 / semicolon-separated — exported from Excel BR)
export function parseMatricula() {
  try {
    if (!fs.existsSync(MATRICULA_PATH)) {
      console.error('MATRICULA_6_CHAMAMENTO - DATA.csv not found at', MATRICULA_PATH);
      return [];
    }
    // Read raw buffer and decode from win1252 to handle special chars correctly
    const buffer = fs.readFileSync(MATRICULA_PATH);
    const content = iconv.decode(buffer, 'win1252');
    const records = parse(content, {
      columns: true,
      delimiter: ';',
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });
    
    // Clean Excel-corrupted fields (dates, times, and Classroom IDs)
    return records.map(r => {
      const Link_Classroom = r['Link Classroom'] || r['Link_Classroom'] || '';
      return {
        ...r,
        'Link Classroom': Link_Classroom,
        periodo_ini: formatExcelDate(r.periodo_ini),
        horario_inicial: formatExcelTime(r.horario_inicial),
        horario_fim: formatExcelTime(r.horario_fim),
        id_classroom: formatClassroomId(r.id_classroom, Link_Classroom),
      };
    });
  } catch (error) {
    console.error('Error parsing MATRICULA_6_CHAMAMENTO - DATA.csv:', error);
    return [];
  }
}

// 4. Parse Modelo (UTF-8, comma separated) — legacy, kept for reference
export function parseModelo() {
  try {
    if (!fs.existsSync(MODELO_PATH)) {
      console.error('MODELO_PLANILHA_ENSALAMENTO.csv not found at', MODELO_PATH);
      return [];
    }
    const content = fs.readFileSync(MODELO_PATH, 'utf-8');
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    return records;
  } catch (error) {
    console.error('Error parsing MODELO_PLANILHA_ENSALAMENTO.csv:', error);
    return [];
  }
}

// 5. Parse Turmas Atualizadas (UTF-8, semicolon separated)
// Columns: modalidade;componente;turma;dia_da_semana;horario_inicial;horario_fim;turno;ano_formativo;nome_formador;Link Classroom
export function parseTurmasAtualizadas() {
  try {
    if (!fs.existsSync(TURMAS_PATH)) {
      console.warn('TURMAS_ATUALIZADAS.csv not found, falling back to empty list.');
      return [];
    }
    const content = fs.readFileSync(TURMAS_PATH, 'utf-8');
    const records = parse(content, {
      columns: true,
      delimiter: ';',
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });

    // Deduplicate by turma name (keep first occurrence of each unique turma)
    const seen = new Set();
    return records
      .filter(r => {
        const key = (r.turma || '').trim().toUpperCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map(r => {
        const link = (r['Link Classroom'] || '').trim();
        return {
          modalidade:      (r.modalidade || '').trim(),
          componente:      (r.componente || '').trim(),
          turma:           (r.turma || '').trim(),
          dia_da_semana:   (r.dia_da_semana || '').trim(),
          horario_inicial: formatExcelTime(r.horario_inicial) || (r.horario_inicial || '').trim(),
          horario_fim:     formatExcelTime(r.horario_fim)     || (r.horario_fim     || '').trim(),
          turno:           (r.turno || '').trim(),
          ano_formativo:   (r.ano_formativo || '').trim(),
          nome_formador:   (r.nome_formador || '').trim(),
          'Link Classroom': link,
          id_classroom:    formatClassroomId('', link),
          // Fields not present in new file — kept blank for compatibility
          nre_tutor:           '',
          tutor_responsavel:   '',
          email_tutor:         '',
          'e-mail_nre':        '',
          nre_formador:        '',
          cpf_formador:        '',
          'e-mail_formador':   '',
          telefone_tutor:      '',
          telefone_formador:   '',
          rg_formador:         '',
          componente_formador: '',
        };
      });
  } catch (error) {
    console.error('Error parsing TURMAS_ATUALIZADAS.csv:', error);
    return [];
  }
}
