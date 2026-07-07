'use client';

import { useState } from 'react';
import Link from 'next/link';
import LogoutButton from './LogoutButton';
import ThemeSelector from './ThemeSelector';

export default function SidebarClient({ session }) {
  const [isOpen, setIsOpen] = useState(false);

  const close = () => setIsOpen(false);

  const navLinks = [
    { href: '/dashboard', icon: '📊', label: 'Dashboard' },
    { href: '/candidates', icon: '👨‍🏫', label: 'Cursistas (NRE)' },
    { href: '/classes', icon: '🏫', label: 'Turmas e Vagas' },
  ];

  return (
    <>
      {/* Mobile top bar */}
      <div className="mobile-topbar">
        <button
          className="hamburger-btn"
          onClick={() => setIsOpen(true)}
          aria-label="Abrir menu"
        >
          ☰
        </button>
        <img src="/brasao.svg" alt="SEED PR" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
        <span style={{ fontWeight: '800', fontSize: '1rem', color: 'var(--text-main)' }}>SEED PR</span>
      </div>

      {/* Dark overlay behind open sidebar on mobile */}
      {isOpen && (
        <div className="sidebar-overlay overlay-visible" onClick={close} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar${isOpen ? ' sidebar-open' : ''}`}>
        {/* Close button visible only on mobile */}
        <button
          onClick={close}
          style={{
            display: 'none',
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'transparent',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.25rem 0.5rem',
            cursor: 'pointer',
            fontSize: '1rem',
            color: 'var(--text-muted)',
          }}
          className="sidebar-close-btn"
          aria-label="Fechar menu"
        >
          ✕
        </button>



        {/* Logo */}
        <div style={{ marginBottom: '2.5rem', marginTop: '0.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img
              src="/brasao.svg"
              alt="Brasão SEED PR"
              style={{ width: '40px', height: '40px', objectFit: 'contain' }}
            />
            <div className="logo-text">
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', lineHeight: 1.1 }}>SEED PR</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>ENSALAMENTO v6</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          {navLinks.map(({ href, icon, label }) => (
            <Link
              key={href}
              href={href}
              className="nav-link"
              onClick={close}
            >
              {icon} <span className="nav-label">{label}</span>
            </Link>
          ))}
        </nav>

        {/* Tutor info at bottom */}
        <div
          className="tutor-info-container"
          style={{
            borderTop: '1px solid var(--border-color)',
            paddingTop: '1rem',
            marginTop: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          <ThemeSelector />

          <div className="tutor-info-full">
            <p style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)' }}>
              {session.tutorName}
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '500' }}>
              NRE {session.nre}
            </p>
            <p style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: '600', wordBreak: 'break-all', marginTop: '0.2rem' }}>
              {session.email}
            </p>
          </div>
          <LogoutButton />
        </div>
      </aside>
    </>
  );
}
