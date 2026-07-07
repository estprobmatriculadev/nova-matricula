/**
 * firebaseDb.js
 * Camada de acesso ao Firestore — substitui new_enrollments.json e class_capacities.json
 *
 * Collections:
 *   enrollments/{cpf_cursista}   — uma matrícula por CPF
 *   class_capacities/{classKey}  — capacidade de cada turma
 *   class_portal_counts/{key}    — contador atômico de vagas por turma
 */

import { getFirestore } from './firebase';

// ─────────────────────────────────────────────
// CACHE EM MEMÓRIA (reduz leituras no Firestore)
// ─────────────────────────────────────────────
// Armazena respostas do Firestore por até TTL_MS millisegundos.
// Cada nova matrícula ou reset invalida o cache automaticamente.
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

const TTL_ENROLLMENTS = 60_000;  // 60 segundos
const TTL_CAPACITIES  = 300_000; // 5 minutos


// ─────────────────────────────────────────────
// MATRÍCULAS
// ─────────────────────────────────────────────

/**
 * Retorna todas as matrículas novas (feitas pelo portal).
 * Resultado é cacheado por TTL_ENROLLMENTS para reduzir leituras no Firestore.
 */
export async function getEnrollmentsFromFirestore() {
  const cached = _getCached('enrollments');
  if (cached) return cached;

  try {
    const db = getFirestore();
    const snapshot = await db.collection('enrollments').get();
    const result = snapshot.empty ? [] : snapshot.docs.map(doc => doc.data());
    _setCached('enrollments', result, TTL_ENROLLMENTS);
    return result;
  } catch (error) {
    console.error('Firestore getEnrollments error:', error);
    return [];
  }
}

/**
 * Salva uma nova matrícula.
 * Usa a combinação de CPF + Componente como ID do documento para permitir múltiplos vínculos por CPF.
 */
export async function saveEnrollmentToFirestore(enrollment) {
  try {
    const db = getFirestore();
    const cpf = (enrollment.cpf_cursista || '').toString().replace(/\D/g, '');
    if (!cpf) throw new Error('CPF inválido para salvar no Firestore.');

    const compKey = (enrollment.componente || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
    const docId = `${cpf}_${compKey}`;

    await db.collection('enrollments').doc(docId).set({
      ...enrollment,
      _createdAt: new Date().toISOString(),
    });
    return { success: true };
  } catch (error) {
    console.error('Firestore saveEnrollment error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Insere uma matrícula de forma ATÔMICA, verificando e reservando vaga na mesma transação.
 *
 * Usa um documento contador por turma (class_portal_counts/{safeClassKey}) para impedir
 * que dois ensalamentos simultâneos passem pela verificação de vaga antes de um deles gravar.
 *
 * @param {object} enrollment     - Dados completos da matrícula
 * @param {string} classKey       - Chave da turma (componente|turma|turno normalizado)
 * @param {number} csvCount       - Cursistas do CSV base já nessa turma (contagem estática)
 * @param {number} capacity       - Capacidade total configurada para a turma
 */
export async function atomicEnrollWithCounterCheck(enrollment, classKey, csvCount, capacity) {
  try {
    const db = getFirestore();
    const safeId = Buffer.from(classKey).toString('base64url');
    const counterRef = db.collection('class_portal_counts').doc(safeId);

    const cpf = (enrollment.cpf_cursista || '').toString().replace(/\D/g, '');
    if (!cpf) throw new Error('CPF inválido para salvar no Firestore.');

    const compKey = (enrollment.componente || '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toUpperCase();
    const enrollRef = db.collection('enrollments').doc(`${cpf}_${compKey}`);

    await db.runTransaction(async (tx) => {
      const counterDoc = await tx.get(counterRef);
      const portalCount = counterDoc.exists ? (counterDoc.data().count || 0) : 0;
      const totalEnrolled = csvCount + portalCount;

      if (totalEnrolled >= capacity) {
        const err = new Error('Turma lotada. Não há vagas disponíveis.');
        err.code = 'TURMA_LOTADA';
        throw err;
      }

      // Grava matrícula e incrementa contador na mesma transação
      tx.set(enrollRef, {
        ...enrollment,
        _createdAt: new Date().toISOString(),
      });

      tx.set(counterRef, {
        classKey,
        count: portalCount + 1,
        _lastUpdated: new Date().toISOString(),
      }, { merge: true });
    });

    // Invalida cache de matrículas para que a próxima leitura reflita o novo ensalamento
    _invalidateCache('enrollments');

    return { success: true };
  } catch (error) {
    if (error.code === 'TURMA_LOTADA') {
      return { success: false, turmaLotada: true, error: error.message };
    }
    console.error('Firestore atomicEnroll error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Atualiza campos de uma matrícula existente (usado no remanejamento de turma).
 */
export async function updateEnrollmentInFirestore(cpf, componente, updates) {
  try {
    const db = getFirestore();
    const cleanCpf = cpf.toString().replace(/\D/g, '');
    const compKey = (componente || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
    const docId = `${cleanCpf}_${compKey}`;
    const ref = db.collection('enrollments').doc(docId);

    const doc = await ref.get();
    if (!doc.exists) {
      return { success: false, error: 'Matrícula não encontrada no Firestore.' };
    }

    await ref.update({
      ...updates,
      _alteredAt: new Date().toISOString(),
    });
    return { success: true };
  } catch (error) {
    console.error('Firestore updateEnrollment error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Remove todas as matrículas E zera os contadores atômicos de turmas.
 * Usado pelo admin para zerar antes da produção.
 */
export async function clearAllEnrollments() {
  try {
    const db = getFirestore();

    // Lê ambas as coleções em paralelo
    const [enrollSnapshot, countersSnapshot] = await Promise.all([
      db.collection('enrollments').get(),
      db.collection('class_portal_counts').get(),
    ]);

    const batch = db.batch();
    enrollSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    countersSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    _invalidateCache(); // Limpa todo o cache após reset
    return { success: true, count: enrollSnapshot.size };
  } catch (error) {
    console.error('Firestore clearAllEnrollments error:', error);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────
// CAPACIDADES DAS TURMAS
// ─────────────────────────────────────────────

/**
 * Retorna o mapa de capacidades { classKey: number }.
 * Resultado é cacheado por TTL_CAPACITIES para reduzir leituras no Firestore.
 */
export async function getCapacitiesFromFirestore() {
  const cached = _getCached('capacities');
  if (cached) return cached;

  try {
    const db = getFirestore();
    const snapshot = await db.collection('class_capacities').get();
    const capacities = {};
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.capacity !== undefined) {
        capacities[doc.id] = data.capacity;
      }
    });
    _setCached('capacities', capacities, TTL_CAPACITIES);
    return capacities;
  } catch (error) {
    console.error('Firestore getCapacities error:', error);
    return {};
  }
}

/**
 * Salva/atualiza a capacidade de uma turma e invalida o cache.
 * classKey é o ID do documento (pode conter caracteres especiais — usamos encoding).
 */
export async function saveCapacityToFirestore(classKey, capacity) {
  try {
    const db = getFirestore();
    const safeId = Buffer.from(classKey).toString('base64url');
    await db.collection('class_capacities').doc(safeId).set({
      classKey,
      capacity: Number(capacity),
      _updatedAt: new Date().toISOString(),
    }, { merge: true });
    _invalidateCache('capacities'); // Invalida cache após alterar capacidade
    return { success: true };
  } catch (error) {
    console.error('Firestore saveCapacity error:', error);
    return { success: false, error: error.message };
  }
}
