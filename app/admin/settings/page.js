'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminSettingsPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [periodStatus, setPeriodStatus] = useState(null);
  const [isOpen, setIsOpen] = useState(true);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    // Check authentication
    const cookies = document.cookie.split(';');
    const sessionCookie = cookies.find(c => c.trim().startsWith('tutor_session='));

    if (!sessionCookie) {
      router.push('/');
      return;
    }

    try {
      const cookieValue = sessionCookie.split('=')[1];
      const sessionData = JSON.parse(decodeURIComponent(cookieValue));
      
      // Verificar se é admin
      const adminEmails = ['jorge.dotti@escola.pr.gov.br', 'estagioprobatorio@escola.pr.gov.br'];
      if (sessionData.role !== 'admin' || !adminEmails.includes(sessionData.email.toLowerCase())) {
        router.push('/dashboard');
        return;
      }

      setSession(sessionData);
      fetchPeriodStatus();
    } catch (err) {
      console.error('Erro ao processar sessão:', err);
      router.push('/');
    }
  }, [router]);

  async function fetchPeriodStatus() {
    try {
      const res = await fetch('/api/period-status');
      const data = await res.json();
      setPeriodStatus(data);
      setIsOpen(data.isOpen);
      setMessage(data.message || '');
      setIsLoading(false);
    } catch (err) {
      console.error('Erro ao buscar status do período:', err);
      setIsLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/period-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOpen, message })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          text: isOpen ? '✓ Período reaberto com sucesso!' : '✓ Período encerrado com sucesso!'
        });
        setPeriodStatus(data);
        setTimeout(() => setFeedback(null), 3000);
      } else {
        setFeedback({
          type: 'error',
          text: data.error || 'Erro ao atualizar período'
        });
      }
    } catch (err) {
      console.error('Erro ao salvar:', err);
      setFeedback({
        type: 'error',
        text: 'Erro ao conectar com o servidor'
      });
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/dashboard" style={{ 
          color: 'var(--text-secondary)',
          textDecoration: 'none',
          fontSize: '0.9rem',
          marginBottom: '1rem',
          display: 'inline-block'
        }}>
          ← Voltar ao Dashboard
        </Link>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚙️ Configurações do Período</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Controle o período de ensalamento para tutores e cursistas
        </p>
      </div>

      {/* Info do Admin */}
      {session && (
        <div style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)',
          padding: '1rem',
          marginBottom: '2rem',
          fontSize: '0.9rem'
        }}>
          <p style={{ margin: '0.25rem 0', color: 'var(--text-muted)' }}>
            <strong>Administrador:</strong> {session.tutorName}
          </p>
          <p style={{ margin: '0.25rem 0', color: 'var(--text-muted)' }}>
            <strong>E-mail:</strong> {session.email}
          </p>
        </div>
      )}

      {/* Feedback Messages */}
      {feedback && (
        <div style={{
          backgroundColor: feedback.type === 'success' 
            ? 'rgba(16, 185, 129, 0.1)' 
            : 'rgba(239, 68, 68, 0.1)',
          border: feedback.type === 'success'
            ? '1px solid rgba(16, 185, 129, 0.3)'
            : '1px solid rgba(239, 68, 68, 0.3)',
          color: feedback.type === 'success' ? '#10b981' : '#ef4444',
          padding: '1rem',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '1.5rem'
        }}>
          {feedback.text}
        </div>
      )}

      {/* Status Card */}
      <div style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '2px solid ' + (isOpen ? '#10b981' : '#ef4444'),
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem',
        marginBottom: '2rem'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem'
        }}>
          <div>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Status Atual do Período
            </p>
            <h2 style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem' }}>
              {isOpen ? '🟢 Aberto' : '🔴 Encerrado'}
            </h2>
          </div>
          <div style={{ fontSize: '2.5rem' }}>
            {isOpen ? '📂' : '📁'}
          </div>
        </div>

        {periodStatus?.closedAt && !isOpen && (
          <p style={{
            margin: '0.5rem 0 0 0',
            fontSize: '0.85rem',
            color: 'var(--text-muted)'
          }}>
            Encerrado em: {new Date(periodStatus.closedAt).toLocaleString('pt-BR')}
          </p>
        )}
      </div>

      {/* Toggle Button */}
      <div style={{ marginBottom: '2rem' }}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            width: '100%',
            padding: '1rem',
            fontSize: '1rem',
            fontWeight: '600',
            backgroundColor: isOpen ? '#ef4444' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => e.target.style.opacity = '0.9'}
          onMouseOut={(e) => e.target.style.opacity = '1'}
        >
          {isOpen ? '🔒 Encerrar Período' : '🔓 Reabrir Período'}
        </button>
      </div>

      {/* Message Input */}
      <div style={{ marginBottom: '2rem' }}>
        <label style={{
          display: 'block',
          marginBottom: '0.5rem',
          fontWeight: '600',
          color: 'var(--text-primary)'
        }}>
          Mensagem para Tutores (opcional)
        </label>
        <p style={{
          margin: '0 0 0.75rem 0',
          fontSize: '0.85rem',
          color: 'var(--text-muted)'
        }}>
          Esta mensagem será exibida quando o período está encerrado.
        </p>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ex: Período encerrado. Para dúvidas, entre em contato com a administração."
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            fontFamily: 'inherit',
            fontSize: '0.95rem',
            minHeight: '100px',
            resize: 'vertical',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          width: '100%',
          padding: '1rem',
          fontSize: '1rem',
          fontWeight: '600',
          backgroundColor: 'var(--primary-color)',
          color: 'white',
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          cursor: saving ? 'not-allowed' : 'pointer',
          opacity: saving ? 0.7 : 1,
          transition: 'all 0.2s'
        }}
        onMouseOver={(e) => !saving && (e.target.style.opacity = '0.9')}
        onMouseOut={(e) => !saving && (e.target.style.opacity = '1')}
      >
        {saving ? '💾 Salvando...' : '💾 Salvar Configurações'}
      </button>

      {/* Info Box */}
      <div style={{
        backgroundColor: 'rgba(59, 130, 246, 0.05)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        borderRadius: 'var(--radius-sm)',
        padding: '1rem',
        marginTop: '2rem',
        fontSize: '0.9rem',
        color: 'var(--text-secondary)',
        lineHeight: '1.6'
      }}>
        <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600' }}>ℹ️ Informações Importantes:</p>
        <ul style={{ margin: '0', paddingLeft: '1.25rem' }}>
          <li>Quando o período está <strong>encerrado</strong>, tutores não conseguirão fazer login.</li>
          <li>Administradores podem acessar sempre, independente do status.</li>
          <li>A mensagem customizada é exibida no modal de "Período Encerrado".</li>
          <li>As alterações são salvas imediatamente no banco de dados.</li>
        </ul>
      </div>
    </div>
  );
}
