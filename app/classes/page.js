'use client';

import { useState, useEffect } from 'react';

// Returns color class based on vacancy percentage
function getVacancyColor(pct, vacancies) {
  if (vacancies === 0) return 'progress-full';
  if (pct >= 90) return 'progress-low';
  if (pct >= 60) return 'progress-medium';
  return 'progress-ok';
}

function getBadgeStyle(vacancies, capacity) {
  if (vacancies === 0) {
    return {
      backgroundColor: 'rgba(239, 68, 68, 0.15)',
      color: '#b91c1c',
      border: '1px solid rgba(239, 68, 68, 0.3)',
    };
  }
  const pct = capacity > 0 ? ((capacity - vacancies) / capacity) * 100 : 0;
  if (pct >= 90) {
    return {
      backgroundColor: 'rgba(249, 115, 22, 0.15)',
      color: '#c2410c',
      border: '1px solid rgba(249, 115, 22, 0.3)',
    };
  }
  if (pct >= 60) {
    return {
      backgroundColor: 'rgba(245, 158, 11, 0.15)',
      color: '#b45309',
      border: '1px solid rgba(245, 158, 11, 0.3)',
    };
  }
  return {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    color: '#047857',
    border: '1px solid rgba(16, 185, 129, 0.25)',
  };
}

export default function ClassesPage() {
  const [classes, setClasses] = useState([]);
  const [filteredClasses, setFilteredClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtering state
  const [search, setSearch] = useState('');
  const [componentFilter, setComponentFilter] = useState('ALL');
  const [scheduleFilter, setScheduleFilter] = useState('ALL');

  async function loadClasses() {
    try {
      const res = await fetch('/api/data');
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = '/';
          return;
        }
        throw new Error('Falha ao carregar lista de turmas.');
      }
      const data = await res.json();

      const nreClasses = data.classes?.nreClasses || [];
      const otherClasses = data.classes?.otherClasses || [];
      setClasses([...nreClasses, ...otherClasses]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClasses();

    // Atualiza a cada 5 minutos (cache server-side de 60s já mantém dados recentes)
    const interval = setInterval(loadClasses, 300_000);
    return () => clearInterval(interval);
  }, []);

  // Update filtered classes when search, filters, or base classes change
  useEffect(() => {
    let result = [...classes];

    if (componentFilter !== 'ALL') {
      result = result.filter(c => c.componente === componentFilter);
    }

    if (scheduleFilter !== 'ALL') {
      result = result.filter(c => {
        const label = `${c.dia_da_semana}|${c.horario_inicial}|${c.horario_fim}`;
        return label === scheduleFilter;
      });
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.turma.toLowerCase().includes(q) ||
        c.nome_formador.toLowerCase().includes(q) ||
        c.componente.toLowerCase().includes(q)
      );
    }

    setFilteredClasses(result);
  }, [classes, search, componentFilter, scheduleFilter]);

  // Unique components list for dropdown
  const uniqueComponents = [...new Set(classes.map(c => c.componente))].sort();

  // Unique schedules for dropdown: "Quarta | 08:00 - 12:00"
  const uniqueSchedules = [
    ...new Map(
      classes.map(c => {
        const key = `${c.dia_da_semana}|${c.horario_inicial}|${c.horario_fim}`;
        const label = `${c.dia_da_semana} · ${c.horario_inicial} – ${c.horario_fim}`;
        return [key, { key, label }];
      })
    ).values()
  ].sort((a, b) => a.label.localeCompare(b.label));

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
          <p style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Carregando turmas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--error)' }}>
        <h3>⚠️ Erro ao carregar turmas</h3>
        <p style={{ marginTop: '0.5rem' }}>{error}</p>
        <button onClick={() => window.location.reload()} className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1>Turmas e Controle de Vagas</h1>
        <p className="subtitle">
          Consulte o limite de capacidade e acompanhe o preenchimento de vagas em tempo real.
        </p>
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.75rem',
        marginBottom: '1.25rem',
        alignItems: 'center',
        fontSize: '0.8rem',
        color: 'var(--text-muted)',
        fontWeight: '600'
      }}>
        <span>Legenda:</span>
        {[
          { color: '#047857', bg: 'rgba(16,185,129,0.12)', label: '< 60% — Vagas disponíveis' },
          { color: '#b45309', bg: 'rgba(245,158,11,0.15)', label: '60–89% — Quase cheia' },
          { color: '#c2410c', bg: 'rgba(249,115,22,0.15)', label: '≥ 90% — Atenção' },
          { color: '#b91c1c', bg: 'rgba(239,68,68,0.15)', label: '0 vagas — LOTADA' },
        ].map(({ color, bg, label }) => (
          <span key={label} style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
            backgroundColor: bg, color, border: `1px solid ${bg}`,
            padding: '0.2rem 0.6rem', borderRadius: '9999px',
          }}>
            ● {label}
          </span>
        ))}
      </div>

      {/* Filter Toolbar */}
      <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div className="filter-toolbar">
          {/* Search Input */}
          <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>🔍</span>
            <input
              type="text"
              placeholder="Buscar turma ou formador..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.25rem' }}
            />
          </div>

          {/* Component dropdown */}
          <select
            value={componentFilter}
            onChange={(e) => setComponentFilter(e.target.value)}
            className="form-input"
            style={{ minWidth: '180px', cursor: 'pointer' }}
          >
            <option value="ALL">Todos os Componentes</option>
            {uniqueComponents.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Schedule dropdown */}
          <select
            value={scheduleFilter}
            onChange={(e) => setScheduleFilter(e.target.value)}
            className="form-input"
            style={{ minWidth: '200px', cursor: 'pointer' }}
          >
            <option value="ALL">Todos os Horários</option>
            {uniqueSchedules.map(s => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>

          {/* Reset filters */}
          {(search || componentFilter !== 'ALL' || scheduleFilter !== 'ALL') && (
            <button
              onClick={() => { setSearch(''); setComponentFilter('ALL'); setScheduleFilter('ALL'); }}
              className="btn btn-outline"
              style={{ padding: '0.6rem 1rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
            >
              ✕ Limpar Filtros
            </button>
          )}
        </div>

        <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {filteredClasses.length} turma{filteredClasses.length !== 1 ? 's' : ''} exibida{filteredClasses.length !== 1 ? 's' : ''}
          {(search || componentFilter !== 'ALL' || scheduleFilter !== 'ALL') && ` (de ${classes.length} total)`}
          <span style={{ marginLeft: '0.75rem', opacity: 0.7 }}>· Atualização automática a cada 5min</span>
        </div>
      </div>

      {/* Classes Table */}
      <div className="glass-card" style={{ padding: '0' }}>
        {filteredClasses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
            <span style={{ fontSize: '3rem' }}>🏫</span>
            <h4 style={{ marginTop: '1rem', color: 'var(--text-main)' }}>Nenhuma turma correspondente</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Experimente redefinir os filtros ou buscar por outra palavra-chave.
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>NRE</th>
                  <th>Componente</th>
                  <th>Turma</th>
                  <th>Horário</th>
                  <th style={{ width: '180px', textAlign: 'center' }}>Ocupação</th>
                  <th style={{ width: '120px', textAlign: 'center' }}>Vagas</th>
                  <th style={{ width: '100px', textAlign: 'center' }}>Cap.</th>
                </tr>
              </thead>
              <tbody>
                {filteredClasses.map((c) => {
                  const pct = c.capacity > 0 ? Math.round((c.enrolledCount / c.capacity) * 100) : 0;
                  const colorClass = getVacancyColor(pct, c.vacancies);
                  const badgeStyle = getBadgeStyle(c.vacancies, c.capacity);
                  const isNreClass = c.isNre;

                  return (
                    <tr key={c.classKey} style={{
                      backgroundColor: isNreClass ? 'rgba(16, 185, 129, 0.01)' : 'transparent'
                    }}>
                      <td style={{ fontWeight: isNreClass ? '700' : '400', color: isNreClass ? 'var(--primary)' : 'var(--text-main)' }}>
                        {c.nre_tutor} {isNreClass ? '★' : ''}
                      </td>
                      <td>
                        <span style={{
                          backgroundColor: 'rgba(148, 163, 184, 0.08)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          fontSize: '0.8rem',
                          fontWeight: '600'
                        }}>
                          {c.componente}
                        </span>
                      </td>
                      <td style={{ fontWeight: '600', fontSize: '0.88rem' }}>{c.turma}</td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {c.dia_da_semana}<br />
                        <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{c.horario_inicial} – {c.horario_fim}</span>
                      </td>

                      {/* Occupation progress bar */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: '700', width: '48px', textAlign: 'right', color: c.vacancies === 0 ? '#b91c1c' : 'var(--text-main)' }}>
                            {c.enrolledCount}/{c.capacity}
                          </span>
                          <div style={{
                            height: '8px',
                            width: '72px',
                            backgroundColor: 'rgba(148, 163, 184, 0.15)',
                            borderRadius: '9999px',
                            overflow: 'hidden',
                            flexShrink: 0,
                          }}>
                            <div
                              className={colorClass}
                              style={{
                                height: '100%',
                                width: `${Math.min(100, pct)}%`,
                                borderRadius: '9999px',
                                transition: 'width 0.5s ease-out',
                              }}
                            />
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', width: '34px' }}>
                            {pct}%
                          </span>
                        </div>
                      </td>

                      {/* Vacancies badge */}
                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '0.25rem 0.65rem',
                          borderRadius: '9999px',
                          fontSize: '0.8rem',
                          fontWeight: '700',
                          ...badgeStyle,
                        }}>
                          {c.vacancies === 0 ? '🔴 LOTADA' : `${c.vacancies} vaga${c.vacancies !== 1 ? 's' : ''}`}
                        </span>
                      </td>

                      <td style={{ textAlign: 'center', fontWeight: '600', color: 'var(--text-muted)' }}>
                        {c.capacity}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
