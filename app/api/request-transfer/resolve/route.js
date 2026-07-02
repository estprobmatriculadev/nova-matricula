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

    const sessionCookie = request.cookies.get('tutor_session');
    const session = sessionCookie ? JSON.parse(sessionCookie.value) : {};

    await ref.update({
      'transferRequest.status': 'RESOLVED',
      'transferRequest.resolvedAt': new Date().toISOString(),
      'transferRequest.resolvedBy': session.email || 'Admin',
    });

    return NextResponse.json({ success: true, message: 'Alerta arquivado com sucesso!' });
  } catch (error) {
    console.error('Resolve transfer alert error:', error);
    return NextResponse.json({ error: 'Erro ao arquivar alerta.' }, { status: 500 });
  }
}
