import { NextResponse } from 'next/server';
import { getSupabase } from '../../../lib/supabase';
import { normalizeString } from '../../../lib/csvParser';
import { invalidateEnrollmentsCache } from '../../../lib/supabaseDb';
import { getClasses } from '../../../lib/db';

export async function POST(request) {
  try {
    const { cpf, componente, targetClassKey } = await request.json();
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

    // Get session cookie to track requester
    const sessionCookie = request.cookies.get('tutor_session');
    const session = sessionCookie ? JSON.parse(sessionCookie.value) : {};

    let updatedData;

    if (targetClassKey) {
      // Transfer to class path
      const classes = await getClasses();
      const targetClass = classes.find(c => c.classKey === targetClassKey);

      if (!targetClass) {
        return NextResponse.json({ error: 'Turma de destino não encontrada.' }, { status: 404 });
      }
      if (targetClass.vacancies <= 0) {
        return NextResponse.json({ error: 'A turma de destino está lotada.' }, { status: 409 });
      }

      updatedData = {
        ...row.data,
        ensaladoManual: false,
        componente:      targetClass.componente,
        turma:           targetClass.turma,
        dia_da_semana:   targetClass.dia_da_semana,
        horario_inicial: targetClass.horario_inicial,
        horario_fim:     targetClass.horario_fim,
        turno:           targetClass.turno,
        nome_formador:   targetClass.nome_formador,
        cpf_formador:    targetClass.cpf_formador,
        tutor_responsavel: targetClass.tutor_responsavel,
        email_tutor:     targetClass.email_tutor,
        'e-mail_formador': targetClass['e-mail_formador'] || targetClass['email_formador'] || '',
        'Link Classroom': targetClass.Link_Classroom || '',
        nre_tutor:       targetClass.nre_tutor,
        'e-mail_nre':    targetClass['e-mail_nre'] || targetClass['email_nre'] || '',
        id_classroom:    targetClass.id_classroom,
        nre_formador:    targetClass.nre_formador || '',
        telefone_tutor:  targetClass.telefone_tutor || '',
        telefone_formador: targetClass.telefone_formador || '',
        rg_formador:     targetClass.rg_formador || '',
        componente_formador: targetClass.componente_formador || '',
        transferRequest: {
          ...(row.data.transferRequest || {}),
          status: 'RESOLVED',
          resolvedAt: new Date().toISOString(),
          resolvedBy: session.email || 'Admin'
        },
        _alteredAt: new Date().toISOString()
      };
    } else {
      // Fallback: Release vacancy and mark as manual
      updatedData = {
        ...row.data,
        ensaladoManual: true,
        turma: 'MANUAL', // Define a turma como MANUAL para sinalizar
        dia_da_semana: '',
        horario_inicial: '',
        horario_fim: '',
        turno: '',
        nome_formador: '',
        cpf_formador: '',
        'e-mail_formador': '',
        'Link Classroom': '',
        id_classroom: '',
        nre_formador: '',
        telefone_formador: '',
        rg_formador: '',
        componente_formador: '',
        transferRequest: {
          ...(row.data.transferRequest || {}),
          status: 'RESOLVED',
          resolvedAt: new Date().toISOString(),
          resolvedBy: session.email || 'Admin'
        },
        _alteredAt: new Date().toISOString()
      };
    }

    const { error: updateError } = await db
      .from('enrollments')
      .update({ data: updatedData })
      .eq('id', docId);

    if (updateError) throw updateError;

    invalidateEnrollmentsCache();

    return NextResponse.json({ 
      success: true, 
      message: targetClassKey 
        ? `Cursista transferido com sucesso para a turma ${updatedData.turma}!`
        : 'Vaga liberada e status alterado para Ensalado (Manual)!' 
    });
  } catch (error) {
    console.error('Release vacancy error:', error);
    return NextResponse.json({ error: 'Erro interno ao liberar vaga.' }, { status: 500 });
  }
}
