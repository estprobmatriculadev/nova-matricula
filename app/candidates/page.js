'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState([]);
  const [allClasses, setAllClasses] = useState([]);
  const [tutorNre, setTutorNre] = useState('');
  const [tutorRole, setTutorRole] = useState('tutor');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [nreFilter, setNreFilter] = useState('ALL');

  // Change-class modal state
  const [changeModal, setChangeModal] = useState(null); // { candidate } or null
  const [newClassKey, setNewClassKey] = useState('');
  const [changing, setChanging] = useState(false);
  const [changeError, setChangeError] = useState('');
  const [changeSuccess, setChangeSuccess] = useState('');

  async function loadData() {
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

      // Store all classes for the change-class modal
      const nreClasses = data.classes?.nreClasses || [];
      const otherClasses = data.classes?.otherClasses || [];
      setAllClasses([...nreClasses, ...otherClasses]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
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
    const query = search.toLowerCase();
    const matchesSearch =
      (c.nome || '').toLowerCase().includes(query) ||
      (c.cpf || '').includes(query) ||
      (c.rg || '').includes(query);

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'PENDING' && c.status === 'PENDING') ||
      (statusFilter === 'ENROLLED' && c.status === 'ENROLLED');

    return matchesSearch && matchesStatus;
  });

  // Handle change class modal open
  function openChangeModal(candidate) {
    setChangeModal({ candidate });
    setNewClassKey('');
    setChangeError('');
    setChangeSuccess('');
  }

  function closeChangeModal() {
    setChangeModal(null);
    setChangeError('');
    setChangeSuccess('');
  }

  async function handleChangeClass() {
    if (!newClassKey) {
      setChangeError('Selecione uma turma de destino.');
      return;
    }
    setChanging(true);
    setChangeError('');
    setChangeSuccess('');

    try {
      const res = await fetch('/api/change-class', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cpf: changeModal.candidate.cleanCpf,
          newClassKey,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setChangeSuccess(`✅ ${data.message}`);
        // Reload data to reflect updated class
        await loadData();
        setTimeout(closeChangeModal, 2000);
      } else {
        setChangeError(data.error || 'Erro ao alterar turma.');
      }
    } catch (err) {
      setChangeError('Erro de rede. Tente novamente.');
    } finally {
      setChanging(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px', height: '40px',
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

  // Classes available for reassignment in the modal (with vacancies)
  const availableClasses = allClasses.filter(c => c.vacancies > 0);

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1>Cursistas — {tutorRole === 'admin' ? (nreFilter === 'ALL' ? 'Todos os NREs' : `NRE ${nreFilter}`) : `NRE ${tutorNre}`}</h1>
        <p className="subtitle">
          Gerencie e matricule os novos concursados nomeados do 6º Chamamento pertencentes ao seu núcleo regional.
        </p>
      </div>

      {/* Admin NRE Filter Selector */}
      {tutorRole === 'admin' && (
        <div style={{
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          padding: '0.875rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
          flexWrap: 'wrap',
        }}>
          <label htmlFor="nre-select" style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '0.95rem' }}>Filtrar por NRE:</label>
          <select
            id="nre-select"
            value={nreFilter}
            onChange={(e) => setNreFilter(e.target.value)}
            className="form-input"
            style={{ width: 'auto', minWidth: '160px', cursor: 'pointer' }}
          >
            <option value="ALL">Todos os NREs ({[...new Set(candidates.map(c => c.nre))].length})</option>
            {[...new Set(candidates.map(c => c.nre))].sort().map(nre => (
              <option key={nre} value={nre}>{nre}</option>
            ))}
          </select>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div className="filter-toolbar">
          {/* Search Input */}
          <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
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
          <div className="filter-btn-group" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`btn ${statusFilter === 'ALL' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '0.5rem 0.9rem', fontSize: '0.83rem' }}
            >
              Todos ({nreFilteredCandidates.length})
            </button>
            <button
              onClick={() => setStatusFilter('PENDING')}
              className={`btn ${statusFilter === 'PENDING' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '0.5rem 0.9rem', fontSize: '0.83rem' }}
            >
              Pendentes ({nreFilteredCandidates.filter(c => c.status === 'PENDING').length})
            </button>
            <button
              onClick={() => setStatusFilter('ENROLLED')}
              className={`btn ${statusFilter === 'ENROLLED' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '0.5rem 0.9rem', fontSize: '0.83rem' }}
            >
              Ensalados ({candidates.filter(c => c.status === 'ENROLLED').length})
            </button>
          </div>
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
                  <th style={{ width: '180px', textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredCandidates.map((c) => (
                  <tr key={c.cleanCpf}>
                    <td style={{ fontWeight: '600' }}>{c.nome}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{formatCpf(c.cpf)}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>{c.rg}</td>
                    <td style={{ fontSize: '0.9rem' }}>
                      <span style={{
                        backgroundColor: 'rgba(148, 163, 184, 0.08)',
                        padding: '0.2rem 0.5rem',
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
                      ) : tutorRole === 'admin' ? (
                        <button
                          onClick={() => openChangeModal(c)}
                          className="btn btn-outline"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderRadius: '6px' }}
                          title="Alterar turma (apenas admin)"
                        >
                          🔄 Alterar Turma
                        </button>
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
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ---- Change Class Modal ---- */}
      {changeModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeChangeModal()}>
          <div className="modal-box">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem' }}>🔄 Alterar Turma</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Cursista: <strong>{changeModal.candidate.nome}</strong>
                </p>
              </div>
              <button
                onClick={closeChangeModal}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--text-muted)', padding: '0.25rem' }}
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            {/* Info row */}
            <div style={{
              backgroundColor: 'rgba(148, 163, 184, 0.06)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.875rem 1rem',
              marginBottom: '1.25rem',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.75rem',
              fontSize: '0.85rem',
            }}>
              <div>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.75rem', textTransform: 'uppercase' }}>CPF</span>
                <p style={{ fontWeight: '600', marginTop: '0.1rem' }}>{changeModal.candidate.cpf}</p>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.75rem', textTransform: 'uppercase' }}>Componente</span>
                <p style={{ fontWeight: '600', marginTop: '0.1rem', color: 'var(--primary)' }}>{changeModal.candidate.vaga}</p>
              </div>
            </div>

            {/* Warning */}
            <div style={{
              backgroundColor: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.75rem 1rem',
              marginBottom: '1.25rem',
              fontSize: '0.82rem',
              color: 'var(--warning)',
              fontWeight: '500',
            }}>
              ⚠️ <strong>Atenção:</strong> Apenas matrículas realizadas por este portal podem ser alteradas aqui. Registros da planilha base devem ser alterados diretamente na planilha oficial.
            </div>

            {/* New class select */}
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label">Selecionar nova turma *</label>
              <select
                value={newClassKey}
                onChange={(e) => setNewClassKey(e.target.value)}
                className="form-input"
                style={{ cursor: 'pointer' }}
              >
                <option value="">-- Selecione uma turma com vagas --</option>
                {availableClasses.map(cls => (
                  <option key={cls.classKey} value={cls.classKey}>
                    [{cls.componente}] {cls.turma} — {cls.dia_da_semana} {cls.horario_inicial}–{cls.horario_fim} [{cls.vacancies} vaga{cls.vacancies !== 1 ? 's' : ''}]
                  </option>
                ))}
              </select>
              {availableClasses.length === 0 && (
                <p style={{ fontSize: '0.8rem', color: 'var(--error)', marginTop: '0.4rem' }}>
                  Nenhuma turma com vagas disponíveis no momento.
                </p>
              )}
            </div>

            {/* Feedback messages */}
            {changeError && (
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: 'var(--error)',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                fontWeight: '500',
                marginBottom: '1rem',
              }}>
                ⚠️ {changeError}
              </div>
            )}
            {changeSuccess && (
              <div style={{
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                color: 'var(--success)',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                fontWeight: '600',
                marginBottom: '1rem',
              }}>
                {changeSuccess}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={closeChangeModal} className="btn btn-outline" disabled={changing}>
                Cancelar
              </button>
              <button
                onClick={handleChangeClass}
                className="btn btn-secondary"
                disabled={changing || !newClassKey || !!changeSuccess}
                style={{ minWidth: '160px' }}
              >
                {changing ? 'Salvando...' : '🔄 Confirmar Alteração'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
