import { cookies } from 'next/headers';
import './globals.css';

export const metadata = {
  title: 'Ensalamento SEED PR - 6º Chamamento',
  description: 'Portal de Matricula de Cursistas e Controle de Vagas',
};

import SidebarClient from './SidebarClient';

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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme') || 'system';
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                    document.documentElement.classList.remove('light');
                  } else if (theme === 'light') {
                    document.documentElement.classList.add('light');
                    document.documentElement.classList.remove('dark');
                  } else {
                    document.documentElement.classList.remove('dark', 'light');
                  }
                } catch (e) {}
              })();
            `
          }}
        />
      </head>
      <body>
        <div className="app-container">
          {isLoggedIn && <SidebarClient session={session} />}

          <main
            className="main-content"
            style={{ marginLeft: isLoggedIn ? undefined : '0' }}
          >
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
