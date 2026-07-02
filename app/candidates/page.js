'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState([]);
  const [tutorNre, setTutorNre] = useState('');
  const [tutorRole, setTutorRole] = useState('tutor');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search & Filter State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [nreFilter, setNreFilter] = useState('ALL');

  useEffect(() => {
    async function loadCandidates() {
      try {
        const res = await fetch('/api/data');
        if (!res.ok) {
          if (res.status === 401) {
            window.location.href = '/';
            return;
          }
          throw new Error('Falha ao carregar lista de cursistas.');
        }
        const data = await res.json();
        setCandidates(data.candidates || []);
        setTutorNre(data.tutorInfo?.nre || '');
        setTutorRole(data.tutorInfo?.role || 'tutor');
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadCandidates();
  }, []);

  // Format CPF as 000.000.000-00 for display
  function formatCpf(cpf) {
    if (!cpf) return '';
    const clean = cpf.toString().replace(/\D/g, '');
    if (clean.length !== 11) return cpf;
    return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`;
  }

  // Pre-filter by NRE selection
  const nreFilteredCandidates = candidates.filter(c => {
    return nreFilter === 'ALL' || c.nre === nreFilter;
  });

  // Filter candidates further by search and status
  const filteredCandidates = nreFilteredCandidates.filter(c => {
    // Search filter
    const query = search.toLowerCase();
    const matchesSearch = 
      (c.nome || '').toLowerCase().includes(query) ||
      (c.cpf || '').includes(query) ||
      (c.rg || '').includes(query);

    // Status filter
    const matchesStatus = 
      statusFilter === 'ALL' ||
      (statusFilter === 'PENDING' && c.status === 'PENDING') ||
      (statusFilter === 'ENROLLED' && c.status === 'ENROLLED');

    return matchesSearch && matchesStatus;
  });

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
          <p style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Carregando cursistas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--error)' }}>
        <h3>⚠️ Erro ao carregar cursistas</h3>
        <p style={{ marginTop: '0.5rem' }}>{error}</p>
        <button onClick={() => window.location.reload()} className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2.5rem' }}>
        <h1>Cursistas — {tutorRole === 'admin' ? (nreFilter === 'ALL' ? 'Todos os NREs' : `NRE ${nreFilter}`) : `NRE ${tutorNre}`}</h1>
        <p className="subtitle">
          Gerencie e matricule os novos concursados nomeados do 6º Chamamento pertencentes ao seu núcleo regional.
        </p>
      </div>

      {/* Admin NRE Filter Selector */}
      {tutorRole === 'admin' && (
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
          <label htmlFor="nre-select" style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '0.95rem' }}>Filtrar por NRE:</label>
          <select
            id="nre-select"
            value={nreFilter}
            onChange={(e) => setNreFilter(e.target.value)}
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
            <option value="ALL">Todos os NREs ({[...new Set(candidates.map(c => c.nre))].length})</option>
            {[...new Set(candidates.map(c => c.nre))].sort().map(nre => (
              <option key={nre} value={nre}>{nre}</option>
            ))}
          </select>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="glass-card" style={{
        padding: '1.5rem',
        marginBottom: '2rem',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1.5rem',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Search Input */}
        <div style={{ flex: 1, minWidth: '260px', position: 'relative' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>🔍</span>
          <input
            type="text"
            placeholder="Buscar por Nome, CPF ou RG..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '2.25rem' }}
          />
        </div>

        {/* Status Filters */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`btn ${statusFilter === 'ALL' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            Todos ({nreFilteredCandidates.length})
          </button>
          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`btn ${statusFilter === 'PENDING' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            Pendentes ({nreFilteredCandidates.filter(c => c.status === 'PENDING').length})
          </button>
          <button
            onClick={() => setStatusFilter('ENROLLED')}
            className={`btn ${statusFilter === 'ENROLLED' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            Ensalados ({candidates.filter(c => c.status === 'ENROLLED').length})
          </button>
        </div>
      </div>

      {/* Candidates Table */}
      <div className="glass-card" style={{ padding: '0' }}>
        {filteredCandidates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
            <span style={{ fontSize: '3rem' }}>👥</span>
            <h4 style={{ marginTop: '1rem', color: 'var(--text-main)' }}>Nenhum cursista encontrado</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Experimente ajustar os filtros ou pesquisar por outro termo.
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>

                  <th>Nome do Servidor</th>
                  <th>CPF</th>
                  <th>RG</th>
                  <th>Vaga (Componente)</th>
                  <th style={{ width: '130px' }}>Status</th>
                  <th style={{ width: '160px', textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredCandidates.map((c) => (
                  <tr key={c.cleanCpf}>

                    <td style={{ fontWeight: '600' }}>{c.nome}</td>
                    <td>{formatCpf(c.cpf)}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{c.rg}</td>
                    <td style={{ fontSize: '0.9rem' }}>
                      <span style={{
                        backgroundColor: 'rgba(148, 163, 184, 0.08)',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        fontWeight: '500'
                      }}>
                        {c.vaga}
                      </span>
                    </td>
                    <td>
                      {c.status === 'ENROLLED' ? (
                        <span className="badge badge-success">✓ Ensalado</span>
                      ) : (
                        <span className="badge badge-pending">⏳ Pendente</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {c.status === 'PENDING' ? (
                        <Link href={`/candidates/${c.cleanCpf}`} className="btn btn-secondary" style={{
                          padding: '0.4rem 0.8rem',
                          fontSize: '0.8rem',
                          borderRadius: '6px'
                        }}>
                          ✍️ Ensalar
                        </Link>
                      ) : (
                        tutorRole === 'admin' ? (
                          <Link href={`/candidates/${c.cleanCpf}`} className="btn btn-secondary" style={{
                            padding: '0.4rem 0.8rem',
                            fontSize: '0.8rem',
                            borderRadius: '6px',
                            backgroundColor: 'var(--secondary)',
                            color: '#ffffff'
                          }}>
                            ✏️ Editar
                          </Link>
                        ) : (
                          <button disabled className="btn btn-outline" style={{
                            padding: '0.4rem 0.8rem',
                            fontSize: '0.8rem',
                            borderRadius: '6px',
                            borderColor: '#d1d5db',
                            color: '#9ca3af'
                          }}>
                            ✔ Completo
                          </button>
                        )
                      )}
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
