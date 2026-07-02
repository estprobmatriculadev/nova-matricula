import { NextResponse } from 'next/server';
import { parseTutores, normalizeString } from '../../lib/csvParser';

export async function POST(request) {
  try {
    const { email, isGoogleAuth, googleToken } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email é obrigatório.' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Load tutors from CSV
    const tutors = parseTutores();
    
    // Check for admin emails (guarantee admins are always allowed)
    const adminEmails = process.env.ADMIN_EMAILS ? 
      process.env.ADMIN_EMAILS.split(',').map(e => e.trim().toLowerCase()) : 
      [];
    if (!adminEmails.includes('jorge.dotti@escola.pr.gov.br')) {
      adminEmails.push('jorge.dotti@escola.pr.gov.br');
    }
    if (!adminEmails.includes('estagioprobatorio@escola.pr.gov.br')) {
      adminEmails.push('estagioprobatorio@escola.pr.gov.br');
    }

    const isAdmin = adminEmails.includes(normalizedEmail);

    let sessionData = null;

    if (isAdmin) {
      sessionData = {
        tutorName: normalizedEmail === 'jorge.dotti@escola.pr.gov.br' ? 'Jorge Dotti (Administrador)' : 'Estágio Probatório (Administrador)',
        nre: 'TODOS',
        email: normalizedEmail,
        role: 'admin'
      };
    } else {
      // Find tutor matching the email_nre (Google login email should match e-mail_nre)
      const tutor = tutors.find(t => {
        const tutorNreEmail = (t.email_nre || '').trim().toLowerCase();
        // Also fallback to check administrative or education email just in case,
        // but prioritize email_nre as requested by the user
        return tutorNreEmail === normalizedEmail || 
               (t.email_adm || '').trim().toLowerCase() === normalizedEmail ||
               (t.email_educ || '').trim().toLowerCase() === normalizedEmail;
      });

      if (!tutor) {
        return NextResponse.json({ 
          error: `Acesso negado. O e-mail '${email}' não está associado a nenhuma tutora responsável de NRE no arquivo de tutores.` 
        }, { status: 403 });
      }

      sessionData = {
        tutorName: tutor.tutor_responsavel,
        nre: tutor.nre_tutor,
        email: tutor.email_nre || tutor.email_educ || email,
        role: 'tutor'
      };
    }

    const response = NextResponse.json({ 
      success: true, 
      user: sessionData 
    });

    // Set a simple cookie for session persistence (JSON format)
    response.cookies.set('tutor_session', JSON.stringify(sessionData), {
      path: '/',
      httpOnly: false, // Allow client-side access for easy rendering
      maxAge: 60 * 60 * 24 // 24 hours
    });

    return response;
  } catch (error) {
    console.error('Auth API Error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('tutor_session');
  return response;
}
