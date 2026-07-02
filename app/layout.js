import { cookies } from 'next/headers';
import Link from 'next/link';
import './globals.css';

export const metadata = {
  title: 'Ensalamento SEED PR - 6º Chamamento',
  description: 'Portal de Matricula de Cursistas e Controle de Vagas',
};

// Client Component to handle logout easily
import LogoutButton from './LogoutButton';

export default function RootLayout({ children }) {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('tutor_session');
  
  let session = null;
  if (sessionCookie) {
    try {
      session = JSON.parse(sessionCookie.value);
    } catch (e) {
      console.error('Failed to parse tutor session cookie:', e);
    }
  }

  const isLoggedIn = !!session;

  return (
    <html lang="pt-BR">
      <body>
        <div className={`app-container ${isLoggedIn ? 'logged-in' : ''}`}>
          {isLoggedIn && (
            <aside className="sidebar">
              <div style={{ marginBottom: '2.5rem' }}>
                {/* Logo Section */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <img
                    src="/brasao.svg"
                    alt="Brasão SEED PR"
                    style={{
                      width: '40px',
                      height: '40px',
                      objectFit: 'contain'
                    }}
                  />
                  <div className="logo-text">
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '800', lineHeight: 1.1 }}>SEED PR</h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>ENSALAMENTO v6</p>
                  </div>
                </div>
              </div>

              {/* Navigation Links */}
              <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                <Link href="/dashboard" className="nav-link" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-main)',
                  textDecoration: 'none',
                  fontWeight: '600',
                  fontSize: '0.95rem'
                }}>
                  📊 <span className="nav-label">Dashboard</span>
                </Link>
                
                <Link href="/candidates" className="nav-link" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-main)',
                  textDecoration: 'none',
                  fontWeight: '600',
                  fontSize: '0.95rem'
                }}>
                  👨‍🏫 <span className="nav-label">Cursistas (NRE)</span>
                </Link>

                <Link href="/classes" className="nav-link" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-main)',
                  textDecoration: 'none',
                  fontWeight: '600',
                  fontSize: '0.95rem'
                }}>
                  🏫 <span className="nav-label">Turmas e Vagas</span>
                </Link>
              </nav>

              {/* Tutor User profile at the bottom */}
              <div className="tutor-info-container" style={{
                borderTop: '1px solid var(--border-color)',
                paddingTop: '1rem',
                marginTop: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                <div className="tutor-info-full">
                  <p style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)' }}>
                    {session.tutorName}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                    NRE {session.nre}
                  </p>
                  <p style={{ 
                    fontSize: '0.7rem', 
                    color: 'var(--primary)', 
                    fontWeight: '600',
                    wordBreak: 'break-all',
                    marginTop: '0.2rem'
                  }}>
                    {session.email}
                  </p>
                </div>
                <LogoutButton />
              </div>
            </aside>
          )}

          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
