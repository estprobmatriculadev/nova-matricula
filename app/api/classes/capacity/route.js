import { NextResponse } from 'next/server';
import { saveClassCapacity } from '../../../lib/db';

export async function POST(request) {
  try {
    // Check authentication
    const sessionCookie = request.cookies.get('tutor_session');
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Sessão expirada ou não autenticada.' }, { status: 401 });
    }

    const { classKey, capacity } = await request.json();

    if (!classKey || capacity === undefined) {
      return NextResponse.json({ error: 'Parâmetros inválidos. Informe classKey e capacity.' }, { status: 400 });
    }

    const numericCapacity = parseInt(capacity, 10);
    if (isNaN(numericCapacity) || numericCapacity < 0) {
      return NextResponse.json({ error: 'Capacidade deve ser um número maior ou igual a zero.' }, { status: 400 });
    }

    await saveClassCapacity(classKey, numericCapacity);

    return NextResponse.json({ success: true, classKey, capacity: numericCapacity });
  } catch (error) {
    console.error('Update Capacity API Error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
