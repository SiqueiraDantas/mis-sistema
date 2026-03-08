import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../services/supabase'
import {
  Users, Plus, RefreshCw, Eye, EyeOff, Lock, Unlock,
  CheckCircle, AlertCircle, Loader, X, Save, Mail,
  Phone, BookOpen, ChevronDown, ChevronUp, KeyRound, Trash2
} from 'lucide-react'

const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2bXVjZHVmaWFhbGNrYWNtbG1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5OTY3NTcsImV4cCI6MjA1NTU3Mjc1N30.jbPPObfQvVWMBVBqTHMzHoFQJCiVoANFEF5nA6tL6BI'
const FN_URL = 'https://rvmucdufiaalckacmlmi.supabase.co/functions/v1/gerenciar-professores'

async function chamarFn(acao, params = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token || ANON_KEY
  const resp = await fetch(FN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ANON_KEY}`,
      'apikey': ANON_KEY,
    },
    body: JSON.stringify({ acao, ...params }),
  })
  const data = await resp.json()
  if (!resp.ok) throw new Error(data.erro || data.message || `HTTP ${resp.status}`)
  return data
}

// ─── MODAL CRIAR PROFESSOR ───────────────────────────────────────────────────
function ModalCriar({ onClose, onCriado }) {
  const [form, setForm] = useState({ nome: '', email: '', senha: '' })
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function criar() {
    if (!form.nome || !form.email || !form.senha) { setErro('Preencha todos os campos'); return }
    if (form.senha.length < 6) { setErro('Senha deve ter pelo menos 6 caracteres'); return }
    setLoading(true); setErro('')
    try {
      await chamarFn('criar', form)
      onCriado()
      onClose()
    } catch (e) {
      setErro(e.message || 'Erro ao criar professor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-mis-bg2 rounded-2xl w-full max-w-md border border-mis-borda shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-mis-borda">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-verde/15 flex items-center justify-center">
              <Plus size={18} className="text-verde"/>
            </div>
            <div>
              <h2 className="font-bold text-mis-texto text-sm">Novo Professor</h2>
              <p className="text-xs text-mis-texto2">Criar conta de acesso</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-mis-borda/50 flex items-center justify-center text-mis-texto2">
            <X size={16}/>
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="mis-label">Nome completo</label>
            <input className="mis-input" placeholder="Ex: Maria Silva"
              value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}/>
          </div>
          <div>
            <label className="mis-label">E-mail de acesso</label>
            <input className="mis-input" type="email" placeholder="professor@email.com"
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}/>
          </div>
          <div>
            <label className="mis-label">Senha inicial</label>
            <div className="relative">
              <input className="mis-input pr-10" type={mostrarSenha ? 'text' : 'password'}
                placeholder="Mínimo 6 caracteres"
                value={form.senha} onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}/>
              <button onClick={() => setMostrarSenha(!mostrarSenha)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-mis-texto2 hover:text-mis-texto">
                {mostrarSenha ? <EyeOff size={14}/> : <Eye size={14}/>}
              </button>
            </div>
            <p className="text-xs text-mis-texto2 mt-1">O professor poderá alterar depois.</p>
          </div>
          {erro && (
            <div className="flex items-center gap-2 text-xs text-red-400 bg-red-900/20 border border-red-900/30 rounded-xl px-3 py-2">
              <AlertCircle size={13}/> {erro}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-mis-borda flex gap-2">
          <button onClick={onClose} className="btn-ghost flex-1 py-2.5 text-sm">Cancelar</button>
          <button onClick={criar} disabled={loading}
            className="btn-primary flex-1 py-2.5 text-sm flex items-center justify-center gap-2">
            {loading ? <><Loader size={14} className="animate-spin"/> Criando...</> : <><Plus size={14}/> Criar Conta</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── MODAL RESETAR SENHA ─────────────────────────────────────────────────────
function ModalSenha({ professor, onClose }) {
  const [novaSenha, setNovaSenha] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState(false)

  async function resetar() {
    if (!novaSenha || novaSenha.length < 6) { setErro('Senha deve ter pelo menos 6 caracteres'); return }
    setLoading(true); setErro('')
    try {
      await chamarFn('resetar_senha', { id: professor.id, nova_senha: novaSenha })
      setOk(true)
      setTimeout(onClose, 1500)
    } catch (e) {
      setErro(e.message || 'Erro ao resetar senha')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-mis-bg2 rounded-2xl w-full max-w-sm border border-mis-borda shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-mis-borda">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amarelo/15 flex items-center justify-center">
              <KeyRound size={18} className="text-amarelo"/>
            </div>
            <div>
              <h2 className="font-bold text-mis-texto text-sm">Resetar Senha</h2>
              <p className="text-xs text-mis-texto2 truncate max-w-[160px]">{professor.nome}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-mis-borda/50 flex items-center justify-center text-mis-texto2">
            <X size={16}/>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {ok ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle size={32} className="text-verde"/>
              <p className="text-sm font-bold text-mis-texto">Senha alterada com sucesso!</p>
            </div>
          ) : (
            <>
              <div>
                <label className="mis-label">Nova senha para {professor.nome?.split(' ')[0]}</label>
                <div className="relative">
                  <input className="mis-input pr-10" type={mostrar ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={novaSenha} onChange={e => setNovaSenha(e.target.value)}/>
                  <button onClick={() => setMostrar(!mostrar)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-mis-texto2 hover:text-mis-texto">
                    {mostrar ? <EyeOff size={14}/> : <Eye size={14}/>}
                  </button>
                </div>
              </div>
              {erro && (
                <div className="flex items-center gap-2 text-xs text-red-400 bg-red-900/20 border border-red-900/30 rounded-xl px-3 py-2">
                  <AlertCircle size={13}/> {erro}
                </div>
              )}
            </>
          )}
        </div>

        {!ok && (
          <div className="p-4 border-t border-mis-borda flex gap-2">
            <button onClick={onClose} className="btn-ghost flex-1 py-2.5 text-sm">Cancelar</button>
            <button onClick={resetar} disabled={loading}
              className="btn-primary flex-1 py-2.5 text-sm flex items-center justify-center gap-2">
              {loading ? <><Loader size={14} className="animate-spin"/> Salvando...</> : <><Save size={14}/> Confirmar</>}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── MODAL EXCLUIR PROFESSOR ─────────────────────────────────────────────────
function ModalExcluir({ professor, onClose, onExcluido }) {
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function excluir() {
    setLoading(true); setErro('')
    try {
      await chamarFn('excluir', { id: professor.id })
      onExcluido()
      onClose()
    } catch (e) {
      setErro(e.message || 'Erro ao excluir professor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-mis-bg2 rounded-2xl w-full max-w-sm border border-mis-borda shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-mis-borda">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-900/20 flex items-center justify-center">
              <Trash2 size={18} className="text-red-400"/>
            </div>
            <div>
              <h2 className="font-bold text-mis-texto text-sm">Excluir Professor</h2>
              <p className="text-xs text-mis-texto2">Ação irreversível</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-mis-borda/50 flex items-center justify-center text-mis-texto2">
            <X size={16}/>
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3 bg-mis-bg3 rounded-xl p-3 border border-mis-borda">
            <div className="w-10 h-10 rounded-xl bg-azul/15 text-azul flex items-center justify-center font-black text-sm shrink-0">
              {professor.nome?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-mis-texto truncate">{professor.nome}</p>
              <p className="text-xs text-mis-texto2 truncate">{professor.email}</p>
            </div>
          </div>

          <div className="flex items-start gap-2 text-xs text-red-400 bg-red-900/20 border border-red-900/30 rounded-xl px-3 py-2">
            <AlertCircle size={13} className="mt-0.5 shrink-0"/>
            <span>Esta ação irá excluir permanentemente o professor e seu acesso ao sistema. Esta ação não pode ser desfeita.</span>
          </div>

          {erro && (
            <div className="flex items-center gap-2 text-xs text-red-400 bg-red-900/20 border border-red-900/30 rounded-xl px-3 py-2">
              <AlertCircle size={13}/> {erro}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-mis-borda flex gap-2">
          <button onClick={onClose} className="btn-ghost flex-1 py-2.5 text-sm">Cancelar</button>
          <button onClick={excluir} disabled={loading}
            className="flex-1 py-2.5 text-sm flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all">
            {loading ? <><Loader size={14} className="animate-spin"/> Excluindo...</> : <><Trash2 size={14}/> Excluir</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── CARD PROFESSOR ───────────────────────────────────────────────────────────
function CardProfessor({ prof, onResetar, onToggle, onExcluir, loadingToggle }) {
  const [expandido, setExpandido] = useState(false)

  const iniciais = prof.nome
    ? prof.nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
    : '?'

  return (
    <div className={`mis-card transition-all ${!prof.ativo ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black text-sm
          ${prof.ativo ? 'bg-azul/15 text-azul' : 'bg-mis-borda text-mis-texto2'}`}>
          {iniciais}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-mis-texto truncate">{prof.nome}</p>
            <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded-md font-bold ${
              prof.ativo ? 'bg-verde/15 text-verde' : 'bg-red-900/20 text-red-400'
            }`}>
              {prof.ativo ? 'Ativo' : 'Inativo'}
            </span>
          </div>
          <p className="text-xs text-mis-texto2 truncate flex items-center gap-1 mt-0.5">
            <Mail size={10}/> {prof.email}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onResetar(prof)} title="Resetar senha"
            className="w-8 h-8 rounded-lg hover:bg-amarelo/15 text-mis-texto2 hover:text-amarelo flex items-center justify-center transition-all">
            <KeyRound size={14}/>
          </button>
          <button onClick={() => onToggle(prof)} disabled={loadingToggle === prof.id}
            title={prof.ativo ? 'Desativar acesso' : 'Ativar acesso'}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
              prof.ativo ? 'hover:bg-red-900/20 text-mis-texto2 hover:text-red-400' : 'hover:bg-verde/15 text-mis-texto2 hover:text-verde'
            }`}>
            {loadingToggle === prof.id
              ? <Loader size={14} className="animate-spin"/>
              : prof.ativo ? <Lock size={14}/> : <Unlock size={14}/>}
          </button>
          <button onClick={() => onExcluir(prof)} title="Excluir professor"
            className="w-8 h-8 rounded-lg hover:bg-red-900/20 text-mis-texto2 hover:text-red-400 flex items-center justify-center transition-all">
            <Trash2 size={14}/>
          </button>
          <button onClick={() => setExpandido(!expandido)}
            className="w-8 h-8 rounded-lg hover:bg-mis-borda/50 text-mis-texto2 flex items-center justify-center transition-all">
            {expandido ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
          </button>
        </div>
      </div>

      {expandido && (
        <div className="mt-3 pt-3 border-t border-mis-borda space-y-2">
          {prof.mini_curriculo && (
            <div>
              <p className="text-xs font-semibold text-mis-texto2 uppercase tracking-wide mb-1 flex items-center gap-1">
                <BookOpen size={10}/> Mini Currículo
              </p>
              <p className="text-xs text-mis-texto leading-relaxed">{prof.mini_curriculo}</p>
            </div>
          )}
          <div className="flex flex-wrap gap-4">
            {prof.telefone && (
              <span className="flex items-center gap-1 text-xs text-mis-texto2">
                <Phone size={10}/> {prof.telefone}
              </span>
            )}
            {prof.email_contato && (
              <span className="flex items-center gap-1 text-xs text-mis-texto2">
                <Mail size={10}/> {prof.email_contato}
              </span>
            )}
          </div>
          <p className="text-xs text-mis-texto2">
            Cadastrado em: {new Date(prof.created_at).toLocaleDateString('pt-BR')}
          </p>
        </div>
      )}
    </div>
  )
}

// ─── SEÇÃO PRINCIPAL ─────────────────────────────────────────────────────────
export default function SecaoProfessores() {
  const [professores, setProfessores] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [modalCriar, setModalCriar] = useState(false)
  const [modalSenha, setModalSenha] = useState(null)
  const [modalExcluir, setModalExcluir] = useState(null)
  const [loadingToggle, setLoadingToggle] = useState(null)
  const [busca, setBusca] = useState('')

  const carregar = useCallback(async () => {
    setLoading(true); setErro('')
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome, email, perfil, ativo, mini_curriculo, email_contato, telefone, created_at')
        .eq('perfil', 'professor')
        .order('nome')
      if (error) throw error
      setProfessores(data || [])
    } catch (e) {
      setErro(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  async function toggleAtivo(prof) {
    setLoadingToggle(prof.id)
    try {
      await chamarFn('toggle_ativo', { id: prof.id, ativo: !prof.ativo })
      setProfessores(ps => ps.map(p => p.id === prof.id ? { ...p, ativo: !p.ativo } : p))
    } catch (e) {
      alert('Erro: ' + e.message)
    } finally {
      setLoadingToggle(null)
    }
  }

  const filtrados = professores.filter(p =>
    p.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    p.email?.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Users size={15} className="text-azul"/>
          <h2 className="text-sm font-bold text-mis-texto">Professores</h2>
          <span className="badge badge-azul">{professores.length} cadastrados</span>
          {filtrados.filter(p => p.ativo).length > 0 && (
            <span className="badge badge-verde">{filtrados.filter(p => p.ativo).length} ativos</span>
          )}
          {filtrados.filter(p => !p.ativo).length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/20 text-red-400 font-bold">
              {filtrados.filter(p => !p.ativo).length} inativos
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <button onClick={carregar} disabled={loading}
            className="w-8 h-8 rounded-lg bg-mis-borda/50 hover:bg-mis-borda text-mis-texto2 flex items-center justify-center transition-all">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''}/>
          </button>
          <button onClick={() => setModalCriar(true)}
            className="btn-primary px-3 py-2 text-xs flex items-center gap-1.5">
            <Plus size={13}/> Novo Professor
          </button>
        </div>
      </div>

      {professores.length > 3 && (
        <input className="mis-input text-sm" placeholder="Buscar por nome ou e-mail..."
          value={busca} onChange={e => setBusca(e.target.value)}/>
      )}

      {loading ? (
        <div className="mis-card flex items-center justify-center py-8">
          <Loader size={20} className="animate-spin text-amarelo"/>
        </div>
      ) : erro ? (
        <div className="mis-card flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle size={16}/> {erro}
        </div>
      ) : filtrados.length === 0 ? (
        <div className="mis-card text-center py-8">
          <Users size={32} className="text-mis-texto2 mx-auto mb-3"/>
          <p className="text-sm font-bold text-mis-texto">Nenhum professor cadastrado</p>
          <p className="text-xs text-mis-texto2 mt-1 mb-4">Crie a primeira conta de acesso.</p>
          <button onClick={() => setModalCriar(true)}
            className="btn-primary px-4 py-2 text-sm flex items-center gap-1.5 mx-auto">
            <Plus size={13}/> Criar Professor
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtrados.map(prof => (
            <CardProfessor key={prof.id} prof={prof}
              onResetar={setModalSenha} onToggle={toggleAtivo} onExcluir={setModalExcluir} loadingToggle={loadingToggle}/>
          ))}
        </div>
      )}

      {modalCriar && <ModalCriar onClose={() => setModalCriar(false)} onCriado={carregar}/>}
      {modalSenha && <ModalSenha professor={modalSenha} onClose={() => setModalSenha(null)}/>}
      {modalExcluir && <ModalExcluir professor={modalExcluir} onClose={() => setModalExcluir(null)} onExcluido={carregar}/>}
    </div>
  )
}