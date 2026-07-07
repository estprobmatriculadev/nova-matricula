import { NextResponse } from 'next/server';
import { getSupabase } from '../../../lib/supabase';
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

    const sessionCookie = request.cookies.get('tutor_session');
    const session = sessionCookie ? JSON.parse(sessionCookie.value) : {};

    const updatedData = {
      ...row.data,
      transferRequest: {
        ...(row.data.transferRequest || {}),
        status: 'RESOLVED',
        resolvedAt: new Date().toISOString(),
        resolvedBy: session.email || 'Admin',
      }
    };

    const { error: updateError } = await db
      .from('enrollments')
      .update({ data: updatedData })
      .eq('id', docId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, message: 'Alerta arquivado com sucesso!' });
  } catch (error) {
    console.error('Resolve transfer alert error:', error);
    return NextResponse.json({ error: 'Erro ao arquivar alerta.' }, { status: 500 });
  }
}
