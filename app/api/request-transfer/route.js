import { NextResponse } from 'next/server';
import { getFirestore } from '../../lib/firebase';
import { normalizeString } from '../../lib/csvParser';

export async function POST(request) {
  try {
    const { cpf, componente, requestedModality, requestedShift } = await request.json();
    if (!cpf || !componente || !requestedModality || !requestedShift) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 });
    }

    const cleanCpf = cpf.replace(/\D/g, '');
    const compKey = normalizeString(componente);
    const docId = `${cleanCpf}_${compKey}`;

    const db = getFirestore();
    const ref = db.collection('enrollments').doc(docId);
    const doc = await ref.get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Matrícula do cursista não encontrada no sistema.' }, { status: 404 });
    }

    // Get session cookie to track requester
    const sessionCookie = request.cookies.get('tutor_session');
    const session = sessionCookie ? JSON.parse(sessionCookie.value) : {};

    await ref.update({
      transferRequest: {
        status: 'PENDING',
        requestedModality,
        requestedShift,
        requestedAt: new Date().toISOString(),
        requestedBy: session.email || 'Tutor',
      }
    });

    return NextResponse.json({ success: true, message: 'Solicitação de troca enviada com sucesso!' });
  } catch (error) {
    console.error('Request-transfer API Error:', error);
    return NextResponse.json({ error: 'Erro interno ao salvar solicitação.' }, { status: 500 });
  }
}
