/**
 * firebaseDb.js
 * Camada de acesso ao Firestore — substitui new_enrollments.json e class_capacities.json
 *
 * Collections:
 *   enrollments/{cpf_cursista}   — uma matrícula por CPF
 *   class_capacities/{classKey}  — capacidade de cada turma
 */

import { getFirestore } from './firebase';

// ─────────────────────────────────────────────
// MATRÍCULAS
// ─────────────────────────────────────────────

/**
 * Retorna todas as matrículas novas (feitas pelo portal).
 * Formato compatível com o antigo new_enrollments.json.
 */
export async function getEnrollmentsFromFirestore() {
  try {
    const db = getFirestore();
    const snapshot = await db.collection('enrollments').get();
    if (snapshot.empty) return [];
    return snapshot.docs.map(doc => doc.data());
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
 * Remove todas as matrículas (usado pelo admin para zerar antes da produção).
 */
export async function clearAllEnrollments() {
  try {
    const db = getFirestore();
    const snapshot = await db.collection('enrollments').get();
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    return { success: true, count: snapshot.size };
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
 */
export async function getCapacitiesFromFirestore() {
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
    return capacities;
  } catch (error) {
    console.error('Firestore getCapacities error:', error);
    return {};
  }
}

/**
 * Salva/atualiza a capacidade de uma turma.
 * classKey é o ID do documento (pode conter caracteres especiais — usamos encoding).
 */
export async function saveCapacityToFirestore(classKey, capacity) {
  try {
    const db = getFirestore();
    // Firestore não aceita '/' em IDs — codificamos com Base64 URL-safe
    const safeId = Buffer.from(classKey).toString('base64url');
    await db.collection('class_capacities').doc(safeId).set({
      classKey,
      capacity: Number(capacity),
      _updatedAt: new Date().toISOString(),
    }, { merge: true });
    return { success: true };
  } catch (error) {
    console.error('Firestore saveCapacity error:', error);
    return { success: false, error: error.message };
  }
}
