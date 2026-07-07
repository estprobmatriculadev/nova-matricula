import { NextResponse } from 'next/server';
import { getSupabase } from '../../../lib/supabase';
import { normalizeString } from '../../../lib/csvParser';
import { invalidateEnrollmentsCache } from '../../../lib/supabaseDb';

export async function POST(request) {
  try {
    const { cpf, componente } = await request.json();
    if (!cpf || !componente) {
      return NextResponse.json({ error: 'CPF e componente são obrigatórios.' }, { status: 400 });
    }

    const cleanCpf = cpf.replace(/\D/g, '');
    const compKey = normalizeString(componente);
    const docId = `${cleanCpf}_${compKey}`;

    const db = getSupabase();
    
    // Get existing enrollment
    const { data: row, error: fetchError } = await db
      .from('enrollments')
      .select('data')
      .eq('id', docId)
      .single();

    if (fetchError || !row) {
      return NextResponse.json({ error: 'Matrícula do cursista não encontrada.' }, { status: 404 });
    }

    // Em vez de deletar o documento, atualizamos marcando como "ensaladoManual"
    // e limpando a turma/horário para liberar a vaga garantida no sistema.
    const updatedData = {
      ...row.data,
      ensaladoManual: true,
      turma: 'MANUAL', // Define a turma como MANUAL para sinalizar
      dia_da_semana: '',
      horario_inicial: '',
      horario_fim: '',
      turno: '',
      nome_formador: '',
      cpf_formador: '',
      transferRequest: {
        ...(row.data.transferRequest || {}),
        status: 'RESOLVED'
      },
      _alteredAt: new Date().toISOString()
    };

    const { error: updateError } = await db
      .from('enrollments')
      .update({ data: updatedData })
      .eq('id', docId);

    if (updateError) throw updateError;

    invalidateEnrollmentsCache();

    return NextResponse.json({ success: true, message: 'Vaga liberada e status alterado para Ensalado (Manual)!' });
  } catch (error) {
    console.error('Release vacancy error:', error);
    return NextResponse.json({ error: 'Erro interno ao liberar vaga.' }, { status: 500 });
  }
}
