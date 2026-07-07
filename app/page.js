'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import ThemeSelector from './ThemeSelector';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [googleClientConfigured, setGoogleClientConfigured] = useState(false);

  useEffect(() => {
    // Check if user is already logged in (redirect to dashboard)
    const cookies = document.cookie.split(';');
    const hasSession = cookies.some(item => item.trim().startsWith('tutor_session='));
    if (hasSession) {
      router.push('/dashboard');
      return;
    }

    // Se o e-mail já foi validado anteriormente, entra direto sem precisar digitar novamente
    const savedEmail = localStorage.getItem('tutor_saved_email');
    if (savedEmail) {
      handleLogin(savedEmail);
    }
  }, [router]);

  // Handle Google Identity Services Credential response
  function handleCredentialResponse(response) {
    try {
      const base64Url = response.credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      const payload = JSON.parse(jsonPayload);
      if (payload.email) {
        handleLogin(payload.email);
      } else {
        setError('Não foi possível obter o e-mail da sua conta Google.');
      }
    } catch (e) {
      console.error('Error parsing Google token:', e);
      setError('Erro ao processar o login com Google.');
    }
  }

  // Load and initialize Google Sign-in if client ID is configured
  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (clientId) {
      setGoogleClientConfigured(true);
      const initGoogle = () => {
        if (window.google) {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleCredentialResponse,
            auto_select: true // Habilita o login automático nativo do Google
          });
          window.google.accounts.id.renderButton(
            document.getElementById('google-signin-button'),
            { theme: 'outline', size: 'large', width: '280', text: 'signin_with', shape: 'rectangular' }
          );
          // Executa o prompt do Google One Tap para login automático instantâneo
          window.google.accounts.id.prompt();
        }
      };

      if (window.google) {
        initGoogle();
      } else {
        const interval = setInterval(() => {
          if (window.google) {
            initGoogle();
            clearInterval(interval);
          }
        }, 500);
        return () => clearInterval(interval);
      }
    }
  }, []);

  async function handleLogin(emailToUse) {
    if (!emailToUse) {
      setError('Por favor, informe ou selecione um e-mail.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToUse })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Salva o e-mail para permitir o login automático/direto nas próximas visitas
        localStorage.setItem('tutor_saved_email', emailToUse);
        router.push('/dashboard');
        router.refresh();
      } else {
        setError(data.error || 'Falha na autenticação.');
      }
    } catch (err) {
      setError('Ocorreu um erro ao tentar fazer login. Verifique sua conexão.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  }

  // Handle Google Auth (Mocking standard Google OAuth Popup/Redirect)
  function handleGoogleLogin() {
    setLoading(true);
    // Standard prompt: if they enter an email, we log them in. 
    // In production, this would trigger standard OAuth. We show a prompt
    // to type their NRE email (e-mail_nre).
    const email = prompt('Digite seu e-mail do Google institucional (e-mail_nre):', '');
    if (email) {
      handleLogin(email);
    } else {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 50% 50%, var(--bg-secondary) 0%, var(--bg-primary) 100%)',
      padding: '1.5rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative colored glow in the background */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '-10%',
        width: '40vw',
        height: '40vw',
        background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, rgba(0,0,0,0) 70%)',
        zIndex: 0
      }}></div>
      <div style={{
        position: 'absolute',
        bottom: '-10%',
        right: '-10%',
        width: '40vw',
        height: '40vw',
        background: 'radial-gradient(circle, rgba(9,105,178,0.06) 0%, rgba(0,0,0,0) 70%)',
        zIndex: 0
      }}></div>

      <div className="glass-card animate-fade-in" style={{
        width: '100%',
        maxWidth: '480px',
        padding: '2rem 1.5rem', // Reduced padding on mobile
        zIndex: 1,
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-lg)'
      }}>

        {/* Header Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img
            src="/brasao.svg"
            alt="Brasão SEED Paraná"
            style={{
              width: '80px',
              height: '80px',
              objectFit: 'contain',
              marginBottom: '1rem',
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))'
            }}
          />
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>SEED Paraná</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '500' }}>
            Portal de Ensalamento - Estágio Probatório
          </p>
        </div>

        {error && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: 'var(--error)',
            padding: '1rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.9rem',
            fontWeight: '500',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Main Google Login button */}
          {googleClientConfigured ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
              <div id="google-signin-button" style={{ display: 'flex', justifyContent: 'center', width: '100%', maxWidth: '280px' }}></div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                Selecione sua conta institucional para acessar o portal.
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="btn btn-primary"
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  width: '100%',
                  backgroundColor: '#ffffff',
                  color: '#1f2937',
                  border: '1px solid #d1d5db',
                  boxShadow: 'var(--shadow-sm)',
                  whiteSpace: 'normal', // Allow wrapping on very small screens
                }}
              >
                {/* Google Icon G */}
                <svg width="20" height="20" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                  <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.186 4.114-3.535 0-6.402-2.867-6.402-6.402s2.867-6.402 6.402-6.402c1.782 0 3.33.729 4.434 1.91l3.18-3.18C19.266 2.228 15.982 1 12.24 1 6.032 1 1 6.032 1 12.24s5.032 11.24 11.24 11.24c5.897 0 10.867-4.248 10.867-11.24 0-.668-.073-1.31-.192-1.955H12.24z"/>
                </svg>
                <span style={{ fontWeight: '700' }}>Fazer Login com o Google</span>
              </button>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', margin: '0.25rem 0', lineHeight: 1.3 }}>
                💡 Para usar o login automático da conta Google, configure a variável de ambiente <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> no painel da Vercel.
              </p>
            </div>
          )}



          {/* Theme Selector */}
          <div style={{ 
            marginTop: '1.5rem', 
            borderTop: '1px solid var(--border-color)', 
            paddingTop: '1.25rem' 
          }}>
            <ThemeSelector />
          </div>

          {/* Explanatory notes footer */}
          <div style={{
            marginTop: '1.25rem',
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            textAlign: 'center',
            lineHeight: '1.4'
          }}>
            <p>Este portal é restrito a tutores de NRE da SEED Paraná.</p>
            <p style={{ marginTop: '0.3rem' }}>
              O ensalamento de cursistas é gravado localmente e sincronizado na planilha Google Sheets associada.
            </p>
          </div>
        </div>
      </div>
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
    </div>
  );
}
