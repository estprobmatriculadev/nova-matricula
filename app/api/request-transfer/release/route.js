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

    // Em vez de deletar o documento, atualizamos marcando como "ensaladoManual"
    // e limpando a turma/horário para liberar a vaga garantida no sistema.
    await ref.update({
      ensaladoManual: true,
      turma: 'MANUAL', // Define a turma como MANUAL para sinalizar
      dia_da_semana: '',
      horario_inicial: '',
      horario_fim: '',
      turno: '',
      nome_formador: '',
      cpf_formador: '',
      'transferRequest.status': 'RESOLVED',
      _alteredAt: new Date().toISOString()
    });

    return NextResponse.json({ success: true, message: 'Vaga liberada e status alterado para Ensalado (Manual)!' });
  } catch (error) {
    console.error('Release vacancy error:', error);
    return NextResponse.json({ error: 'Erro interno ao liberar vaga.' }, { status: 500 });
  }
}
