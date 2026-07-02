import { NextResponse } from 'next/server';
import { getClasses } from '../../lib/db';
import { updateEnrollmentInFirestore, getEnrollmentsFromFirestore } from '../../lib/firebaseDb';

export async function POST(request) {
  try {
    // Autenticação + verificação de admin
    const sessionCookie = request.cookies.get('tutor_session');
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Sessão expirada ou não autenticada.' }, { status: 401 });
    }
    const session = JSON.parse(sessionCookie.value);
    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado. Apenas administradores podem alterar turmas.' }, { status: 403 });
    }

    const { cpf, newClassKey } = await request.json();
    if (!cpf || !newClassKey) {
      return NextResponse.json({ error: 'CPF e nova turma são obrigatórios.' }, { status: 400 });
    }

    const cleanCpf = cpf.toString().replace(/\D/g, '');

    // Verifica se a matrícula existe no Firestore
    const enrollments = await getEnrollmentsFromFirestore();
    const existing = enrollments.find(e =>
      (e.cpf_cursista || '').toString().replace(/\D/g, '') === cleanCpf
    );

    if (!existing) {
      return NextResponse.json({
        error: 'Cursista não encontrado nos registros do portal. Apenas matrículas realizadas por este portal podem ser alteradas aqui.'
      }, { status: 404 });
    }

    // Busca a turma de destino
    const classes = await getClasses();
    const targetClass = classes.find(c => c.classKey === newClassKey);

    if (!targetClass) {
      return NextResponse.json({ error: 'Turma de destino não encontrada.' }, { status: 404 });
    }
    if (targetClass.vacancies <= 0) {
      return NextResponse.json({ error: 'A turma de destino está lotada.' }, { status: 409 });
    }

    // Atualiza no Firestore
    const result = await updateEnrollmentInFirestore(cleanCpf, {
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
      'e-mail_nre':    targetClass['e-mail_nre'] || '',
      nre_tutor:       targetClass.nre_tutor,
      Link_Classroom:  targetClass.Link_Classroom || '',
      id_classroom:    targetClass.id_classroom   || '',
      _alteredBy:      session.email,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Turma alterada com sucesso para ${targetClass.turma}.`,
      newClass: {
        turma:           targetClass.turma,
        componente:      targetClass.componente,
        dia_da_semana:   targetClass.dia_da_semana,
        horario_inicial: targetClass.horario_inicial,
        horario_fim:     targetClass.horario_fim,
      },
    });
  } catch (error) {
    console.error('Change-Class API Error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
