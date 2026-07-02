import { NextResponse } from 'next/server';
import { getFirestore } from '../../../lib/firebase';
import { normalizeString } from '../../../lib/csvParser';

export async function POST(request) {
  try {
    const { cpf, componente } = await request.json();
    if (!cpf || !componente) {
      return NextResponse.json({ error: 'CPF e componente são obrigatórios.' }, { status: 400 });
    }

    const cleanCpf = cpf.replace(/\D/g, '');
    const compKey = normalizeString(componente);
    const docId = `${cleanCpf}_${compKey}`;

    const db = getFirestore();
    const ref = db.collection('enrollments').doc(docId);
    const doc = await ref.get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Matrícula do cursista não encontrada.' }, { status: 404 });
    }

    // Deleta o registro de matrícula do Firestore.
    // Isso automaticamente libera a vaga que estava ocupada no portal.
    await ref.delete();

    return NextResponse.json({ success: true, message: 'Vaga liberada com sucesso no sistema!' });
  } catch (error) {
    console.error('Release vacancy error:', error);
    return NextResponse.json({ error: 'Erro interno ao liberar vaga.' }, { status: 500 });
  }
}
