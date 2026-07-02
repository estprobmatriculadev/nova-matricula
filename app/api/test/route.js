import { NextResponse } from 'next/server';
import { parseNomeados, parseMatricula, parseTutores } from '../../lib/csvParser';
import { getClasses } from '../../lib/db';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const diagnostic = {};
  try {
    diagnostic.cwd = process.cwd();
    diagnostic.filesInCwd = fs.readdirSync(process.cwd());
    
    // Check if data/csv directory exists and list its contents
    const csvDir = path.join(process.cwd(), 'data', 'csv');
    diagnostic.csvDirExists = fs.existsSync(csvDir);
    if (diagnostic.csvDirExists) {
      diagnostic.csvFiles = fs.readdirSync(csvDir);
    }
  } catch (e) {
    diagnostic.cwdError = e.message;
  }

  try {
    diagnostic.tutorsCount = parseTutores().length;
  } catch (e) {
    diagnostic.tutorsError = { message: e.message, stack: e.stack };
  }

  try {
    diagnostic.candidatesCount = parseNomeados().length;
  } catch (e) {
    diagnostic.candidatesError = { message: e.message, stack: e.stack };
  }

  try {
    const classes = await getClasses();
    diagnostic.classesCount = classes.length;
  } catch (e) {
    diagnostic.classesError = { message: e.message, stack: e.stack };
  }

  return NextResponse.json(diagnostic);
}
