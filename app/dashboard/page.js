'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recentEnrollments, setRecentEnrollments] = useState([]);

  const [selectedNre, setSelectedNre] = useState('ALL');

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/data');
        if (!res.ok) {
          if (res.status === 401) {
            window.location.href = '/';
            return;
          }
          throw new Error('Falha ao carregar dados do painel.');
        }
        const jsonData = await res.json();
        setData(jsonData);

        const recentRes = await fetch('/api/recent-enrollments');
        if (recentRes.ok) {
          const recentData = await recentRes.json();
          setRecentEnrollments(recentData.enrollments || []);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid var(--border-color)',
            borderTop: '4px solid var(--primary)',
            borderRadius: '50%',
            animation: 'pulse 1.5s infinite linear',
            margin: '0 auto 1rem'
          }}></div>
          <p style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Carregando painel...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--error)' }}>
        <h3>⚠️ Erro ao carregar painel</h3>
        <p style={{ marginTop: '0.5rem' }}>{error}</p>
        <button onClick={() => window.location.reload()} className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Tentar Novamente
        </button>
      </div>
    );
  }

  const { stats, tutorInfo } = data;
  const uniqueNres = data ? [...new Set(data.candidates.map(c => c.nre))].sort() : [];

  // Compute dynamic stats based on selected NRE for admin
  let displayStats = stats;
  if (tutorInfo.role === 'admin' && selectedNre !== 'ALL') {
    const filteredCandidates = data.candidates.filter(c => c.nre === selectedNre);
    const enrolled = filteredCandidates.filter(c => c.status === 'ENROLLED').length;
    const total = filteredCandidates.length;
    displayStats = {
      total,
      enrolled,
      pending: total - enrolled
    };
  }

  const pctEnrolled = displayStats.total > 0 ? Math.round((displayStats.enrolled / displayStats.total) * 100) : 0;

  return (
    <div className="animate-fade-in">
      {/* Upper header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h1>Painel de Controle — {tutorInfo.role === 'admin' ? (selectedNre === 'ALL' ? 'Administrador (Global)' : `NRE ${selectedNre}`) : `NRE ${tutorInfo.nre}`}</h1>
        <p className="subtitle">
          Bem-vindo, <strong>{tutorInfo.tutorName}</strong>. Aqui está o resumo das matrículas do 6º Chamamento.
        </p>
      </div>

      {/* Admin NRE Filter Selector */}
      {tutorInfo.role === 'admin' && (
        <div style={{
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          padding: '1rem 1.5rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
          maxWidth: 'fit-content'
        }}>
          <label htmlFor="nre-select" style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '0.95rem' }}>Visualizar NRE:</label>
          <select
            id="nre-select"
            value={selectedNre}
            onChange={(e) => setSelectedNre(e.target.value)}
            style={{
              padding: '0.5rem 1.5rem 0.5rem 1rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
              backgroundColor: '#1e293b',
              color: 'var(--text-main)',
              outline: 'none',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">Todos os NREs ({uniqueNres.length})</option>
            {uniqueNres.map(nre => (
              <option key={nre} value={nre}>{nre}</option>
            ))}
          </select>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="glass-card stat-card" style={{ borderLeft: '4px solid var(--secondary)' }}>
          <div className="stat-info">
            <p>Total de Cursistas</p>
            <h3>{displayStats.total}</h3>
          </div>
          <div className="stat-icon" style={{ backgroundColor: 'rgba(9, 105, 178, 0.1)', color: 'var(--secondary)' }}>
            👥
          </div>
        </div>

        <div className="glass-card stat-card" style={{ borderLeft: '4px solid var(--success)' }}>
          <div className="stat-info">
            <p>Ensalados (Matriculados)</p>
            <h3>{displayStats.enrolled}</h3>
          </div>
          <div className="stat-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
            ✅
          </div>
        </div>

        <div className="glass-card stat-card" style={{ borderLeft: '4px solid var(--warning)' }}>
          <div className="stat-info">
            <p>Pendentes de Ensalamento</p>
            <h3>{displayStats.pending}</h3>
          </div>
          <div className="stat-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}>
            ⏳
          </div>
        </div>
      </div>

      {/* Progress & Google Sheets Sync */}
      <div className="dashboard-grid" style={{ marginBottom: '2.5rem' }}>
        {/* Progress Card */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h3 style={{ marginBottom: '1rem' }}>Progresso de Ensalamento do NRE</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ flex: 1 }}>
              <div style={{
                height: '16px',
                width: '100%',
                backgroundColor: 'rgba(148, 163, 184, 0.15)',
                borderRadius: '9999px',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <div style={{
                  height: '100%',
                  width: `${pctEnrolled}%`,
                  background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
                  borderRadius: '9999px',
                  transition: 'width 0.8s ease-out'
                }}></div>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem', fontWeight: '500' }}>
                {displayStats.enrolled} de {displayStats.total} cursistas ensalados nas turmas.
              </p>
            </div>
            <div style={{ fontSize: '2.25rem', fontWeight: '800', color: 'var(--primary)' }}>
              {pctEnrolled}%
            </div>
          </div>
        </div>

        {/* Sync Status Card */}
        <div className="glass-card">
          <h3 style={{ marginBottom: '0.75rem' }}>Sincronização de Dados</h3>
          {tutorInfo.sheetsConfigured ? (
            <div>
              <div style={{ marginBottom: '0.75rem' }}>
                <span className="badge badge-success">🌐 Google Sheets Ativo</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                Os dados de novos cursistas cadastrados estão sendo enviados automaticamente para a planilha oficial.
              </p>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: '0.75rem' }}>
                <span className="badge badge-pending">💾 Modo Local Ativo</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4', marginBottom: '1rem' }}>
                A API do Google Sheets não está configurada. Os cadastros estão sendo gravados localmente no servidor.
              </p>
              {recentEnrollments.length > 0 && (
                <a href="/api/download-csv" className="btn btn-outline" style={{ width: '100%', padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                  📥 Baixar CSV de Matrículas
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Recent Enrollments Table */}
      <div className="glass-card" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3>Matrículas Recentes (Neste Processo)</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Últimos cursistas recém-ensalados pelo seu NRE.
            </p>
          </div>
          <Link href="/candidates" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
            ➕ Ensalar Cursista
          </Link>
        </div>

        {recentEnrollments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: '2.5rem' }}>🏫</span>
            <h4 style={{ marginTop: '1rem', color: 'var(--text-main)' }}>Nenhuma matrícula realizada ainda</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Os cursistas recém-registrados aparecerão listados aqui.
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nome do Cursista</th>
                  <th>Componente</th>
                  <th>Turma</th>
                  <th>CGM</th>
                  <th>Código Cursista</th>
                </tr>
              </thead>
              <tbody>
                {recentEnrollments.slice(-5).reverse().map((e, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: '600' }}>{e.nome_cursista}</td>
                    <td>{e.componente}</td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{e.turma}</td>
                    <td>{e.cgm}</td>
                    <td>
                      <code style={{
                        backgroundColor: 'var(--primary-light)',
                        color: 'var(--primary)',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        fontWeight: '700',
                        fontSize: '0.85rem'
                      }}>
                        {e.cod_cursista}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
