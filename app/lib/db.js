import fs from 'fs';
import path from 'path';
import { parseMatricula, parseNomeados, parseTutores, normalizeString } from './csvParser';
import { getEnrollmentsFromSheets, getCapacitiesFromSheets, saveCapacityToSheets, isSheetsConfigured } from './googleSheets';

const LOCAL_DATA_DIR = path.join(process.cwd(), 'data');
const ENROLLMENTS_FILE = path.join(LOCAL_DATA_DIR, 'new_enrollments.json');
const CAPACITIES_FILE = path.join(LOCAL_DATA_DIR, 'class_capacities.json');

// Ensure data folder exists
function ensureDataFolder() {
  try {
    if (!fs.existsSync(LOCAL_DATA_DIR)) {
      fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
    }
  } catch (e) {
    console.warn('Could not create data folder on read-only filesystem:', e.message);
  }
}

// 1. Get New Enrollments (Async to support Google Sheets fetch)
export async function getNewEnrollments() {
  if (isSheetsConfigured()) {
    return await getEnrollmentsFromSheets();
  }

  ensureDataFolder();
  if (!fs.existsSync(ENROLLMENTS_FILE)) {
    try {
      fs.writeFileSync(ENROLLMENTS_FILE, JSON.stringify([]));
    } catch (e) {
      console.warn('Could not write enrollments file on read-only filesystem:', e.message);
    }
    return [];
  }
  try {
    const content = fs.readFileSync(ENROLLMENTS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error reading new_enrollments.json:', error);
    return [];
  }
}

// 2. Save New Enrollment (Async to handle await getNewEnrollments)
export async function saveNewEnrollment(enrollment) {
  ensureDataFolder();
  try {
    const enrollments = await getNewEnrollments();
    enrollments.push(enrollment);
    fs.writeFileSync(ENROLLMENTS_FILE, JSON.stringify(enrollments, null, 2));
  } catch (e) {
    console.warn('Could not save enrollment locally on read-only filesystem:', e.message);
  }
}

// 3. Get Class Capacities (stored as classKey: capacity)
export async function getClassCapacities() {
  if (isSheetsConfigured()) {
    return await getCapacitiesFromSheets();
  }

  ensureDataFolder();
  if (!fs.existsSync(CAPACITIES_FILE)) {
    try {
      fs.writeFileSync(CAPACITIES_FILE, JSON.stringify({}));
    } catch (e) {
      console.warn('Could not write capacities file on read-only filesystem:', e.message);
    }
    return {};
  }
  try {
    const content = fs.readFileSync(CAPACITIES_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error reading class_capacities.json:', error);
    return {};
  }
}

// 4. Save Class Capacity
export async function saveClassCapacity(classKey, capacity) {
  if (isSheetsConfigured()) {
    await saveCapacityToSheets(classKey, capacity);
  }

  ensureDataFolder();
  try {
    const capacities = await getClassCapacities();
    capacities[classKey] = capacity;
    fs.writeFileSync(CAPACITIES_FILE, JSON.stringify(capacities, null, 2));
  } catch (e) {
    console.warn('Could not save class capacity locally on read-only filesystem:', e.message);
  }
}

// 5. Get List of Classes with Enrollment Counts and Vacancies
export async function getClasses() {
  // Load existing enrollments from base matricula CSV
  const baseMatricula = parseMatricula();
  // Load new enrollments from Google Sheets or local file
  const newEnrollments = await getNewEnrollments();
  // Load capacities config
  const capacitiesConfig = await getClassCapacities();

  // We want to group by class (defined by component, class name, turno)
  const classesMap = {};

  // Process already enrolled students from base CSV
  baseMatricula.forEach(student => {
    const comp = student.componente || '';
    const name = student.turma || '';
    const turno = student.turno || '';
    const key = `${normalizeString(comp)}|${normalizeString(name)}|${normalizeString(turno)}`;

    if (!classesMap[key]) {
      classesMap[key] = {
        componente: comp,
        turma: name,
        turno: turno,
        dia_da_semana: student.dia_da_semana || '',
        horario_inicial: student.horario_inicial || '',
        horario_fim: student.horario_fim || '',
        nome_formador: student.nome_formador || '',
        cpf_formador: student.cpf_formador || '',
        'e-mail_formador': student['e-mail_formador'] || student['email_formador'] || '',
        tutor_responsavel: student.tutor_responsavel || '',
        email_tutor: student.email_tutor || '',
        'e-mail_nre': student['e-mail_nre'] || student['email_nre'] || '',
        nre_tutor: student.nre_tutor || '',
        Link_Classroom: student['Link Classroom'] || student['Link_Classroom'] || '',
        id_classroom: student.id_classroom || '',
        enrolledCount: 0,
        newEnrolledCount: 0
      };
    }
    classesMap[key].enrolledCount += 1;
  });

  // Process new enrollments from our app
  newEnrollments.forEach(student => {
    const comp = student.componente || '';
    const name = student.turma || '';
    const turno = student.turno || '';
    const key = `${normalizeString(comp)}|${normalizeString(name)}|${normalizeString(turno)}`;

    if (classesMap[key]) {
      classesMap[key].enrolledCount += 1;
      classesMap[key].newEnrolledCount += 1;
    } else {
      // If for some reason the class was not in the base CSV, create it
      classesMap[key] = {
        componente: comp,
        turma: name,
        turno: student.turno || '',
        dia_da_semana: student.dia_da_semana || '',
        horario_inicial: student.horario_inicial || '',
        horario_fim: student.horario_fim || '',
        nome_formador: student.nome_formador || '',
        cpf_formador: student.cpf_formador || '',
        'e-mail_formador': student['e-mail_formador'] || '',
        tutor_responsavel: student.tutor_responsavel || '',
        email_tutor: student.email_tutor || '',
        'e-mail_nre': student['e-mail_nre'] || '',
        nre_tutor: student.nre_tutor || '',
        Link_Classroom: student['Link Classroom'] || '',
        id_classroom: student.id_classroom || '',
        enrolledCount: 1,
        newEnrolledCount: 1
      };
    }
  });

  // Calculate capacities and vacancies
  return Object.keys(classesMap).map(key => {
    const cls = classesMap[key];
    const capacity = capacitiesConfig[key] !== undefined ? capacitiesConfig[key] : 10; // Default capacity: 10
    const vacancies = Math.max(0, capacity - cls.enrolledCount);
    return {
      ...cls,
      classKey: key,
      capacity,
      vacancies
    };
  });
}
