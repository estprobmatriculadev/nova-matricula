'use client';

import { useState, useEffect } from 'react';

export default function ThemeSelector() {
  const [theme, setTheme] = useState('system');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'system';
    setTheme(savedTheme);
  }, []);

  const changeTheme = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);

    const root = document.documentElement;
    if (newTheme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else if (newTheme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      // System
      root.classList.remove('dark', 'light');
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '0.4rem',
      width: '100%',
      marginBottom: '0.5rem'
    }}>
      <span style={{ 
        fontSize: '0.7rem', 
        fontWeight: '700', 
        color: 'var(--text-muted)', 
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }}>
        Tema Visual
      </span>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        backgroundColor: 'rgba(148, 163, 184, 0.08)',
        padding: '3px',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
        gap: '2px'
      }}>
        {[
          { key: 'light', icon: '☀️', title: 'Claro' },
          { key: 'dark', icon: '🌙', title: 'Escuro' },
          { key: 'system', icon: '💻', title: 'Sistema' }
        ].map((t) => {
          const isActive = theme === t.key;

          return (
            <button
              key={t.key}
              onClick={() => changeTheme(t.key)}
              title={t.title}
              type="button"
              style={{
                background: isActive ? 'var(--bg-secondary)' : 'transparent',
                color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                border: 'none',
                borderRadius: '6px',
                padding: '0.45rem 0',
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.3rem',
                fontWeight: '600',
                transition: 'var(--transition)',
                boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
              }}
            >
              <span>{t.icon}</span>
              <span style={{ fontSize: '0.72rem' }} className="theme-text-lbl">{t.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
