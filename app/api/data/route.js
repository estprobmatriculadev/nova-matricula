import { NextResponse } from 'next/server';
import { parseNomeados, parseMatricula, normalizeString } from '../../lib/csvParser';
import { getClasses, getNewEnrollments, getClassCapacities } from '../../lib/db';
import { isSheetsConfigured } from '../../lib/googleSheets';

// Helper to normalize CPF (remove dots, dashes, spaces)
function cleanCpf(cpf) {
  if (!cpf) return '';
  return cpf.toString().replace(/\D/g, '');
}

// Map candidate "VAGA" from Nomeados CSV to classroom "COMPONENTE"
function mapVagaToComponent(vaga) {
  const v = (vaga || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
  if (v.includes('MATEMATICA')) return 'MATEMATICA';
  if (v.includes('PORTUGUES') || v.includes('LINGUA PORTUGUESA')) return 'PORTUGUES';
  if (v.includes('INGLES') || v.includes('LINGUA ESTRANGEIRA') || v.includes('INGL')) return 'INGLES';
  if (v.includes('EDUCACAO FISICA') || v.includes('E FISIC')) return 'EDUCACAO FISICA';
  if (v.includes('ARTE')) return 'ARTE';
  if (v.includes('CIENCIAS')) return 'CIENCIAS';
  if (v.includes('BIOLOGIA')) return 'BIOLOGIA';
  if (v.includes('GEOGRAFIA')) return 'GEOGRAFIA';
  if (v.includes('HISTORIA')) return 'HISTORIA';
  if (v.includes('SOCIOLOGIA')) return 'SOCIOLOGIA';
  if (v.includes('FILOSOFIA')) return 'FILOSOFIA';
  if (v.includes('QUIMICA')) return 'QUIMICA';
  if (v.includes('FISICA')) return 'FISICA';
  if (v.includes('PEDAGOGO') || v.includes('EQ GESTORA')) return 'EQ GESTORA';
  return vaga; // fallback
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

    // 2. Get existing enrollments (to determine status) and capacities in parallel
    const baseMatricula = parseMatricula();
    const [newEnrollments, capacitiesConfig] = await Promise.all([
      getNewEnrollments(),
      getClassCapacities()
    ]);

    // Build sets of clean "CPF_Componente" strings of already enrolled students
    const enrolledVias = new Set();
    const manualEnrolledVias = new Set();

    baseMatricula.forEach(student => {
      const cpf = cleanCpf(student.cpf_cursista);
      const comp = normalizeString(student.componente);
      if (cpf && comp) enrolledVias.add(`${cpf}_${comp}`);
    });

    newEnrollments.forEach(student => {
      const cpf = cleanCpf(student.cpf_cursista);
      const comp = normalizeString(student.componente);
      if (cpf && comp) {
        const key = `${cpf}_${comp}`;
        if (student.ensaladoManual || student.turma === 'MANUAL') {
          manualEnrolledVias.add(key);
          enrolledVias.delete(key); // Firestore precedence overrides base CSV
        } else {
          enrolledVias.add(key);
          manualEnrolledVias.delete(key);
        }
      }
    });

    // Filter candidates by NRE
    const filteredCandidates = allCandidates
      .filter(c => !filterByNre || normalizeString(c.nre) === normalizedTutorNre)
      .map(c => {
        const cpfClean = cleanCpf(c.cpf);
        const compMapped = normalizeString(mapVagaToComponent(c.vaga));
        const key = `${cpfClean}_${compMapped}`;
        
        let status = 'PENDING';
        if (enrolledVias.has(key)) {
          status = 'ENROLLED';
        } else if (manualEnrolledVias.has(key)) {
          status = 'ENROLLED_MANUAL';
        }

        return {
          ...c,
          cleanCpf: cpfClean,
          status
        };
      });

    // 3. Get Classes using pre-fetched data
    const allClasses = await getClasses(newEnrollments, capacitiesConfig);

    // We can split classes into "NRE Classes" and "Other Classes"
    const nreClasses = allClasses.filter(cls => !filterByNre || normalizeString(cls.nre_tutor) === normalizedTutorNre);
    const otherClasses = allClasses.filter(cls => filterByNre && normalizeString(cls.nre_tutor) !== normalizedTutorNre);

    // 4. Calculate Stats for this NRE
    const totalCandidates = filteredCandidates.length;
    const enrolledCandidates = filteredCandidates.filter(c => c.status === 'ENROLLED' || c.status === 'ENROLLED_MANUAL').length;
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
