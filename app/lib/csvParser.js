import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import iconv from 'iconv-lite';

// Paths to data files in the project (defined literally for Vercel/webpack tracing)
const TUTORES_PATH = path.join(process.cwd(), 'data', 'csv', 'tutores.csv');
const NOMEADOS_PATH = path.join(process.cwd(), 'data', 'csv', 'Nomeados_6_chamamento.csv');
const MATRICULA_PATH = path.join(process.cwd(), 'data', 'csv', 'MATRICULA_6_CHAMAMENTO - DATA.csv');
const MODELO_PATH = path.join(process.cwd(), 'data', 'csv', 'MODELO_PLANILHA_ENSALAMENTO.csv');

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
      rg: r.rg || '',
      cpf: r.cpf || '',
      email_adm: r.email_adm || '',
      email_educ: r.email_educ || '',
      nre_tutor: r.nre_tutor || '',
      email_nre: r.email_nre || '',
      telefone: r.telefone || '',
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
    return records;
  } catch (error) {
    console.error('Error parsing MATRICULA_6_CHAMAMENTO - DATA.csv:', error);
    return [];
  }
}

// 4. Parse Modelo (UTF-8, comma separated)
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
