'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CandidateDetailPage({ params }) {
  const { cpf } = params;
  const router = useRouter();
  
  const [candidate, setCandidate] = useState(null);
  const [classes, setClasses] = useState([]);
  const [tutorNre, setTutorNre] = useState('');
  
  // Form fields
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedClassKey, setSelectedClassKey] = useState('');
  const [obsTutor, setObsTutor] = useState(''); // Used for single "Observações" field
  
  // Accessibility fields
  const [possuiAcessibilidade, setPossuiAcessibilidade] = useState('NÃO');
  const [tipoDeficiencia, setTipoDeficiencia] = useState([]);
  const [necessidadesEspecificas, setNecessidadesEspecificas] = useState([]);
  const [outrasNecessidades, setOutrasNecessidades] = useState('');
  const [fallbackWarning, setFallbackWarning] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [sheetsSynced, setSheetsSynced] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/data');
        if (!res.ok) {
          if (res.status === 401) {
            window.location.href = '/';
            return;
          }
          throw new Error('Falha ao carregar dados do cursista.');
        }
        const data = await res.json();
        setTutorNre(data.tutorInfo?.nre || '');

        // Find candidate
        const cand = data.candidates.find(c => c.cleanCpf === cpf);
        if (!cand) {
          throw new Error('Cursista não encontrado ou sem permissão de acesso.');
        }
        
        // Auto-generate suggested email
        if (cand.nome) {
          const suggested = generateSuggestedEmail(cand.nome);
          setEmail(suggested);
        }

        setCandidate(cand);

        // Gather all classes (both NRE and other classes)
        const nreClasses = data.classes?.nreClasses || [];
        const otherClasses = data.classes?.otherClasses || [];
        const allCls = [...nreClasses, ...otherClasses];

        // Filter dropdown options according to candidate's subject and area fallbacks
        const mappedComp = mapVagaToComponent(cand.vaga);
        
        let filteredDropdownClasses = allCls.filter(c => 
          normalizeString(c.componente) === normalizeString(mappedComp) && c.vacancies > 0
        );

        let fallbackMsg = '';

        // If no matching classes with vacancies, fallback to the same area
        if (filteredDropdownClasses.length === 0) {
          const candArea = getAreaOfComponent(cand.vaga);
          filteredDropdownClasses = allCls.filter(c => 
            getAreaOfComponent(c.componente) === candArea && c.vacancies > 0
          );
          if (filteredDropdownClasses.length > 0) {
            fallbackMsg = `Todas as turmas do componente de concurso (${cand.vaga}) estão lotadas. Exibindo turmas disponíveis da mesma área de conhecimento.`;
          }
        }

        // If still empty, display all classes with vacancies as final fallback
        if (filteredDropdownClasses.length === 0) {
          filteredDropdownClasses = allCls.filter(c => c.vacancies > 0);
          if (filteredDropdownClasses.length > 0) {
            fallbackMsg = `Todas as turmas da área de conhecimento estão lotadas. Exibindo outras turmas disponíveis no sistema.`;
          }
        }

        setClasses(filteredDropdownClasses);
        setFallbackWarning(fallbackMsg);

        if (filteredDropdownClasses.length > 0) {
          setSelectedClassKey(filteredDropdownClasses[0].classKey);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [cpf]);

  // Helper to normalize string for matching
  function normalizeString(str) {
    if (!str) return '';
    return str.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
  }

  // Suggest email based on full name: first.last@escola.pr.gov.br
  function generateSuggestedEmail(fullName) {
    if (!fullName) return '';
    const cleanName = fullName
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove accents
      .toLowerCase()
      .replace(/[^a-z\s]/g, '') // keep only letters and spaces
      .trim();

    const parts = cleanName.split(/\s+/).filter(p => p.length > 2); // filter small words like 'da', 'de'
    if (parts.length === 0) return '';
    
    const first = parts[0];
    const last = parts[parts.length - 1];
    return `${first}.${last}@escola.pr.gov.br`;
  }

  // Get knowledge area of a component for vacancy fallback
  function getAreaOfComponent(vaga) {
    const v = normalizeString(vaga);
    if (v.includes('MATEMATICA') || v.includes('BIOLOGIA') || v.includes('QUIMICA') || v.includes('FISICA') || v.includes('CIENCIAS')) {
      return 'CIENCIAS_MATEMATICA';
    }
    if (v.includes('PORTUGUES') || v.includes('LINGUA PORTUGUESA') || v.includes('INGLES') || v.includes('LINGUA ESTRANGEIRA') || v.includes('ARTE') || v.includes('EDUCACAO FISICA')) {
      return 'LINGUAGENS_ARTE';
    }
    if (v.includes('HISTORIA') || v.includes('GEOGRAFIA') || v.includes('FILOSOFIA') || v.includes('SOCIOLOGIA')) {
      return 'HUMANAS';
    }
    if (v.includes('PEDAGOGO') || v.includes('EQ GESTORA') || v.includes('PEDAG')) {
      return 'GESTAO';
    }
    return 'OUTROS';
  }

  // Map candidate "VAGA" from Nomeados CSV to classroom "COMPONENTE"
  function mapVagaToComponent(vaga) {
    const v = normalizeString(vaga);
    if (v.includes('MATEMATICA')) return 'MATEMATICA';
    if (v.includes('PORTUGUES') || v.includes('LINGUA PORTUGUESA')) return 'PORTUGUES';
    if (v.includes('INGLES') || v.includes('LINGUA ESTRANGEIRA') || v.includes('INGL')) return 'INGLES';
    if (v.includes('EDUCACAO FISICA') || v.includes('E FISIC')) return 'EDUCACAO FISICA';
    if (v.includes('ARTE')) return 'ARTE';
    if (v.includes('CIENCIAS')) return 'CIENCIAS';
    if (v.includes('BIOLOGIA')) return 'BIOLOGIA';
    if (v.includes('GEOGRAFIA')) return 'GEOGRAFIA';
    if (v.includes('HISTORIA')) return 'HISTORIA';
    if (v.includes('SOCIOLOGIA')) return 'SOCIOLOGIA';
    if (v.includes('FILOSOFIA')) return 'FILOSOFIA';
    if (v.includes('QUIMICA')) return 'QUIMICA';
    if (v.includes('FISICA')) return 'FISICA';
    if (v.includes('PEDAGOGO') || v.includes('EQ GESTORA')) return 'EQ GESTORA';
    return vaga; // fallback
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !phone || !selectedClassKey) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cpf: candidate.cpf,
          email,
          phone,
          classKey: selectedClassKey,
          observacoes_tutor: obsTutor,
          observacoes_cursista: '',
          possui_acessibilidade: possuiAcessibilidade,
          tipo_deficiencia: tipoDeficiencia.join(', '),
          necessidades_especificas: necessidadesEspecificas.join(', '),
          outras_necessidades: outrasNecessidades
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSheetsSynced(data.sheetsSynced);
        setSuccess(true);
        setTimeout(() => {
          router.push('/candidates');
          router.refresh();
        }, 3000);
      } else {
        setError(data.error || 'Ocorreu um erro ao realizar a matrícula.');
      }
    } catch (err) {
      setError('Erro ao enviar formulário. Tente novamente.');
      console.error(err);
    } finally {
      setSubmitting(false);
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
          <p style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Carregando dados do cursista...</p>
        </div>
      </div>
    );
  }

  if (error && !candidate) {
    return (
      <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--error)' }}>
        <h3>⚠️ Erro</h3>
        <p style={{ marginTop: '0.5rem' }}>{error}</p>
        <Link href="/candidates" className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Voltar para Lista
        </Link>
      </div>
    );
  }

  // Pre-filter matching classes to highlight them in the dropdown
  const matchedComponent = mapVagaToComponent(candidate.vaga);
  const matchedClasses = classes.filter(c => normalizeString(c.componente) === normalizeString(matchedComponent));
  const otherClassesList = classes.filter(c => normalizeString(c.componente) !== normalizeString(matchedComponent));

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/candidates" style={{ textDecoration: 'none', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: '600', fontSize: '0.9rem', marginBottom: '1rem' }}>
          ← Voltar para Lista
        </Link>
        <h1>Ensalar Novo Cursista</h1>
        <p className="subtitle">Formulário de preenchimento de dados de ensalamento e sincronização.</p>
      </div>

      {success && (
        <div className="glass-card" style={{
          backgroundColor: sheetsSynced ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
          border: sheetsSynced ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(245, 158, 11, 0.2)',
          color: sheetsSynced ? 'var(--success)' : 'var(--warning)',
          padding: '1.5rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '2rem',
          textAlign: 'center',
          fontWeight: '600'
        }}>
          {sheetsSynced ? (
            '🎉 Matrícula realizada com sucesso! Sincronizado com o Google Sheets. Redirecionando...'
          ) : (
            '⚠️ Matrícula realizada apenas localmente! O Google Sheets não está configurado na hospedagem. Redirecionando...'
          )}
        </div>
      )}

      {error && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          color: 'var(--error)',
          padding: '1rem',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.9rem',
          fontWeight: '500',
          marginBottom: '2rem'
        }}>
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="glass-card" style={{ padding: '2.5rem' }}>
        {/* Candidate Read-Only Details Grid */}
        <div style={{
          backgroundColor: 'rgba(148, 163, 184, 0.04)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)',
          padding: '1.5rem',
          marginBottom: '2rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem'
        }}>
          <div>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700' }}>Nome do Servidor</span>
            <p style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-main)', marginTop: '0.2rem' }}>{candidate.nome}</p>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700' }}>Vaga de Concurso</span>
            <p style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--primary)', marginTop: '0.2rem' }}>{candidate.vaga}</p>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700' }}>RG</span>
            <p style={{ fontWeight: '600', fontSize: '0.95rem', color: 'var(--text-main)', marginTop: '0.2rem' }}>{candidate.rg}</p>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700' }}>CPF</span>
            <p style={{ fontWeight: '600', fontSize: '0.95rem', color: 'var(--text-main)', marginTop: '0.2rem' }}>{candidate.cpf}</p>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700' }}>NRE da Posse</span>
            <p style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-main)', marginTop: '0.2rem' }}>{candidate.nre}</p>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700' }}>Edital</span>
            <p style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{candidate.edital || '-'}</p>
          </div>
        </div>

        {/* Input Fields */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
          {/* Email */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">E-mail do Cursista *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              required
              placeholder="nome.sobrenome@escola.pr.gov.br"
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Use o <strong>@escola.pr.gov.br</strong> ou sua conta <strong>Gmail</strong>, caso não possua a conta institucional.
            </p>
          </div>

          {/* Phone */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Telefone de Contato (WhatsApp) *</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="form-input"
              required
              placeholder="Ex: 41999999999 (somente números)"
            />
          </div>
        </div>

        {/* Class Select Row */}
        <div style={{ marginBottom: '2rem' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Selecionar Turma *</label>
            {fallbackWarning && (
              <div style={{
                backgroundColor: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                color: 'var(--warning)',
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                fontWeight: '500',
                marginBottom: '0.5rem'
              }}>
                ⚠️ {fallbackWarning}
              </div>
            )}
            <select
              value={selectedClassKey}
              onChange={(e) => setSelectedClassKey(e.target.value)}
              className="form-input"
              required
              style={{ cursor: 'pointer' }}
            >
              <option value="" disabled>-- Selecione uma turma --</option>
              {classes.map(cls => (
                <option key={cls.classKey} value={cls.classKey} disabled={cls.vacancies <= 0}>
                  [{cls.componente}] {cls.turma} — {cls.dia_da_semana} ({cls.turno}) [{cls.vacancies} vagas] {cls.vacancies <= 0 ? '(LOTADA)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Accessibility Fields Section */}
        <div style={{
          borderTop: '1px solid var(--border-color)',
          paddingTop: '2rem',
          marginBottom: '2rem'
        }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>Acessibilidade e Inclusão</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            {/* Needs Accessibility */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Possui necessidade de acessibilidade? *</label>
              <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: '500' }}>
                  <input
                    type="radio"
                    name="possui_acessibilidade"
                    value="SIM"
                    checked={possuiAcessibilidade === 'SIM'}
                    onChange={() => setPossuiAcessibilidade('SIM')}
                    style={{ cursor: 'pointer', width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                  />
                  Sim
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: '500' }}>
                  <input
                    type="radio"
                    name="possui_acessibilidade"
                    value="NÃO"
                    checked={possuiAcessibilidade === 'NÃO'}
                    onChange={() => {
                      setPossuiAcessibilidade('NÃO');
                      setTipoDeficiencia([]);
                      setNecessidadesEspecificas([]);
                      setOutrasNecessidades('');
                    }}
                    style={{ cursor: 'pointer', width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                  />
                  Não
                </label>
              </div>
            </div>
          </div>

          {possuiAcessibilidade === 'SIM' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              {/* Type of Disability */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Tipo de deficiência:</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginTop: '0.5rem' }}>
                  {['Visual', 'Auditiva', 'Motora', 'Intelectual'].map(def => (
                    <label key={def} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: '500' }}>
                      <input
                        type="checkbox"
                        checked={tipoDeficiencia.includes(def)}
                        onChange={() => {
                          setTipoDeficiencia(prev => 
                            prev.includes(def) ? prev.filter(x => x !== def) : [...prev, def]
                          );
                        }}
                        style={{ cursor: 'pointer', width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                      />
                      {def}
                    </label>
                  ))}
                </div>
              </div>

              {/* Specific Needs */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Necessidades específicas:</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginTop: '0.5rem' }}>
                  {['leitor de tela', 'intérprete de LIBRAS', 'tempo adicional', 'material ampliado'].map(nec => (
                    <label key={nec} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: '500' }}>
                      <input
                        type="checkbox"
                        checked={necessidadesEspecificas.includes(nec)}
                        onChange={() => {
                          setNecessidadesEspecificas(prev => 
                            prev.includes(nec) ? prev.filter(x => x !== nec) : [...prev, nec]
                          );
                        }}
                        style={{ cursor: 'pointer', width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                      />
                      {nec}
                    </label>
                  ))}
                </div>
              </div>

              {/* Other Needs */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Outros tipos de necessidades:</label>
                <input
                  type="text"
                  value={outrasNecessidades}
                  onChange={(e) => setOutrasNecessidades(e.target.value)}
                  className="form-input"
                  placeholder="Descreva outras necessidades específicas se houver..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Observations */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', marginBottom: '2.5rem' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Observações</label>
            <textarea
              value={obsTutor}
              onChange={(e) => setObsTutor(e.target.value)}
              className="form-input"
              rows="3"
              placeholder="Adicione observações sobre a matrícula..."
              style={{ resize: 'vertical' }}
            ></textarea>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '2rem' }}>
          <Link href="/candidates" className="btn btn-outline">
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={submitting || success}
            className="btn btn-secondary"
            style={{ minWidth: '180px' }}
          >
            {submitting ? 'Gravando...' : 'Confirmar Ensalamento'}
          </button>
        </div>
      </form>
    </div>
  );
}
