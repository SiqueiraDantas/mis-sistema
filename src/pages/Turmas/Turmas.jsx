import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Plus, X, Save, Trash2, Users, BookOpen, ChevronRight, AlertCircle, Check, Search, Calendar } from 'lucide-react'

const OFICINAS = ['Flauta Doce','Clarinete','Trompete','Trombone','Saxofone','Trompa','Euphonio','Tuba','Percussão','Bateria','Flauta Transversal','Flauta Doce (Macaoca)','Violão (Macaoca)']
const DIAS = ['Segunda','Terça','Quarta','Quinta','Sexta']
const ANO_ATUAL = new Date().getFullYear()

function ModalTurma({ turma, professores, onClose, onSalvo }) {
  const editando = !!turma
  const diasAtuais = turma?.dias_semana?.length > 0 ? turma.dias_semana : turma?.dia_semana ? [turma.dia_semana] : []
  const [form, setForm] = useState({
    nome: turma?.nome || '',
    oficina_id: turma?.oficina_id || '',
    professor_id: turma?.professor_id || '',
    dias_semana: diasAtuais,
    horario_inicio: turma?.horario_inicio?.slice(0, 5) || '',
    horario_fim: turma?.horario_fim?.slice(0, 5) || '',
    vagas: turma?.vagas || 20,
  })
  const [oficinas, setOficinas] = useState([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    supabase
      .from('oficinas')
      .select('id, nome')
      .order('nome')
      .then(({ data }) => setOficinas(data || []))
  }, [])

  function setField(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function toggleDia(dia) {
    setForm(f => ({
      ...f,
      dias_semana: f.dias_semana.includes(dia)
        ? f.dias_semana.filter(d => d !== dia)
        : [...f.dias_semana, dia]
    }))
  }

  async function salvar() {
    if (!form.nome.trim()) {
      setErro('Nome da turma obrigatório')
      return
    }
    if (!form.oficina_id) {
      setErro('Selecione uma oficina')
      return
    }
    if (form.dias_semana.length === 0) {
      setErro('Selecione ao menos um dia')
      return
    }
    if (!form.horario_inicio || !form.horario_fim) {
      setErro('Informe o horário')
      return
    }

    setLoading(true)
    setErro('')

    try {
      const payload = {
        nome: form.nome.trim(),
        oficina_id: form.oficina_id,
        professor_id: form.professor_id || null,
        dia_semana: form.dias_semana[0],
        dias_semana: form.dias_semana,
        horario_inicio: form.horario_inicio,
        horario_fim: form.horario_fim,
        vagas: Number(form.vagas),
      }

      const { error } = editando
        ? await supabase.from('turmas').update(payload).eq('id', turma.id)
        : await supabase.from('turmas').insert({ ...payload, ano_letivo: ANO_ATUAL, ativa: true })

      if (error) throw error
      onSalvo()
    } catch (e) {
      console.error(e)
      setErro('Erro: ' + (e?.message || 'Tente novamente.'))
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/70 z-[9999] overflow-y-auto">
      <div className="min-h-full flex items-start justify-center p-3 py-6">
        <div className="w-full max-w-lg bg-mis-bg2 border border-mis-borda rounded-xl2 animate-fade-in">
          <div className="flex items-center justify-between p-4 border-b border-mis-borda">
            <h2 className="text-sm font-bold text-mis-texto">{editando ? 'Editar Turma' : 'Nova Turma'}</h2>
            <button onClick={onClose} className="text-mis-texto2 hover:text-mis-texto p-1">
              <X size={18} />
            </button>
          </div>

          <div className="p-4 space-y-3">
            <div>
              <label className="mis-label">Nome <span className="text-amarelo">*</span></label>
              <input
                className="mis-input"
                placeholder="Ex: Flauta Doce — Manhã"
                value={form.nome}
                onChange={e => setField('nome', e.target.value)}
              />
            </div>

            <div>
              <label className="mis-label">Oficina <span className="text-amarelo">*</span></label>
              <select className="mis-input" value={form.oficina_id} onChange={e => setField('oficina_id', e.target.value)}>
                <option value="">Selecione</option>
                {oficinas.map(o => (
                  <option key={o.id} value={o.id}>{o.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mis-label">Professor</label>
              <select className="mis-input" value={form.professor_id} onChange={e => setField('professor_id', e.target.value)}>
                <option value="">Sem professor</option>
                {professores.map(p => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mis-label">Dias da semana <span className="text-amarelo">*</span></label>
              <div className="flex gap-2 mt-1 flex-wrap">
                {DIAS.map(dia => (
                  <button
                    key={dia}
                    type="button"
                    onClick={() => toggleDia(dia)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all
                      ${form.dias_semana.includes(dia)
                        ? 'bg-amarelo/15 border-amarelo text-amarelo'
                        : 'bg-mis-bg3 border-mis-borda text-mis-texto2 hover:border-amarelo/40'}`}
                  >
                    {dia}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="mis-label">Vagas</label>
                <input
                  className="mis-input"
                  type="number"
                  min="1"
                  max="100"
                  value={form.vagas}
                  onChange={e => setField('vagas', e.target.value)}
                />
              </div>

              <div>
                <label className="mis-label">Início <span className="text-amarelo">*</span></label>
                <input
                  className="mis-input"
                  type="time"
                  value={form.horario_inicio}
                  onChange={e => setField('horario_inicio', e.target.value)}
                />
              </div>

              <div>
                <label className="mis-label">Fim <span className="text-amarelo">*</span></label>
                <input
                  className="mis-input"
                  type="time"
                  value={form.horario_fim}
                  onChange={e => setField('horario_fim', e.target.value)}
                />
              </div>
            </div>

            {erro && (
              <div className="bg-red-900/30 border border-red-800 text-red-400 text-xs rounded-lg px-3 py-2 flex items-center gap-2">
                <AlertCircle size={13} /> {erro}
              </div>
            )}
          </div>

          <div className="flex gap-2 p-4 border-t border-mis-borda">
            <button onClick={onClose} className="btn-secondary px-4 py-2 text-sm">Cancelar</button>
            <button onClick={salvar} disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2 py-2 text-sm">
              {loading
                ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                : <><Save size={13} /> {editando ? 'Salvar' : 'Criar Turma'}</>}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

function ModalAlunos({ turma, onClose }) {
  const [alunosTurma, setAlunosTurma] = useState([])
  const [todosAlunos, setTodosAlunos] = useState([])
  const [busca, setBusca] = useState('')
  const [filtroOficina, setFiltroOficina] = useState(turma?.oficinas?.nome || '')
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(null)

  async function carregar() {
    setLoading(true)

    try {
      const [{ data: ta }, { data: todos }] = await Promise.all([
        supabase
          .from('frequencias')
          .select('aluno_id')
          .eq('turma_id', turma.id)
          .is('data_aula', null),

        supabase
          .from('alunos')
          .select(`
            id,
            nome,
            numero_matricula,
            matriculas_oficinas (
              ano_letivo,
              oficinas (nome)
            )
          `)
          .eq('status', 'ativo')
          .eq('ano_letivo', ANO_ATUAL)
          .order('nome')
      ])

      setAlunosTurma([...new Set((ta || []).map(f => f.aluno_id))])
      setTodosAlunos(todos || [])
    } catch (e) {
      console.error('Erro ao carregar alunos da turma:', e)
      setTodosAlunos([])
      setAlunosTurma([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  async function toggleAluno(alunoId) {
    setSalvando(alunoId)

    try {
      const vinculado = alunosTurma.includes(alunoId)

      if (vinculado) {
        await supabase
          .from('frequencias')
          .delete()
          .eq('turma_id', turma.id)
          .eq('aluno_id', alunoId)
          .is('data_aula', null)

        setAlunosTurma(prev => prev.filter(x => x !== alunoId))
      } else {
        const { data: existe } = await supabase
          .from('frequencias')
          .select('id')
          .eq('turma_id', turma.id)
          .eq('aluno_id', alunoId)
          .is('data_aula', null)
          .maybeSingle()

        if (!existe) {
          const { error } = await supabase
            .from('frequencias')
            .insert({
              turma_id: turma.id,
              aluno_id: alunoId,
              data_aula: null,
              status: 'presente'
            })

          if (error) throw error
        }

        setAlunosTurma(prev => [...prev, alunoId])
      }
    } catch (e) {
      console.error('Erro ao vincular aluno:', e)
    } finally {
      setSalvando(null)
    }
  }

  const filtrados = todosAlunos.filter(aluno => {
    const nomeOk = aluno.nome.toLowerCase().includes(busca.toLowerCase())

    const oficinasAluno = (aluno.matriculas_oficinas || [])
      .filter(item => Number(item?.ano_letivo) === ANO_ATUAL)
      .map(item => item?.oficinas?.nome)
      .filter(Boolean)

    const oficinasFallback = (aluno.matriculas_oficinas || [])
      .map(item => item?.oficinas?.nome)
      .filter(Boolean)

    const listaOficinas = oficinasAluno.length > 0 ? oficinasAluno : oficinasFallback
    const oficinaOk = !filtroOficina || listaOficinas.includes(filtroOficina)

    return nomeOk && oficinaOk
  })

  return createPortal(
    <div className="fixed inset-0 bg-black/70 z-[9999] overflow-y-auto">
      <div className="min-h-full flex items-start justify-center p-3 py-6">
        <div className="w-full max-w-lg bg-mis-bg2 border border-mis-borda rounded-xl2 animate-fade-in">
          <div className="flex items-center justify-between p-4 border-b border-mis-borda">
            <div>
              <h2 className="text-sm font-bold text-mis-texto">Alunos da Turma</h2>
              <p className="text-xs text-mis-texto2 mt-0.5">
                {turma.nome} · {alunosTurma.length} aluno{alunosTurma.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button onClick={onClose} className="text-mis-texto2 hover:text-mis-texto p-1">
              <X size={18} />
            </button>
          </div>

          <div className="p-4">
            <div className="space-y-3 mb-3">
              <div>
                <label className="mis-label">Filtrar por oficina</label>
                <select
                  className="mis-input text-sm"
                  value={filtroOficina}
                  onChange={e => setFiltroOficina(e.target.value)}
                >
                  <option value="">Todas as oficinas</option>
                  {OFICINAS.map(oficina => (
                    <option key={oficina} value={oficina}>{oficina}</option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mis-texto2" />
                <input
                  className="mis-input pl-9 text-sm"
                  placeholder="Buscar aluno pelo nome..."
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-6 h-6 border-2 border-amarelo border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {filtrados.map(aluno => {
                  const vinculado = alunosTurma.includes(aluno.id)
                  return (
                    <button
                      key={aluno.id}
                      onClick={() => toggleAluno(aluno.id)}
                      disabled={salvando === aluno.id}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all text-left
                        ${vinculado
                          ? 'bg-amarelo/10 border-amarelo/40'
                          : 'bg-mis-bg3 border-mis-borda hover:border-amarelo/30'}`}
                    >
                      <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0
                        ${vinculado ? 'bg-amarelo border-amarelo' : 'border-mis-borda'}`}>
                        {salvando === aluno.id
                          ? <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                          : vinculado && <Check size={10} className="text-black" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-mis-texto truncate">{aluno.nome}</p>
                        <p className="text-xs text-mis-texto2 font-mono">{aluno.numero_matricula}</p>
                      </div>
                    </button>
                  )
                })}

                {filtrados.length === 0 && (
                  <p className="text-center text-mis-texto2 text-sm py-6">
                    Nenhum aluno encontrado.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-mis-borda">
            <button onClick={onClose} className="btn-primary w-full py-2 text-sm">Concluir</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

function ModalExcluir({ turma, onClose, onConfirmar }) {
  const [loading, setLoading] = useState(false)

  async function confirmar() {
    setLoading(true)
    await onConfirmar()
    setLoading(false)
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-mis-bg2 border border-mis-borda rounded-xl2 p-5 animate-fade-in">
        <div className="w-11 h-11 rounded-full bg-red-900/30 flex items-center justify-center mb-4 mx-auto">
          <Trash2 size={20} className="text-red-400" />
        </div>

        <h2 className="text-sm font-bold text-mis-texto text-center mb-1">Excluir Turma</h2>
        <p className="text-sm text-mis-texto2 text-center mb-0.5">Deseja excluir</p>
        <p className="text-sm font-bold text-mis-texto text-center mb-2">{turma.nome}?</p>
        <p className="text-xs text-red-400 text-center mb-4">Esta ação não pode ser desfeita.</p>

        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1 py-2 text-sm">Cancelar</button>
          <button
            onClick={confirmar}
            disabled={loading}
            className="flex-1 py-2 rounded-lg font-bold text-sm bg-red-900/40 border border-red-800 text-red-400 hover:bg-red-900/60 transition-colors flex items-center justify-center gap-2"
          >
            {loading
              ? <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
              : <><Trash2 size={13} /> Excluir</>}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function GradeSemanal({ turmas, onClose }) {
  const horarios = [...new Set(turmas.map(t => t.horario_inicio))].sort()

  return createPortal(
    <div className="fixed inset-0 bg-black/70 z-[9999] overflow-y-auto">
      <div className="min-h-full flex items-start justify-center p-3 py-6">
        <div className="w-full max-w-4xl bg-mis-bg2 border border-mis-borda rounded-xl2 animate-fade-in">
          <div className="flex items-center justify-between p-4 border-b border-mis-borda">
            <div>
              <h2 className="text-sm font-bold text-mis-texto">Grade Semanal</h2>
              <p className="text-xs text-mis-texto2 mt-0.5">
                {ANO_ATUAL} · {turmas.length} turma{turmas.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button onClick={onClose} className="text-mis-texto2 hover:text-mis-texto p-1">
              <X size={18} />
            </button>
          </div>

          <div className="p-4 overflow-x-auto">
            {turmas.length === 0 ? (
              <p className="text-center text-mis-texto2 text-sm py-10">Nenhuma turma cadastrada.</p>
            ) : (
              <table className="w-full text-xs border-collapse min-w-[480px]">
                <thead>
                  <tr>
                    <th className="text-left font-bold uppercase tracking-widest text-mis-texto2 pb-3 pr-3 w-16">Hora</th>
                    {DIAS.map(d => (
                      <th key={d} className="text-center font-bold uppercase tracking-widest text-mis-texto2 pb-3 px-1">
                        {d.slice(0, 3)}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {horarios.map(h => (
                    <tr key={h} className="border-t border-mis-borda">
                      <td className="py-2 pr-3 font-bold text-amarelo align-top whitespace-nowrap">
                        {h?.slice(0, 5)}
                      </td>

                      {DIAS.map(dia => {
                        const ts = turmas.filter(t =>
                          t.horario_inicio === h &&
                          (t.dias_semana?.includes(dia) || t.dia_semana === dia)
                        )

                        return (
                          <td key={dia} className="py-1.5 px-1 align-top">
                            {ts.map(t => (
                              <div key={t.id} className="bg-amarelo/10 border border-amarelo/20 rounded-lg p-2 mb-1">
                                <p className="font-semibold text-mis-texto leading-tight">{t.nome}</p>
                                <p className="text-amarelo mt-0.5">{t.oficinas?.nome}</p>
                                {t.profiles && <p className="text-mis-texto2">Prof. {t.profiles.nome}</p>}
                                <p className="text-mis-texto2">
                                  {t.horario_inicio?.slice(0, 5)}–{t.horario_fim?.slice(0, 5)}
                                </p>
                              </div>
                            ))}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="p-4 border-t border-mis-borda">
            <button onClick={onClose} className="btn-secondary w-full py-2 text-sm">Fechar</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default function Turmas() {
  const { isDiretor } = useAuth()
  const [turmas, setTurmas] = useState([])
  const [professores, setProfessores] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroDia, setFiltroDia] = useState('')
  const [filtroOficina, setFiltroOficina] = useState('')
  const [modalNova, setModalNova] = useState(false)
  const [turmaEditar, setTurmaEditar] = useState(null)
  const [turmaExcluir, setTurmaExcluir] = useState(null)
  const [turmaAlunos, setTurmaAlunos] = useState(null)
  const [mostrarGrade, setMostrarGrade] = useState(false)

  const buscarDados = useCallback(async () => {
    setLoading(true)

    try {
      const [{ data: t, error: e1 }, { data: p }] = await Promise.all([
        supabase
          .from('turmas')
          .select('id, nome, dia_semana, dias_semana, horario_inicio, horario_fim, vagas, ativa, ano_letivo, oficina_id, professor_id, oficinas(id,nome), profiles(id,nome)')
          .eq('ano_letivo', ANO_ATUAL)
          .order('horario_inicio'),

        supabase
          .from('profiles')
          .select('id, nome')
          .eq('perfil', 'professor')
          .order('nome')
      ])

      if (e1) console.error('Erro turmas:', e1)

      setTurmas(t || [])
      setProfessores(p || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    buscarDados()
  }, [buscarDados])

  async function excluirTurma(turma) {
    await supabase.from('frequencias').delete().eq('turma_id', turma.id)
    await supabase.from('turmas').delete().eq('id', turma.id)
    setTurmaExcluir(null)
    buscarDados()
  }

  const turmasFiltradas = turmas.filter(t => {
    const dias = t.dias_semana?.length > 0 ? t.dias_semana : t.dia_semana ? [t.dia_semana] : []

    if (filtroDia && !dias.includes(filtroDia)) return false
    if (filtroOficina && t.oficinas?.nome !== filtroOficina) return false

    return true
  })

  return (
    <div className="animate-fade-in">
      <div className="flex items-start justify-between mb-5 gap-2">
        <div>
          <h1 className="page-title">Turmas</h1>
          <p className="text-mis-texto2 text-sm mt-1">
            {turmas.length} turma{turmas.length !== 1 ? 's' : ''} · {ANO_ATUAL}
          </p>
        </div>

        <div className="flex flex-col gap-2 flex-shrink-0">
          <button
            onClick={() => setMostrarGrade(true)}
            className="btn-secondary flex items-center gap-2 px-3 py-2 text-sm whitespace-nowrap"
          >
            <Calendar size={14} /> Grade Semanal
          </button>

          {isDiretor && (
            <button
              onClick={() => setModalNova(true)}
              className="btn-primary flex items-center gap-2 px-3 py-2 text-sm whitespace-nowrap"
            >
              <Plus size={14} /> Nova Turma
            </button>
          )}
        </div>
      </div>

      <div className="mis-card mb-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mis-label">Dia</label>
            <select className="mis-input text-sm" value={filtroDia} onChange={e => setFiltroDia(e.target.value)}>
              <option value="">Todos</option>
              {DIAS.map(d => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mis-label">Oficina</label>
            <select className="mis-input text-sm" value={filtroOficina} onChange={e => setFiltroOficina(e.target.value)}>
              <option value="">Todas</option>
              {OFICINAS.map(o => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="mis-card flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-amarelo border-t-transparent rounded-full animate-spin" />
            <span className="text-mis-texto2 text-sm">Carregando turmas...</span>
          </div>
        </div>
      ) : turmasFiltradas.length === 0 ? (
        <div className="mis-card flex flex-col items-center justify-center py-16 text-center">
          <BookOpen size={36} className="text-mis-borda mb-3" />
          <p className="text-mis-texto font-semibold mb-1">Nenhuma turma encontrada</p>
          {isDiretor && (
            <button onClick={() => setModalNova(true)} className="btn-primary mt-3 flex items-center gap-2 px-4 py-2 text-sm">
              <Plus size={14} /> Criar primeira turma
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {turmasFiltradas.map(turma => {
            const dias = turma.dias_semana?.length > 0 ? turma.dias_semana : turma.dia_semana ? [turma.dia_semana] : []

            return (
              <div key={turma.id} className="mis-card hover:border-mis-texto/20 transition-all">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 text-center w-14">
                    <p className="text-xs font-bold text-amarelo">{turma.horario_inicio?.slice(0, 5)}</p>
                    <p className="text-xs text-mis-texto2">{turma.horario_fim?.slice(0, 5)}</p>
                  </div>

                  <div className="w-px h-10 bg-mis-borda flex-shrink-0" />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-mis-texto truncate">{turma.nome}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {turma.oficinas && <span className="badge badge-amarelo">{turma.oficinas.nome}</span>}
                      {dias.map(d => (
                        <span key={d} className="badge badge-gray">{d.slice(0, 3)}</span>
                      ))}
                    </div>
                    {turma.profiles && <p className="text-xs text-mis-texto2 mt-0.5">Prof. {turma.profiles.nome}</p>}
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => setTurmaAlunos(turma)}
                      title="Alunos"
                      className="p-1.5 rounded-lg border border-mis-borda text-mis-texto2 hover:text-amarelo hover:border-amarelo/40 transition-colors"
                    >
                      <Users size={14} />
                    </button>

                    {isDiretor && (
                      <>
                        <button
                          onClick={() => setTurmaEditar(turma)}
                          title="Editar"
                          className="p-1.5 rounded-lg border border-mis-borda text-mis-texto2 hover:text-mis-texto transition-colors"
                        >
                          <ChevronRight size={14} />
                        </button>

                        <button
                          onClick={() => setTurmaExcluir(turma)}
                          title="Excluir"
                          className="p-1.5 rounded-lg border border-red-900/40 text-red-400 hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {(modalNova || turmaEditar) && (
        <ModalTurma
          turma={turmaEditar}
          professores={professores}
          onClose={() => {
            setModalNova(false)
            setTurmaEditar(null)
          }}
          onSalvo={() => {
            setModalNova(false)
            setTurmaEditar(null)
            buscarDados()
          }}
        />
      )}

      {turmaExcluir && (
        <ModalExcluir
          turma={turmaExcluir}
          onClose={() => setTurmaExcluir(null)}
          onConfirmar={() => excluirTurma(turmaExcluir)}
        />
      )}

      {turmaAlunos && (
        <ModalAlunos
          turma={turmaAlunos}
          onClose={() => {
            setTurmaAlunos(null)
            buscarDados()
          }}
        />
      )}

      {mostrarGrade && (
        <GradeSemanal turmas={turmas} onClose={() => setMostrarGrade(false)} />
      )}
    </div>
  )
}