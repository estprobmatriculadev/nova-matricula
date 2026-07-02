'use client';

import { useState, useEffect } from 'react';

export default function ClassesPage() {
  const [classes, setClasses] = useState([]);
  const [filteredClasses, setFilteredClasses] = useState([]);
  const [tutorNre, setTutorNre] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtering state
  const [search, setSearch] = useState('');
  const [componentFilter, setComponentFilter] = useState('ALL');

  useEffect(() => {
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
        setTutorNre(data.tutorInfo?.nre || '');
        
        const nreClasses = data.classes?.nreClasses || [];
        const otherClasses = data.classes?.otherClasses || [];
        setClasses([...nreClasses, ...otherClasses]);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadClasses();
  }, []);

  // Update filtered classes when search, filters, or base classes change
  useEffect(() => {
    let result = [...classes];

    // Component filter
    if (componentFilter !== 'ALL') {
      result = result.filter(c => c.componente === componentFilter);
    }

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(c => 
        c.turma.toLowerCase().includes(q) ||
        c.nome_formador.toLowerCase().includes(q) ||
        c.componente.toLowerCase().includes(q)
      );
    }

    setFilteredClasses(result);
  }, [classes, search, componentFilter]);

  // Unique components list for dropdown
  const uniqueComponents = [...new Set(classes.map(c => c.componente))].sort();

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
      <div style={{ marginBottom: '2.5rem' }}>
        <h1>Turmas e Controle de Vagas</h1>
        <p className="subtitle">
          Consulte o limite de capacidade e acompanhe o preenchimento de vagas das turmas do 6º Chamamento.
        </p>
      </div>

      {/* Filter Toolbar */}
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
        <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>🔍</span>
          <input
            type="text"
            placeholder="Buscar por Turma ou Formador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '2.25rem' }}
          />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>

          {/* Component selection dropdown */}
          <select
            value={componentFilter}
            onChange={(e) => setComponentFilter(e.target.value)}
            className="form-input"
            style={{ width: '180px', padding: '0.5rem 1rem', fontSize: '0.85rem', cursor: 'pointer' }}
          >
            <option value="ALL">Todos os Componentes</option>
            {uniqueComponents.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Classes Table */}
      <div className="glass-card" style={{ padding: '0' }}>
        {filteredClasses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
            <span style={{ fontSize: '3rem' }}>🏫</span>
            <h4 style={{ marginTop: '1rem', color: 'var(--text-main)' }}>Nenhuma turma correspondente encontrada</h4>
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
                  <th>Horário / Encontro</th>

                  <th style={{ width: '180px', textAlign: 'center' }}>Vagas Preenchidas</th>
                  <th style={{ width: '110px', textAlign: 'center' }}>Restantes</th>
                  <th style={{ width: '110px', textAlign: 'center' }}>Capacidade</th>
                </tr>
              </thead>
              <tbody>
                {filteredClasses.map((c) => {
                  const pct = c.capacity > 0 ? Math.round((c.enrolledCount / c.capacity) * 100) : 0;
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
                          padding: '0.25rem 0.5rem',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          fontSize: '0.85rem',
                          fontWeight: '600'
                        }}>
                          {c.componente}
                        </span>
                      </td>
                      <td style={{ fontWeight: '600', fontSize: '0.9rem' }}>{c.turma}</td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {c.dia_da_semana}<br />
                        <span style={{ fontWeight: '600' }}>{c.horario_inicial} - {c.horario_fim}</span>
                      </td>

                      <td>
                        {/* Progress Bar inside Table cell */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: '700', width: '50px', textAlign: 'right' }}>
                            {c.enrolledCount}/{c.capacity}
                          </span>
                          <div style={{
                            height: '8px',
                            width: '80px',
                            backgroundColor: 'rgba(148, 163, 184, 0.15)',
                            borderRadius: '9999px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              height: '100%',
                              width: `${Math.min(100, pct)}%`,
                              backgroundColor: pct >= 100 ? 'var(--error)' : pct >= 80 ? 'var(--warning)' : 'var(--primary)',
                              borderRadius: '9999px'
                            }}></div>
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {c.vacancies === 0 ? (
                          <span className="badge badge-error" style={{ fontSize: '0.8rem' }}>LOTADA</span>
                        ) : c.vacancies <= 5 ? (
                          <span className="badge badge-pending" style={{ fontSize: '0.8rem' }}>{c.vacancies} rest.</span>
                        ) : (
                          <span className="badge badge-success" style={{ fontSize: '0.8rem' }}>{c.vacancies} vagas</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontWeight: '600' }}>{c.capacity}</span>
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
