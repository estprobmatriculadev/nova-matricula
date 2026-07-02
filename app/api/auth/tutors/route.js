import { NextResponse } from 'next/server';
import { parseTutores } from '../../../lib/csvParser';

export async function GET() {
  try {
    const tutors = parseTutores();
    // Map only public/necessary details for selection
    const tutorsList = tutors.map(t => ({
      name: t.tutor_responsavel,
      email: t.email_nre || t.email_educ || t.email_adm,
      nre: t.nre_tutor
    })).sort((a, b) => a.nre.localeCompare(b.nre));


    
    return NextResponse.json({ tutors: tutorsList });
  } catch (error) {
    console.error('Error fetching tutors list:', error);
    return NextResponse.json({ error: 'Erro ao carregar lista de tutores.' }, { status: 500 });
  }
}
