'use client';

import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    try {
      await fetch('/api/auth', { method: 'DELETE' });
      // Clear cookie client side too just in case
      document.cookie = 'tutor_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      // Limpa o e-mail salvo para não entrar em loop ao deslogar
      localStorage.removeItem('tutor_saved_email');
      
      // Desativa o auto-select nativo do Google temporariamente para permitir trocar de conta
      if (typeof window !== 'undefined' && window.google?.accounts?.id) {
        window.google.accounts.id.disableAutoSelect();
      }
      
      router.push('/');
      router.refresh();
    } catch (e) {
      console.error('Failed to log out:', e);
    }
  }

  return (
    <button 
      onClick={handleLogout} 
      className="btn btn-outline" 
      style={{ 
        width: '100%', 
        padding: '0.5rem 1rem', 
        fontSize: '0.85rem',
        borderRadius: 'var(--radius-sm)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.4rem'
      }}
    >
      🚪 Sair da Conta
    </button>
  );
}
