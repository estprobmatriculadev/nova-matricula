/**
 * db.js — Camada de dados unificada
 *
 * Fonte primária: Firebase Firestore
 * Fonte estática: CSVs (nomeados, matricula base, tutores)
 *
 * Google Sheets é usado APENAS como espelho (escrita assíncrona),
 * nunca como fonte de leitura.
 */

import { parseMatricula, parseNomeados, parseTutores, normalizeString, parseTurmasAtualizadas } from './csvParser';
import {
  getEnrollmentsFromFirestore,
  saveEnrollmentToFirestore,
  updateEnrollmentInFirestore,
  getCapacitiesFromFirestore,
  saveCapacityToFirestore,
  clearAllEnrollments,
  atomicEnrollWithCounterCheck,
} from './supabaseDb'; // ← migrado de firebaseDb para Supabase

// Re-exporta clearAllEnrollments para uso na rota API de reset
export { clearAllEnrollments };

// Re-exporta atomicEnrollWithCounterCheck para uso na rota de ensalamento
export { atomicEnrollWithCounterCheck };

// ─────────────────────────────────────────────
// MATRÍCULAS NOVAS
// ─────────────────────────────────────────────

export async function getNewEnrollments() {
  return await getEnrollmentsFromFirestore();
}

export async function saveNewEnrollment(enrollment) {
  return await saveEnrollmentToFirestore(enrollment);
}

// ─────────────────────────────────────────────
// CAPACIDADES
// ─────────────────────────────────────────────

export async function getClassCapacities() {
  return await getCapacitiesFromFirestore();
}

export async function saveClassCapacity(classKey, capacity) {
  return await saveCapacityToFirestore(classKey, capacity);
}

// ─────────────────────────────────────────────
// TURMAS — calculadas a partir de CSV + Firestore
// ─────────────────────────────────────────────

export async function getClasses(preFetchedEnrollments = null, preFetchedCapacities = null) {
  // 0. Catálogo atualizado de turmas (TURMAS_ATUALIZADAS.csv)
  const turmasCatalog = parseTurmasAtualizadas();

  // Dados estáticos (CSV base da planilha original com cursistas já matriculados)
  const baseMatricula = parseMatricula();
  
  let newEnrollments = preFetchedEnrollments;
  let capacitiesConfig = preFetchedCapacities;

  // Se algum dado não foi passado pré-carregado, busca do banco em paralelo
  if (!newEnrollments || !capacitiesConfig) {
    const promises = [];
    if (!newEnrollments) {
      promises.push(getNewEnrollments().then(res => { newEnrollments = res; }));
    }
    if (!capacitiesConfig) {
      promises.push(getClassCapacities().then(res => { capacitiesConfig = res; }));
    }
    await Promise.all(promises);
  }

  const classesMap = {};

  // 0. Pré-popula o mapa com TODAS as turmas do catálogo atualizado
  // (garante que turmas sem matrícula ainda apareçam com vagas disponíveis)
  turmasCatalog.forEach(t => {
    const comp  = t.componente || '';
    const name  = t.turma     || '';
    const turno = t.turno     || '';
    const key   = `${normalizeString(comp)}|${normalizeString(name)}|${normalizeString(turno)}`;
    if (!classesMap[key]) {
      classesMap[key] = {
        componente:          comp,
        turma:               name,
        turno:               turno,
        dia_da_semana:       t.dia_da_semana   || '',
        horario_inicial:     t.horario_inicial || '',
        horario_fim:         t.horario_fim     || '',
        nome_formador:       t.nome_formador   || '',
        cpf_formador:        '',
        'e-mail_formador':   '',
        tutor_responsavel:   '',
        email_tutor:         '',
        'e-mail_nre':        '',
        nre_tutor:           '',
        Link_Classroom:      t['Link Classroom'] || '',
        id_classroom:        t.id_classroom    || '',
        nre_formador:        '',
        telefone_tutor:      '',
        telefone_formador:   '',
        rg_formador:         '',
        componente_formador: '',
        enrolledCount:       0,
        newEnrolledCount:    0,
      };
    }
  });

  // Conjunto de CPFs no Firestore para evitar contagem dupla
  const firestoreCpfs = new Set(
    newEnrollments.map(e => (e.cpf_cursista || '').toString().replace(/\D/g, ''))
  );

  // 1. Agrupa turmas existentes no CSV base
  baseMatricula.forEach(student => {
    // Se o aluno do CSV já fez matrícula ou foi alterado pelo portal (está no Firestore),
    // nós não contamos ele na turma antiga do CSV para não ocupar vaga duas vezes.
    const studentCpf = (student.cpf_cursista || student.cpf || '').toString().replace(/\D/g, '');
    if (studentCpf && firestoreCpfs.has(studentCpf)) {
      return;
    }

    const comp  = student.componente || '';
    const name  = student.turma     || '';
    const turno = student.turno     || '';
    const key   = `${normalizeString(comp)}|${normalizeString(name)}|${normalizeString(turno)}`;

    if (!classesMap[key]) {
      classesMap[key] = {
        componente:      comp,
        turma:           name,
        turno:           turno,
        dia_da_semana:   student.dia_da_semana   || '',
        horario_inicial: student.horario_inicial || '',
        horario_fim:     student.horario_fim     || '',
        nome_formador:   student.nome_formador   || '',
        cpf_formador:    student.cpf_formador    || '',
        'e-mail_formador': student['e-mail_formador'] || student['email_formador'] || '',
        tutor_responsavel: student.tutor_responsavel || '',
        email_tutor:     student.email_tutor     || '',
        'e-mail_nre':    student['e-mail_nre']   || student['email_nre'] || '',
        nre_tutor:       student.nre_tutor       || '',
        Link_Classroom:  student['Link Classroom'] || student['Link_Classroom'] || '',
        id_classroom:    student.id_classroom    || '',
        nre_formador:    student.nre_formador    || '',
        telefone_tutor:  student.telefone_tutor  || '',
        telefone_formador: student.telefone_formador || '',
        rg_formador:     student.rg_formador     || '',
        componente_formador: student.componente_formador || '',
        enrolledCount:   0,
        newEnrolledCount: 0,
      };
    }
    
    // Apenas incrementa a contagem de matriculados se houver de fato um cursista nesta linha
    const hasStudent = (student.nome_cursista || student.nome || '').toString().trim() !== '' ||
                       (student.cpf_cursista || student.cpf || '').toString().trim() !== '';
    if (hasStudent) {
      classesMap[key].enrolledCount += 1;
    }
  });

  // 2. Conta matrículas novas do Firestore
  newEnrollments.forEach(student => {
    // Registros manuais não ocupam vaga física em turmas do portal
    if (student.ensaladoManual || student.turma === 'MANUAL') {
      return;
    }

    const comp  = student.componente || '';
    const name  = student.turma     || '';
    const turno = student.turno     || '';
    const key   = `${normalizeString(comp)}|${normalizeString(name)}|${normalizeString(turno)}`;

    if (classesMap[key]) {
      classesMap[key].enrolledCount    += 1;
      classesMap[key].newEnrolledCount += 1;
    } else {
      // Turma nova criada apenas pelo portal (improvável, mas seguro)
      classesMap[key] = {
        componente:      comp,
        turma:           name,
        turno:           student.turno           || '',
        dia_da_semana:   student.dia_da_semana   || '',
        horario_inicial: student.horario_inicial || '',
        horario_fim:     student.horario_fim     || '',
        nome_formador:   student.nome_formador   || '',
        cpf_formador:    student.cpf_formador    || '',
        'e-mail_formador': student['e-mail_formador'] || '',
        tutor_responsavel: student.tutor_responsavel || '',
        email_tutor:     student.email_tutor     || '',
        'e-mail_nre':    student['e-mail_nre']   || '',
        nre_tutor:       student.nre_tutor       || '',
        Link_Classroom:  student['Link Classroom'] || '',
        id_classroom:    student.id_classroom    || '',
        nre_formador:    student.nre_formador    || '',
        telefone_tutor:  student.telefone_tutor  || '',
        telefone_formador: student.telefone_formador || '',
        rg_formador:     student.rg_formador     || '',
        componente_formador: student.componente_formador || '',
        enrolledCount:   1,
        newEnrolledCount: 1,
      };
    }
  });

  // 3. Calcula capacidades e vagas
  return Object.keys(classesMap).map(key => {
    const cls      = classesMap[key];
    const isTecnicos = normalizeString(cls.componente || '').includes('TECNIC');
    const defaultCapacity = isTecnicos ? 30 : 10;
    const capacity = capacitiesConfig[key] !== undefined ? capacitiesConfig[key] : defaultCapacity;
    const vacancies = Math.max(0, capacity - cls.enrolledCount);
    return { ...cls, classKey: key, capacity, vacancies };
  });
}
