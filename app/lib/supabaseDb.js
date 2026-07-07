/**
 * supabaseDb.js
 * Camada de acesso ao banco — Supabase (PostgreSQL)
 * Substitui firebaseDb.js com a mesma interface de funções.
 *
 * Tabelas:
 *   enrollments          — matrículas feitas pelo portal
 *   class_capacities     — capacidade configurada por turma
 *   class_portal_counts  — contador atômico de vagas por turma
 *
 * Função SQL:
 *   atomic_enroll()      — check + insert em uma única transação PostgreSQL
 */

import { getSupabase } from './supabase';

// ─────────────────────────────────────────────
// CACHE EM MEMÓRIA (reduz leituras no banco)
// ─────────────────────────────────────────────
const _cache = new Map();

function _getCached(key) {
  const entry = _cache.get(key);
  if (entry && Date.now() < entry.expiresAt) return entry.data;
  _cache.delete(key);
  return null;
}

function _setCached(key, data, ttlMs) {
  _cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

function _invalidateCache(...keys) {
  if (keys.length === 0) {
    _cache.clear();
  } else {
    keys.forEach(k => _cache.delete(k));
  }
}

const TTL_ENROLLMENTS = 60_000;   // 60 segundos
const TTL_CAPACITIES  = 300_000;  // 5 minutos

// ─────────────────────────────────────────────
// MATRÍCULAS
// ─────────────────────────────────────────────

/**
 * Retorna todas as matrículas feitas pelo portal.
 * Resultado cacheado por TTL_ENROLLMENTS.
 */
export async function getEnrollmentsFromFirestore() {
  const cached = _getCached('enrollments');
  if (cached) return cached;

  try {
    const db = getSupabase();
    const { data, error } = await db
      .from('enrollments')
      .select('data');

    if (error) throw error;

    const result = (data || []).map(row => row.data);
    _setCached('enrollments', result, TTL_ENROLLMENTS);
    return result;
  } catch (error) {
    console.error('Supabase getEnrollments error:', error);
    return [];
  }
}

/**
 * Salva uma nova matrícula (sem checagem de vaga — use atomicEnrollWithCounterCheck).
 */
export async function saveEnrollmentToFirestore(enrollment) {
  try {
    const db = getSupabase();
    const cpf = (enrollment.cpf_cursista || '').toString().replace(/\D/g, '');
    if (!cpf) throw new Error('CPF inválido.');

    const compKey = (enrollment.componente || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
    const id = `${cpf}_${compKey}`;

    const { error } = await db
      .from('enrollments')
      .upsert({ id, data: { ...enrollment, _createdAt: new Date().toISOString() } });

    if (error) throw error;
    _invalidateCache('enrollments');
    return { success: true };
  } catch (error) {
    console.error('Supabase saveEnrollment error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Insere uma matrícula de forma ATÔMICA usando função PostgreSQL.
 * Garante que verificação de vaga e gravação acontecem na mesma transação.
 *
 * @param {object} enrollment - Dados completos da matrícula
 * @param {string} classKey   - Chave da turma (componente|turma|turno normalizado)
 * @param {number} csvCount   - Cursistas do CSV base nessa turma (estático)
 * @param {number} capacity   - Capacidade total da turma
 */
export async function atomicEnrollWithCounterCheck(enrollment, classKey, csvCount, capacity) {
  try {
    const db = getSupabase();

    const cpf = (enrollment.cpf_cursista || '').toString().replace(/\D/g, '');
    if (!cpf) throw new Error('CPF inválido.');

    const compKey = (enrollment.componente || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
    const enrollmentId = `${cpf}_${compKey}`;

    const { data, error } = await db.rpc('atomic_enroll', {
      p_enrollment_id:   enrollmentId,
      p_enrollment_data: { ...enrollment, _createdAt: new Date().toISOString() },
      p_class_key:       classKey,
      p_csv_count:       csvCount,
      p_capacity:        capacity,
    });

    if (error) throw error;

    if (data === 'TURMA_LOTADA') {
      return { success: false, turmaLotada: true, error: 'Turma lotada. Não há vagas disponíveis.' };
    }

    _invalidateCache('enrollments');
    return { success: true };
  } catch (error) {
    console.error('Supabase atomicEnroll error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Atualiza campos de uma matrícula existente (remanejamento de turma).
 */
export async function updateEnrollmentInFirestore(cpf, componente, updates) {
  try {
    const db = getSupabase();
    const cleanCpf = cpf.toString().replace(/\D/g, '');
    const compKey  = (componente || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
    const id = `${cleanCpf}_${compKey}`;

    // Verifica se existe
    const { data: existing, error: fetchError } = await db
      .from('enrollments')
      .select('data')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return { success: false, error: 'Matrícula não encontrada.' };
    }

    const updated = {
      ...existing.data,
      ...updates,
      _alteredAt: new Date().toISOString(),
    };

    const { error } = await db
      .from('enrollments')
      .update({ data: updated })
      .eq('id', id);

    if (error) throw error;
    _invalidateCache('enrollments');
    return { success: true };
  } catch (error) {
    console.error('Supabase updateEnrollment error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Remove todas as matrículas e zera os contadores de turma.
 */
export async function clearAllEnrollments() {
  try {
    const db = getSupabase();

    const [enrollRes, countsRes] = await Promise.all([
      db.from('enrollments').select('id', { count: 'exact', head: true }),
      db.from('class_portal_counts').delete().neq('class_key', ''),
    ]);

    const count = enrollRes.count || 0;
    await db.from('enrollments').delete().neq('id', '');

    _invalidateCache();
    return { success: true, count };
  } catch (error) {
    console.error('Supabase clearAllEnrollments error:', error);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────
// CAPACIDADES DAS TURMAS
// ─────────────────────────────────────────────

/**
 * Retorna o mapa de capacidades { classKey: number }.
 * Resultado cacheado por TTL_CAPACITIES.
 */
export async function getCapacitiesFromFirestore() {
  const cached = _getCached('capacities');
  if (cached) return cached;

  try {
    const db = getSupabase();
    const { data, error } = await db
      .from('class_capacities')
      .select('class_key, capacity');

    if (error) throw error;

    const capacities = {};
    (data || []).forEach(row => {
      capacities[row.class_key] = row.capacity;
    });
    _setCached('capacities', capacities, TTL_CAPACITIES);
    return capacities;
  } catch (error) {
    console.error('Supabase getCapacities error:', error);
    return {};
  }
}

/**
 * Salva/atualiza a capacidade de uma turma.
 */
export async function saveCapacityToFirestore(classKey, capacity) {
  try {
    const db = getSupabase();
    const { error } = await db
      .from('class_capacities')
      .upsert({ class_key: classKey, capacity: Number(capacity), updated_at: new Date().toISOString() });

    if (error) throw error;
    _invalidateCache('capacities');
    return { success: true };
  } catch (error) {
    console.error('Supabase saveCapacity error:', error);
    return { success: false, error: error.message };
  }
}
