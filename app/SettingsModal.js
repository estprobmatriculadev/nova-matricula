'use client';

import { useState, useEffect } from 'react';

export default function SettingsModal({ isOpen, onClose, session }) {
  const [isLoading, setIsLoading] = useState(false);
  const [periodStatus, setPeriodStatus] = useState(null);
  const [status, setStatus] = useState(true);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Check admin status
  const isAdmin = session?.role === 'admin' && 
    ['jorge.dotti@escola.pr.gov.br', 'estagioprobatorio@escola.pr.gov.br'].includes(session?.email?.toLowerCase());

  useEffect(() => {
    if (isOpen && isAdmin) {
      fetchPeriodStatus();
    }
  }, [isOpen, isAdmin]);

  async function fetchPeriodStatus() {
    setIsLoading(true);
    try {
      const res = await fetch('/api/period-status');
      const data = await res.json();
      setPeriodStatus(data);
      setStatus(data.isOpen);
      setMessage(data.message || '');
    } catch (err) {
      console.error('Erro ao buscar status:', err);
      setFeedback({ type: 'error', text: 'Erro ao carregar configurações' });
    } finally {
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
        body: JSON.stringify({ isOpen: status, message })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          text: status ? '✓ Período reaberto com sucesso!' : '✓ Período encerrado com sucesso!'
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

  if (!isOpen) return null;

  // If not admin, show message
  if (!isAdmin) {
    return (
      <>
        <div
          className="modal-overlay"
          onClick={onClose}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderRadius: 'var(--radius-lg)',
              padding: '2rem',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              border: '1px solid var(--border-color)'
            }}
          >
            <h2 style={{ margin: '0 0 1rem 0' }}>⚙️ Configurações</h2>
            <p style={{ color: 'var(--text-muted)', margin: '0' }}>
              Apenas administradores podem acessar as configurações do período.
            </p>
            <button
              onClick={onClose}
              style={{
                marginTop: '1.5rem',
                padding: '0.75rem 1.5rem',
                backgroundColor: 'var(--primary-color)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Fechar
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="modal-overlay"
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          overscrollBehavior: 'contain'
        }}
      />

      {/* Modal */}
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'var(--bg-primary)',
          borderRadius: 'var(--radius-lg)',
          padding: '2rem',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          border: '1px solid var(--border-color)',
          zIndex: 10000
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem' }}>⚙️ Configurações</h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.25rem 0.5rem',
              cursor: 'pointer',
              fontSize: '1.2rem',
              color: 'var(--text-muted)'
            }}
          >
            ✕
          </button>
        </div>

        {/* Loading */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p>Carregando...</p>
          </div>
        ) : (
          <>
            {/* Feedback */}
            {feedback && (
              <div
                style={{
                  backgroundColor: feedback.type === 'success'
                    ? 'rgba(16, 185, 129, 0.1)'
                    : 'rgba(239, 68, 68, 0.1)',
                  border: feedback.type === 'success'
                    ? '1px solid rgba(16, 185, 129, 0.3)'
                    : '1px solid rgba(239, 68, 68, 0.3)',
                  color: feedback.type === 'success' ? '#10b981' : '#ef4444',
                  padding: '1rem',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '1.5rem',
                  fontSize: '0.9rem'
                }}
              >
                {feedback.text}
              </div>
            )}

            {/* Status Card */}
            <div
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '2px solid ' + (status ? '#10b981' : '#ef4444'),
                borderRadius: 'var(--radius-lg)',
                padding: '1.5rem',
                marginBottom: '1.5rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    Status do Período
                  </p>
                  <h3 style={{ margin: '0.5rem 0 0 0', fontSize: '1.3rem' }}>
                    {status ? '🟢 Aberto' : '🔴 Encerrado'}
                  </h3>
                </div>
                <div style={{ fontSize: '2rem' }}>
                  {status ? '📂' : '📁'}
                </div>
              </div>
              {periodStatus?.closedAt && !status && (
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Encerrado em: {new Date(periodStatus.closedAt).toLocaleString('pt-BR')}
                </p>
              )}
            </div>

            {/* Toggle Button */}
            <button
              onClick={() => setStatus(!status)}
              style={{
                width: '100%',
                padding: '1rem',
                fontSize: '1rem',
                fontWeight: '600',
                backgroundColor: status ? '#ef4444' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                marginBottom: '1.5rem',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => (e.target.style.opacity = '0.9')}
              onMouseOut={(e) => (e.target.style.opacity = '1')}
            >
              {status ? '🔒 Encerrar Período' : '🔓 Reabrir Período'}
            </button>

            {/* Message Input */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '600',
                  color: 'var(--text-primary)'
                }}
              >
                Mensagem para Tutores (opcional)
              </label>
              <p
                style={{
                  margin: '0 0 0.75rem 0',
                  fontSize: '0.85rem',
                  color: 'var(--text-muted)'
                }}
              >
                Será exibida quando o período está encerrado.
              </p>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ex: Período encerrado. Entre em contato com a administração."
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontFamily: 'inherit',
                  fontSize: '0.95rem',
                  minHeight: '80px',
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
                transition: 'all 0.2s',
                marginBottom: '0.75rem'
              }}
              onMouseOver={(e) => !saving && (e.target.style.opacity = '0.9')}
              onMouseOut={(e) => !saving && (e.target.style.opacity = '1')}
            >
              {saving ? '💾 Salvando...' : '💾 Salvar Configurações'}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '0.95rem',
                fontWeight: '600',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => (e.target.style.opacity = '0.8')}
              onMouseOut={(e) => (e.target.style.opacity = '1')}
            >
              Fechar
            </button>

            {/* Info */}
            <div
              style={{
                backgroundColor: 'rgba(59, 130, 246, 0.05)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.75rem',
                marginTop: '1.5rem',
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
                lineHeight: '1.5'
              }}
            >
              <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600' }}>ℹ️ Informações:</p>
              <ul style={{ margin: '0', paddingLeft: '1.25rem', fontSize: '0.8rem' }}>
                <li>Período encerrado = tutores não conseguem fazer login</li>
                <li>Admins sempre conseguem acessar</li>
                <li>Alterações são salvas imediatamente</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </>
  );
}
