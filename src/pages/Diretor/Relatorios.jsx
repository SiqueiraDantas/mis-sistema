import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabase'
import {
  BarChart2, Users, TrendingUp, Download, FileText,
  Loader, Calendar, AlertCircle, Eye, X, CheckCircle,
  Award, Activity, BookOpen, ChevronDown, ChevronUp
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Legend
} from 'recharts'

const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2bXVjZHVmaWFhbGNrYWNtbG1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5OTY3NTcsImV4cCI6MjA1NTU3Mjc1N30.jbPPObfQvVWMBVBqTHMzHoFQJCiVoANFEF5nA6tL6BI'
const MESES_NOMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

// ─── MODAL RELATÓRIO SECULT ──────────────────────────────────────────────────
function ModalRelatorio({ onClose }) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [preview, setPreview] = useState(null)

  const [form, setForm] = useState({
    data_inicio: '',
    data_fim: '',
    numero_relatorio: '001',
    tipo_parcial: true,
    numero_instrumento: '',
    nome_responsavel: '',
    cpf_responsavel: '',
    acoes_desenvolvidas: '',
  })

  function setF(k, v) { setForm(p => ({ ...p, [k]: v })) }

  async function buscarPreview() {
    if (!form.data_inicio || !form.data_fim) { setErro('Informe o período'); return }
    if (form.data_inicio > form.data_fim) { setErro('Data início deve ser anterior ao fim'); return }
    setLoading(true); setErro('')
    try {
      const [{ data: freqs }, { data: matriculas }, { data: aulas }] = await Promise.all([
        supabase.from('frequencias').select('status').gte('data_aula', form.data_inicio).lte('data_aula', form.data_fim),
        supabase.from('matriculas_oficinas').select('aluno_id'),
        supabase.from('planos_aula').select('data_aula').gte('data_aula', form.data_inicio).lte('data_aula', form.data_fim),
      ])
      const totalFreqs = (freqs || []).length
      const presencas = (freqs || []).filter(f => f.status === 'presente').length
      const percentual = totalFreqs > 0 ? Math.round((presencas / totalFreqs) * 100) : 0
      const totalAlunos = new Set((matriculas || []).map(m => m.aluno_id)).size
      setPreview({ totalAulas: (aulas || []).length, percentual, totalAlunos, presencas, faltas: totalFreqs - presencas })
      setStep(2)
    } catch (e) { setErro('Erro: ' + e.message) }
    finally { setLoading(false) }
  }

  async function exportar() {
    setLoading(true); setErro('')
    try {
      const resp = await fetch('https://rvmucdufiaalckacmlmi.supabase.co/functions/v1/gerar-relatorio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}`, 'apikey': ANON_KEY },
        body: JSON.stringify(form)
      })
      if (!resp.ok) {
        const text = await resp.text()
        let msg = 'Erro ao gerar'
        try { msg = JSON.parse(text).erro || msg } catch {}
        throw new Error(msg)
      }
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Relatorio_Execucao_${form.data_inicio}_${form.data_fim}.docx`
      a.click()
      URL.revokeObjectURL(url)
      onClose()
    } catch (e) { setErro('Erro: ' + (e?.message || 'Tente novamente')) }
    finally { setLoading(false) }
  }

  const fmtDate = d => d ? d.split('-').reverse().join('/') : ''

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-mis-bg2 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col border border-mis-borda shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-mis-borda">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-verde/15 flex items-center justify-center">
              <FileText size={18} className="text-verde"/>
            </div>
            <div>
              <h2 className="font-bold text-mis-texto text-sm">Relatório de Execução</h2>
              <p className="text-xs text-mis-texto2">Formato SECULT-CE</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${step === 1 ? 'bg-amarelo text-black' : 'bg-verde/20 text-verde'}`}>
                {step > 1 ? <CheckCircle size={12}/> : '1'}
              </span>
              <div className="w-8 h-px bg-mis-borda"/>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${step === 2 ? 'bg-amarelo text-black' : 'bg-mis-borda text-mis-texto2'}`}>2</span>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-mis-borda/50 flex items-center justify-center text-mis-texto2"><X size={16}/></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {step === 1 && (
            <div className="space-y-4">
              {/* Período */}
              <div>
                <p className="text-xs font-semibold text-mis-texto2 uppercase tracking-wide mb-2">Período do Relatório</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mis-label">Data início</label>
                    <input className="mis-input" type="date" value={form.data_inicio} onChange={e => setF('data_inicio', e.target.value)}/>
                  </div>
                  <div>
                    <label className="mis-label">Data fim</label>
                    <input className="mis-input" type="date" value={form.data_fim} onChange={e => setF('data_fim', e.target.value)}/>
                  </div>
                </div>
              </div>

              {/* Identificação */}
              <div>
                <p className="text-xs font-semibold text-mis-texto2 uppercase tracking-wide mb-2">Identificação</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mis-label">Nº do Relatório</label>
                    <input className="mis-input" value={form.numero_relatorio} onChange={e => setF('numero_relatorio', e.target.value)} placeholder="001"/>
                  </div>
                  <div>
                    <label className="mis-label">Tipo</label>
                    <select className="mis-input" value={form.tipo_parcial ? 'parcial' : 'final'} onChange={e => setF('tipo_parcial', e.target.value === 'parcial')}>
                      <option value="parcial">Parcial</option>
                      <option value="final">Final</option>
                    </select>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="mis-label">Nº do Instrumento</label>
                  <input className="mis-input" value={form.numero_instrumento} onChange={e => setF('numero_instrumento', e.target.value)} placeholder="Ex: 001/2025"/>
                </div>
              </div>

              {/* Responsável */}
              <div>
                <p className="text-xs font-semibold text-mis-texto2 uppercase tracking-wide mb-2">Responsável pela Emissão</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mis-label">Nome completo</label>
                    <input className="mis-input" value={form.nome_responsavel} onChange={e => setF('nome_responsavel', e.target.value)} placeholder="Nome do responsável"/>
                  </div>
                  <div>
                    <label className="mis-label">CPF</label>
                    <input className="mis-input" value={form.cpf_responsavel} onChange={e => setF('cpf_responsavel', e.target.value)} placeholder="000.000.000-00"/>
                  </div>
                </div>
              </div>

              {/* Ações (opcional) */}
              <div>
                <label className="mis-label">Ações desenvolvidas <span className="text-mis-texto2">(opcional — preenchido automaticamente)</span></label>
                <textarea className="mis-input min-h-[80px] resize-none" value={form.acoes_desenvolvidas}
                  onChange={e => setF('acoes_desenvolvidas', e.target.value)}
                  placeholder="Deixe em branco para gerar automaticamente com base nos dados do sistema..."/>
              </div>

              {erro && <div className="flex items-center gap-2 text-xs text-red-400 bg-red-900/20 border border-red-900/30 rounded-xl px-3 py-2"><AlertCircle size={13}/> {erro}</div>}
            </div>
          )}

          {step === 2 && preview && (
            <div className="space-y-4">
              <div className="bg-mis-bg3 rounded-xl p-3 border border-mis-borda">
                <p className="text-xs text-mis-texto2 mb-1">Período</p>
                <p className="text-sm font-bold text-mis-texto">{fmtDate(form.data_inicio)} → {fmtDate(form.data_fim)}</p>
                <p className="text-xs text-mis-texto2 mt-0.5">Relatório {form.tipo_parcial ? 'Parcial' : 'Final'} · Nº {form.numero_relatorio}</p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Aulas', valor: preview.totalAulas, cor: 'text-amarelo', bg: 'bg-amarelo/10' },
                  { label: 'Alunos', valor: preview.totalAlunos, cor: 'text-azul', bg: 'bg-azul/10' },
                  { label: 'Frequência', valor: `${preview.percentual}%`, cor: preview.percentual >= 75 ? 'text-verde' : 'text-red-400', bg: preview.percentual >= 75 ? 'bg-verde/10' : 'bg-red-900/20' },
                ].map((s, i) => (
                  <div key={i} className={`${s.bg} rounded-xl p-3 border border-mis-borda text-center`}>
                    <p className={`text-lg font-black ${s.cor}`}>{s.valor}</p>
                    <p className="text-xs text-mis-texto2 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-verde/10 rounded-xl p-2.5 border border-mis-borda text-center">
                  <p className="text-sm font-black text-verde">{preview.presencas}</p>
                  <p className="text-xs text-mis-texto2">Presenças</p>
                </div>
                <div className="bg-red-900/20 rounded-xl p-2.5 border border-mis-borda text-center">
                  <p className="text-sm font-black text-red-400">{preview.faltas}</p>
                  <p className="text-xs text-mis-texto2">Faltas</p>
                </div>
              </div>

              <div className="bg-mis-bg3 rounded-xl p-3 border border-mis-borda space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-mis-texto2">Responsável</span><span className="text-mis-texto font-medium">{form.nome_responsavel || '—'}</span></div>
                <div className="flex justify-between"><span className="text-mis-texto2">CPF</span><span className="text-mis-texto font-medium">{form.cpf_responsavel || '—'}</span></div>
                <div className="flex justify-between"><span className="text-mis-texto2">Nº Instrumento</span><span className="text-mis-texto font-medium">{form.numero_instrumento || '—'}</span></div>
              </div>

              {form.acoes_desenvolvidas && (
                <div className="bg-mis-bg3 rounded-xl p-3 border border-mis-borda">
                  <p className="text-xs font-semibold text-mis-texto2 mb-1 uppercase tracking-wide">Ações (customizadas)</p>
                  <p className="text-xs text-mis-texto leading-relaxed">{form.acoes_desenvolvidas}</p>
                </div>
              )}

              {erro && <div className="flex items-center gap-2 text-xs text-red-400 bg-red-900/20 border border-red-900/30 rounded-xl px-3 py-2"><AlertCircle size={13}/> {erro}</div>}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-mis-borda flex gap-2">
          {step === 1 ? (
            <>
              <button onClick={onClose} className="btn-ghost flex-1 py-2.5 text-sm">Cancelar</button>
              <button onClick={buscarPreview} disabled={loading} className="btn-primary flex-1 py-2.5 text-sm flex items-center justify-center gap-2">
                {loading ? <><Loader size={14} className="animate-spin"/> Carregando...</> : <><Eye size={14}/> Pré-visualizar</>}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => { setStep(1); setPreview(null); setErro('') }} className="btn-ghost flex-1 py-2.5 text-sm">Voltar</button>
              <button onClick={exportar} disabled={loading} className="btn-primary flex-1 py-2.5 text-sm flex items-center justify-center gap-2">
                {loading ? <><Loader size={14} className="animate-spin"/> Gerando...</> : <><Download size={14}/> Baixar .docx</>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── TOOLTIP CUSTOMIZADO ─────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-mis-bg2 border border-mis-borda rounded-xl px-3 py-2 text-xs shadow-lg">
      <p className="text-mis-texto2 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-bold">{p.name}: {p.value}{p.name === 'Frequência' ? '%' : ''}</p>
      ))}
    </div>
  )
}

// ─── PÁGINA RELATÓRIOS ────────────────────────────────────────────────────────
export default function Relatorios() {
  const [loading, setLoading] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [rankingExpandido, setRankingExpandido] = useState(false)

  const [kpis, setKpis] = useState({ totalAlunos: 0, totalAulas: 0, mediaFreq: 0, oficinasAtivas: 0 })
  const [freqPorOficina, setFreqPorOficina] = useState([])
  const [aulasPorMes, setAulasPorMes] = useState([])
  const [rankingAlunos, setRankingAlunos] = useState([])
  const [aulasVsMeta, setAulasVsMeta] = useState([])

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const anoAtual = new Date().getFullYear()
        const inicio = `${anoAtual}-01-01`
        const fim = `${anoAtual}-12-31`

        const [
          { data: freqs },
          { data: matriculas },
          { data: oficinas },
          { data: aulas },
        ] = await Promise.all([
          supabase.from('frequencias').select('aluno_id, status, turma_id, data_aula').gte('data_aula', inicio).lte('data_aula', fim),
          supabase.from('matriculas_oficinas').select('aluno_id, oficina_id, oficinas(nome)'),
          supabase.from('oficinas').select('id, nome').eq('ativo', true),
          supabase.from('planos_aula').select('data_aula, turma_id').gte('data_aula', inicio).lte('data_aula', fim),
        ])

        const totalAlunos = new Set((matriculas || []).map(m => m.aluno_id)).size
        const totalAulas = (aulas || []).length
        const totalFreqs = (freqs || []).length
        const presencas = (freqs || []).filter(f => f.status === 'presente').length
        const mediaFreq = totalFreqs > 0 ? Math.round((presencas / totalFreqs) * 100) : 0

        setKpis({ totalAlunos, totalAulas, mediaFreq, oficinasAtivas: (oficinas || []).length })

        // Frequência % por oficina
        const porOficina = (oficinas || []).map(of => {
          // alunos matriculados nessa oficina
          const alunosOf = new Set((matriculas || []).filter(m => m.oficina_id === of.id).map(m => m.aluno_id))
          const freqsOf = (freqs || []).filter(f => alunosOf.has(f.aluno_id))
          const pOf = freqsOf.filter(f => f.status === 'presente').length
          const pct = freqsOf.length > 0 ? Math.round((pOf / freqsOf.length) * 100) : 0
          return { nome: of.nome.length > 10 ? of.nome.substring(0, 10) + '…' : of.nome, nomeCompleto: of.nome, 'Frequência': pct, alunos: alunosOf.size }
        }).filter(o => o.alunos > 0).sort((a, b) => b['Frequência'] - a['Frequência'])
        setFreqPorOficina(porOficina)

        // Aulas por mês
        const porMes = MESES_NOMES.map((m, i) => {
          const mes = String(i + 1).padStart(2, '0')
          const count = (aulas || []).filter(a => a.data_aula?.startsWith(`${anoAtual}-${mes}`)).length
          return { mes: m, Aulas: count }
        })
        setAulasPorMes(porMes)

        // Ranking alunos por presença
        const porAluno = {}
        for (const f of (freqs || [])) {
          if (!porAluno[f.aluno_id]) {
            const mat = (matriculas || []).find(m => m.aluno_id === f.aluno_id)
            porAluno[f.aluno_id] = { nome: f.aluno_id, presencas: 0, total: 0 }
          }
          porAluno[f.aluno_id].total++
          if (f.status === 'presente') porAluno[f.aluno_id].presencas++
        }

        // Buscar nomes
        const alunoIds = Object.keys(porAluno)
        if (alunoIds.length > 0) {
          const { data: alunosData } = await supabase.from('alunos').select('id, nome').in('id', alunoIds)
          for (const al of (alunosData || [])) {
            if (porAluno[al.id]) porAluno[al.id].nome = al.nome
          }
        }

        const ranking = Object.values(porAluno)
          .map(a => ({ ...a, pct: a.total > 0 ? Math.round((a.presencas / a.total) * 100) : 0 }))
          .sort((a, b) => b.pct - a.pct)
        setRankingAlunos(ranking)

        // Aulas dadas vs meta (8 aulas/mês por oficina como referência)
        const metaMensal = (oficinas || []).length * 4
        const aulasVsMetaData = MESES_NOMES.map((m, i) => {
          const mes = String(i + 1).padStart(2, '0')
          const dadas = (aulas || []).filter(a => a.data_aula?.startsWith(`${anoAtual}-${mes}`)).length
          return { mes: m, Dadas: dadas, Meta: metaMensal }
        })
        setAulasVsMeta(aulasVsMetaData)

      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const CORES = ['#F59E0B', '#3B82F6', '#10B981', '#EF4444', '#8B5CF6', '#EC4899']

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader size={28} className="animate-spin text-amarelo"/>
    </div>
  )

  const rankingVisiveis = rankingExpandido ? rankingAlunos : rankingAlunos.slice(0, 5)

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Relatórios</h1>
          <p className="text-mis-texto2 text-sm mt-1">Visão geral do desempenho da escola · {new Date().getFullYear()}</p>
        </div>
        <button onClick={() => setModalAberto(true)} className="btn-primary flex items-center gap-2 px-4 py-2.5 text-sm">
          <Download size={15}/> Relatório SECULT
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Users,     label: 'Total de Alunos',  valor: kpis.totalAlunos,   cor: 'text-azul',    bg: 'bg-azul/10' },
          { icon: BookOpen,  label: 'Aulas Realizadas', valor: kpis.totalAulas,    cor: 'text-amarelo', bg: 'bg-amarelo/10' },
          { icon: Activity,  label: 'Média Frequência', valor: `${kpis.mediaFreq}%`, cor: kpis.mediaFreq >= 75 ? 'text-verde' : 'text-red-400', bg: kpis.mediaFreq >= 75 ? 'bg-verde/10' : 'bg-red-900/20' },
          { icon: BarChart2, label: 'Oficinas Ativas',  valor: kpis.oficinasAtivas, cor: 'text-marrom', bg: 'bg-marrom/10' },
        ].map((k, i) => (
          <div key={i} className={`mis-card flex flex-col gap-2 border-l-2 ${i===0?'border-azul':i===1?'border-amarelo':i===2?kpis.mediaFreq>=75?'border-verde':'border-red-500':'border-marrom'}`}>
            <div className={`w-8 h-8 rounded-lg ${k.bg} flex items-center justify-center`}>
              <k.icon size={16} className={k.cor}/>
            </div>
            <span className={`text-2xl font-black ${k.cor}`}>{k.valor}</span>
            <span className="text-xs text-mis-texto2">{k.label}</span>
          </div>
        ))}
      </div>

      {/* Gráficos linha 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Frequência por Oficina */}
        <div className="mis-card">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={16} className="text-verde"/>
            <h3 className="text-sm font-bold text-mis-texto">Frequência por Oficina</h3>
          </div>
          {freqPorOficina.length === 0 ? (
            <p className="text-xs text-mis-texto2 text-center py-8">Nenhum dado disponível</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={freqPorOficina} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="nome" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false}/>
                <YAxis domain={[0, 100]} tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Bar dataKey="Frequência" radius={[4, 4, 0, 0]}>
                  {freqPorOficina.map((_, i) => (
                    <Cell key={i} fill={CORES[i % CORES.length]}/>
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Aulas Dadas vs Meta */}
        <div className="mis-card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-amarelo"/>
            <h3 className="text-sm font-bold text-mis-texto">Aulas Dadas vs Meta Mensal</h3>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={aulasVsMeta} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="mes" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Bar dataKey="Meta" fill="#374151" radius={[4, 4, 0, 0]}/>
              <Bar dataKey="Dadas" fill="#F59E0B" radius={[4, 4, 0, 0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Ranking Alunos */}
      <div className="mis-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Award size={16} className="text-amarelo"/>
            <h3 className="text-sm font-bold text-mis-texto">Ranking de Presença dos Alunos</h3>
          </div>
          <span className="text-xs text-mis-texto2">{rankingAlunos.length} alunos</span>
        </div>

        {rankingAlunos.length === 0 ? (
          <p className="text-xs text-mis-texto2 text-center py-8">Nenhum dado de frequência disponível</p>
        ) : (
          <>
            <div className="space-y-2">
              {rankingVisiveis.map((aluno, i) => (
                <div key={i} className="flex items-center gap-3">
                  {/* Posição */}
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                    i === 0 ? 'bg-amarelo text-black' :
                    i === 1 ? 'bg-mis-texto2/30 text-mis-texto' :
                    i === 2 ? 'bg-marrom/30 text-marrom' :
                    'bg-mis-bg3 text-mis-texto2'
                  }`}>{i + 1}</div>

                  {/* Nome */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-mis-texto truncate">{aluno.nome}</p>
                    <p className="text-xs text-mis-texto2">{aluno.presencas}/{aluno.total} aulas</p>
                  </div>

                  {/* Barra */}
                  <div className="w-24 h-1.5 bg-mis-borda rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${aluno.pct >= 75 ? 'bg-verde' : aluno.pct >= 50 ? 'bg-amarelo' : 'bg-red-500'}`}
                      style={{ width: `${aluno.pct}%` }}
                    />
                  </div>

                  {/* % */}
                  <span className={`text-xs font-bold w-10 text-right ${aluno.pct >= 75 ? 'text-verde' : aluno.pct >= 50 ? 'text-amarelo' : 'text-red-400'}`}>
                    {aluno.pct}%
                  </span>
                </div>
              ))}
            </div>

            {rankingAlunos.length > 5 && (
              <button
                onClick={() => setRankingExpandido(!rankingExpandido)}
                className="w-full mt-3 flex items-center justify-center gap-1 text-xs text-mis-texto2 hover:text-amarelo transition-colors py-1"
              >
                {rankingExpandido ? <><ChevronUp size={13}/> Mostrar menos</> : <><ChevronDown size={13}/> Ver todos ({rankingAlunos.length})</>}
              </button>
            )}
          </>
        )}
      </div>

      {modalAberto && <ModalRelatorio onClose={() => setModalAberto(false)}/>}
    </div>
  )
}