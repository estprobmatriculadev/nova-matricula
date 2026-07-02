'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// Helper to determine knowledge area from vaga name
function getKnowledgeArea(vaga) {
  const v = (vaga || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
  if (v.includes('MATEMATICA') || v.includes('BIOLOGIA') || v.includes('QUIMICA') || v.includes('FISICA') || v.includes('CIENCIAS')) {
    return 'Exatas/Naturais';
  }
  if (v.includes('PORTUGUES') || v.includes('LINGUA PORTUGUESA') || v.includes('INGLES') || v.includes('LINGUA ESTRANGEIRA') || v.includes('ARTE') || v.includes('EDUCACAO FISICA')) {
    return 'Linguagens';
  }
  if (v.includes('HISTORIA') || v.includes('GEOGRAFIA') || v.includes('FILOSOFIA') || v.includes('SOCIOLOGIA')) {
    return 'Humanas';
  }
  if (v.includes('PEDAGOGO') || v.includes('EQ GESTORA') || v.includes('PEDAG')) {
    return 'Gestão/Pedagogia';
  }
  return 'Linguagens'; // default fallback to keep 4-axis radar symmetrical
}

// Radar Chart Component rendered with pure inline SVG
function SVGRadarChart({ data }) {
  const cx = 140;
  const cy = 130;
  const rMax = 80;
  
  // Axes configurations
  const axes = [
    { label: 'Exatas/Naturais', val: data.exatas, color: '#3b82f6' },
    { label: 'Linguagens', val: data.linguagens, color: '#10b981' },
    { label: 'Humanas', val: data.humanas, color: '#f59e0b' },
    { label: 'Gestão/Pedagogia', val: data.gestao, color: '#ec4899' }
  ];

  // Calculate coordinates for a given value (0 to 1) and angle index (0 to 3)
  const getCoords = (val, idx) => {
    const angle = (idx * Math.PI) / 2; // 90 degrees each
    const r = Math.min(1, Math.max(0, val)) * rMax;
    // Axis 0 is UP, Axis 1 is RIGHT, Axis 2 is DOWN, Axis 3 is LEFT
    const x = cx + r * Math.sin(angle);
    const y = cy - r * Math.cos(angle);
    return { x, y };
  };

  // Concentric circle rings (25%, 50%, 75%, 100%)
  const rings = [0.25, 0.5, 0.75, 1.0];

  // Polygons for the data fill
  const pts = axes.map((a, i) => getCoords(a.val, i));
  const pointsString = pts.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      <svg width="280" height="250" viewBox="0 0 280 250" style={{ overflow: 'visible' }}>
        {/* Grids and Rings */}
        {rings.map((fraction, rIdx) => (
          <polygon
            key={rIdx}
            points={axes.map((_, idx) => {
              const coords = getCoords(fraction, idx);
              return `${coords.x},${coords.y}`;
            }).join(' ')}
            fill="none"
            stroke="var(--border-color)"
            strokeWidth="1"
            strokeDasharray={rIdx < 3 ? '4,4' : 'none'}
          />
        ))}

        {/* Outer Axes Lines */}
        {axes.map((_, idx) => {
          const outer = getCoords(1, idx);
          return (
            <line
              key={idx}
              x1={cx}
              y1={cy}
              x2={outer.x}
              y2={outer.y}
              stroke="var(--border-color)"
              strokeWidth="1.5"
            />
          );
        })}

        {/* Data Area Fill */}
        {pointsString && (
          <polygon
            points={pointsString}
            fill="rgba(16, 185, 129, 0.2)"
            stroke="var(--primary)"
            strokeWidth="2.5"
            style={{ transition: 'points 0.5s ease-in-out' }}
          />
        )}

        {/* Data Points Dot */}
        {pts.map((p, idx) => (
          <circle
            key={idx}
            cx={p.x}
            cy={p.y}
            r="4.5"
            fill="var(--secondary)"
            stroke="#fff"
            strokeWidth="1.5"
            style={{ transition: 'cx 0.5s, cy 0.5s' }}
          />
        ))}

        {/* Labels */}
        {axes.map((axis, idx) => {
          const outer = getCoords(1.15, idx);
          // Adjust text alignment based on position
          let textAnchor = 'middle';
          let dy = '0.35em';
          if (idx === 1) textAnchor = 'start';
          if (idx === 3) textAnchor = 'end';
          if (idx === 0) dy = '-0.4em';
          if (idx === 2) dy = '1.1em';

          return (
            <text
              key={idx}
              x={outer.x}
              y={outer.y}
              textAnchor={textAnchor}
              dy={dy}
              style={{
                fontSize: '0.7rem',
                fontWeight: '700',
                fill: 'var(--text-main)',
                fontFamily: 'var(--font-sans)'
              }}
            >
              {axis.label} ({Math.round(axis.val * 100)}%)
            </text>
          );
        })}
      </svg>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recentEnrollments, setRecentEnrollments] = useState([]);

  // Admin simulated tutor/NRE view state
  const [selectedNre, setSelectedNre] = useState('ALL');

  // Change-class states for admin alerts
  const [allClasses, setAllClasses] = useState([]);
  const [changeModal, setChangeModal] = useState(null);
  const [newClassKey, setNewClassKey] = useState('');
  const [changing, setChanging] = useState(false);
  const [changeError, setChangeError] = useState('');
  const [changeSuccess, setChangeSuccess] = useState('');

  // Reset state (admin only)
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState('');

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
      const nreCls = jsonData.classes?.nreClasses || [];
      const otherCls = jsonData.classes?.otherClasses || [];
      setAllClasses([...nreCls, ...otherCls]);

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

  function openChangeModal(alertRecord) {
    const cleanCpf = (alertRecord.cpf_cursista || '').toString().replace(/\D/g, '');
    const candAdapter = {
      nome: alertRecord.nome_cursista,
      cpf: alertRecord.cpf_cursista,
      cleanCpf: cleanCpf,
      vaga: alertRecord.componente
    };
    setChangeModal({ candidate: candAdapter });
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
          vaga: changeModal.candidate.vaga,
          newClassKey,
        }),
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        setChangeSuccess(`✅ ${resData.message}`);
        await loadData();
        setTimeout(closeChangeModal, 2000);
      } else {
        setChangeError(resData.error || 'Erro ao alterar a turma.');
      }
    } catch (e) {
      setChangeError('Erro na conexão com o servidor.');
    } finally {
      setChanging(false);
    }
  }

  async function handleResolveAlert(cpf, componente) {
    if (!confirm('Deseja realmente ignorar/arquivar este alerta?')) return;
    try {
      const res = await fetch('/api/request-transfer/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf, componente })
      });
      if (res.ok) {
        await loadData();
      }
    } catch (e) {
      console.error('Falha ao resolver alerta', e);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleReset() {
    setResetting(true);
    setResetMsg('');
    try {
      const res = await fetch('/api/reset-enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'ZERAR_MATRICULAS' }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setResetMsg(`✅ ${result.message}`);
        setTimeout(() => { setShowResetConfirm(false); setResetMsg(''); window.location.reload(); }, 3000);
      } else {
        setResetMsg(`⚠️ ${result.error}`);
      }
    } catch (e) {
      setResetMsg('⚠️ Erro de rede. Tente novamente.');
    } finally {
      setResetting(false);
    }
  }

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

  // Determine active context (simulated tutor vs admin)
  const isSimulating = tutorInfo.role === 'admin' && selectedNre !== 'ALL';

  // Filter candidates & enrollments based on simulated NRE
  const filteredCandidates = isSimulating
    ? data.candidates.filter(c => c.nre === selectedNre)
    : data.candidates;

  const totalCandidates = filteredCandidates.length;
  const enrolledCandidates = filteredCandidates.filter(c => c.status === 'ENROLLED').length;
  const pendingCandidates = totalCandidates - enrolledCandidates;

  const pctEnrolled = totalCandidates > 0 ? Math.round((enrolledCandidates / totalCandidates) * 100) : 0;

  // Filter recent enrollments to show only the simulated NRE's enrollments
  const displayRecentEnrollments = isSimulating
    ? recentEnrollments.filter(e => {
        // Find corresponding candidate NRE for safety
        const cand = data.candidates.find(c => c.nome === e.nome_cursista);
        return cand ? cand.nre === selectedNre : false;
      })
    : recentEnrollments;

  // Calculate radar chart distribution statistics for the active view
  const areaStats = {
    'Exatas/Naturais': { total: 0, enrolled: 0 },
    'Linguagens': { total: 0, enrolled: 0 },
    'Humanas': { total: 0, enrolled: 0 },
    'Gestão/Pedagogia': { total: 0, enrolled: 0 }
  };

  filteredCandidates.forEach(c => {
    const area = getKnowledgeArea(c.vaga);
    if (areaStats[area]) {
      areaStats[area].total += 1;
      if (c.status === 'ENROLLED') {
        areaStats[area].enrolled += 1;
      }
    }
  });

  const radarData = {
    exatas: areaStats['Exatas/Naturais'].total > 0 ? areaStats['Exatas/Naturais'].enrolled / areaStats['Exatas/Naturais'].total : 0,
    linguagens: areaStats['Linguagens'].total > 0 ? areaStats['Linguagens'].enrolled / areaStats['Linguagens'].total : 0,
    humanas: areaStats['Humanas'].total > 0 ? areaStats['Humanas'].enrolled / areaStats['Humanas'].total : 0,
    gestao: areaStats['Gestão/Pedagogia'].total > 0 ? areaStats['Gestão/Pedagogia'].enrolled / areaStats['Gestão/Pedagogia'].total : 0
  };

  // Find the class with highest occupancy (active view NRE vs Global)
  const allCls = [...(data.classes?.nreClasses || []), ...(data.classes?.otherClasses || [])];
  const activeNreClasses = isSimulating
    ? allCls.filter(c => c.nre_tutor === selectedNre)
    : allCls;

  const sortedClasses = [...activeNreClasses].sort((a, b) => {
    const aPct = a.capacity > 0 ? a.enrolledCount / a.capacity : 0;
    const bPct = b.capacity > 0 ? b.enrolledCount / b.capacity : 0;
    return bPct - aPct; // descending
  });
  const topBusyClass = sortedClasses.length > 0 ? sortedClasses[0] : null;
  const topBusyClassPct = topBusyClass && topBusyClass.capacity > 0
    ? Math.round((topBusyClass.enrolledCount / topBusyClass.capacity) * 100)
    : 0;

  const activeAlerts = recentEnrollments.filter(e => e.transferRequest && e.transferRequest.status === 'PENDING');

  return (
    <div className="animate-fade-in">
      {/* Upper header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h1>
          Painel de Controle —{' '}
          {tutorInfo.role === 'admin'
            ? (selectedNre === 'ALL'
              ? 'Administrador (Global)'
              : `Simulação Tutor NRE ${selectedNre}`)
            : `NRE ${tutorInfo.nre}`}
        </h1>
        <p className="subtitle">
          {isSimulating ? (
            <span style={{ color: 'var(--secondary)', fontWeight: '700' }}>
              👁️ MODO SIMULADO: Exibindo painel como Tutor Responsável do NRE {selectedNre}
            </span>
          ) : (
            <>
              Bem-vindo, <strong>{tutorInfo.tutorName}</strong>. Aqui está o resumo das matrículas do 6º Chamamento.
            </>
          )}
        </p>
      </div>

      {/* Alertas de Alteração de Modalidade/Turno (Admin Only) */}
      {tutorInfo.role === 'admin' && activeAlerts.length > 0 && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.05)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: 'var(--radius-md)',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <h2 style={{ fontSize: '1.2rem', color: 'var(--error)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            ⚠️ Alertas de Solicitação de Troca de Modalidade/Turno ({activeAlerts.length})
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Tutoras solicitaram a verificação destes cursistas que precisam de ajuste de enturmação por troca de modalidade ou turno.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
            {activeAlerts.map(alert => (
              <div key={`${alert.cpf_cursista}_${alert.componente}`} style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '0.75rem',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-main)' }}>{alert.nome_cursista}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    CPF: {alert.cpf_cursista} | Vaga: {alert.componente}
                  </div>
                  <div style={{
                    marginTop: '0.75rem',
                    padding: '0.6rem 0.8rem',
                    backgroundColor: 'rgba(249, 115, 22, 0.06)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid rgba(249, 115, 22, 0.15)',
                    fontSize: '0.85rem'
                  }}>
                    <div><strong>Turma Atual:</strong> {alert.turma} ({alert.turno || 'N/A'})</div>
                    <div style={{ marginTop: '0.4rem', borderTop: '1px dashed rgba(249, 115, 22, 0.2)', paddingTop: '0.4rem' }}>
                      👉 <strong>Desejado:</strong> <span style={{ color: 'var(--secondary)', fontWeight: '700' }}>{alert.transferRequest.requestedModality}</span> ({alert.transferRequest.requestedShift})
                    </div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.6rem' }}>
                    Solicitado por {alert.transferRequest.requestedBy} em {new Date(alert.transferRequest.requestedAt).toLocaleString('pt-BR')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button
                    onClick={() => openChangeModal(alert)}
                    className="btn btn-secondary"
                    style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem', borderRadius: '6px', flex: 1 }}
                  >
                    🔄 Alterar Turma
                  </button>
                  <button
                    onClick={() => handleResolveAlert(alert.cpf_cursista, alert.componente)}
                    className="btn btn-outline"
                    style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem', borderRadius: '6px', borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
                  >
                    Ignorar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admin actions and Simulation Toggle */}
      {tutorInfo.role === 'admin' && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          marginBottom: '2rem',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          padding: '1.25rem 1.5rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            {/* Simulation Select */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <label htmlFor="nre-select" style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                👁️ Visualizar como Tutor (NRE):
              </label>
              <select
                id="nre-select"
                value={selectedNre}
                onChange={(e) => setSelectedNre(e.target.value)}
                className="form-input"
                style={{
                  width: 'auto',
                  minWidth: '180px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                <option value="ALL">Visualização Global (Admin)</option>
                {uniqueNres.map(nre => (
                  <option key={nre} value={nre}>NRE {nre}</option>
                ))}
              </select>
            </div>

            {/* Clear Button */}
            <button
              onClick={() => setShowResetConfirm(true)}
              className="btn btn-danger"
              style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
            >
              🗑️ Zerar Matrículas de Teste
            </button>
          </div>
        </div>
      )}

      {/* Modal de confirmação do reset */}
      {showResetConfirm && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowResetConfirm(false)}>
          <div className="modal-box" style={{ maxWidth: '420px' }}>
            <h2 style={{ fontSize: '1.2rem', color: 'var(--error)', marginBottom: '0.75rem' }}>⚠️ Confirmar Reset</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              Esta ação irá <strong>apagar permanentemente</strong> todas as matrículas registradas pelo portal no Firebase.
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Os dados do CSV base e da planilha original não serão afetados. Use apenas antes de efetivar o sistema.
            </p>
            {resetMsg && (
              <div style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: resetMsg.startsWith('✅') ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                color: resetMsg.startsWith('✅') ? 'var(--success)' : 'var(--error)',
                fontSize: '0.85rem', fontWeight: '600', marginBottom: '1rem',
              }}>
                {resetMsg}
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowResetConfirm(false)} className="btn btn-outline" disabled={resetting}>Cancelar</button>
              <button onClick={handleReset} className="btn btn-danger" disabled={resetting} style={{ minWidth: '140px' }}>
                {resetting ? 'Apagando...' : '🗑️ Confirmar Reset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="stats-grid">
        <div className="glass-card stat-card" style={{ borderLeft: '4px solid var(--secondary)' }}>
          <div className="stat-info">
            <p>Total de Cursistas</p>
            <h3>{totalCandidates}</h3>
          </div>
          <div className="stat-icon" style={{ backgroundColor: 'rgba(9, 105, 178, 0.1)', color: 'var(--secondary)' }}>
            👥
          </div>
        </div>

        <div className="glass-card stat-card" style={{ borderLeft: '4px solid var(--success)' }}>
          <div className="stat-info">
            <p>Ensalados (Matriculados)</p>
            <h3>{enrolledCandidates}</h3>
          </div>
          <div className="stat-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
            ✅
          </div>
        </div>

        <div className="glass-card stat-card" style={{ borderLeft: '4px solid var(--warning)' }}>
          <div className="stat-info">
            <p>Pendentes</p>
            <h3>{pendingCandidates}</h3>
          </div>
          <div className="stat-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}>
            ⏳
          </div>
        </div>

        <div className="glass-card stat-card" style={{ borderLeft: '4px solid var(--accent)' }}>
          <div className="stat-info">
            <p>Taxa Geral</p>
            <h3>{pctEnrolled}%</h3>
          </div>
          <div className="stat-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.08)', color: 'var(--accent)' }}>
            📈
          </div>
        </div>
      </div>

      {/* Main Grid: Radar Chart + Progress & Extra analysis */}
      <div className="dashboard-grid" style={{ marginBottom: '2.5rem' }}>
        {/* Left: Radar Chart Analysis */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h3 style={{ marginBottom: '1.25rem', width: '100%' }}>Matrículas por Área de Conhecimento</h3>
          <SVGRadarChart data={radarData} />
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '1rem', lineHeight: '1.3' }}>
            Distribuição percentual de preenchimento de turmas em tempo real por eixos de formação.
          </p>
        </div>

        {/* Right: Detailed Progress & Busy Class */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Progress Card */}
          <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h3 style={{ marginBottom: '1rem' }}>Progresso de Ensalamento</h3>
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
                  {enrolledCandidates} de {totalCandidates} cursistas ensalados.
                </p>
              </div>
              <div style={{ fontSize: '2.25rem', fontWeight: '800', color: 'var(--primary)' }}>
                {pctEnrolled}%
              </div>
            </div>
          </div>

          {/* Busy Class Card */}
          <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h3 style={{ marginBottom: '0.75rem' }}>Turma com Maior Ocupação</h3>
            {topBusyClass ? (
              <div>
                <p style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-main)' }}>
                  {topBusyClass.turma}
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                  {topBusyClass.componente} · {topBusyClass.dia_da_semana} ({topBusyClass.turno})
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <div style={{
                    height: '8px',
                    width: '100px',
                    backgroundColor: 'rgba(148, 163, 184, 0.15)',
                    borderRadius: '9999px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${topBusyClassPct}%`,
                      backgroundColor: topBusyClassPct >= 90 ? 'var(--error)' : 'var(--primary)',
                      borderRadius: '9999px'
                    }}></div>
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: '700', color: topBusyClassPct >= 90 ? 'var(--error)' : 'var(--text-main)' }}>
                    {topBusyClass.enrolledCount}/{topBusyClass.capacity} alunos ({topBusyClassPct}%)
                  </span>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Nenhuma turma cadastrada.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Sync Status Card & Firebase indicator */}
      <div className="dashboard-grid" style={{ marginBottom: '2.5rem' }}>
        <div className="glass-card">
          <h3 style={{ marginBottom: '0.75rem' }}>Persistência Principal (Firestore)</h3>
          <div>
            <div style={{ marginBottom: '0.75rem' }}>
              <span className="badge badge-success">🔥 Firebase Firestore Conectado</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              As matrículas novas e limites de capacidade das turmas estão persistindo de forma segura e imediata no Firebase.
            </p>
          </div>
        </div>

        <div className="glass-card">
          <h3 style={{ marginBottom: '0.75rem' }}>Sincronização de Dados</h3>
          {tutorInfo.sheetsConfigured ? (
            <div>
              <div style={{ marginBottom: '0.75rem' }}>
                <span className="badge badge-success">🌐 Google Sheets Ativo (Backup)</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                As novas matrículas são espelhadas automaticamente na planilha Google de forma assíncrona, servindo de backup visual para sua equipe.
              </p>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: '0.75rem' }}>
                <span className="badge badge-pending">💾 Modo Firestore Purista</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                Google Sheets não configurado na Vercel. Operações utilizando exclusivamente o Firestore Database do Firebase.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Enrollments Table */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3>
              Matrículas Recentes{' '}
              {isSimulating ? `(NRE ${selectedNre})` : '(Geral)'}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Últimos cursistas recém-ensalados pelo NRE selecionado.
            </p>
          </div>
          <Link href="/candidates" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
            ➕ Ensalar Cursista
          </Link>
        </div>

        {displayRecentEnrollments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: '2.5rem' }}>🏫</span>
            <h4 style={{ marginTop: '1rem', color: 'var(--text-main)' }}>Nenhuma matrícula realizada ainda</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Os cursistas recém-registrados sob a visão atual aparecerão listados aqui.
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
                {displayRecentEnrollments.slice(-5).reverse().map((e, idx) => (
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

      {/* ---- Change Class Modal (para Alertas de Admin) ---- */}
      {changeModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeChangeModal()}>
          <div className="modal-box">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem' }}>🔄 Alterar Turma (Alerta de Transferência)</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Selecione o novo horário de <strong>{changeModal.candidate.nome}</strong>.
                </p>
              </div>
              <button onClick={closeChangeModal} className="btn-close" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-muted)' }}>✕</button>
            </div>

            {/* Info */}
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.75rem 1rem',
              marginBottom: '1.25rem',
              fontSize: '0.85rem',
            }}>
              <div><strong>Cursista:</strong> {changeModal.candidate.nome}</div>
              <div><strong>CPF:</strong> {changeModal.candidate.cpf}</div>
              <div><strong>Vaga Original:</strong> {changeModal.candidate.vaga}</div>
            </div>

            {/* Aviso informativo de remanejamento */}
            <div style={{
              backgroundColor: 'rgba(9, 105, 178, 0.06)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.75rem 1rem',
              marginBottom: '1.25rem',
              fontSize: '0.82rem',
              color: 'var(--text-main)',
              fontWeight: '500',
            }}>
              💡 Ao confirmar, a turma antiga será liberada e o cursista será matriculado no novo horário em tempo real. O alerta será resolvido automaticamente.
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
                  Nenhuma turma com vagas disponíveis para este componente no momento.
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
