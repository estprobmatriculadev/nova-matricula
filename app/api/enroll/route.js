import { NextResponse } from 'next/server';
import { parseNomeados, normalizeString } from '../../lib/csvParser';
import { getClasses, saveNewEnrollment } from '../../lib/db';
import { appendEnrollmentToSheets, isSheetsConfigured } from '../../lib/googleSheets';

// Helper to normalize CPF
function cleanCpf(cpf) {
  if (!cpf) return '';
  return cpf.toString().replace(/\D/g, '');
}

// Map vaga/componente to 2-letter abbreviation for cod_cursista
function getComponentAbbreviation(comp) {
  const c = normalizeString(comp);
  if (c.includes('MATEMATICA')) return 'MT';
  if (c.includes('PORTUGUES') || c.includes('LINGUA PORTUGUESA')) return 'LP';
  if (c.includes('INGLES') || c.includes('LINGUA ESTRANGEIRA') || c.includes('INGL')) return 'IN';
  if (c.includes('EDUCACAO FISICA') || c.includes('E FISIC')) return 'EF';
  if (c.includes('ARTE')) return 'AR';
  if (c.includes('CIENCIAS')) return 'CI';
  if (c.includes('BIOLOGIA')) return 'BI';
  if (c.includes('GEOGRAFIA')) return 'GE';
  if (c.includes('HISTORIA')) return 'HI';
  if (c.includes('SOCIOLOGIA')) return 'SO';
  if (c.includes('FILOSOFIA')) return 'FL';
  if (c.includes('QUIMICA')) return 'QI';
  if (c.includes('FISICA')) return 'FI';
  if (c.includes('PEDAGOGO') || c.includes('EQ GESTORA') || c.includes('PEDAG')) return 'PD';
  return 'XX'; // Fallback
}

export async function POST(request) {
  try {
    // Check authentication
    const sessionCookie = request.cookies.get('tutor_session');
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Sessão expirada ou não autenticada.' }, { status: 401 });
    }
    const session = JSON.parse(sessionCookie.value);
    const tutorNre = session.nre;

    // Parse request body
    const body = await request.json();
    const {
      cpf,               // Candidate CPF
      email,             // Cursista Email
      phone,             // Cursista Phone
      classKey,          // Target Class Key
      observacoes_tutor, // Tutor notes
      observacoes_cursista, // Cursista notes
      possui_acessibilidade,
      tipo_deficiencia,
      necessidades_especificas,
      outras_necessidades
    } = body;

    // Validate required fields
    if (!cpf || !email || !classKey) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes: CPF, E-mail ou Turma.' }, { status: 400 });
    }

    const cleanInputCpf = cleanCpf(cpf);

    // 1. Fetch Candidate Details
    const candidates = parseNomeados();
    const candidate = candidates.find(c => cleanCpf(c.cpf) === cleanInputCpf);

    if (!candidate) {
      return NextResponse.json({ error: 'Candidato não encontrado.' }, { status: 404 });
    }

    // Access Control: Validate that the tutor matches the candidate's NRE (bypass for admin)
    if (session.role !== 'admin' && normalizeString(candidate.nre) !== normalizeString(tutorNre)) {
      return NextResponse.json({ error: 'Acesso negado. Este candidato não pertence ao seu NRE.' }, { status: 403 });
    }

    // 2. Fetch Class Details and check vacancies
    const classes = await getClasses();
    const targetClass = classes.find(c => c.classKey === classKey);

    if (!targetClass) {
      return NextResponse.json({ error: 'Turma selecionada não encontrada.' }, { status: 404 });
    }

    if (targetClass.vacancies <= 0) {
      return NextResponse.json({ error: 'Turma lotada. Não há vagas disponíveis.' }, { status: 409 });
    }

    // 3. Generate Cursista Code (EP6 + Component Abbr + RG)
    const compAbbr = getComponentAbbreviation(candidate.vaga || targetClass.componente);
    const cleanRg = candidate.rg.replace(/\D/g, '');
    const cod_cursista = `EP6${compAbbr}${cleanRg}`;

    // Determine Modalidade
    let modalidade = 'DOCENTE';
    const compUpper = normalizeString(targetClass.componente);
    if (compUpper.includes('EQ GESTORA') || compUpper.includes('PEDAGOGO')) {
      modalidade = 'EQUIPE GESTORA';
    } else if (compUpper.includes('TECNICA') || compUpper.includes('TECNICOS')) {
      modalidade = 'TÉCNICOS';
    }

    // 4. Create the enrollment record matching MATRICULA_6_CHAMAMENTO - DATA.csv structure
    const enrollmentRecord = {
      nome_cursista: candidate.nome.trim().toUpperCase(),
      'e-mail': email.trim().toLowerCase(),
      modalidade: modalidade,
      componente: targetClass.componente,
      turma: targetClass.turma,
      dia_da_semana: targetClass.dia_da_semana,
      horario_inicial: targetClass.horario_inicial,
      horario_fim: targetClass.horario_fim,
      turno: targetClass.turno,
      ano_formativo: '1º ANO', // Default to 1st year for new named
      nome_formador: targetClass.nome_formador,
      cpf_formador: targetClass.cpf_formador,
      tutor_responsavel: targetClass.tutor_responsavel,
      email_tutor: targetClass.email_tutor,
      'e-mail_formador': targetClass['e-mail_formador'] || targetClass['email_formador'] || '',
      'Link Classroom': targetClass.Link_Classroom || '',
      nre_tutor: targetClass.nre_tutor,
      'e-mail_nre': targetClass['e-mail_nre'] || targetClass['email_nre'] || '',
      id_classroom: targetClass.id_classroom,
      cgm: '', // CGM removed as requested
      rg: candidate.rg.trim(),
      periodo_ini: candidate.data_exercicio || candidate.data_ingresso || '03/02/2026',
      chamamento: '6º Chamamento',
      nre_exe: candidate.nre.trim().toUpperCase(),
      munic_exe: candidate.nre.trim().toUpperCase(), // Default to NRE name as municipality placeholder
      componente_conc: candidate.vaga.trim().toUpperCase(),
      nre_formador: targetClass.nre_formador || '',
      telefone_tutor: targetClass.telefone_tutor || '',
      telefone_formador: targetClass.telefone_formador || '',
      telefone_cursista: phone.trim(),
      rg_formador: targetClass.rg_formador || '',
      componente_formador: targetClass.componente_formador || '',
      cpf_cursista: cleanInputCpf,
      observacoes_cursista: observacoes_cursista || '',
      observacoes_formador: '',
      observacoes_tutor: observacoes_tutor || '',
      observacoes_turma: '',
      cod_cursista: cod_cursista,
      possui_acessibilidade: possui_acessibilidade || 'NÃO',
      tipo_deficiencia: tipo_deficiencia || '',
      necessidades_especificas: necessidades_especificas || '',
      outras_necessidades: outras_necessidades || ''
    };

    // 5. Save locally
    await saveNewEnrollment(enrollmentRecord);

    // 6. Append to Google Sheets (if configured)
    const sheetsResult = await appendEnrollmentToSheets(enrollmentRecord);

    if (isSheetsConfigured() && !sheetsResult.success) {
      return NextResponse.json({ 
        error: `Erro ao salvar na planilha do Google: ${sheetsResult.error || 'Erro de permissão ou conexão.'}` 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      cod_cursista,
      sheetsSynced: sheetsResult.success
    });
  } catch (error) {
    console.error('Enroll API Error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
