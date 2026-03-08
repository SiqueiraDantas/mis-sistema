import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabase'
import {
  GraduationCap, Users, ClipboardList, FileText,
  Edit3, Save, X, Lock, Music, Phone, Mail,
  BookOpen, CheckCircle, Loader, Camera
} from 'lucide-react'

const ANO_ATUAL = new Date().getFullYear()

// ─── TELA DE BLOQUEIO ────────────────────────────────────────────────────────
function BloqueadoCard({ titulo, descricao, icon: Icon }) {
  return (
    <div className="mis-card relative overflow-hidden opacity-60 select-none">
      {/* Overlay de bloqueio */}
      <div className="absolute inset-0 bg-mis-bg2/80 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center gap-2 rounded-2xl">
        <div className="w-10 h-10 rounded-full bg-mis-borda flex items-center justify-center">
          <Lock size={18} className="text-mis-texto2" />
        </div>
        <p className="text-xs font-bold text-mis-texto2">Acesso restrito</p>
        <p className="text-xs text-mis-texto2 opacity-70">Apenas para Diretores</p>
      </div>
      {/* Conteúdo fantasma por baixo */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-mis-borda flex items-center justify-center shrink-0">
          <Icon size={18} className="text-mis-texto2" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-mis-texto mb-1">{titulo}</h3>
          <p className="text-xs text-mis-texto2">{descricao}</p>
        </div>
      </div>
    </div>
  )
}

// ─── CARD MINI BIO ────────────────────────────────────────────────────────────
function MiniBioCard({ perfil }) {
  const [editando, setEditando] = useState(false)
  const [loading, setLoading] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [erro, setErro] = useState('')
  const [form, setForm] = useState({
    mini_curriculo: perfil?.mini_curriculo || '',
    telefone:       perfil?.telefone || '',
    email_contato:  perfil?.email_contato || '',
    instrumento:    perfil?.instrumento || '',
  })

  // Sincroniza quando perfil carrega
  useEffect(() => {
    setForm({
      mini_curriculo: perfil?.mini_curriculo || '',
      telefone:       perfil?.telefone || '',
      email_contato:  perfil?.email_contato || '',
      instrumento:    perfil?.instrumento || '',
    })
  }, [perfil])

  async function salvar() {
    setLoading(true); setErro('')
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          mini_curriculo: form.mini_curriculo,
          telefone:       form.telefone,
          email_contato:  form.email_contato,
          instrumento:    form.instrumento,
        })
        .eq('id', perfil.id)

      if (error) throw error
      setSalvo(true)
      setEditando(false)
      setTimeout(() => setSalvo(false), 3000)
    } catch (e) {
      setErro('Erro ao salvar: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  const iniciais = perfil?.nome
    ? perfil.nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
    : '?'

  return (
    <div className="mis-card">
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amarelo/30 to-amarelo/10 border border-amarelo/30 flex items-center justify-center">
            {perfil?.foto_url ? (
              <img src={perfil.foto_url} alt="foto" className="w-full h-full rounded-2xl object-cover"/>
            ) : (
              <span className="text-lg font-black text-amarelo">{iniciais}</span>
            )}
          </div>
        </div>

        {/* Nome e badge */}
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-mis-texto truncate">{perfil?.nome || '—'}</h2>
          <span className="badge badge-azul mt-1">Professor</span>
          {form.instrumento && !editando && (
            <p className="text-xs text-mis-texto2 mt-1 flex items-center gap-1">
              <Music size={11}/> {form.instrumento}
            </p>
          )}
        </div>

        {/* Botão editar */}
        <button
          onClick={() => { setEditando(!editando); setErro('') }}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0 ${
            editando ? 'bg-red-900/20 text-red-400 hover:bg-red-900/30' : 'bg-mis-borda/50 text-mis-texto2 hover:text-mis-texto hover:bg-mis-borda'
          }`}
        >
          {editando ? <X size={14}/> : <Edit3 size={14}/>}
        </button>
      </div>

      {/* Modo visualização */}
      {!editando && (
        <div className="space-y-3">
          {/* Mini currículo */}
          <div>
            <p className="text-xs font-semibold text-mis-texto2 uppercase tracking-wide mb-1">Mini Currículo</p>
            {form.mini_curriculo ? (
              <p className="text-xs text-mis-texto leading-relaxed">{form.mini_curriculo}</p>
            ) : (
              <button onClick={() => setEditando(true)} className="text-xs text-amarelo hover:underline flex items-center gap-1">
                <Edit3 size={11}/> Adicionar mini currículo
              </button>
            )}
          </div>

          {/* Contatos */}
          {(form.telefone || form.email_contato) && (
            <div className="flex flex-wrap gap-3 pt-2 border-t border-mis-borda">
              {form.telefone && (
                <span className="flex items-center gap-1 text-xs text-mis-texto2">
                  <Phone size={11} className="text-verde"/> {form.telefone}
                </span>
              )}
              {form.email_contato && (
                <span className="flex items-center gap-1 text-xs text-mis-texto2">
                  <Mail size={11} className="text-azul"/> {form.email_contato}
                </span>
              )}
            </div>
          )}

          {salvo && (
            <div className="flex items-center gap-2 text-xs text-verde bg-verde/10 border border-verde/20 rounded-xl px-3 py-2">
              <CheckCircle size={13}/> Perfil atualizado com sucesso!
            </div>
          )}
        </div>
      )}

      {/* Modo edição */}
      {editando && (
        <div className="space-y-3">
          <div>
            <label className="mis-label">Instrumento / Especialidade</label>
            <input className="mis-input" placeholder="Ex: Violão, Piano, Percussão..."
              value={form.instrumento}
              onChange={e => setForm(f => ({ ...f, instrumento: e.target.value }))}
            />
          </div>
          <div>
            <label className="mis-label">Mini Currículo</label>
            <textarea className="mis-input resize-none" rows={4}
              placeholder="Formação, experiência, projetos anteriores..."
              value={form.mini_curriculo}
              onChange={e => setForm(f => ({ ...f, mini_curriculo: e.target.value }))}
            />
            <p className="text-xs text-mis-texto2 mt-1">{form.mini_curriculo.length}/500 caracteres</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mis-label">Telefone</label>
              <input className="mis-input" placeholder="(88) 99999-9999"
                value={form.telefone}
                onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
              />
            </div>
            <div>
              <label className="mis-label">E-mail de contato</label>
              <input className="mis-input" type="email" placeholder="seu@email.com"
                value={form.email_contato}
                onChange={e => setForm(f => ({ ...f, email_contato: e.target.value }))}
              />
            </div>
          </div>

          {erro && (
            <p className="text-xs text-red-400 bg-red-900/20 border border-red-900/30 rounded-xl px-3 py-2">{erro}</p>
          )}

          <button onClick={salvar} disabled={loading}
            className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2">
            {loading ? <><Loader size={14} className="animate-spin"/> Salvando...</> : <><Save size={14}/> Salvar Perfil</>}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── PROFESSOR DASHBOARD ──────────────────────────────────────────────────────
export default function ProfessorDashboard() {
  const { perfil, isDiretor } = useAuth()
  const [stats, setStats] = useState({ turmas: 0, alunos: 0, frequencias: 0, aulas: 0 })
  const [loading, setLoading] = useState(true)
  const [proximasAulas, setProximasAulas] = useState([])

  useEffect(() => {
    if (!perfil?.id) return
    async function loadData() {
      const hoje = new Date().toISOString().split('T')[0]

      const [
        { data: turmasData },
        { data: planosData },
      ] = await Promise.all([
        supabase.from('turmas')
          .select('id, nome, oficinas(nome), horario_inicio, horario_fim')
          .eq('professor_id', perfil.id)
          .eq('ano_letivo', ANO_ATUAL)
          .eq('ativa', true),
        supabase.from('planos_aula')
          .select('id, data_aula, conteudo, turma_id')
          .eq('professor_id', perfil.id)
          .gte('data_aula', hoje)
          .order('data_aula')
          .limit(3),
      ])

      const turmaIds = (turmasData || []).map(t => t.id)

      let totalAlunos = 0
      let totalFreqs = 0

      if (turmaIds.length > 0) {
        const [{ count: alunos }, { count: freqs }] = await Promise.all([
          supabase.from('matriculas_oficinas')
            .select('*', { count: 'exact', head: true })
            .in('oficina_id', turmaIds),
          supabase.from('frequencias')
            .select('*', { count: 'exact', head: true })
            .in('turma_id', turmaIds)
            .eq('status', 'presente'),
        ])
        totalAlunos = alunos || 0
        totalFreqs = freqs || 0
      }

      setStats({
        turmas: (turmasData || []).length,
        alunos: totalAlunos,
        frequencias: totalFreqs,
        aulas: (planosData || []).length,
      })
      setProximasAulas(planosData || [])
      setLoading(false)
    }
    loadData()
  }, [perfil?.id])

  const fmtDate = (d) => {
    const [y, m, dd] = d.split('-')
    return `${dd}/${m}`
  }
  const diaSemana = (d) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' })

  return (
    <div className="animate-fade-in space-y-5">
      {/* Saudação */}
      <div>
        <h1 className="page-title">Olá, {perfil?.nome?.split(' ')[0] || 'Professor'} 👋</h1>
        <p className="text-mis-texto2 text-sm mt-1 capitalize">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Layout principal: bio + cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Mini Bio — ocupa 1 coluna */}
        <MiniBioCard perfil={perfil} />

        {/* Cards de stats — ocupa 2 colunas */}
        <div className="md:col-span-2 space-y-4">

          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: GraduationCap, label: 'Minhas Turmas',   valor: loading ? '…' : stats.turmas,      cor: 'text-azul',    bg: 'bg-azul/10' },
              { icon: Users,         label: 'Alunos',          valor: loading ? '…' : stats.alunos,      cor: 'text-verde',   bg: 'bg-verde/10' },
              { icon: ClipboardList, label: 'Presenças (ano)', valor: loading ? '…' : stats.frequencias, cor: 'text-amarelo', bg: 'bg-amarelo/10' },
              { icon: BookOpen,      label: 'Próx. aulas reg.', valor: loading ? '…' : stats.aulas,      cor: 'text-marrom',  bg: 'bg-marrom/10' },
            ].map((c, i) => (
              <div key={i} className="mis-card flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}>
                  <c.icon size={18} className={c.cor}/>
                </div>
                <div>
                  <p className="text-xl font-black text-mis-texto">{c.valor}</p>
                  <p className="text-xs text-mis-texto2 leading-tight">{c.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Próximas aulas */}
          <div className="mis-card">
            <p className="text-xs font-bold text-mis-texto uppercase tracking-wide mb-3">Próximas Aulas Registradas</p>
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader size={16} className="animate-spin text-amarelo"/>
              </div>
            ) : proximasAulas.length === 0 ? (
              <p className="text-xs text-mis-texto2 text-center py-3">Nenhuma aula futura registrada ainda.</p>
            ) : (
              <div className="space-y-2">
                {proximasAulas.map((aula) => (
                  <div key={aula.id} className="flex items-center gap-3 bg-mis-bg3 rounded-xl px-3 py-2 border border-mis-borda">
                    <div className="text-center shrink-0 w-10">
                      <p className="text-xs font-black text-amarelo">{fmtDate(aula.data_aula)}</p>
                      <p className="text-xs text-mis-texto2 capitalize">{diaSemana(aula.data_aula)}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-mis-texto truncate">{aula.conteudo || 'Sem conteúdo registrado'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Funcionalidades bloqueadas para professor */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Lock size={13} className="text-mis-texto2"/>
          <p className="text-xs font-bold text-mis-texto2 uppercase tracking-wide">Funcionalidades exclusivas do Diretor</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <BloqueadoCard
            icon={FileText}
            titulo="Relatório de Execução SECULT"
            descricao="Gera o relatório oficial de prestação de contas para a SECULT-CE."
          />
          <BloqueadoCard
            icon={Users}
            titulo="Perfil dos Alunos"
            descricao="Análise sociodemográfica completa dos alunos matriculados."
          />
          <BloqueadoCard
            icon={ClipboardList}
            titulo="Alertas de Frequência"
            descricao="Ranking de faltas e frequência geral por oficina."
          />
        </div>
      </div>
    </div>
  )
}