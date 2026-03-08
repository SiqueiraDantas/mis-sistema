import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Plus, X, Save, Trash2, ChevronRight, AlertCircle, Calendar, User, FileText, Sparkles } from 'lucide-react'

const ANO_ATUAL = new Date().getFullYear()
const MESES = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function ModalPlano({ plano, turmas, professorId, onClose, onSalvo }) {
  const editando = !!plano

  const [form, setForm] = useState({
    turma_id: plano?.turma_id || '',
    data_aula: plano?.data_aula || '',
    conteudo: plano?.conteudo || '',
    metodologia: plano?.metodologia || '',
    materiais: plano?.materiais || '',
    plano_mensal: plano?.plano_mensal || '',
  })

  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [gerando, setGerando] = useState(false)

  useEffect(() => {
    if (!editando && !form.turma_id && turmas?.length > 0) {
      setForm((f) => ({ ...f, turma_id: turmas[0].id }))
    }
  }, [editando, form.turma_id, turmas])

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function gerarPlanoMensal() {
    if (!form.conteudo.trim()) {
      setErro('Preencha o conteudo primeiro para gerar o plano mensal')
      return
    }

    setGerando(true)
    setErro('')

    try {
      const { data, error } = await supabase.functions.invoke('gerar-plano', {
        body: {
          conteudo: form.conteudo,
          metodologia: form.metodologia,
          materiais: form.materiais,
        },
      })

      if (error) throw error

      if (data?.texto) {
        set('plano_mensal', data.texto.trim())
      } else if (data?.planoMensal) {
        set('plano_mensal', data.planoMensal.trim())
      } else if (data?.erro) {
        throw new Error(data.erro)
      } else {
        throw new Error('Resposta inesperada da funcao gerar-plano')
      }
    } catch (e) {
      console.error('Erro IA:', e)
      setErro('Erro ao gerar plano mensal com IA: ' + (e?.message || ''))
    } finally {
      setGerando(false)
    }
  }

  async function salvar() {
    if (!form.turma_id) {
      setErro('Selecione a turma')
      return
    }

    if (!form.data_aula) {
      setErro('Informe a data da aula')
      return
    }

    if (!form.conteudo.trim()) {
      setErro('Conteudo e obrigatorio')
      return
    }

    setLoading(true)
    setErro('')

    try {
      const payload = {
        turma_id: form.turma_id,
        professor_id: professorId,
        data_aula: form.data_aula,
        conteudo: form.conteudo.trim(),
        metodologia: form.metodologia.trim(),
        materiais: form.materiais.trim(),
        plano_mensal: form.plano_mensal.trim(),
        ano_letivo: ANO_ATUAL,
      }

      const { error } = editando
        ? await supabase.from('planos_aula').update(payload).eq('id', plano.id)
        : await supabase.from('planos_aula').insert(payload)

      if (error) throw error

      onSalvo()
    } catch (e) {
      console.error(e)
      setErro('Erro ao salvar: ' + (e?.message || 'Tente novamente.'))
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/70 z-[9999] overflow-y-auto">
      <div className="min-h-full flex items-start justify-center p-3 py-6">
        <div className="w-full max-w-2xl bg-mis-bg2 border border-mis-borda rounded-xl2 animate-fade-in">
          <div className="flex items-center justify-between p-4 border-b border-mis-borda">
            <h2 className="text-sm font-bold text-mis-texto">
              {editando ? 'Editar Plano de Aula' : 'Novo Plano de Aula'}
            </h2>
            <button onClick={onClose} className="text-mis-texto2 hover:text-mis-texto p-1">
              <X size={18} />
            </button>
          </div>

          <div className="p-4 space-y-4">
            <div>
              <label className="mis-label">
                Turma <span className="text-amarelo">*</span>
              </label>
              <select
                className="mis-input"
                value={form.turma_id}
                onChange={(e) => set('turma_id', e.target.value)}
              >
                <option value="">Selecione a turma</option>
                {turmas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mis-label">
                Data da aula <span className="text-amarelo">*</span>
              </label>
              <input
                className="mis-input"
                type="date"
                value={form.data_aula}
                onChange={(e) => set('data_aula', e.target.value)}
              />
            </div>

            <div>
              <label className="mis-label">
                Conteudo <span className="text-amarelo">*</span>
              </label>
              <textarea
                className="mis-input min-h-[100px] resize-y"
                rows={4}
                placeholder="Descreva os conteudos trabalhados nesta aula..."
                value={form.conteudo}
                onChange={(e) => set('conteudo', e.target.value)}
              />
            </div>

            <div>
              <label className="mis-label">Metodologia da aula</label>
              <textarea
                className="mis-input min-h-[100px] resize-y"
                rows={4}
                placeholder="Descreva a metodologia utilizada..."
                value={form.metodologia}
                onChange={(e) => set('metodologia', e.target.value)}
              />
            </div>

            <div>
              <label className="mis-label">Necessidades tecnicas / Materiais</label>
              <textarea
                className="mis-input min-h-[80px] resize-y"
                rows={3}
                placeholder="Ex: Instrumento, metodo Arban, espaco adequado..."
                value={form.materiais}
                onChange={(e) => set('materiais', e.target.value)}
              />
            </div>

            <div className="border border-mis-borda rounded-lg p-3 bg-mis-bg3">
              <div className="flex items-center justify-between mb-1">
                <label className="mis-label flex items-center gap-2 mb-0">
                  <Calendar size={13} className="text-amarelo" /> Plano Mensal
                </label>

                <button
                  type="button"
                  onClick={gerarPlanoMensal}
                  disabled={gerando}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border border-amarelo/40 text-amarelo hover:bg-amarelo/10 transition-colors disabled:opacity-50"
                >
                  {gerando ? (
                    <div className="w-3 h-3 border border-amarelo border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Sparkles size={11} />
                  )}
                  {gerando ? 'Gerando...' : 'Gerar com IA'}
                </button>
              </div>

              <p className="text-xs text-mis-texto2 mb-2">
                Resumo dos objetivos do mes (aparece no documento exportado para a SECULT)
              </p>

              <textarea
                className="mis-input min-h-[80px] resize-y"
                rows={3}
                placeholder="Preencha o conteudo acima e clique em Gerar com IA..."
                value={form.plano_mensal}
                onChange={(e) => set('plano_mensal', e.target.value)}
              />
            </div>

            {erro && (
              <div className="bg-red-900/30 border border-red-800 text-red-400 text-xs rounded-lg px-3 py-2 flex items-center gap-2">
                <AlertCircle size={13} /> {erro}
              </div>
            )}
          </div>

          <div className="flex gap-2 p-4 border-t border-mis-borda">
            <button onClick={onClose} className="btn-secondary px-4 py-2 text-sm">
              Cancelar
            </button>

            <button
              onClick={salvar}
              disabled={loading}
              className="btn-primary flex-1 flex items-center justify-center gap-2 py-2 text-sm"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <Save size={13} /> {editando ? 'Salvar' : 'Registrar Aula'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

function ModalExcluir({ plano, onClose, onConfirmar }) {
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

        <h2 className="text-sm font-bold text-mis-texto text-center mb-1">Excluir Plano</h2>

        <p className="text-sm text-mis-texto2 text-center mb-2">
          Aula do dia{' '}
          <span className="font-bold text-mis-texto">
            {plano.data_aula ? new Date(plano.data_aula + 'T12:00:00').toLocaleDateString('pt-BR') : ''}
          </span>
        </p>

        <p className="text-xs text-red-400 text-center mb-4">Esta acao nao pode ser desfeita.</p>

        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1 py-2 text-sm">
            Cancelar
          </button>

          <button
            onClick={confirmar}
            disabled={loading}
            className="flex-1 py-2 rounded-lg font-bold text-sm bg-red-900/40 border border-red-800 text-red-400 hover:bg-red-900/60 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
            ) : (
              <>
                <Trash2 size={13} /> Excluir
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function ModalCurriculo({ perfil, onClose, onSalvo }) {
  const [form, setForm] = useState({
    mini_curriculo: perfil?.mini_curriculo || '',
    email_contato: perfil?.email_contato || perfil?.email || '',
    telefone: perfil?.telefone || '',
  })
  const [loading, setLoading] = useState(false)

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function salvar() {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          mini_curriculo: form.mini_curriculo.trim(),
          email_contato: form.email_contato.trim(),
          telefone: form.telefone.trim(),
        })
        .eq('id', perfil.id)

      if (error) throw error

      onSalvo()
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/70 z-[9999] overflow-y-auto">
      <div className="min-h-full flex items-start justify-center p-3 py-6">
        <div className="w-full max-w-lg bg-mis-bg2 border border-mis-borda rounded-xl2 animate-fade-in">
          <div className="flex items-center justify-between p-4 border-b border-mis-borda">
            <h2 className="text-sm font-bold text-mis-texto">Meu Mini Curriculo</h2>
            <button onClick={onClose} className="text-mis-texto2 hover:text-mis-texto p-1">
              <X size={18} />
            </button>
          </div>

          <div className="p-4 space-y-3">
            <p className="text-xs text-mis-texto2">
              Essas informacoes aparecem no Plano de Curso exportado para a SECULT.
            </p>

            <div>
              <label className="mis-label">E-mail de contato</label>
              <input
                className="mis-input"
                type="email"
                placeholder="seu@email.com"
                value={form.email_contato}
                onChange={(e) => set('email_contato', e.target.value)}
              />
            </div>

            <div>
              <label className="mis-label">Telefone</label>
              <input
                className="mis-input"
                placeholder="(88) 99999-9999"
                value={form.telefone}
                onChange={(e) => set('telefone', e.target.value)}
              />
            </div>

            <div>
              <label className="mis-label">Mini curriculo</label>
              <textarea
                className="mis-input min-h-[140px] resize-y"
                rows={6}
                placeholder="Descreva sua formacao e experiencia musical..."
                value={form.mini_curriculo}
                onChange={(e) => set('mini_curriculo', e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 p-4 border-t border-mis-borda">
            <button onClick={onClose} className="btn-secondary px-4 py-2 text-sm">
              Cancelar
            </button>

            <button
              onClick={salvar}
              disabled={loading}
              className="btn-primary flex-1 flex items-center justify-center gap-2 py-2 text-sm"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <Save size={13} /> Salvar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default function PlanosAula() {
  const auth = useAuth()
  console.log('AUTH PlanosAula:', auth)

  const { usuario: user, isDiretor } = useAuth()
  const [turmas, setTurmas] = useState([])
  const [mesFiltro, setMesFiltro] = useState(new Date().getMonth())
  const [planos, setPlanos] = useState([])
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(false)
  const [modalNovo, setModalNovo] = useState(false)
  const [planoEditar, setPlanoEditar] = useState(null)
  const [planoExcluir, setPlanoExcluir] = useState(null)
  const [modalCurriculo, setModalCurriculo] = useState(false)

  useEffect(() => {
    async function init() {
      const [{ data: prof }, { data: minhasTurmas }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        isDiretor
          ? supabase.from('turmas').select('id, nome, oficinas(nome)').eq('ano_letivo', ANO_ATUAL).order('nome')
          : supabase.from('turmas').select('id, nome, oficinas(nome)').eq('professor_id', user.id).eq('ano_letivo', ANO_ATUAL).order('nome'),
      ])

      setPerfil(prof)
      setTurmas(minhasTurmas || [])
    }

    if (user?.id) {
      init()
    }
  }, [user, isDiretor])

  const buscarPlanos = useCallback(async () => {
    setLoading(true)

    const mesInicio = String(mesFiltro + 1).padStart(2, '0')
    const dataInicio = `${ANO_ATUAL}-${mesInicio}-01`
    const ultimoDia = new Date(ANO_ATUAL, mesFiltro + 1, 0).getDate()
    const dataFim = `${ANO_ATUAL}-${mesInicio}-${String(ultimoDia).padStart(2, '0')}`

    const { data, error } = await supabase
      .from('planos_aula')
      .select('*, turmas(id, nome, oficinas(nome))')
      .gte('data_aula', dataInicio)
      .lte('data_aula', dataFim)
      .eq('ano_letivo', ANO_ATUAL)
      .order('data_aula')

    if (error) {
      console.error(error)
      setPlanos([])
      setLoading(false)
      return
    }

    const filtrados = isDiretor
      ? (data || [])
      : (data || []).filter((plano) => turmas.some((turma) => turma.id === plano.turma_id))

    setPlanos(filtrados)
    setLoading(false)
  }, [mesFiltro, isDiretor, turmas])

  useEffect(() => {
    if (user?.id && turmas.length >= 0) {
      buscarPlanos()
    }
  }, [buscarPlanos, user, turmas])

  async function excluir(plano) {
    await supabase.from('planos_aula').delete().eq('id', plano.id)
    setPlanoExcluir(null)
    buscarPlanos()
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-start justify-between mb-5 gap-2">
        <div>
          <h1 className="page-title">Planos de Aula</h1>
          <p className="text-mis-texto2 text-sm mt-1">
            {planos.length} aula{planos.length !== 1 ? 's' : ''} · {MESES[mesFiltro]} {ANO_ATUAL}
          </p>
        </div>

        <div className="flex flex-col gap-2 flex-shrink-0">
          {!isDiretor && (
            <button
              onClick={() => setModalCurriculo(true)}
              className="btn-secondary flex items-center gap-2 px-3 py-2 text-sm whitespace-nowrap"
            >
              <User size={14} /> Meu Curriculo
            </button>
          )}

          <button
            onClick={() => setModalNovo(true)}
            className="btn-primary flex items-center gap-2 px-3 py-2 text-sm whitespace-nowrap"
          >
            <Plus size={14} /> Nova Aula
          </button>
        </div>
      </div>

      <div className="mis-card mb-4">
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="mis-label">Mes</label>
            <select
              className="mis-input text-sm"
              value={mesFiltro}
              onChange={(e) => setMesFiltro(Number(e.target.value))}
            >
              {MESES.map((m, i) => (
                <option key={i} value={i}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="mis-card flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-amarelo border-t-transparent rounded-full animate-spin" />
            <span className="text-mis-texto2 text-sm">Carregando planos...</span>
          </div>
        </div>
      ) : planos.length === 0 ? (
        <div className="mis-card flex flex-col items-center justify-center py-16 text-center">
          <FileText size={36} className="text-mis-borda mb-3" />
          <p className="text-mis-texto font-semibold mb-1">Nenhuma aula registrada</p>
          <p className="text-mis-texto2 text-sm mb-4">
            {MESES[mesFiltro]} - {ANO_ATUAL}
          </p>
          <button
            onClick={() => setModalNovo(true)}
            className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
          >
            <Plus size={14} /> Registrar primeira aula
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {planos.map((plano) => {
            const data = plano.data_aula ? new Date(plano.data_aula + 'T12:00:00') : null
            const diaSemana = data ? data.toLocaleDateString('pt-BR', { weekday: 'short' }) : ''
            const diaNum = data ? data.getDate() : ''
            const nomeTurma = plano.turmas?.nome || 'Turma sem nome'

            return (
              <div key={plano.id} className="mis-card hover:border-mis-texto/20 transition-all">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 text-center w-12 bg-mis-bg3 rounded-lg p-2 border border-mis-borda">
                    <p className="text-xs text-mis-texto2 capitalize">{diaSemana}</p>
                    <p className="text-lg font-bold text-amarelo leading-tight">{diaNum}</p>
                    <p className="text-xs text-mis-texto2">{MESES[mesFiltro].slice(0, 3)}</p>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-mis-texto mb-1">{nomeTurma}</p>
                    <p className="text-xs text-mis-texto2 line-clamp-2">{plano.conteudo}</p>

                    <div className="flex gap-2 mt-2 flex-wrap">
                      {plano.metodologia && <span className="badge badge-gray">Metodologia ok</span>}
                      {plano.materiais && <span className="badge badge-gray">Materiais ok</span>}
                      {plano.plano_mensal && <span className="badge badge-amarelo">Plano mensal ok</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => setPlanoEditar(plano)}
                      title="Editar"
                      className="p-1.5 rounded-lg border border-mis-borda text-mis-texto2 hover:text-mis-texto transition-colors"
                    >
                      <ChevronRight size={14} />
                    </button>

                    <button
                      onClick={() => setPlanoExcluir(plano)}
                      title="Excluir"
                      className="p-1.5 rounded-lg border border-red-900/40 text-red-400 hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {(modalNovo || planoEditar) && (
        <ModalPlano
          plano={planoEditar}
          turmas={turmas}
          professorId={user.id}
          onClose={() => {
            setModalNovo(false)
            setPlanoEditar(null)
          }}
          onSalvo={() => {
            setModalNovo(false)
            setPlanoEditar(null)
            buscarPlanos()
          }}
        />
      )}

      {planoExcluir && (
        <ModalExcluir
          plano={planoExcluir}
          onClose={() => setPlanoExcluir(null)}
          onConfirmar={() => excluir(planoExcluir)}
        />
      )}

      {modalCurriculo && perfil && (
        <ModalCurriculo
          perfil={perfil}
          onClose={() => setModalCurriculo(false)}
          onSalvo={() => {
            setModalCurriculo(false)
            supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .single()
              .then(({ data }) => setPerfil(data))
          }}
        />
      )}
    </div>
  )
}