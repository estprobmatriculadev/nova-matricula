import { NextResponse } from 'next/server';
import { getNewEnrollments } from '../../lib/db';
import { HEADERS_ORDER } from '../../lib/googleSheets';

export async function GET(request) {
  try {
    // Check authentication
    const sessionCookie = request.cookies.get('tutor_session');
    if (!sessionCookie) {
      return new NextResponse('Não autenticado.', { status: 401 });
    }
    const session = JSON.parse(sessionCookie.value);
    const tutorNre = session.nre.toUpperCase();

    // Fetch enrollments
    const enrollments = await getNewEnrollments();
    
    // Filter by tutor NRE (so tutors only download their NRE data)
    const filteredEnrollments = enrollments.filter(e => {
      const nreExe = (e.nre_exe || '').trim().toUpperCase();
      const nreTutor = (e.nre_tutor || '').trim().toUpperCase();
      return nreExe === tutorNre || nreTutor === tutorNre;
    });

    if (filteredEnrollments.length === 0) {
      return new NextResponse('Nenhuma nova matrícula encontrada para o seu NRE.', { status: 404 });
    }

    // Generate CSV Content
    // Semicolon separator is standard for Excel in Portuguese Brazil environment
    const delimiter = ';';
    
    // Write headers
    let csvContent = '\uFEFF'; // Add BOM for Excel UTF-8 support
    csvContent += HEADERS_ORDER.join(delimiter) + '\n';

    // Write rows
    filteredEnrollments.forEach(e => {
      const row = HEADERS_ORDER.map(header => {
        let val = '';
        if (header === 'Link Classroom') {
          val = e['Link Classroom'] || e['Link_Classroom'] || '';
        } else if (header === 'e-mail_formador') {
          val = e['e-mail_formador'] || e['email_formador'] || '';
        } else if (header === 'e-mail_nre') {
          val = e['e-mail_nre'] || e['email_nre'] || '';
        } else {
          val = e[header] || '';
        }
        
        // Clean values to avoid issues with separator or newlines
        val = val.toString().replace(/"/g, '""').replace(/\n/g, ' ');
        return `"${val}"`;
      });
      csvContent += row.join(delimiter) + '\n';
    });

    const filename = `novas_matriculas_NRE_${tutorNre.replace(/\s+/g, '_')}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    console.error('Download CSV API Error:', error);
    return new NextResponse('Erro interno do servidor.', { status: 500 });
  }
}
