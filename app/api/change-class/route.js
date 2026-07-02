import { NextResponse } from 'next/server';
import { getClasses } from '../../lib/db';
import { updateEnrollmentInFirestore, saveEnrollmentToFirestore, getEnrollmentsFromFirestore } from '../../lib/firebaseDb';
import { parseMatricula } from '../../lib/csvParser';

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

    // 1. Busca nas matrículas dinâmicas do Firestore
    const enrollments = await getEnrollmentsFromFirestore();
    let existing = enrollments.find(e =>
      (e.cpf_cursista || '').toString().replace(/\D/g, '') === cleanCpf
    );

    let baseRecord = null;

    if (!existing) {
      // 2. Se não estiver no Firestore, busca no CSV base (planilha base original)
      const baseMatricula = parseMatricula();
      baseRecord = baseMatricula.find(e => {
        const baseCpf = (e.cpf_cursista || e.cpf || '').toString().replace(/\D/g, '');
        return baseCpf === cleanCpf;
      });

      if (!baseRecord) {
        return NextResponse.json({
          error: 'Cursista não encontrado nos registros do portal nem na planilha base.'
        }, { status: 404 });
      }
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

    let result;

    if (existing) {
      // Caso 1: Já está no Firestore (atualiza campos de turma)
      result = await updateEnrollmentInFirestore(cleanCpf, {
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
    } else {
      // Caso 2: Cursista do CSV base. Criamos um registro no Firestore apontando para a nova turma
      const enrollmentRecord = {
        nome_cursista:            baseRecord.nome_cursista || baseRecord.nome || '',
        'e-mail':                 baseRecord['e-mail'] || baseRecord.email || '',
        modalidade:               baseRecord.modalidade || '',
        componente:               targetClass.componente,
        turma:                    targetClass.turma,
        dia_da_semana:            targetClass.dia_da_semana,
        horario_inicial:          targetClass.horario_inicial,
        horario_fim:              targetClass.horario_fim,
        turno:                    targetClass.turno,
        ano_formativo:            baseRecord.ano_formativo || '2026',
        nome_formador:            targetClass.nome_formador,
        cpf_formador:             targetClass.cpf_formador,
        tutor_responsavel:        targetClass.tutor_responsavel,
        email_tutor:              targetClass.email_tutor,
        'e-mail_formador':        targetClass['e-mail_formador'] || '',
        'Link Classroom':         targetClass.Link_Classroom || '',
        nre_tutor:                targetClass.nre_tutor,
        'e-mail_nre':             targetClass['e-mail_nre'] || '',
        id_classroom:             targetClass.id_classroom || '',
        cgm:                      baseRecord.cgm || '',
        rg:                       baseRecord.rg || '',
        periodo_ini:              baseRecord.periodo_ini || '',
        chamamento:               baseRecord.chamamento || '6',
        nre_exe:                  baseRecord.nre_exe || '',
        munic_exe:                baseRecord.munic_exe || '',
        componente_conc:          baseRecord.componente_conc || '',
        nre_formador:             targetClass.nre_formador || '',
        telefone_tutor:           targetClass.telefone_tutor || '',
        telefone_formador:        targetClass.telefone_formador || '',
        telefone_cursista:        baseRecord.telefone_cursista || baseRecord.telefone || '',
        rg_formador:              targetClass.rg_formador || '',
        componente_formador:      targetClass.componente_formador || '',
        cpf_cursista:             cleanCpf,
        observacoes_cursista:     baseRecord.observacoes_cursista || '',
        observacoes_formador:     baseRecord.observacoes_formador || '',
        observacoes_tutor:        baseRecord.observacoes_tutor || 'Alterado pelo Admin',
        observacoes_turma:        baseRecord.observacoes_turma || '',
        cod_cursista:             baseRecord.cod_cursista || `CURS-${Math.floor(100000 + Math.random() * 900000)}`,
        possui_acessibilidade:    baseRecord.possui_acessibilidade || 'NÃO',
        tipo_deficiencia:         baseRecord.tipo_deficiencia || '',
        necessidades_especificas: baseRecord.necessidades_especificas || '',
        outras_necessidades:      baseRecord.outras_necessidades || '',
        _alteredBy:               session.email,
        _originalSource:          'csv_base'
      };
      
      result = await saveEnrollmentToFirestore(enrollmentRecord);
    }

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
