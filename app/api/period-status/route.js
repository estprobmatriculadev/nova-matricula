import { NextResponse } from 'next/server';
import { getFirestore } from '../../lib/firebase';

/**
 * GET /api/period-status
 * Retorna o status do período de ensalamento
 * 
 * Response: { isOpen: boolean, message: string }
 */
export async function GET(request) {
  try {
    const db = getFirestore();
    const settingsRef = db.collection('settings').doc('period-status');
    const settingsSnap = await settingsRef.get();

    const isOpen = settingsSnap.exists ? settingsSnap.data().isOpen ?? true : true;
    const message = settingsSnap.exists ? settingsSnap.data().message || '' : '';
    const closedAt = settingsSnap.exists ? settingsSnap.data().closedAt || null : null;

    return NextResponse.json({
      isOpen,
      message,
      closedAt,
      success: true
    });
  } catch (error) {
    console.error('Erro ao buscar status do período:', error);
    return NextResponse.json({ 
      error: 'Erro ao buscar status do período',
      isOpen: true // Default: período aberto em caso de erro
    }, { status: 500 });
  }
}

/**
 * POST /api/period-status
 * Atualiza o status do período (apenas admin)
 * 
 * Body: { isOpen: boolean, message?: string }
 */
export async function POST(request) {
  try {
    const { isOpen, message } = await request.json();

    // Verificar autenticação
    const cookies = request.headers.get('cookie') || '';
    const cookieArray = cookies.split(';');
    const sessionCookie = cookieArray.find(c => c.trim().startsWith('tutor_session='));

    if (!sessionCookie) {
      return NextResponse.json({ 
        error: 'Sessão expirada ou não autenticada.' 
      }, { status: 401 });
    }

    let session = null;
    try {
      const cookieValue = sessionCookie.split('=')[1];
      session = JSON.parse(decodeURIComponent(cookieValue));
    } catch (e) {
      return NextResponse.json({ 
        error: 'Sessão inválida.' 
      }, { status: 401 });
    }

    // Verificar se é admin
    const adminEmails = process.env.ADMIN_EMAILS ? 
      process.env.ADMIN_EMAILS.split(',').map(e => e.trim().toLowerCase()) : 
      [];
    if (!adminEmails.includes('jorge.dotti@escola.pr.gov.br')) {
      adminEmails.push('jorge.dotti@escola.pr.gov.br');
    }
    if (!adminEmails.includes('estagioprobatorio@escola.pr.gov.br')) {
      adminEmails.push('estagioprobatorio@escola.pr.gov.br');
    }

    const isAdmin = session.role === 'admin' && adminEmails.includes(session.email.toLowerCase());

    if (!isAdmin) {
      return NextResponse.json({ 
        error: 'Acesso negado. Apenas administradores podem alterar o status do período.' 
      }, { status: 403 });
    }

    // Atualizar status no Firestore
    const db = getFirestore();
    const settingsRef = db.collection('settings').doc('period-status');

    await settingsRef.set({
      isOpen: typeof isOpen === 'boolean' ? isOpen : true,
      message: message || '',
      closedAt: !isOpen ? new Date().toISOString() : null,
      updatedBy: session.email,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    return NextResponse.json({
      success: true,
      isOpen: typeof isOpen === 'boolean' ? isOpen : true,
      message: message || ''
    });
  } catch (error) {
    console.error('Erro ao atualizar status do período:', error);
    return NextResponse.json({ 
      error: 'Erro ao atualizar status do período'
    }, { status: 500 });
  }
}
