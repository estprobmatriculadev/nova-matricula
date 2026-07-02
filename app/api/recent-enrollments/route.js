import { NextResponse } from 'next/server';
import { getNewEnrollments } from '../../lib/db';

export async function GET(request) {
  try {
    // Check authentication
    const sessionCookie = request.cookies.get('tutor_session');
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Sessão expirada ou não autenticada.' }, { status: 401 });
    }
    const session = JSON.parse(sessionCookie.value);
    const tutorNre = (session.nre || '').toUpperCase();
    const isAdmin = session.role === 'admin';

    // Fetch enrollments
    const enrollments = await getNewEnrollments();
    
    // Admin sees all; tutors only see their NRE
    const filteredEnrollments = isAdmin
      ? enrollments
      : enrollments.filter(e => {
          const nreExe = (e.nre_exe || '').trim().toUpperCase();
          const nreTutor = (e.nre_tutor || '').trim().toUpperCase();
          return nreExe === tutorNre || nreTutor === tutorNre;
        });

    return NextResponse.json({ enrollments: filteredEnrollments });
  } catch (error) {
    console.error('Recent Enrollments API Error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
