import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../contexts/AuthContext'
import {
  Search, UserCheck, UserX, ChevronRight,
  X, Save, AlertCircle, Users, SlidersHorizontal, Check, Trash2
} from 'lucide-react'

const OFICINAS = [
  'Flauta Doce', 'Clarinete', 'Trompete', 'Trombone', 'Saxofone',
  'Trompa', 'Euphonio', 'Tuba', 'Percussão', 'Bateria',
  'Flauta Transversal', 'Flauta Doce (Macaoca)', 'Violão (Macaoca)',
]

const ESCOLAS = [
  'CEI José Alzir Silva Lima', 'CEI José Hermínio Rodrigues do Nascimento',
  'CEI Mãe Toinha', 'CEI Maria da Conceição Barros Pinho',
  'CEI Maria de Lourdes Bezerra Costa', 'CEI Maria Mirtes Costa Salgado',
  'CEI Sara Rosita Ferreira', 'CEI Terezinha Mariano Germano',
  'EEF 25 de Maio I', 'EEF Álvaro de Araújo Carneiro', 'EEF Dau Alberto',
  'EEF Francisco Correia Lima', 'EEF João Costa', 'EEF José Severo de Pinho',
  'EEF Margarida Alves', 'EEF Padre Jaime Felício', 'EEF Paula Queiroz',
  'EEF Vicente Patrício de Almeida', 'EEIF Antonio Alves da Silva',
  'EEIF Comunidade Pau Ferros', 'EEIF Damião Carneiro', 'EEIF Eliônia Campos',
  'EEEP João Jackson Lobo Guerra', 'EEEP Venceslau Vieira Batista',
  'EEM Alfredo Machado', 'IEST Santa Teresinha Instituto Educacional',
  'IFCE Campus Boa Viagem',
]

const PROGRAMAS_SOCIAIS = ['Bolsa Família', 'Pé-de-Meia', 'Cesta Básica', 'Nenhum']
const ANO_ATUAL = new Date().getFullYear()

function mascararTelefone(telefone) {
  if (!telefone) return '***'
  const numeros = String(telefone).replace(/\D/g, '')
  if (numeros.length < 4) return '***'
  return `*** *** ${numeros.slice(-4)}`
}

function normalizarProgramaSocial(valor) {
  if (Array.isArray(valor)) return valor.filter(Boolean)

  if (typeof valor === 'string' && valor.trim()) {
    return valor
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
  }

  return []
}

function extrairOficinasAnoAtual(matriculasOficinas) {
  const registros = Array.isArray(matriculasOficinas) ? matriculasOficinas : []

  const oficinasAnoAtual = registros
    .filter(item => Number(item?.ano_letivo) === ANO_ATUAL)
    .map(item => item?.oficinas?.nome)
    .filter(Boolean)

  if (oficinasAnoAtual.length > 0) {
    return [...new Set(oficinasAnoAtual)]
  }

  const fallback = registros
    .map(item => item?.oficinas?.nome)
    .filter(Boolean)

  return [...new Set(fallback)]
}

function ModalEdicao({ aluno, onClose, onSalvo, onExcluir }) {
  const [form, setForm] = useState({
    nome: aluno.nome || '',
    escola_origem: aluno.escola_origem || '',
    rede_ensino: aluno.rede_ensino || '',
    sexo: aluno.sexo === 'M' ? 'Masculino' : aluno.sexo === 'F' ? 'Feminino' : 'Outro',
    raca: aluno.raca || '',
    religiao: aluno.religiao || '',
    tipo: aluno.tipo || 'matricula',
    programa_social: normalizarProgramaSocial(aluno.programa_social),
    integrantes_familia: aluno.integrantes_familia || '',
    oficinas: [],
    resp_nome: aluno.responsaveis?.[0]?.nome || '',
    resp_telefone: aluno.responsaveis?.[0]?.telefone || '',
    resp_email: aluno.responsaveis?.[0]?.email || '',
  })

  const [loadingOficinas, setLoadingOficinas] = useState(true)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function toggleOficina(oficina) {
    setForm(f => ({
      ...f,
      oficinas: f.oficinas.includes(oficina)
        ? f.oficinas.filter(item => item !== oficina)
        : [...f.oficinas, oficina]
    }))
  }

  function togglePrograma(programa) {
    setForm(f => {
      let lista = [...f.programa_social]

      if (programa === 'Nenhum') {
        return { ...f, programa_social: lista.includes('Nenhum') ? [] : ['Nenhum'] }
      }

      lista = lista.filter(item => item !== 'Nenhum')

      return {
        ...f,
        programa_social: lista.includes(programa)
          ? lista.filter(item => item !== programa)
          : [...lista, programa]
      }
    })
  }

  useEffect(() => {
    let ativo = true

    async function carregarOficinasAluno() {
      setLoadingOficinas(true)

      try {
        const { data, error } = await supabase
          .from('matriculas_oficinas')
          .select(`
            ano_letivo,
            oficinas (nome)
          `)
          .eq('aluno_id', aluno.id)

        console.log('DEBUG - Oficinas do aluno:', aluno.nome, 'ID:', aluno.id, 'Data:', data)

        if (error) throw error

        const registros = data || []

        const oficinasAnoAtual = registros
          .filter(item => Number(item?.ano_letivo) === ANO_ATUAL)
          .map(item => item?.oficinas?.nome)
          .filter(Boolean)

        const oficinasFallback = registros
          .map(item => item?.oficinas?.nome)
          .filter(Boolean)

        const oficinasCarregadas =
          oficinasAnoAtual.length > 0 ? oficinasAnoAtual : oficinasFallback

        console.log('DEBUG - Oficinas carregadas:', oficinasCarregadas)

        if (ativo) {
          setForm(f => ({
            ...f,
            oficinas: [...new Set(oficinasCarregadas)]
          }))
        }
      } catch (e) {
        console.error('Erro ao carregar oficinas do aluno:', e)
      } finally {
        if (ativo) setLoadingOficinas(false)
      }
    }

    carregarOficinasAluno()

    return () => {
      ativo = false
    }
  }, [aluno.id])

  async function salvar() {
    if (!form.nome.trim()) {
      setErro('Nome obrigatório')
      return
    }

    setLoading(true)
    setErro('')

    try {
      const sexoMap = {
        Masculino: 'M',
        Feminino: 'F',
        Outro: 'Outro'
      }

      const { error: errorAluno } = await supabase
        .from('alunos')
        .update({
          nome: form.nome.trim(),
          escola_origem: form.escola_origem || null,
          rede_ensino: form.rede_ensino || null,
          sexo: sexoMap[form.sexo] || null,
          raca: form.raca || null,
          religiao: form.religiao || null,
          tipo: form.tipo || 'matricula',
          programa_social: Array.isArray(form.programa_social) ? form.programa_social : [],
          integrantes_familia: form.integrantes_familia ? Number(form.integrantes_familia) : null,
        })
        .eq('id', aluno.id)

      if (errorAluno) throw errorAluno

      const { error: errorDeleteOficinas } = await supabase
        .from('matriculas_oficinas')
        .delete()
        .eq('aluno_id', aluno.id)
        .eq('ano_letivo', ANO_ATUAL)

      if (errorDeleteOficinas) throw errorDeleteOficinas

      if (form.oficinas.length > 0) {
        const { data: ofs, error: errorBuscaOficinas } = await supabase
          .from('oficinas')
          .select('id, nome')
          .in('nome', form.oficinas)

        if (errorBuscaOficinas) throw errorBuscaOficinas

        if (ofs?.length > 0) {
          const payload = ofs.map(oficina => ({
            aluno_id: aluno.id,
            oficina_id: oficina.id,
            ano_letivo: ANO_ATUAL
          }))

          const { error: errorInsertOficinas } = await supabase
            .from('matriculas_oficinas')
            .insert(payload)

          if (errorInsertOficinas) throw errorInsertOficinas
        }
      }

      if (aluno.responsaveis?.[0]?.id) {
        const { error: errorResponsavel } = await supabase
          .from('responsaveis')
          .update({
            nome: form.resp_nome || null,
            telefone: form.resp_telefone || null,
            email: form.resp_email || null,
          })
          .eq('id', aluno.responsaveis[0].id)

        if (errorResponsavel) throw errorResponsavel
      }

      onSalvo()
    } catch (e) {
      console.error('Erro ao salvar aluno:', e)
      setErro(e?.message || 'Erro ao salvar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-[9999] overflow-y-auto">
      <div className="min-h-full flex items-center justify-center p-4 py-8">
        <div className="w-full max-w-lg bg-mis-bg2 border border-mis-borda rounded-xl2 animate-fade-in">
          <div className="flex items-center justify-between p-5 border-b border-mis-borda">
            <div>
              <h2 className="text-base font-bold text-mis-texto">Editar Aluno</h2>
              <p className="text-xs text-mis-texto2 mt-0.5">{aluno.numero_matricula}</p>
            </div>
            <button onClick={onClose} className="text-mis-texto2 hover:text-mis-texto">
              <X size={20} />
            </button>
          </div>

          <div className="p-5 space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-mis-texto2 mb-3">
                Dados do Aluno
              </p>

              <div className="space-y-3">
                <div>
                  <label className="mis-label">Nome completo</label>
                  <input
                    className="mis-input"
                    value={form.nome}
                    onChange={e => set('nome', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mis-label">Sexo</label>
                    <select
                      className="mis-input"
                      value={form.sexo}
                      onChange={e => set('sexo', e.target.value)}
                    >
                      <option value="">Selecione</option>
                      <option>Masculino</option>
                      <option>Feminino</option>
                      <option>Outro</option>
                    </select>
                  </div>

                  <div>
                    <label className="mis-label">Raça</label>
                    <select
                      className="mis-input"
                      value={form.raca}
                      onChange={e => set('raca', e.target.value)}
                    >
                      <option value="">Selecione</option>
                      <option>Branca</option>
                      <option>Preta</option>
                      <option>Parda</option>
                      <option>Amarela</option>
                      <option>Indígena</option>
                      <option>Prefiro não informar</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mis-label">Religião</label>
                  <select
                    className="mis-input"
                    value={form.religiao}
                    onChange={e => set('religiao', e.target.value)}
                  >
                    <option value="">Selecione (opcional)</option>
                    <option>Católica</option>
                    <option>Evangélica</option>
                    <option>Espírita</option>
                    <option>Umbanda/Candomblé</option>
                    <option>Sem religião</option>
                    <option>Outra</option>
                  </select>
                </div>

                <div>
                  <label className="mis-label">Escola onde estuda</label>
                  <select
                    className="mis-input"
                    value={form.escola_origem}
                    onChange={e => set('escola_origem', e.target.value)}
                  >
                    <option value="">Selecione</option>
                    {ESCOLAS.map(escola => (
                      <option key={escola}>{escola}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mis-label">Rede de Ensino</label>
                    <select
                      className="mis-input"
                      value={form.rede_ensino}
                      onChange={e => set('rede_ensino', e.target.value)}
                    >
                      <option value="">Selecione</option>
                      <option>Pública</option>
                      <option>Privada</option>
                      <option>Não estuda</option>
                    </select>
                  </div>

                  <div>
                    <label className="mis-label">Tipo de Matrícula</label>
                    <select
                      className="mis-input"
                      value={form.tipo}
                      onChange={e => set('tipo', e.target.value)}
                    >
                      <option value="matricula">Matrícula</option>
                      <option value="rematricula">Rematrícula</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-mis-texto2 mb-3">
                Oficinas
              </p>

              {loadingOficinas ? (
                <div className="text-xs text-mis-texto2">
                  Carregando oficinas do aluno...
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {OFICINAS.map(oficina => (
                    <button
                      key={oficina}
                      type="button"
                      onClick={() => toggleOficina(oficina)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-left border transition-all
                        ${form.oficinas.includes(oficina)
                          ? 'bg-amarelo/15 border-amarelo text-amarelo'
                          : 'bg-mis-bg3 border-mis-borda text-mis-texto2 hover:border-amarelo/40'}`}
                    >
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0
                          ${form.oficinas.includes(oficina)
                            ? 'bg-amarelo border-amarelo'
                            : 'border-mis-borda'}`}
                      >
                        {form.oficinas.includes(oficina) && (
                          <Check size={10} className="text-black" />
                        )}
                      </div>
                      {oficina}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-mis-texto2 mb-3">
                Responsável
              </p>

              <div className="space-y-3">
                <div>
                  <label className="mis-label">Nome</label>
                  <input
                    className="mis-input"
                    value={form.resp_nome}
                    onChange={e => set('resp_nome', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mis-label">Telefone</label>
                    <input
                      className="mis-input"
                      value={form.resp_telefone}
                      onChange={e => set('resp_telefone', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="mis-label">E-mail</label>
                    <input
                      className="mis-input"
                      type="email"
                      value={form.resp_email}
                      onChange={e => set('resp_email', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="mis-label">Nº Integrantes na Família</label>
                  <input
                    className="mis-input"
                    type="number"
                    min="1"
                    value={form.integrantes_familia}
                    onChange={e => set('integrantes_familia', e.target.value)}
                  />
                </div>

                <div>
                  <label className="mis-label">Programas Sociais</label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {PROGRAMAS_SOCIAIS.map(programa => (
                      <button
                        key={programa}
                        type="button"
                        onClick={() => togglePrograma(programa)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all
                          ${form.programa_social.includes(programa)
                            ? 'bg-azul/15 border-azul text-azul-light'
                            : 'bg-mis-bg3 border-mis-borda text-mis-texto2'}`}
                      >
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0
                            ${form.programa_social.includes(programa)
                              ? 'bg-azul border-azul'
                              : 'border-mis-borda'}`}
                        >
                          {form.programa_social.includes(programa) && (
                            <Check size={10} className="text-white" />
                          )}
                        </div>
                        {programa}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {erro && (
              <div className="bg-red-900/30 border border-red-800 text-red-400 text-xs rounded-lg px-3 py-2 flex items-center gap-2">
                <AlertCircle size={14} />
                {erro}
              </div>
            )}
          </div>

          <div className="flex gap-3 p-5 border-t border-mis-borda">
            <button onClick={onClose} className="btn-secondary px-4 py-2">
              Cancelar
            </button>

            <button
              onClick={onExcluir}
              className="px-4 py-2 rounded-lg border border-red-900/40 text-red-400 hover:bg-red-900/20 transition-colors flex items-center gap-2 text-sm font-semibold"
            >
              <Trash2 size={14} />
              Excluir
            </button>

            <button
              onClick={salvar}
              disabled={loading || loadingOficinas}
              className="btn-primary flex-1 flex items-center justify-center gap-2 py-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <Save size={14} />
                  Salvar Alterações
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ModalConfirmacao({ aluno, onClose, onConfirmar }) {
  const [loading, setLoading] = useState(false)
  const ativar = aluno.status === 'inativo'

  async function confirmar() {
    try {
      setLoading(true)
      await onConfirmar()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-mis-bg2 border border-mis-borda rounded-xl2 p-6 animate-fade-in">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 mx-auto ${ativar ? 'bg-verde/20' : 'bg-red-900/30'}`}>
          {ativar ? <UserCheck size={24} className="text-verde-light" /> : <UserX size={24} className="text-red-400" />}
        </div>

        <h2 className="text-base font-bold text-mis-texto text-center mb-2">
          {ativar ? 'Reativar Aluno' : 'Inativar Aluno'}
        </h2>

        <p className="text-sm text-mis-texto2 text-center mb-6">
          {ativar
            ? `Deseja reativar o aluno ${aluno.nome}?`
            : `Deseja inativar o aluno ${aluno.nome}? Ele não aparecerá nas turmas ativas.`}
        </p>

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1 py-2">
            Cancelar
          </button>

          <button
            onClick={confirmar}
            disabled={loading}
            className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2
              ${ativar ? 'bg-verde/20 border border-verde/40 text-verde-light hover:bg-verde/30' : 'btn-danger'}`}
          >
            {loading
              ? <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
              : ativar ? 'Reativar' : 'Inativar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalExcluir({ aluno, onClose, onConfirmar }) {
  const [loading, setLoading] = useState(false)

  async function confirmar() {
    try {
      setLoading(true)
      await onConfirmar()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-mis-bg2 border border-mis-borda rounded-xl2 p-6 animate-fade-in">
        <div className="w-12 h-12 rounded-full bg-red-900/30 flex items-center justify-center mb-4 mx-auto">
          <Trash2 size={24} className="text-red-400" />
        </div>

        <h2 className="text-base font-bold text-mis-texto text-center mb-2">
          Excluir Aluno
        </h2>

        <p className="text-sm text-mis-texto2 text-center mb-1">
          Tem certeza que deseja excluir permanentemente o aluno
        </p>

        <p className="text-sm font-bold text-mis-texto text-center mb-2">
          {aluno.nome}?
        </p>

        <p className="text-xs text-red-400 text-center mb-6">
          Esta ação não pode ser desfeita. Todos os dados, oficinas e responsáveis serão removidos.
        </p>

        <div className="flex gap-3">
          <button onClick={onClose} disabled={loading} className="btn-secondary flex-1 py-2">
            Cancelar
          </button>

          <button
            onClick={confirmar}
            disabled={loading}
            className="flex-1 py-2 rounded-lg font-bold text-sm bg-red-900/40 border border-red-800 text-red-400 hover:bg-red-900/60 transition-colors flex items-center justify-center gap-2"
          >
            {loading
              ? <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
              : (
                <>
                  <Trash2 size={14} />
                  Excluir permanentemente
                </>
              )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Alunos() {
  const { isDiretor } = useAuth()
  const [alunos, setAlunos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('ativo')
  const [filtroOficina, setFiltroOficina] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [mostrarFiltros, setMostrarFiltros] = useState(false)
  const [alunoEditar, setAlunoEditar] = useState(null)
  const [alunoToggle, setAlunoToggle] = useState(null)
  const [alunoExcluir, setAlunoExcluir] = useState(null)
  const [total, setTotal] = useState(0)
  const [excluindoId, setExcluindoId] = useState(null)

  const buscarAlunos = useCallback(async () => {
    setLoading(true)

    try {
      let query = supabase
        .from('alunos')
        .select(`
          id,
          numero_matricula,
          nome,
          sexo,
          raca,
          escola_origem,
          rede_ensino,
          tipo,
          status,
          ano_letivo,
          programa_social,
          integrantes_familia,
          religiao,
          created_at,
          responsaveis (id, nome, telefone, email),
          matriculas_oficinas (
            oficina_id,
            ano_letivo,
            oficinas (nome)
          )
        `)
        .eq('ano_letivo', ANO_ATUAL)
        .order('nome')

      if (filtroStatus) query = query.eq('status', filtroStatus)
      if (filtroTipo) query = query.eq('tipo', filtroTipo)
      if (busca.trim()) query = query.ilike('nome', `%${busca.trim()}%`)

      const { data, error } = await query
      if (error) throw error

      let resultado = data || []

      if (filtroOficina) {
        resultado = resultado.filter(aluno => {
          const oficinas = extrairOficinasAnoAtual(aluno.matriculas_oficinas)
          return oficinas.includes(filtroOficina)
        })
      }

      setAlunos(resultado)
      setTotal(resultado.length)
    } catch (e) {
      console.error('Erro ao buscar alunos:', e)
      setAlunos([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [busca, filtroStatus, filtroOficina, filtroTipo])

  useEffect(() => {
    const t = setTimeout(buscarAlunos, 300)
    return () => clearTimeout(t)
  }, [buscarAlunos])

  async function toggleStatus(aluno) {
    const novoStatus = aluno.status === 'ativo' ? 'inativo' : 'ativo'

    await supabase
      .from('alunos')
      .update({ status: novoStatus })
      .eq('id', aluno.id)

    setAlunoToggle(null)
    buscarAlunos()
  }

  async function excluirAluno(aluno) {
    if (!aluno || excluindoId) return

    try {
      setExcluindoId(aluno.id)

      const { error: erroOficinas } = await supabase
        .from('matriculas_oficinas')
        .delete()
        .eq('aluno_id', aluno.id)

      if (erroOficinas) throw erroOficinas

      const { error: erroResponsaveis } = await supabase
        .from('responsaveis')
        .delete()
        .eq('aluno_id', aluno.id)

      if (erroResponsaveis) throw erroResponsaveis

      const { error: erroAluno } = await supabase
        .from('alunos')
        .delete()
        .eq('id', aluno.id)

      if (erroAluno) throw erroAluno

      setAlunoExcluir(null)
      setAlunoEditar(null)

      setAlunos(prev => prev.filter(item => item.id !== aluno.id))
      setTotal(prev => Math.max(0, prev - 1))

      setTimeout(() => {
        buscarAlunos()
      }, 50)
    } catch (e) {
      console.error('Erro ao excluir aluno:', e)
    } finally {
      setExcluindoId(null)
    }
  }

  function limparFiltros() {
    setFiltroStatus('ativo')
    setFiltroOficina('')
    setFiltroTipo('')
    setBusca('')
  }

  const filtrosAtivos = filtroStatus !== 'ativo' || filtroOficina || filtroTipo

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Alunos</h1>
          <p className="text-mis-texto2 text-sm mt-1">
            {total} aluno{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''} · {ANO_ATUAL}
          </p>
        </div>
      </div>

      <div className="mis-card mb-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-mis-texto2" />
            <input
              className="mis-input pl-9"
              placeholder="Buscar por nome..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
          </div>

          <button
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className={`btn-secondary flex items-center gap-2 px-4 ${filtrosAtivos ? 'border-amarelo text-amarelo' : ''}`}
          >
            <SlidersHorizontal size={16} />
            Filtros
            {filtrosAtivos && <span className="w-2 h-2 bg-amarelo rounded-full" />}
          </button>
        </div>

        {mostrarFiltros && (
          <div className="mt-4 pt-4 border-t border-mis-borda grid grid-cols-1 md:grid-cols-3 gap-3 animate-fade-in">
            <div>
              <label className="mis-label">Status</label>
              <select className="mis-input" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
                <option value="">Todos</option>
                <option value="ativo">Ativos</option>
                <option value="inativo">Inativos</option>
              </select>
            </div>

            <div>
              <label className="mis-label">Oficina</label>
              <select className="mis-input" value={filtroOficina} onChange={e => setFiltroOficina(e.target.value)}>
                <option value="">Todas</option>
                {OFICINAS.map(oficina => (
                  <option key={oficina}>{oficina}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mis-label">Tipo</label>
              <select className="mis-input" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
                <option value="">Todos</option>
                <option value="matricula">Matrícula</option>
                <option value="rematricula">Rematrícula</option>
              </select>
            </div>

            {filtrosAtivos && (
              <button
                onClick={limparFiltros}
                className="btn-secondary text-xs flex items-center gap-1 px-3 py-1.5 md:col-span-3 w-fit"
              >
                <X size={12} />
                Limpar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="mis-card flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-amarelo border-t-transparent rounded-full animate-spin" />
            <span className="text-mis-texto2 text-sm">Carregando alunos...</span>
          </div>
        </div>
      ) : alunos.length === 0 ? (
        <div className="mis-card flex flex-col items-center justify-center py-16 text-center">
          <Users size={40} className="text-mis-borda mb-3" />
          <p className="text-mis-texto font-semibold mb-1">Nenhum aluno encontrado</p>
          <p className="text-mis-texto2 text-sm">Tente ajustar os filtros ou a busca.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alunos.map(aluno => {
            const oficinas = extrairOficinasAnoAtual(aluno.matriculas_oficinas)
            const responsavel = aluno.responsaveis?.[0]

            return (
              <div
                key={aluno.id}
                className={`mis-card flex items-center gap-4 transition-all hover:border-mis-texto/20 ${aluno.status === 'inativo' ? 'opacity-50' : ''}`}
              >
                <div className="w-10 h-10 rounded-full bg-amarelo/10 border border-amarelo/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-amarelo font-bold text-sm">
                    {aluno.nome.charAt(0).toUpperCase()}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-mis-texto truncate">{aluno.nome}</p>
                    <span className={`badge ${aluno.status === 'ativo' ? 'badge-verde' : 'badge-red'}`}>
                      {aluno.status}
                    </span>
                    <span className={`badge ${aluno.tipo === 'rematricula' ? 'badge-azul' : 'badge-gray'}`}>
                      {aluno.tipo}
                    </span>
                  </div>

                  <p className="text-xs text-mis-texto2 mt-0.5 font-mono">{aluno.numero_matricula}</p>

                  {oficinas.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {oficinas.slice(0, 3).map(oficina => (
                        <span key={oficina} className="badge badge-amarelo">
                          {oficina}
                        </span>
                      ))}
                      {oficinas.length > 3 && (
                        <span className="badge badge-gray">+{oficinas.length - 3}</span>
                      )}
                    </div>
                  )}

                  {responsavel && (
                    <p className="text-xs text-mis-texto2 mt-1">
                      Resp: {responsavel.nome} · {mascararTelefone(responsavel.telefone)}
                    </p>
                  )}
                </div>

                {isDiretor && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setAlunoToggle(aluno)}
                      title={aluno.status === 'ativo' ? 'Inativar' : 'Reativar'}
                      className={`p-2 rounded-lg border transition-colors
                        ${aluno.status === 'ativo'
                          ? 'text-red-400 border-red-900/40 hover:bg-red-900/20'
                          : 'text-verde-light border-verde/30 hover:bg-verde/10'}`}
                    >
                      {aluno.status === 'ativo' ? <UserX size={16} /> : <UserCheck size={16} />}
                    </button>

                    <button
                      onClick={() => setAlunoEditar(aluno)}
                      className="p-2 rounded-lg border border-mis-borda text-mis-texto2 hover:text-mis-texto hover:border-mis-texto/30 transition-colors"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {alunoEditar && (
        <ModalEdicao
          aluno={alunoEditar}
          onClose={() => setAlunoEditar(null)}
          onSalvo={() => {
            setAlunoEditar(null)
            buscarAlunos()
          }}
          onExcluir={() => {
            const alunoSelecionado = alunoEditar
            setAlunoEditar(null)

            setTimeout(() => {
              setAlunoExcluir(alunoSelecionado)
            }, 50)
          }}
        />
      )}

      {alunoToggle && (
        <ModalConfirmacao
          aluno={alunoToggle}
          onClose={() => setAlunoToggle(null)}
          onConfirmar={() => toggleStatus(alunoToggle)}
        />
      )}

      {alunoExcluir && (
        <ModalExcluir
          aluno={alunoExcluir}
          onClose={() => {
            if (!excluindoId) setAlunoExcluir(null)
          }}
          onConfirmar={() => excluirAluno(alunoExcluir)}
        />
      )}
    </div>
  )
}