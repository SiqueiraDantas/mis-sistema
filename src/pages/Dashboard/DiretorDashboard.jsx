import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabase'
import SecaoProfessores from './SecaoProfessores'
import {
  BarChart2, Users, GraduationCap, TrendingUp, Download,
  FileText, Loader, Calendar, ChevronRight, BookOpen,
  CheckCircle, AlertCircle, Eye, X, Clock, Hash
} from 'lucide-react'

const ANO_ATUAL = new Date().getFullYear()
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2bXVjZHVmaWFhbGNrYWNtbG1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5OTY3NTcsImV4cCI6MjA1NTU3Mjc1N30.jbPPObfQvVWMBVBqTHMzHoFQJCiVoANFEF5nA6tL6BI'
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

// ─── MODAL PLANO DE CURSO ─────────────────────────────────────────────────────
function ModalExportacao({ turmas, onClose }) {
  const [step, setStep] = useState(1)
  const [turmaSelecionada, setTurmaSelecionada] = useState(turmas[0]?.id || '')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [erro, setErro] = useState('')
  const [preview, setPreview] = useState(null)

  const turma = turmas.find(t => t.id === turmaSelecionada)

  async function buscarPreview() {
    if (!turmaSelecionada || !dataInicio || !dataFim) { setErro('Preencha todos os campos'); return }
    if (dataInicio > dataFim) { setErro('Data de inicio deve ser anterior ao fim'); return }
    setLoadingPreview(true); setErro('')
    try {
      const [{ data: planos }, { data: professor }] = await Promise.all([
        supabase.from('planos_aula').select('*').eq('turma_id', turmaSelecionada)
          .gte('data_aula', dataInicio).lte('data_aula', dataFim).order('data_aula'),
        supabase.from('profiles').select('*').eq('id', turma?.professor_id).single()
      ])
      if (!planos || planos.length === 0) { setErro('Nenhuma aula registrada neste periodo'); return }
      setPreview({ planos, professor, turma })
      setStep(2)
    } catch (e) { setErro('Erro ao buscar dados: ' + e.message) }
    finally { setLoadingPreview(false) }
  }

  async function exportar() {
    setLoading(true); setErro('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || ANON_KEY
      const resp = await fetch('https://rvmucdufiaalckacmlmi.supabase.co/functions/v1/gerar-plano-curso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'apikey': ANON_KEY },
        body: JSON.stringify({ turma_id: turmaSelecionada, professor_id: turma?.professor_id, data_inicio: dataInicio, data_fim: dataFim })
      })
      const result = await resp.json()
      if (result.erro) throw new Error(result.erro)
      const JSZip = (await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm')).default
      const zip = new JSZip()
      zip.file('[Content_Types].xml', result.contentTypes)
      zip.file('_rels/.rels', result.relsMain)
      zip.file('word/_rels/document.xml.rels', result.wordRels)
      zip.file('word/document.xml', result.docXml)
      const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
      const nomeCurso = turma?.oficinas?.nome || turma?.nome || 'curso'
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `Plano_Curso_${nomeCurso.replace(/\s+/g, '_')}_${dataInicio}_${dataFim}.docx`; a.click()
      URL.revokeObjectURL(url); onClose()
    } catch (e) { setErro('Erro ao gerar: ' + (e?.message || 'Tente novamente')) }
    finally { setLoading(false) }
  }

  const fmtDate = (d) => { const [y,m,dd] = d.split('-'); return `${dd}/${m}/${y}` }
  const totalAulas = preview?.planos?.length || 0
  const cargaHoraria = (totalAulas * 1.5).toFixed(1)
  const comConteudo = preview?.planos?.filter(p => p.conteudo).length || 0
  const comPlanoMensal = preview?.planos?.filter(p => p.plano_mensal).length || 0

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-mis-bg2 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-mis-borda shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-mis-borda">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amarelo/15 flex items-center justify-center"><FileText size={18} className="text-amarelo"/></div>
            <div><h2 className="font-bold text-mis-texto text-sm">Exportar Plano de Curso</h2><p className="text-xs text-mis-texto2">Formato SECULT-CE</p></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${step === 1 ? 'bg-amarelo text-black' : 'bg-verde/20 text-verde'}`}>{step > 1 ? <CheckCircle size={12}/> : '1'}</span>
              <div className="w-8 h-px bg-mis-borda"/>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${step === 2 ? 'bg-amarelo text-black' : 'bg-mis-borda text-mis-texto2'}`}>2</span>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-mis-borda/50 flex items-center justify-center text-mis-texto2"><X size={16}/></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-xs text-mis-texto2">Selecione a turma e o periodo para gerar o documento.</p>
              <div>
                <label className="mis-label">Turma / Oficina</label>
                <select className="mis-input" value={turmaSelecionada} onChange={e => setTurmaSelecionada(e.target.value)}>
                  {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
                {turma && (
                  <div className="mt-2 flex items-center gap-3 text-xs text-mis-texto2">
                    <span className="flex items-center gap-1"><Clock size={11}/> {turma.horario_inicio?.slice(0,5)} - {turma.horario_fim?.slice(0,5)}</span>
                    <span className="flex items-center gap-1"><Users size={11}/> {turma.vagas} vagas</span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="mis-label">Data inicio</label><input className="mis-input" type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}/></div>
                <div><label className="mis-label">Data fim</label><input className="mis-input" type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}/></div>
              </div>
              {erro && <div className="flex items-center gap-2 text-xs text-red-400 bg-red-900/20 border border-red-900/30 rounded-xl px-3 py-2"><AlertCircle size={13}/> {erro}</div>}
            </div>
          )}
          {step === 2 && preview && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-mis-bg3 rounded-xl p-3 border border-mis-borda">
                  <p className="text-xs text-mis-texto2 mb-1">Turma</p>
                  <p className="text-sm font-bold text-mis-texto">{preview.turma?.nome}</p>
                  <p className="text-xs text-mis-texto2">{preview.turma?.oficinas?.nome}</p>
                </div>
                <div className="bg-mis-bg3 rounded-xl p-3 border border-mis-borda">
                  <p className="text-xs text-mis-texto2 mb-1">Professor</p>
                  <p className="text-sm font-bold text-mis-texto">{preview.professor?.nome || '—'}</p>
                  <p className="text-xs text-mis-texto2">{preview.professor?.email_contato || '—'}</p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Aulas', valor: totalAulas, cor: 'text-amarelo', bg: 'bg-amarelo/10' },
                  { label: 'Carga', valor: cargaHoraria + 'h', cor: 'text-azul', bg: 'bg-azul/10' },
                  { label: 'Com conteudo', valor: comConteudo + '/' + totalAulas, cor: 'text-verde', bg: 'bg-verde/10' },
                  { label: 'Plano mensal', valor: comPlanoMensal > 0 ? 'Sim' : 'Nao', cor: comPlanoMensal > 0 ? 'text-verde' : 'text-red-400', bg: comPlanoMensal > 0 ? 'bg-verde/10' : 'bg-red-900/20' },
                ].map((s, i) => (
                  <div key={i} className={`${s.bg} rounded-xl p-2.5 border border-mis-borda text-center`}>
                    <p className={`text-sm font-black ${s.cor}`}>{s.valor}</p>
                    <p className="text-xs text-mis-texto2 mt-0.5 leading-tight">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 text-xs text-mis-texto2 bg-mis-bg3 rounded-xl p-3 border border-mis-borda">
                <Calendar size={13} className="text-amarelo"/>
                <span>Periodo: <strong className="text-mis-texto">{fmtDate(dataInicio)}</strong> ate <strong className="text-mis-texto">{fmtDate(dataFim)}</strong></span>
              </div>
              <div>
                <p className="text-xs font-semibold text-mis-texto2 mb-2 uppercase tracking-wide">Aulas incluidas</p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {preview.planos.map((pl) => (
                    <div key={pl.id} className="flex items-center gap-3 bg-mis-bg3 rounded-lg px-3 py-2 border border-mis-borda">
                      <span className="text-xs font-mono text-amarelo w-20 shrink-0">{fmtDate(pl.data_aula)}</span>
                      <span className="text-xs text-mis-texto truncate flex-1">{pl.conteudo || <em className="text-mis-texto2">sem conteudo</em>}</span>
                      <div className="flex gap-1 shrink-0">
                        {pl.metodologia && <span className="w-1.5 h-1.5 rounded-full bg-azul"/>}
                        {pl.materiais && <span className="w-1.5 h-1.5 rounded-full bg-verde"/>}
                        {pl.plano_mensal && <span className="w-1.5 h-1.5 rounded-full bg-amarelo"/>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {!preview.professor?.mini_curriculo && (
                <div className="flex items-start gap-2 text-xs text-yellow-400 bg-yellow-900/20 border border-yellow-900/30 rounded-xl px-3 py-2">
                  <AlertCircle size={13} className="mt-0.5 shrink-0"/>
                  <span>O professor nao possui mini curriculo cadastrado. O campo ficara vazio no documento.</span>
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
              <button onClick={buscarPreview} disabled={loadingPreview} className="btn-primary flex-1 py-2.5 text-sm flex items-center justify-center gap-2">
                {loadingPreview ? <><Loader size={14} className="animate-spin"/> Buscando...</> : <><Eye size={14}/> Pre-visualizar</>}
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

// ─── MODAL FREQUENCIA ────────────────────────────────────────────────────────
function ModalFrequencia({ onClose }) {
  const [oficinas, setOficinas] = useState([])
  const [oficinaSelecionada, setOficinaSelecionada] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingOficinas, setLoadingOficinas] = useState(true)
  const [erro, setErro] = useState('')
  const [preview, setPreview] = useState(null) // { totalAulas, presencas, faltas }
  const [step, setStep] = useState(1)

  useEffect(() => {
    supabase.from('oficinas').select('id, nome').eq('ativo', true).order('nome')
      .then(({ data }) => {
        setOficinas(data || [])
        if (data?.length > 0) setOficinaSelecionada(data[0].id)
        setLoadingOficinas(false)
      })
  }, [])

  async function buscarPreview() {
    if (!oficinaSelecionada || !dataInicio || !dataFim) { setErro('Preencha todos os campos'); return }
    if (dataInicio > dataFim) { setErro('Data de início deve ser anterior ao fim'); return }
    setLoading(true); setErro('')
    try {
      const [{ data: freqs }, { data: matriculas }] = await Promise.all([
        supabase.from('frequencias').select('*').eq('turma_id', oficinaSelecionada)
          .gte('data_aula', dataInicio).lte('data_aula', dataFim),
        supabase.from('matriculas_oficinas').select('aluno_id, alunos(nome)')
          .eq('oficina_id', oficinaSelecionada)
      ])

      const diasComAula = [...new Set((freqs || []).map(f => f.data_aula))].sort()
      if (diasComAula.length === 0) { setErro('Nenhuma aula registrada neste período'); setLoading(false); return }

      const alunos = (matriculas || []).map(m => m.alunos).filter(Boolean)
      const presencas = (freqs || []).filter(f => f.status === 'presente').length
      const faltas = (freqs || []).filter(f => f.status === 'ausente').length

      setPreview({ diasComAula, alunos, presencas, faltas })
      setStep(2)
    } catch (e) { setErro('Erro: ' + e.message) }
    finally { setLoading(false) }
  }

  async function exportar() {
    setLoading(true); setErro('')
    try {
      const resp = await fetch('https://rvmucdufiaalckacmlmi.supabase.co/functions/v1/gerar-frequencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}`, 'apikey': ANON_KEY },
        body: JSON.stringify({ oficina_id: oficinaSelecionada, data_inicio: dataInicio, data_fim: dataFim })
      })

      if (!resp.ok) {
        const text = await resp.text()
        let msg = 'Erro ao gerar'
        try { msg = JSON.parse(text).erro || msg } catch {}
        throw new Error(msg)
      }

      const blob = await resp.blob()
      const nomeOficina = oficinas.find(o => o.id === oficinaSelecionada)?.nome || 'oficina'
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Frequencia_${nomeOficina.replace(/\s+/g, '_')}_${dataInicio}_${dataFim}.docx`
      a.click()
      URL.revokeObjectURL(url)
      onClose()
    } catch (e) { setErro('Erro ao gerar: ' + (e?.message || 'Tente novamente')) }
    finally { setLoading(false) }
  }

  const nomeOficina = oficinas.find(o => o.id === oficinaSelecionada)?.nome || ''

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-mis-bg2 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col border border-mis-borda shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-mis-borda">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-azul/15 flex items-center justify-center"><Calendar size={18} className="text-azul"/></div>
            <div><h2 className="font-bold text-mis-texto text-sm">Exportar Frequência</h2><p className="text-xs text-mis-texto2">Formato SECULT-CE</p></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${step === 1 ? 'bg-amarelo text-black' : 'bg-verde/20 text-verde'}`}>{step > 1 ? <CheckCircle size={12}/> : '1'}</span>
              <div className="w-8 h-px bg-mis-borda"/>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${step === 2 ? 'bg-amarelo text-black' : 'bg-mis-borda text-mis-texto2'}`}>2</span>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-mis-borda/50 flex items-center justify-center text-mis-texto2"><X size={16}/></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-xs text-mis-texto2">Selecione a oficina e o período para gerar a folha de frequência.</p>
              <div>
                <label className="mis-label">Oficina</label>
                {loadingOficinas ? (
                  <div className="mis-input flex items-center gap-2 text-mis-texto2"><Loader size={13} className="animate-spin"/> Carregando...</div>
                ) : (
                  <select className="mis-input" value={oficinaSelecionada} onChange={e => setOficinaSelecionada(e.target.value)}>
                    {oficinas.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
                  </select>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mis-label">Data início</label>
                  <input className="mis-input" type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}/>
                </div>
                <div>
                  <label className="mis-label">Data fim</label>
                  <input className="mis-input" type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}/>
                </div>
              </div>
              {erro && <div className="flex items-center gap-2 text-xs text-red-400 bg-red-900/20 border border-red-900/30 rounded-xl px-3 py-2"><AlertCircle size={13}/> {erro}</div>}
            </div>
          )}

          {step === 2 && preview && (
            <div className="space-y-4">
              <div className="bg-mis-bg3 rounded-xl p-3 border border-mis-borda">
                <p className="text-xs text-mis-texto2 mb-1">Oficina</p>
                <p className="text-sm font-bold text-mis-texto">{nomeOficina}</p>
                <p className="text-xs text-mis-texto2">{dataInicio.split('-').reverse().join('/')} até {dataFim.split('-').reverse().join('/')}</p>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Aulas', valor: preview.diasComAula.length, cor: 'text-amarelo', bg: 'bg-amarelo/10' },
                  { label: 'Alunos', valor: preview.alunos.length, cor: 'text-azul', bg: 'bg-azul/10' },
                  { label: 'Presenças', valor: preview.presencas, cor: 'text-verde', bg: 'bg-verde/10' },
                  { label: 'Faltas', valor: preview.faltas, cor: 'text-red-400', bg: 'bg-red-900/20' },
                ].map((s, i) => (
                  <div key={i} className={`${s.bg} rounded-xl p-2.5 border border-mis-borda text-center`}>
                    <p className={`text-sm font-black ${s.cor}`}>{s.valor}</p>
                    <p className="text-xs text-mis-texto2 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-xs font-semibold text-mis-texto2 mb-2 uppercase tracking-wide">Dias com aula</p>
                <div className="flex flex-wrap gap-1.5">
                  {preview.diasComAula.map(d => (
                    <span key={d} className="bg-verde/20 text-verde border border-verde/30 rounded-lg px-2 py-0.5 text-xs font-bold">
                      {d.split('-')[2]}/{d.split('-')[1]}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-mis-texto2 mb-2 uppercase tracking-wide">Alunos ({preview.alunos.length})</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {preview.alunos.map((a, i) => (
                    <div key={i} className="text-xs text-mis-texto bg-mis-bg3 rounded-lg px-3 py-1.5 border border-mis-borda">
                      {i + 1}. {a.nome}
                    </div>
                  ))}
                </div>
              </div>

              {erro && <div className="flex items-center gap-2 text-xs text-red-400 bg-red-900/20 border border-red-900/30 rounded-xl px-3 py-2"><AlertCircle size={13}/> {erro}</div>}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-mis-borda flex gap-2">
          {step === 1 ? (
            <>
              <button onClick={onClose} className="btn-ghost flex-1 py-2.5 text-sm">Cancelar</button>
              <button onClick={buscarPreview} disabled={loading} className="btn-primary flex-1 py-2.5 text-sm flex items-center justify-center gap-2">
                {loading ? <><Loader size={14} className="animate-spin"/> Buscando...</> : <><Eye size={14}/> Pre-visualizar</>}
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

// ─── CARD EXPORTACAO ─────────────────────────────────────────────────────────
function CardExportacao({ icon: Icon, titulo, descricao, badge, cor, onClick }) {
  return (
    <button onClick={onClick} className="mis-card text-left w-full hover:border-amarelo/40 transition-all group relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-gradient-to-br from-amarelo/5 to-transparent -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-500"/>
      <div className="flex items-start gap-3 relative">
        <div className={`w-10 h-10 rounded-xl ${cor} flex items-center justify-center shrink-0`}><Icon size={18}/></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-bold text-mis-texto">{titulo}</h3>
            {badge && <span className="badge badge-amarelo text-xs">{badge}</span>}
          </div>
          <p className="text-xs text-mis-texto2 leading-relaxed">{descricao}</p>
        </div>
        <ChevronRight size={14} className="text-mis-texto2 group-hover:text-amarelo group-hover:translate-x-0.5 transition-all mt-1 shrink-0"/>
      </div>
    </button>
  )
}

// ─── DASHBOARD DIRETOR ────────────────────────────────────────────────────────
export default function DiretorDashboard() {
  const { perfil } = useAuth()
  const [stats, setStats] = useState({ alunos: 0, turmas: 0, oficinas: 0 })
  const [turmas, setTurmas] = useState([])
  const [modalAberto, setModalAberto] = useState(false)
  const [modalFrequenciaAberto, setModalFrequenciaAberto] = useState(false)

  // Novos estados
  const [freqGeral, setFreqGeral] = useState({ pct: 0, presencas: 0, faltas: 0, total: 0 })
  const [alertaFaltas, setAlertaFaltas] = useState([])
  const [resumoOficinas, setResumoOficinas] = useState([])
  const [loadingKpis, setLoadingKpis] = useState(true)
  const [perfisAlunos, setPerfisAlunos] = useState({
    sexo: [], raca: [], redeEnsino: [], programaSocial: [],
    integrantes: { media: 0, total: 0 }, tipo: [], bairros: []
  })

  useEffect(() => {
    async function loadData() {
      const hoje = new Date()
      const mesInicio = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}-01`
      const mesFim = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}-${new Date(hoje.getFullYear(),hoje.getMonth()+1,0).getDate()}`

      const [
        { count: alunos },
        { count: turmasCount },
        { count: oficinas },
        { data: turmasData },
        { data: freqs },
        { data: matriculas },
        { data: oficinasData },
      ] = await Promise.all([
        supabase.from('alunos').select('*', { count: 'exact', head: true }).eq('status', 'ativo'),
        supabase.from('turmas').select('*', { count: 'exact', head: true }).eq('ano_letivo', ANO_ATUAL).eq('ativa', true),
        supabase.from('oficinas').select('*', { count: 'exact', head: true }),
        supabase.from('turmas').select('id, nome, professor_id, oficinas(nome), horario_inicio, horario_fim, vagas').eq('ano_letivo', ANO_ATUAL).order('nome'),
        supabase.from('frequencias').select('aluno_id, status, turma_id').gte('data_aula', mesInicio).lte('data_aula', mesFim),
        supabase.from('matriculas_oficinas').select('aluno_id, oficina_id'),
        supabase.from('oficinas').select('id, nome').eq('ativo', true).order('nome'),
      ])

      setStats({ alunos: alunos || 0, turmas: turmasCount || 0, oficinas: oficinas || 0 })
      setTurmas(turmasData || [])

      // ── Frequência geral do mês ──────────────────────────────────────────
      const totalFreqs = (freqs || []).length
      const presencas  = (freqs || []).filter(f => f.status === 'presente').length
      const faltas     = (freqs || []).filter(f => f.status === 'ausente').length
      const pct        = totalFreqs > 0 ? Math.round((presencas / totalFreqs) * 100) : 0
      setFreqGeral({ pct, presencas, faltas, total: totalFreqs })

      // ── Alunos com mais faltas no mês ────────────────────────────────────
      const porAluno = {}
      for (const f of (freqs || [])) {
        if (!porAluno[f.aluno_id]) porAluno[f.aluno_id] = { presencas: 0, faltas: 0 }
        if (f.status === 'presente') porAluno[f.aluno_id].presencas++
        if (f.status === 'ausente')  porAluno[f.aluno_id].faltas++
      }
      const idsComFaltas = Object.entries(porAluno)
        .filter(([_, v]) => v.faltas > 0)
        .sort((a, b) => b[1].faltas - a[1].faltas)
        .slice(0, 5)
        .map(([id]) => id)

      if (idsComFaltas.length > 0) {
        const { data: alunosData } = await supabase.from('alunos').select('id, nome').in('id', idsComFaltas)
        const alerta = idsComFaltas.map(id => {
          const al = (alunosData || []).find(a => a.id === id)
          const total = (porAluno[id].presencas + porAluno[id].faltas)
          const pctAluno = total > 0 ? Math.round((porAluno[id].presencas / total) * 100) : 0
          return { id, nome: al?.nome || '—', faltas: porAluno[id].faltas, presencas: porAluno[id].presencas, pct: pctAluno }
        })
        setAlertaFaltas(alerta)
      }

      // ── Resumo por oficina ───────────────────────────────────────────────
      const resumo = (oficinasData || []).map(of => {
        const alunosOf = new Set((matriculas || []).filter(m => m.oficina_id === of.id).map(m => m.aluno_id))
        const freqsOf  = (freqs || []).filter(f => alunosOf.has(f.aluno_id))
        const pOf      = freqsOf.filter(f => f.status === 'presente').length
        const pctOf    = freqsOf.length > 0 ? Math.round((pOf / freqsOf.length) * 100) : null
        return { nome: of.nome, alunos: alunosOf.size, pct: pctOf, aulas: freqsOf.length > 0 ? [...new Set(freqsOf.map(f => f.data_aula))].length : 0 }
      }).filter(o => o.alunos > 0)
      setResumoOficinas(resumo)

      // ── Perfil sociodemográfico dos alunos ──────────────────────────────
      const { data: ap } = await supabase
        .from('alunos')
        .select('sexo, raca, rede_ensino, programa_social, integrantes_familia, tipo, escola_origem')
        .eq('status', 'ativo')

      if (ap && ap.length > 0) {
        const contagem = (campo) => {
          const map = {}
          ap.forEach(a => {
            const val = a[campo] || 'Não informado'
            map[val] = (map[val] || 0) + 1
          })
          return Object.entries(map)
            .map(([nome, qtd]) => ({ nome, qtd, pct: Math.round((qtd / ap.length) * 100) }))
            .sort((a, b) => b.qtd - a.qtd)
        }

        // programa_social é ARRAY
        const progMap = {}
        ap.forEach(a => {
          const progs = a.programa_social || []
          if (progs.length === 0) { progMap['Nenhum'] = (progMap['Nenhum'] || 0) + 1 }
          else progs.forEach(p => { progMap[p] = (progMap[p] || 0) + 1 })
        })
        const programaSocial = Object.entries(progMap)
          .map(([nome, qtd]) => ({ nome, qtd, pct: Math.round((qtd / ap.length) * 100) }))
          .sort((a, b) => b.qtd - a.qtd)

        const mediaFamilia = ap.filter(a => a.integrantes_familia > 0)
        const media = mediaFamilia.length > 0
          ? (mediaFamilia.reduce((s, a) => s + a.integrantes_familia, 0) / mediaFamilia.length).toFixed(1)
          : '—'

        setPerfisAlunos({
          sexo: contagem('sexo'),
          raca: contagem('raca'),
          redeEnsino: contagem('rede_ensino'),
          tipo: contagem('tipo'),
          escolaOrigem: contagem('escola_origem'),
          programaSocial,
          integrantes: { media, total: ap.length },
        })
      }

      setLoadingKpis(false)
    }
    loadData()
  }, [])

  const mesAtual = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="page-title">Painel do Diretor</h1>
          <p className="text-mis-texto2 text-sm mt-1">Visão geral da Escola de Música</p>
        </div>
        <span className="badge badge-amarelo ml-auto">Diretor</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Users,         label: 'Total de Alunos', valor: stats.alunos,   cor: 'text-verde' },
          { icon: GraduationCap, label: 'Turmas Ativas',   valor: stats.turmas,   cor: 'text-azul' },
          { icon: BarChart2,     label: 'Oficinas',        valor: stats.oficinas, cor: 'text-amarelo' },
          { icon: TrendingUp,    label: 'Ano Letivo',      valor: ANO_ATUAL,      cor: 'text-marrom' },
        ].map((c, i) => (
          <div key={i} className="mis-card flex flex-col gap-2">
            <c.icon size={20} className={c.cor}/>
            <span className="text-2xl font-black text-mis-texto">{c.valor}</span>
            <span className="text-xs text-mis-texto2">{c.label}</span>
          </div>
        ))}
      </div>

      {/* Documentos SECULT */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-bold text-mis-texto">Documentos SECULT</h2>
          <span className="badge badge-azul">Exportação</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <CardExportacao icon={BookOpen} titulo="Plano de Curso" badge="DOCX"
            descricao="Gera o documento com cabeçalho, mini currículo do professor, plano mensal e tabela de aulas por período."
            cor="bg-amarelo/15 text-amarelo" onClick={() => setModalAberto(true)}/>
          <CardExportacao icon={Calendar} titulo="Frequência de Alunos" badge="DOCX"
            descricao="Gera a tabela de presença com P/F por data para cada aluno da oficina no período selecionado."
            cor="bg-azul/15 text-azul" onClick={() => setModalFrequenciaAberto(true)}/>
        </div>
      </div>

      {/* ── Seção de KPIs ── */}
      {loadingKpis ? (
        <div className="mis-card flex items-center justify-center py-8">
          <Loader size={20} className="animate-spin text-amarelo"/>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Frequência Geral do Mês */}
          <div className="mis-card flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Hash size={15} className="text-verde"/>
              <h3 className="text-xs font-bold text-mis-texto uppercase tracking-wide">Frequência do Mês</h3>
            </div>
            <p className="text-xs text-mis-texto2 capitalize">{mesAtual}</p>

            {/* Anel de progresso visual */}
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 shrink-0">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="26" fill="none" stroke="#1f2937" strokeWidth="8"/>
                  <circle cx="32" cy="32" r="26" fill="none"
                    stroke={freqGeral.pct >= 75 ? '#10B981' : freqGeral.pct >= 50 ? '#F59E0B' : '#EF4444'}
                    strokeWidth="8"
                    strokeDasharray={`${(freqGeral.pct / 100) * 163} 163`}
                    strokeLinecap="round"/>
                </svg>
                <span className={`absolute inset-0 flex items-center justify-center text-sm font-black ${freqGeral.pct >= 75 ? 'text-verde' : freqGeral.pct >= 50 ? 'text-amarelo' : 'text-red-400'}`}>
                  {freqGeral.pct}%
                </span>
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex justify-between text-xs">
                  <span className="text-mis-texto2">Presenças</span>
                  <span className="font-bold text-verde">{freqGeral.presencas}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-mis-texto2">Faltas</span>
                  <span className="font-bold text-red-400">{freqGeral.faltas}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-mis-texto2">Total reg.</span>
                  <span className="font-bold text-mis-texto">{freqGeral.total}</span>
                </div>
              </div>
            </div>

            {freqGeral.total === 0 && (
              <p className="text-xs text-mis-texto2 text-center py-1">Nenhum registro este mês</p>
            )}
          </div>

          {/* Alunos com mais faltas */}
          <div className="mis-card flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle size={15} className="text-red-400"/>
              <h3 className="text-xs font-bold text-mis-texto uppercase tracking-wide">Alerta de Faltas</h3>
            </div>
            <p className="text-xs text-mis-texto2">Alunos com mais ausências no mês</p>

            {alertaFaltas.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-4 gap-2">
                <CheckCircle size={24} className="text-verde"/>
                <p className="text-xs text-mis-texto2 text-center">Nenhuma falta registrada este mês!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {alertaFaltas.map((al, i) => (
                  <div key={al.id} className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${al.pct < 75 ? 'bg-red-900/40 text-red-400' : 'bg-amarelo/20 text-amarelo'}`}>
                      {al.faltas}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-mis-texto truncate">{al.nome}</p>
                      <div className="w-full h-1 bg-mis-borda rounded-full mt-0.5">
                        <div className={`h-full rounded-full ${al.pct >= 75 ? 'bg-verde' : al.pct >= 50 ? 'bg-amarelo' : 'bg-red-500'}`}
                          style={{ width: `${al.pct}%` }}/>
                      </div>
                    </div>
                    <span className={`text-xs font-bold shrink-0 ${al.pct >= 75 ? 'text-verde' : al.pct >= 50 ? 'text-amarelo' : 'text-red-400'}`}>
                      {al.pct}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resumo por oficina */}
          <div className="mis-card flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-azul"/>
              <h3 className="text-xs font-bold text-mis-texto uppercase tracking-wide">Resumo por Oficina</h3>
            </div>
            <p className="text-xs text-mis-texto2">Alunos e frequência no mês</p>

            {resumoOficinas.length === 0 ? (
              <p className="text-xs text-mis-texto2 text-center py-4">Nenhum dado disponível</p>
            ) : (
              <div className="space-y-2.5">
                {resumoOficinas.map((of, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <p className="text-xs font-medium text-mis-texto truncate">{of.nome}</p>
                        <span className="text-xs text-mis-texto2 shrink-0 ml-1">{of.alunos} alunos</span>
                      </div>
                      <div className="w-full h-1.5 bg-mis-borda rounded-full">
                        <div
                          className={`h-full rounded-full ${of.pct === null ? 'bg-mis-borda' : of.pct >= 75 ? 'bg-verde' : of.pct >= 50 ? 'bg-amarelo' : 'bg-red-500'}`}
                          style={{ width: of.pct !== null ? `${of.pct}%` : '0%' }}/>
                      </div>
                    </div>
                    <span className={`text-xs font-bold w-8 text-right shrink-0 ${of.pct === null ? 'text-mis-texto2' : of.pct >= 75 ? 'text-verde' : of.pct >= 50 ? 'text-amarelo' : 'text-red-400'}`}>
                      {of.pct !== null ? `${of.pct}%` : '—'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ── Perfil Sociodemográfico ── */}
      {!loadingKpis && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users size={15} className="text-amarelo"/>
            <h2 className="text-sm font-bold text-mis-texto">Perfil dos Alunos Matriculados</h2>
            <span className="badge badge-amarelo">{perfisAlunos.integrantes.total} ativos</span>
          </div>

          {/* Linha 1: Sexo + Raça + Tipo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Sexo */}
            <div className="mis-card space-y-3">
              <h4 className="text-xs font-bold text-mis-texto uppercase tracking-wide">Sexo</h4>
              {perfisAlunos.sexo.map((s, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-mis-texto">{s.nome}</span>
                    <span className="font-bold text-mis-texto2">{s.qtd} ({s.pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-mis-borda rounded-full">
                    <div className="h-full rounded-full bg-azul" style={{ width: `${s.pct}%` }}/>
                  </div>
                </div>
              ))}
              {perfisAlunos.sexo.length === 0 && <p className="text-xs text-mis-texto2">Sem dados</p>}
            </div>

            {/* Raça */}
            <div className="mis-card space-y-3">
              <h4 className="text-xs font-bold text-mis-texto uppercase tracking-wide">Raça / Cor</h4>
              {perfisAlunos.raca.map((r, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-mis-texto truncate">{r.nome}</span>
                    <span className="font-bold text-mis-texto2 shrink-0 ml-1">{r.qtd} ({r.pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-mis-borda rounded-full">
                    <div className="h-full rounded-full bg-marrom" style={{ width: `${r.pct}%` }}/>
                  </div>
                </div>
              ))}
              {perfisAlunos.raca.length === 0 && <p className="text-xs text-mis-texto2">Sem dados</p>}
            </div>

            {/* Tipo (aluno/responsável/etc) */}
            <div className="mis-card space-y-3">
              <h4 className="text-xs font-bold text-mis-texto uppercase tracking-wide">Tipo de Matrícula</h4>
              {perfisAlunos.tipo.map((t, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-mis-texto truncate">{t.nome}</span>
                    <span className="font-bold text-mis-texto2 shrink-0 ml-1">{t.qtd} ({t.pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-mis-borda rounded-full">
                    <div className="h-full rounded-full bg-verde" style={{ width: `${t.pct}%` }}/>
                  </div>
                </div>
              ))}
              {perfisAlunos.tipo.length === 0 && <p className="text-xs text-mis-texto2">Sem dados</p>}
            </div>
          </div>

          {/* Linha 2: Rede de Ensino + Escola Origem + Programa Social */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Rede de ensino */}
            <div className="mis-card space-y-3">
              <h4 className="text-xs font-bold text-mis-texto uppercase tracking-wide">Rede de Ensino</h4>
              {(perfisAlunos.redeEnsino || []).map((r, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-mis-texto truncate">{r.nome}</span>
                    <span className="font-bold text-mis-texto2 shrink-0 ml-1">{r.qtd} ({r.pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-mis-borda rounded-full">
                    <div className="h-full rounded-full bg-amarelo" style={{ width: `${r.pct}%` }}/>
                  </div>
                </div>
              ))}
              {(perfisAlunos.redeEnsino || []).length === 0 && <p className="text-xs text-mis-texto2">Sem dados</p>}
            </div>

            {/* Escola de origem */}
            <div className="mis-card space-y-3">
              <h4 className="text-xs font-bold text-mis-texto uppercase tracking-wide">Escola de Origem</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {(perfisAlunos.escolaOrigem || []).slice(0, 8).map((e, i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-mis-texto truncate flex-1">{e.nome}</span>
                    <span className="text-xs font-bold text-mis-texto2 shrink-0 bg-mis-bg3 px-1.5 py-0.5 rounded-md">{e.qtd}</span>
                  </div>
                ))}
              </div>
              {(perfisAlunos.escolaOrigem || []).length === 0 && <p className="text-xs text-mis-texto2">Sem dados</p>}
            </div>

            {/* Programa social + Família */}
            <div className="mis-card space-y-3">
              <h4 className="text-xs font-bold text-mis-texto uppercase tracking-wide">Programas Sociais</h4>
              <div className="space-y-2">
                {(perfisAlunos.programaSocial || []).map((p, i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-mis-texto truncate flex-1">{p.nome}</span>
                    <span className="text-xs font-bold text-mis-texto2 shrink-0 bg-mis-bg3 px-1.5 py-0.5 rounded-md">{p.qtd}</span>
                  </div>
                ))}
                {(perfisAlunos.programaSocial || []).length === 0 && <p className="text-xs text-mis-texto2">Sem dados</p>}
              </div>
              <div className="border-t border-mis-borda pt-2 mt-1 flex justify-between items-center">
                <span className="text-xs text-mis-texto2">Média integrantes família</span>
                <span className="text-sm font-black text-amarelo">{perfisAlunos.integrantes.media}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Gestão de Professores ── */}
      <SecaoProfessores />

      {modalAberto && turmas.length > 0 && <ModalExportacao turmas={turmas} onClose={() => setModalAberto(false)}/>}
      {modalAberto && turmas.length === 0 && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-mis-bg2 rounded-2xl p-6 max-w-sm w-full border border-mis-borda text-center">
            <AlertCircle size={32} className="text-amarelo mx-auto mb-3"/>
            <h3 className="font-bold text-mis-texto mb-1">Nenhuma turma encontrada</h3>
            <p className="text-xs text-mis-texto2 mb-4">Crie turmas antes de exportar documentos.</p>
            <button onClick={() => setModalAberto(false)} className="btn-primary px-6 py-2 text-sm">Fechar</button>
          </div>
        </div>
      )}
      {modalFrequenciaAberto && <ModalFrequencia onClose={() => setModalFrequenciaAberto(false)}/>}
    </div>
  )
}