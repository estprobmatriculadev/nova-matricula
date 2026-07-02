import { NextResponse } from 'next/server';
import { parseNomeados, parseMatricula, normalizeString } from '../../lib/csvParser';
import { getClasses, getNewEnrollments } from '../../lib/db';
import { isSheetsConfigured } from '../../lib/googleSheets';

// Helper to normalize CPF (remove dots, dashes, spaces)
function cleanCpf(cpf) {
  if (!cpf) return '';
  return cpf.toString().replace(/\D/g, '');
}

export async function GET(request) {
  try {
    // Get tutor_session cookie
    const sessionCookie = request.cookies.get('tutor_session');
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Sessão expirada ou não autenticada.' }, { status: 401 });
    }

    const session = JSON.parse(sessionCookie.value);
    const tutorNre = session.nre; // e.g. "CASCAVEL" or "APUCARANA"
    const sheetsConfigured = isSheetsConfigured();

    const { searchParams } = new URL(request.url);
    const queryNre = searchParams.get('nre');

    let targetNre = tutorNre;
    let filterByNre = true;

    if (session.role === 'admin') {
      if (queryNre && queryNre !== 'TODOS') {
        targetNre = queryNre;
      } else {
        filterByNre = false;
      }
    }

    const normalizedTutorNre = normalizeString(targetNre);

    // 1. Get all Candidates (Nomeados)
    const allCandidates = parseNomeados();

    // 2. Get existing enrollments (to determine status)
    const baseMatricula = parseMatricula();
    const newEnrollments = await getNewEnrollments();

    // Build a set of clean CPFs of already enrolled students
    const enrolledCpfs = new Set();
    baseMatricula.forEach(student => {
      const cpf = cleanCpf(student.cpf_cursista);
      if (cpf) enrolledCpfs.add(cpf);
    });
    newEnrollments.forEach(student => {
      const cpf = cleanCpf(student.cpf_cursista);
      if (cpf) enrolledCpfs.add(cpf);
    });

    // Filter candidates by NRE
    const filteredCandidates = allCandidates
      .filter(c => !filterByNre || normalizeString(c.nre) === normalizedTutorNre)
      .map(c => {
        const cpfClean = cleanCpf(c.cpf);
        const isEnrolled = enrolledCpfs.has(cpfClean);
        return {
          ...c,
          cleanCpf: cpfClean,
          status: isEnrolled ? 'ENROLLED' : 'PENDING'
        };
      });

    // 3. Get Classes
    const allClasses = await getClasses();

    // We can split classes into "NRE Classes" and "Other Classes"
    const nreClasses = allClasses.filter(cls => !filterByNre || normalizeString(cls.nre_tutor) === normalizedTutorNre);
    const otherClasses = allClasses.filter(cls => filterByNre && normalizeString(cls.nre_tutor) !== normalizedTutorNre);

    // 4. Calculate Stats for this NRE
    const totalCandidates = filteredCandidates.length;
    const enrolledCandidates = filteredCandidates.filter(c => c.status === 'ENROLLED').length;
    const pendingCandidates = totalCandidates - enrolledCandidates;

    return NextResponse.json({
      tutorInfo: {
        ...session,
        sheetsConfigured
      },
      candidates: filteredCandidates,
      classes: {
        nreClasses,
        otherClasses
      },
      stats: {
        total: totalCandidates,
        enrolled: enrolledCandidates,
        pending: pendingCandidates
      }
    });
  } catch (error) {
    console.error('Data API Error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
