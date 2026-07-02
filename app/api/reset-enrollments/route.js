import { NextResponse } from 'next/server';
import { clearAllEnrollments } from '../../lib/db';

/**
 * POST /api/reset-enrollments
 * Apenas admin. Apaga todas as matrículas do Firestore.
 * Usar antes de efetivar (ir para produção real).
 */
export async function POST(request) {
  try {
    const sessionCookie = request.cookies.get('tutor_session');
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const session = JSON.parse(sessionCookie.value);
    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado. Apenas administradores.' }, { status: 403 });
    }

    // Confirmação obrigatória no body
    const body = await request.json().catch(() => ({}));
    if (body.confirm !== 'ZERAR_MATRICULAS') {
      return NextResponse.json({
        error: 'Confirmação inválida. Envie { "confirm": "ZERAR_MATRICULAS" } no body.'
      }, { status: 400 });
    }

    const result = await clearAllEnrollments();

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    console.log(`[RESET] ${result.count} matrículas apagadas por ${session.email} em ${new Date().toISOString()}`);

    return NextResponse.json({
      success: true,
      message: `${result.count} matrícula(s) apagada(s) com sucesso. Sistema pronto para produção.`,
      clearedBy: session.email,
      clearedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Reset API Error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
