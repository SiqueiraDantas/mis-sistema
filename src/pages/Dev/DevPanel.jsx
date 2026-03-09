import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../services/supabase'
import {
  Activity, Users, AlertTriangle, RefreshCw,
  Database, Shield, Key, UserCog, CheckCircle,
  XCircle, Clock, Terminal, ChevronDown, ChevronUp,
  GraduationCap, Music, ClipboardList, Search,
  Mail, AlertCircle, LogIn, BarChart3
} from 'lucide-react'

const ANO_ATUAL = new Date().getFullYear()

function StatusIndicator({ ok, label }) {
  return (
    <div className="flex items-center gap-2">
      {ok ? (
        <CheckCircle size={14} className="text-verde-light" />
      ) : (
        <XCircle size={14} className="text-red-400" />
      )}
      <span className={`text-xs ${ok ? 'text-verde-light' : 'text-red-400'}`}>{label}</span>
    </div>
  )
}

function CardStat({ icon: Icon, label, valor, cor = 'amarelo' }) {
  const cores = {
    amarelo: 'bg-amarelo/10 border-amarelo/20 text-amarelo',
    azul: 'bg-azul/10 border-azul/20 text-azul-light',
    verde: 'bg-verde/10 border-verde/20 text-verde-light',
    red: 'bg-red-900/20 border-red-800/30 text-red-400',
  }

  return (
    <div className="mis-card flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg border flex items-center justify-center ${cores[cor]}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-lg font-bold text-mis-texto">{valor}</p>
        <p className="text-xs text-mis-texto2">{label}</p>
      </div>
    </div>
  )
}

function BarraSimples({ label, valor, max, cor = 'amarelo' }) {
  const pct = max > 0 ? Math.round((valor / max) * 100) : 0
  const cores = {
    amarelo: 'bg-amarelo',
    azul: 'bg-azul',
    verde: 'bg-verde',
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-mis-texto2 w-20 text-right truncate">{label}</span>
      <div className="flex-1 h-5 bg-mis-bg3 rounded-full overflow-hidden border border-mis-borda">
        <div
          className={`h-full rounded-full ${cores[cor]} transition-all duration-500`}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
      <span className="text-xs font-bold text-mis-texto w-8">{valor}</span>
    </div>
  )
}

export default function DevPanel() {
  const [stats, setStats] = useState(null)
  const [usuarios, setUsuarios] = useState([])
  const [logs, setLogs] = useState([])
  const [loginLogs, setLoginLogs] = useState([])
  const [alertas, setAlertas] = useState([])
  const [oficinasStats, setOficinasStats] = useState([])
  const [healthStatus, setHealthStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingHealth, setLoadingHealth] = useState(true)
  const [editandoPerfil, setEditandoPerfil] = useState(null)
  const [novoPerfil, setNovoPerfil] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [enviandoReset, setEnviandoReset] = useState(null)
  const [resetSucesso, setResetSucesso] = useState(null)
  const [buscaUsuario, setBuscaUsuario] = useState('')
  const [secaoAberta, setSecaoAberta] = useState({
    saude: true,
    stats: true,
    graficos: true,
    alertas: true,
    logins: true,
    usuarios: true,
    logs: true,
  })

  function toggleSecao(secao) {
    setSecaoAberta(prev => ({ ...prev, [secao]: !prev[secao] }))
  }

  const carregarDados = useCallback(async () => {
    setLoading(true)
    try {
      const [
        { count: totalAlunos },
        { count: totalAlunosAtivos },
        { count: totalTurmas },
        { count: totalTurmasAtivas },
        { count: totalProfessores },
        { count: totalOficinas },
        { count: totalFrequencias },
        { count: totalMatriculas },
      ] = await Promise.all([
        supabase.from('alunos').select('*', { count: 'exact', head: true }).eq('ano_letivo', ANO_ATUAL),
        supabase.from('alunos').select('*', { count: 'exact', head: true }).eq('ano_letivo', ANO_ATUAL).eq('status', 'ativo'),
        supabase.from('turmas').select('*', { count: 'exact', head: true }).eq('ano_letivo', ANO_ATUAL),
        supabase.from('turmas').select('*', { count: 'exact', head: true }).eq('ano_letivo', ANO_ATUAL).eq('ativa', true),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('perfil', 'professor'),
        supabase.from('oficinas').select('*', { count: 'exact', head: true }),
        supabase.from('frequencias').select('*', { count: 'exact', head: true }),
        supabase.from('matriculas_oficinas').select('*', { count: 'exact', head: true }).eq('ano_letivo', ANO_ATUAL),
      ])

      setStats({
        totalAlunos: totalAlunos || 0,
        totalAlunosAtivos: totalAlunosAtivos || 0,
        totalTurmas: totalTurmas || 0,
        totalTurmasAtivas: totalTurmasAtivas || 0,
        totalProfessores: totalProfessores || 0,
        totalOficinas: totalOficinas || 0,
        totalFrequencias: totalFrequencias || 0,
        totalMatriculas: totalMatriculas || 0,
      })

      const { data: users } = await supabase
        .from('profiles')
        .select('id, nome, email, perfil, instrumento')
        .order('nome')

      setUsuarios(users || [])

      try {
        const { data: logsData } = await supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50)
        setLogs(logsData || [])
      } catch {
        setLogs([])
      }

      try {
        const { data: loginsData } = await supabase
          .from('login_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(30)
        setLoginLogs(loginsData || [])
      } catch {
        setLoginLogs([])
      }

      await carregarAlertas()
      await carregarOficinasStats()

    } catch (e) {
      console.error('Erro ao carregar dados do DevPanel:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  async function carregarAlertas() {
    const alertasTemp = []

    try {
      const { data: todosAlunos } = await supabase
        .from('alunos')
        .select('id, nome, matriculas_oficinas(oficina_id)')
        .eq('ano_letivo', ANO_ATUAL)
        .eq('status', 'ativo')

      const semOficina = (todosAlunos || []).filter(a =>
        !a.matriculas_oficinas || a.matriculas_oficinas.length === 0
      )

      if (semOficina.length > 0) {
        alertasTemp.push({
          tipo: 'warning',
          titulo: `${semOficina.length} aluno(s) sem oficina`,
          detalhe: semOficina.slice(0, 5).map(a => a.nome).join(', ') +
            (semOficina.length > 5 ? ` e mais ${semOficina.length - 5}...` : ''),
        })
      }

      const { data: alunosSemResp } = await supabase
        .from('alunos')
        .select('id, nome, responsaveis(id)')
        .eq('ano_letivo', ANO_ATUAL)
        .eq('status', 'ativo')

      const semResponsavel = (alunosSemResp || []).filter(a =>
        !a.responsaveis || a.responsaveis.length === 0
      )

      if (semResponsavel.length > 0) {
        alertasTemp.push({
          tipo: 'error',
          titulo: `${semResponsavel.length} aluno(s) sem responsável`,
          detalhe: semResponsavel.slice(0, 5).map(a => a.nome).join(', ') +
            (semResponsavel.length > 5 ? ` e mais ${semResponsavel.length - 5}...` : ''),
        })
      }

      const { data: profs } = await supabase
        .from('profiles')
        .select('id, nome')
        .eq('perfil', 'professor')

      const { data: turmasAtivas } = await supabase
        .from('turmas')
        .select('professor_id')
        .eq('ano_letivo', ANO_ATUAL)
        .eq('ativa', true)

      const profsComTurma = new Set((turmasAtivas || []).map(t => t.professor_id))
      const profsSemTurma = (profs || []).filter(p => !profsComTurma.has(p.id))

      if (profsSemTurma.length > 0) {
        alertasTemp.push({
          tipo: 'info',
          titulo: `${profsSemTurma.length} professor(es) sem turma`,
          detalhe: profsSemTurma.map(p => p.nome).join(', '),
        })
      }

      if (alertasTemp.length === 0) {
        alertasTemp.push({
          tipo: 'success',
          titulo: 'Nenhum problema encontrado',
          detalhe: 'Todos os dados estão completos.',
        })
      }
    } catch (e) {
      console.error('Erro ao carregar alertas:', e)
    }

    setAlertas(alertasTemp)
  }

  async function carregarOficinasStats() {
    try {
      const { data } = await supabase
        .from('matriculas_oficinas')
        .select('oficinas(nome)')
        .eq('ano_letivo', ANO_ATUAL)

      if (!data) return

      const contagem = {}
      data.forEach(item => {
        const nome = item?.oficinas?.nome
        if (nome) contagem[nome] = (contagem[nome] || 0) + 1
      })

      const lista = Object.entries(contagem)
        .map(([nome, total]) => ({ nome, total }))
        .sort((a, b) => b.total - a.total)

      setOficinasStats(lista)
    } catch {
      setOficinasStats([])
    }
  }

  const verificarSaude = useCallback(async () => {
    setLoadingHealth(true)
    const resultados = {}

    try {
      const inicio = Date.now()
      const { error } = await supabase.from('profiles').select('id').limit(1)
      const tempo = Date.now() - inicio
      resultados.supabase = { ok: !error, tempo, erro: error?.message }
    } catch (e) {
      resultados.supabase = { ok: false, tempo: 0, erro: e.message }
    }

    try {
      const { data } = await supabase.auth.getSession()
      resultados.auth = { ok: !!data?.session, info: data?.session ? 'Sessão ativa' : 'Sem sessão' }
    } catch (e) {
      resultados.auth = { ok: false, info: e.message }
    }

    try {
      const { error } = await supabase.from('alunos').select('id').limit(1)
      resultados.rls = { ok: !error, info: error ? error.message : 'Acesso OK' }
    } catch (e) {
      resultados.rls = { ok: false, info: e.message }
    }

    const tabelas = ['alunos', 'turmas', 'profiles', 'oficinas', 'frequencias', 'responsaveis', 'matriculas_oficinas', 'audit_logs', 'login_logs']
    resultados.tabelas = {}
    for (const tabela of tabelas) {
      try {
        const { count, error } = await supabase.from(tabela).select('*', { count: 'exact', head: true })
        resultados.tabelas[tabela] = { ok: !error, count: count || 0 }
      } catch {
        resultados.tabelas[tabela] = { ok: false, count: 0 }
      }
    }

    setHealthStatus(resultados)
    setLoadingHealth(false)
  }, [])

  useEffect(() => {
    carregarDados()
    verificarSaude()
  }, [carregarDados, verificarSaude])

  async function alterarPerfil(userId) {
    if (!novoPerfil || salvando) return
    setSalvando(true)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ perfil: novoPerfil })
        .eq('id', userId)

      if (error) throw error

      setUsuarios(prev =>
        prev.map(u => u.id === userId ? { ...u, perfil: novoPerfil } : u)
      )
      setEditandoPerfil(null)
      setNovoPerfil('')
    } catch (e) {
      console.error('Erro ao alterar perfil:', e)
      alert('Erro ao alterar perfil: ' + e.message)
    } finally {
      setSalvando(false)
    }
  }

  async function enviarResetSenha(email) {
    if (!email || enviandoReset) return
    setEnviandoReset(email)
    setResetSucesso(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })
      if (error) throw error
      setResetSucesso(email)
      setTimeout(() => setResetSucesso(null), 5000)
    } catch (e) {
      console.error('Erro ao enviar reset:', e)
      alert('Erro ao enviar email de redefinição: ' + e.message)
    } finally {
      setEnviandoReset(null)
    }
  }

  function getUltimosLogins() {
    const mapa = {}
    loginLogs.forEach(log => {
      if (!mapa[log.email]) {
        mapa[log.email] = log
      }
    })
    return Object.values(mapa).sort((a, b) =>
      new Date(b.created_at) - new Date(a.created_at)
    )
  }

  const usuariosFiltrados = usuarios.filter(u =>
    !buscaUsuario.trim() ||
    u.nome?.toLowerCase().includes(buscaUsuario.toLowerCase()) ||
    u.email?.toLowerCase().includes(buscaUsuario.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amarelo border-t-transparent rounded-full animate-spin" />
          <span className="text-mis-texto2 text-sm">Carregando painel dev...</span>
        </div>
      </div>
    )
  }

  const ultimosLogins = getUltimosLogins()
  const maxOficina = oficinasStats.length > 0 ? oficinasStats[0].total : 1

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Terminal size={20} className="text-amarelo" />
            <h1 className="page-title">Painel Dev</h1>
          </div>
          <p className="text-mis-texto2 text-sm mt-1">
            Monitoramento e gerenciamento do sistema · {ANO_ATUAL}
          </p>
        </div>
        <button
          onClick={() => { carregarDados(); verificarSaude() }}
          className="btn-secondary flex items-center gap-2 px-4 py-2"
        >
          <RefreshCw size={14} />
          Atualizar
        </button>
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <div className="mis-card">
          <button onClick={() => toggleSecao('alertas')} className="w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-amarelo" />
              <h2 className="text-sm font-bold text-mis-texto">Alertas</h2>
              {alertas.some(a => a.tipo !== 'success') && (
                <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
              )}
            </div>
            {secaoAberta.alertas ? <ChevronUp size={16} className="text-mis-texto2" /> : <ChevronDown size={16} className="text-mis-texto2" />}
          </button>

          {secaoAberta.alertas && (
            <div className="mt-4 space-y-2">
              {alertas.map((alerta, i) => {
                const estilos = {
                  error: 'bg-red-900/15 border-red-800/30 text-red-400',
                  warning: 'bg-amarelo/10 border-amarelo/20 text-amarelo',
                  info: 'bg-azul/10 border-azul/20 text-azul-light',
                  success: 'bg-verde/10 border-verde/20 text-verde-light',
                }
                const icones = {
                  error: <XCircle size={14} />,
                  warning: <AlertTriangle size={14} />,
                  info: <AlertCircle size={14} />,
                  success: <CheckCircle size={14} />,
                }
                return (
                  <div key={i} className={`p-3 rounded-lg border ${estilos[alerta.tipo]}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {icones[alerta.tipo]}
                      <span className="text-xs font-bold">{alerta.titulo}</span>
                    </div>
                    <p className="text-xs opacity-80 ml-6">{alerta.detalhe}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Saúde do Sistema */}
      <div className="mis-card">
        <button onClick={() => toggleSecao('saude')} className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-amarelo" />
            <h2 className="text-sm font-bold text-mis-texto">Saúde do Sistema</h2>
          </div>
          {secaoAberta.saude ? <ChevronUp size={16} className="text-mis-texto2" /> : <ChevronDown size={16} className="text-mis-texto2" />}
        </button>

        {secaoAberta.saude && (
          <div className="mt-4 space-y-4">
            {loadingHealth ? (
              <div className="flex items-center gap-2 text-mis-texto2 text-xs">
                <div className="w-4 h-4 border-2 border-amarelo border-t-transparent rounded-full animate-spin" />
                Verificando saúde do sistema...
              </div>
            ) : healthStatus && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className={`p-3 rounded-lg border ${healthStatus.supabase.ok ? 'bg-verde/5 border-verde/20' : 'bg-red-900/10 border-red-800/30'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Database size={14} className={healthStatus.supabase.ok ? 'text-verde-light' : 'text-red-400'} />
                      <span className="text-xs font-semibold text-mis-texto">Supabase</span>
                    </div>
                    <StatusIndicator ok={healthStatus.supabase.ok} label={healthStatus.supabase.ok ? `Conectado (${healthStatus.supabase.tempo}ms)` : healthStatus.supabase.erro} />
                  </div>
                  <div className={`p-3 rounded-lg border ${healthStatus.auth.ok ? 'bg-verde/5 border-verde/20' : 'bg-red-900/10 border-red-800/30'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Shield size={14} className={healthStatus.auth.ok ? 'text-verde-light' : 'text-red-400'} />
                      <span className="text-xs font-semibold text-mis-texto">Autenticação</span>
                    </div>
                    <StatusIndicator ok={healthStatus.auth.ok} label={healthStatus.auth.info} />
                  </div>
                  <div className={`p-3 rounded-lg border ${healthStatus.rls.ok ? 'bg-verde/5 border-verde/20' : 'bg-red-900/10 border-red-800/30'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Key size={14} className={healthStatus.rls.ok ? 'text-verde-light' : 'text-red-400'} />
                      <span className="text-xs font-semibold text-mis-texto">RLS</span>
                    </div>
                    <StatusIndicator ok={healthStatus.rls.ok} label={healthStatus.rls.info} />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-mis-texto2 uppercase tracking-widest mb-2">Tabelas</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {Object.entries(healthStatus.tabelas).map(([tabela, info]) => (
                      <div key={tabela} className="flex items-center justify-between p-2 rounded-lg bg-mis-bg3 border border-mis-borda">
                        <span className="text-xs text-mis-texto font-mono">{tabela}</span>
                        <span className={`text-xs font-bold ${info.ok ? 'text-verde-light' : 'text-red-400'}`}>
                          {info.ok ? info.count : 'ERR'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Estatísticas */}
      <div className="mis-card">
        <button onClick={() => toggleSecao('stats')} className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database size={16} className="text-amarelo" />
            <h2 className="text-sm font-bold text-mis-texto">Estatísticas</h2>
          </div>
          {secaoAberta.stats ? <ChevronUp size={16} className="text-mis-texto2" /> : <ChevronDown size={16} className="text-mis-texto2" />}
        </button>

        {secaoAberta.stats && stats && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <CardStat icon={Users} label="Alunos ativos" valor={stats.totalAlunosAtivos} cor="verde" />
            <CardStat icon={Users} label="Total alunos" valor={stats.totalAlunos} cor="azul" />
            <CardStat icon={GraduationCap} label="Turmas ativas" valor={stats.totalTurmasAtivas} cor="amarelo" />
            <CardStat icon={GraduationCap} label="Total turmas" valor={stats.totalTurmas} cor="azul" />
            <CardStat icon={UserCog} label="Professores" valor={stats.totalProfessores} cor="amarelo" />
            <CardStat icon={Music} label="Oficinas" valor={stats.totalOficinas} cor="verde" />
            <CardStat icon={ClipboardList} label="Frequências" valor={stats.totalFrequencias} cor="azul" />
            <CardStat icon={Music} label="Matrículas oficinas" valor={stats.totalMatriculas} cor="amarelo" />
          </div>
        )}
      </div>

      {/* Gráfico - Alunos por Oficina */}
      {oficinasStats.length > 0 && (
        <div className="mis-card">
          <button onClick={() => toggleSecao('graficos')} className="w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-amarelo" />
              <h2 className="text-sm font-bold text-mis-texto">Alunos por Oficina</h2>
            </div>
            {secaoAberta.graficos ? <ChevronUp size={16} className="text-mis-texto2" /> : <ChevronDown size={16} className="text-mis-texto2" />}
          </button>

          {secaoAberta.graficos && (
            <div className="mt-4 space-y-2">
              {oficinasStats.map((item, i) => (
                <BarraSimples
                  key={item.nome}
                  label={item.nome}
                  valor={item.total}
                  max={maxOficina}
                  cor={i % 3 === 0 ? 'amarelo' : i % 3 === 1 ? 'azul' : 'verde'}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Últimos Logins */}
      <div className="mis-card">
        <button onClick={() => toggleSecao('logins')} className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LogIn size={16} className="text-amarelo" />
            <h2 className="text-sm font-bold text-mis-texto">Últimos Logins</h2>
            <span className="badge badge-gray">{loginLogs.length}</span>
          </div>
          {secaoAberta.logins ? <ChevronUp size={16} className="text-mis-texto2" /> : <ChevronDown size={16} className="text-mis-texto2" />}
        </button>

        {secaoAberta.logins && (
          <div className="mt-4">
            {ultimosLogins.length === 0 ? (
              <div className="text-center py-6">
                <LogIn size={28} className="text-mis-borda mx-auto mb-2" />
                <p className="text-sm text-mis-texto2">Nenhum login registrado ainda</p>
                <p className="text-xs text-mis-texto2 mt-1">Os logins serão registrados a partir de agora</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-mis-texto2 uppercase tracking-widest">Último acesso por usuário</p>
                <div className="space-y-1">
                  {ultimosLogins.map((log, i) => {
                    const agora = new Date()
                    const loginDate = new Date(log.created_at)
                    const diffMs = agora - loginDate
                    const diffMin = Math.floor(diffMs / 60000)
                    const diffHoras = Math.floor(diffMs / 3600000)
                    const diffDias = Math.floor(diffMs / 86400000)

                    let tempo
                    if (diffMin < 1) tempo = 'agora'
                    else if (diffMin < 60) tempo = `${diffMin}min atrás`
                    else if (diffHoras < 24) tempo = `${diffHoras}h atrás`
                    else tempo = `${diffDias}d atrás`

                    const recente = diffHoras < 24

                    return (
                      <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-mis-bg3 border border-mis-borda">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${recente ? 'bg-verde animate-pulse' : 'bg-mis-texto2'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-mis-texto truncate">{log.email}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Clock size={10} className="text-mis-texto2" />
                          <span className="text-xs text-mis-texto2">{tempo}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {loginLogs.length > ultimosLogins.length && (
                  <>
                    <p className="text-xs font-semibold text-mis-texto2 uppercase tracking-widest mt-4">Histórico recente</p>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {loginLogs.map((log, i) => (
                        <div key={i} className="flex items-center justify-between p-1.5 text-xs">
                          <span className="text-mis-texto truncate">{log.email}</span>
                          <span className="text-mis-texto2 font-mono flex-shrink-0 ml-2">
                            {new Date(log.created_at).toLocaleString('pt-BR', {
                              day: '2-digit', month: '2-digit',
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Gerenciamento de Usuários */}
      <div className="mis-card">
        <button onClick={() => toggleSecao('usuarios')} className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCog size={16} className="text-amarelo" />
            <h2 className="text-sm font-bold text-mis-texto">Gerenciamento de Usuários</h2>
            <span className="badge badge-gray">{usuarios.length}</span>
          </div>
          {secaoAberta.usuarios ? <ChevronUp size={16} className="text-mis-texto2" /> : <ChevronDown size={16} className="text-mis-texto2" />}
        </button>

        {secaoAberta.usuarios && (
          <div className="mt-4 space-y-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mis-texto2" />
              <input
                className="mis-input pl-9 text-sm"
                placeholder="Buscar por nome ou email..."
                value={buscaUsuario}
                onChange={e => setBuscaUsuario(e.target.value)}
              />
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {usuariosFiltrados.map(user => (
                <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg bg-mis-bg3 border border-mis-borda">
                  <div className="w-8 h-8 rounded-full bg-amarelo/10 border border-amarelo/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-amarelo font-bold text-xs">
                      {(user.nome || user.email || '?').charAt(0).toUpperCase()}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-mis-texto truncate">
                      {user.nome || 'Sem nome'}
                    </p>
                    <p className="text-xs text-mis-texto2 truncate">{user.email}</p>
                  </div>

                  {editandoPerfil === user.id ? (
                    <div className="flex items-center gap-2">
                      <select
                        className="mis-input text-xs py-1 px-2 w-28"
                        value={novoPerfil}
                        onChange={e => setNovoPerfil(e.target.value)}
                      >
                        <option value="">Selecione</option>
                        <option value="professor">Professor</option>
                        <option value="diretor">Diretor</option>
                        <option value="dev">Dev</option>
                      </select>
                      <button
                        onClick={() => alterarPerfil(user.id)}
                        disabled={!novoPerfil || salvando}
                        className="px-2 py-1 rounded text-xs font-semibold bg-verde/20 border border-verde/40 text-verde-light hover:bg-verde/30 disabled:opacity-50"
                      >
                        {salvando ? '...' : 'OK'}
                      </button>
                      <button
                        onClick={() => { setEditandoPerfil(null); setNovoPerfil('') }}
                        className="px-2 py-1 rounded text-xs font-semibold text-mis-texto2 hover:text-mis-texto"
                      >
                        X
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className={`badge ${
                        user.perfil === 'diretor' ? 'badge-amarelo' :
                        user.perfil === 'dev' ? 'badge-amarelo' :
                        'badge-azul'
                      }`}>
                        {user.perfil}
                      </span>

                      <button
                        onClick={() => enviarResetSenha(user.email)}
                        disabled={enviandoReset === user.email}
                        className={`p-1 rounded transition-colors ${
                          resetSucesso === user.email
                            ? 'text-verde-light'
                            : 'text-mis-texto2 hover:text-mis-texto hover:bg-mis-borda/30'
                        }`}
                        title="Enviar email de redefinição de senha"
                      >
                        {enviandoReset === user.email ? (
                          <div className="w-3.5 h-3.5 border-2 border-mis-texto2/30 border-t-mis-texto2 rounded-full animate-spin" />
                        ) : resetSucesso === user.email ? (
                          <CheckCircle size={14} />
                        ) : (
                          <Mail size={14} />
                        )}
                      </button>

                      <button
                        onClick={() => { setEditandoPerfil(user.id); setNovoPerfil(user.perfil) }}
                        className="p-1 rounded text-mis-texto2 hover:text-mis-texto hover:bg-mis-borda/30 transition-colors"
                        title="Alterar perfil"
                      >
                        <UserCog size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Logs de Atividades */}
      <div className="mis-card">
        <button onClick={() => toggleSecao('logs')} className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amarelo" />
            <h2 className="text-sm font-bold text-mis-texto">Logs de Atividades</h2>
            <span className="badge badge-gray">{logs.length}</span>
          </div>
          {secaoAberta.logs ? <ChevronUp size={16} className="text-mis-texto2" /> : <ChevronDown size={16} className="text-mis-texto2" />}
        </button>

        {secaoAberta.logs && (
          <div className="mt-4">
            {logs.length === 0 ? (
              <div className="text-center py-8">
                <Clock size={32} className="text-mis-borda mx-auto mb-2" />
                <p className="text-sm text-mis-texto2">Nenhum log registrado ainda</p>
                <p className="text-xs text-mis-texto2 mt-1">Os logs aparecerão conforme o sistema for utilizado</p>
              </div>
            ) : (
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {logs.map((log, i) => {
                  const acaoIcon = {
                    INSERT: <span className="text-verde-light text-xs font-bold">+</span>,
                    UPDATE: <span className="text-amarelo text-xs font-bold">~</span>,
                    DELETE: <span className="text-red-400 text-xs font-bold">−</span>,
                  }
                  const acaoLabel = {
                    INSERT: 'Criou',
                    UPDATE: 'Editou',
                    DELETE: 'Removeu',
                  }

                  return (
                    <div key={log.id || i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-mis-bg3 transition-colors">
                      <div className="w-5 h-5 rounded flex items-center justify-center bg-mis-bg3 border border-mis-borda flex-shrink-0 mt-0.5">
                        {acaoIcon[log.acao] || <span className="text-mis-texto2 text-xs">?</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-mis-texto">
                          <span className="font-semibold">{acaoLabel[log.acao] || log.acao}</span>
                          {' '}em{' '}
                          <span className="font-mono text-amarelo">{log.tabela}</span>
                        </p>
                        <p className="text-xs text-mis-texto2 font-mono mt-0.5">
                          {log.created_at ? new Date(log.created_at).toLocaleString('pt-BR') : ''}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}