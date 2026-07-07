import { NextResponse } from 'next/server';
import { getSupabase } from '../../lib/supabase';
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

    const db = getSupabase();
    
    // Get existing enrollment
    const { data: row, error: fetchError } = await db
      .from('enrollments')
      .select('data')
      .eq('id', docId)
      .single();

    if (fetchError || !row) {
      return NextResponse.json({ error: 'Matrícula do cursista não encontrada no sistema.' }, { status: 404 });
    }

    // Get session cookie to track requester
    const sessionCookie = request.cookies.get('tutor_session');
    const session = sessionCookie ? JSON.parse(sessionCookie.value) : {};

    const updatedData = {
      ...row.data,
      transferRequest: {
        status: 'PENDING',
        requestedModality,
        requestedShift,
        requestedAt: new Date().toISOString(),
        requestedBy: session.email || 'Tutor',
      }
    };

    const { error: updateError } = await db
      .from('enrollments')
      .update({ data: updatedData })
      .eq('id', docId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, message: 'Solicitação de troca enviada com sucesso!' });
  } catch (error) {
    console.error('Request-transfer API Error:', error);
    return NextResponse.json({ error: 'Erro interno ao salvar solicitação.' }, { status: 500 });
  }
}
