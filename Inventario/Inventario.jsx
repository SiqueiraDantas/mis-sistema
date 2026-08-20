import { useCallback, useEffect, useMemo, useState } from 'react'
import imageCompression from 'browser-image-compression'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { usePeriodo } from '../../contexts/PeriodoContext'
import {
  AlertCircle,
  Boxes,
  Camera,
  Check,
  ClipboardList,
  Loader,
  Package,
  Plus,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Undo2,
  Users,
  X,
} from 'lucide-react'

const DATA_INICIAL_REGISTROS = '2026-08-19'
const BUCKET_FOTOS = 'inventario-fotos'
const PERIODO_ATUAL = '2026.2'

const CATEGORIAS = ['Instrumento', 'Percussão', 'Acessório', 'Outro']
const ESTADOS_ITEM = ['novo', 'bom', 'regular', 'manutenção', 'danificado']

function unwrapRelation(value) {
  return Array.isArray(value) ? value[0] : value
}

function formatDateBr(dateString) {
  if (!dateString) return '19/08/2026'

  const [year, month, day] = String(dateString).split('-')
  if (!year || !month || !day) return dateString

  return `${day}/${month}/${year}`
}

function formatDateShort(dateString) {
  if (!dateString) return '19/08'

  const [year, month, day] = String(dateString).split('-')
  if (!year || !month || !day) return dateString

  return `${day}/${month}`
}

function getTodayIso() {
  return new Date().toISOString().slice(0, 10)
}

function getInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return parts.slice(0, 2).map(part => part[0]).join('').toUpperCase()
}

function normalizeText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function slugify(value = '') {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function getPhotoSource(pathOrUrl) {
  if (!pathOrUrl) return null
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) return pathOrUrl
  return null
}

async function uploadPhoto(file, folder) {
  if (!file) return null

  const compressed = await imageCompression(file, {
    maxSizeMB: 1.2,
    maxWidthOrHeight: 1600,
    useWebWorker: true,
  })

  const extension = file.name?.split('.').pop()?.toLowerCase() || 'jpg'
  const safeName = slugify(file.name?.replace(/\.[^.]+$/, '') || 'foto')
  const objectPath = `${folder}/${crypto.randomUUID()}-${safeName}.${extension}`

  const { error } = await supabase.storage.from(BUCKET_FOTOS).upload(objectPath, compressed, {
    upsert: false,
    contentType: compressed.type || file.type || 'image/jpeg',
  })

  if (error) throw error

  return objectPath
}

async function attachSignedUrls(emprestimos) {
  const entries = []

  for (const emprestimo of emprestimos) {
    if (emprestimo.foto_entrega_path && !getPhotoSource(emprestimo.foto_entrega_path)) {
      entries.push({ key: `${emprestimo.id}:entrega`, path: emprestimo.foto_entrega_path })
    }

    if (emprestimo.foto_devolucao_path && !getPhotoSource(emprestimo.foto_devolucao_path)) {
      entries.push({ key: `${emprestimo.id}:devolucao`, path: emprestimo.foto_devolucao_path })
    }
  }

  if (entries.length === 0) {
    return emprestimos.map(emprestimo => ({
      ...emprestimo,
      foto_entrega_url: getPhotoSource(emprestimo.foto_entrega_path),
      foto_devolucao_url: getPhotoSource(emprestimo.foto_devolucao_path),
    }))
  }

  const uniqueEntries = entries.filter(
    (entry, index, all) => all.findIndex(item => item.path === entry.path) === index,
  )

  const { data, error } = await supabase
    .storage
    .from(BUCKET_FOTOS)
    .createSignedUrls(uniqueEntries.map(entry => entry.path), 60 * 60)

  if (error) {
    console.error('Erro ao assinar fotos do inventário:', error)
    return emprestimos.map(emprestimo => ({
      ...emprestimo,
      foto_entrega_url: getPhotoSource(emprestimo.foto_entrega_path),
      foto_devolucao_url: getPhotoSource(emprestimo.foto_devolucao_path),
    }))
  }

  const signedByPath = new Map()

  uniqueEntries.forEach((entry, index) => {
    signedByPath.set(entry.path, data?.[index]?.signedUrl || null)
  })

  return emprestimos.map(emprestimo => ({
    ...emprestimo,
    foto_entrega_url: getPhotoSource(emprestimo.foto_entrega_path)
      || signedByPath.get(emprestimo.foto_entrega_path)
      || null,
    foto_devolucao_url: getPhotoSource(emprestimo.foto_devolucao_path)
      || signedByPath.get(emprestimo.foto_devolucao_path)
      || null,
  }))
}

function groupStudentsByOffice(matriculas) {
  const students = new Map()

  for (const registro of matriculas || []) {
    const aluno = unwrapRelation(registro.alunos)
    const oficina = unwrapRelation(registro.oficinas)

    if (!aluno?.id || !oficina?.id) continue

    if (!students.has(aluno.id)) {
      students.set(aluno.id, {
        id: aluno.id,
        nome: aluno.nome,
        numero_matricula: aluno.numero_matricula,
        foto_url: aluno.foto_url || null,
        status: aluno.status,
        oficinas: [],
      })
    }

    const current = students.get(aluno.id)

    if (!current.oficinas.some(item => item.id === oficina.id)) {
      current.oficinas.push({ id: oficina.id, nome: oficina.nome })
    }
  }

  return [...students.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}

function buildActiveLoanMap(emprestimos) {
  const map = new Map()

  for (const emprestimo of emprestimos) {
    if (emprestimo.status !== 'emprestado' || emprestimo.data_devolucao) continue

    const quantidade = Number(emprestimo.quantidade) || 1
    map.set(
      emprestimo.inventario_item_id,
      (map.get(emprestimo.inventario_item_id) || 0) + quantidade,
    )
  }

  return map
}

function MetricCard({ icon, label, value, hint, bgClass, iconClass }) {
  const IconComponent = icon

  return (
    <div className="mis-card flex items-center gap-3">
      <div className={`w-11 h-11 rounded-xl ${bgClass} flex items-center justify-center shrink-0`}>
        <IconComponent size={18} className={iconClass} />
      </div>

      <div>
        <p className="text-xl font-black text-mis-texto">{value}</p>
        <p className="text-xs text-mis-texto2">{label}</p>
        {hint && <p className="text-[11px] text-mis-texto2 mt-0.5">{hint}</p>}
      </div>
    </div>
  )
}

function ModalShell({ title, subtitle, onClose, children, footer }) {
  return (
    <div className="fixed inset-0 bg-black/70 z-[9999] overflow-y-auto">
      <div className="min-h-full flex items-start justify-center p-3 py-6">
        <div className="w-full max-w-2xl bg-mis-bg2 border border-mis-borda rounded-xl2 animate-fade-in">
          <div className="flex items-center justify-between p-4 border-b border-mis-borda">
            <div>
              <h2 className="text-sm font-bold text-mis-texto">{title}</h2>
              {subtitle && <p className="text-xs text-mis-texto2 mt-0.5">{subtitle}</p>}
            </div>

            <button onClick={onClose} className="text-mis-texto2 hover:text-mis-texto p-1">
              <X size={18} />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {children}
          </div>

          <div className="p-4 border-t border-mis-borda">
            {footer}
          </div>
        </div>
      </div>
    </div>
  )
}

function FileInputCard({ label, helper, file, onChange, required }) {
  return (
    <div>
      <label className="mis-label">
        {label}
        {required && <span className="text-amarelo"> *</span>}
      </label>

      <label className="flex items-center gap-3 rounded-xl border border-dashed border-mis-borda bg-mis-bg3 px-4 py-4 cursor-pointer hover:border-amarelo/40 transition-colors">
        <div className="w-10 h-10 rounded-xl bg-amarelo/10 flex items-center justify-center shrink-0">
          <Camera size={18} className="text-amarelo" />
        </div>

        <div className="min-w-0">
          <p className="text-sm font-semibold text-mis-texto truncate">
            {file?.name || 'Selecionar imagem'}
          </p>
          <p className="text-xs text-mis-texto2 mt-0.5">
            {helper}
          </p>
        </div>

        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={event => onChange(event.target.files?.[0] || null)}
        />
      </label>
    </div>
  )
}

function ModalNovoItem({ oficinas, oficinaInicial, perfil, onClose, onSaved }) {
  const [form, setForm] = useState({
    nome: '',
    categoria: CATEGORIAS[0],
    oficina_id: oficinaInicial || '',
    modo_controle: 'unitario',
    quantidade_total: '1',
    marca: '',
    modelo: '',
    numero_patrimonio: '',
    numero_serie: '',
    estado: 'bom',
    descricao: '',
  })
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  function setField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function salvar() {
    if (!form.nome.trim()) {
      setErro('Informe o nome do item.')
      return
    }

    if (!form.oficina_id) {
      setErro('Selecione a oficina do item.')
      return
    }

    if (form.modo_controle === 'quantidade' && Number(form.quantidade_total) < 1) {
      setErro('Informe uma quantidade válida.')
      return
    }

    setLoading(true)
    setErro('')

    try {
      const payload = {
        nome: form.nome.trim(),
        categoria: form.categoria,
        oficina_id: form.oficina_id,
        modo_controle: form.modo_controle,
        quantidade_total: form.modo_controle === 'quantidade'
          ? Number(form.quantidade_total || 1)
          : 1,
        marca: form.marca.trim() || null,
        modelo: form.modelo.trim() || null,
        numero_patrimonio: form.numero_patrimonio.trim() || null,
        numero_serie: form.numero_serie.trim() || null,
        estado: form.estado,
        descricao: form.descricao.trim() || null,
        created_by: perfil?.id || null,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase.from('inventario_itens').insert(payload)

      if (error) throw error

      onSaved()
    } catch (error) {
      console.error('Erro ao cadastrar item:', error)
      setErro(error?.message || 'Não foi possível cadastrar o item.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModalShell
      title="Cadastrar Item"
      subtitle="Novo item do estoque da escola."
      onClose={onClose}
      footer={(
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary px-4 py-2 text-sm">
            Cancelar
          </button>

          <button
            onClick={salvar}
            disabled={loading}
            className="btn-primary flex-1 flex items-center justify-center gap-2 py-2 text-sm disabled:opacity-50"
          >
            {loading
              ? <><Loader size={14} className="animate-spin" /> Salvando...</>
              : <><Plus size={14} /> Cadastrar item</>}
          </button>
        </div>
      )}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="md:col-span-2">
          <label className="mis-label">Nome do item</label>
          <input
            className="mis-input"
            placeholder="Ex: Trompete Yamaha, Baqueta de caixa"
            value={form.nome}
            onChange={event => setField('nome', event.target.value)}
          />
        </div>

        <div>
          <label className="mis-label">Oficina</label>
          <select
            className="mis-input"
            value={form.oficina_id}
            onChange={event => setField('oficina_id', event.target.value)}
          >
            <option value="">Selecione</option>
            {oficinas.map(oficina => (
              <option key={oficina.id} value={oficina.id}>
                {oficina.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mis-label">Categoria</label>
          <select
            className="mis-input"
            value={form.categoria}
            onChange={event => setField('categoria', event.target.value)}
          >
            {CATEGORIAS.map(categoria => (
              <option key={categoria} value={categoria}>
                {categoria}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mis-label">Tipo de controle</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setField('modo_controle', 'unitario')}
            className={`rounded-xl border px-4 py-3 text-left transition-all ${
              form.modo_controle === 'unitario'
                ? 'border-amarelo bg-amarelo/10'
                : 'border-mis-borda bg-mis-bg3 hover:border-amarelo/30'
            }`}
          >
            <p className="text-sm font-semibold text-mis-texto">Unidade individual</p>
            <p className="text-xs text-mis-texto2 mt-1">
              Controle um instrumento por cadastro, com patrimônio ou série opcional.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setField('modo_controle', 'quantidade')}
            className={`rounded-xl border px-4 py-3 text-left transition-all ${
              form.modo_controle === 'quantidade'
                ? 'border-amarelo bg-amarelo/10'
                : 'border-mis-borda bg-mis-bg3 hover:border-amarelo/30'
            }`}
          >
            <p className="text-sm font-semibold text-mis-texto">Item em quantidade</p>
            <p className="text-xs text-mis-texto2 mt-1">
              Ideal para baquetas, acessórios e materiais que saem em lote.
            </p>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {form.modo_controle === 'quantidade' && (
          <div>
            <label className="mis-label">Quantidade total</label>
            <input
              className="mis-input"
              type="number"
              min="1"
              value={form.quantidade_total}
              onChange={event => setField('quantidade_total', event.target.value)}
            />
          </div>
        )}

        <div>
          <label className="mis-label">Estado</label>
          <select
            className="mis-input"
            value={form.estado}
            onChange={event => setField('estado', event.target.value)}
          >
            {ESTADOS_ITEM.map(estado => (
              <option key={estado} value={estado}>
                {estado}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="mis-label">Marca</label>
          <input
            className="mis-input"
            placeholder="Opcional"
            value={form.marca}
            onChange={event => setField('marca', event.target.value)}
          />
        </div>

        <div>
          <label className="mis-label">Modelo</label>
          <input
            className="mis-input"
            placeholder="Opcional"
            value={form.modelo}
            onChange={event => setField('modelo', event.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="mis-label">Número de patrimônio</label>
          <input
            className="mis-input"
            placeholder="Opcional"
            value={form.numero_patrimonio}
            onChange={event => setField('numero_patrimonio', event.target.value)}
          />
        </div>

        <div>
          <label className="mis-label">Número de série</label>
          <input
            className="mis-input"
            placeholder="Opcional"
            value={form.numero_serie}
            onChange={event => setField('numero_serie', event.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="mis-label">Observações</label>
        <textarea
          className="mis-input resize-none"
          rows={3}
          placeholder="Ex: item com estojo, par de baquetas incluso, precisa de manutenção leve..."
          value={form.descricao}
          onChange={event => setField('descricao', event.target.value)}
        />
      </div>

      {erro && (
        <div className="bg-red-900/30 border border-red-800 text-red-400 text-xs rounded-lg px-3 py-2 flex items-center gap-2">
          <AlertCircle size={13} /> {erro}
        </div>
      )}
    </ModalShell>
  )
}

function ModalEmprestimo({
  oficinas,
  alunos,
  itens,
  emprestimosAtivos,
  contexto,
  perfil,
  periodoLetivo,
  onClose,
  onSaved,
}) {
  const ativosPorItem = useMemo(() => buildActiveLoanMap(emprestimosAtivos), [emprestimosAtivos])
  const oficinaPadrao = contexto?.oficina_id || alunos.find(aluno => aluno.id === contexto?.aluno_id)?.oficinas?.[0]?.id || ''

  const [form, setForm] = useState({
    oficina_id: oficinaPadrao,
    aluno_id: contexto?.aluno_id || '',
    inventario_item_id: '',
    quantidade: '1',
    data_emprestimo: DATA_INICIAL_REGISTROS,
    estado_emprestimo: 'bom',
    observacoes_emprestimo: '',
  })
  const [foto, setFoto] = useState(null)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const alunosDaOficina = useMemo(
    () => alunos.filter(aluno => aluno.oficinas.some(oficina => oficina.id === form.oficina_id)),
    [alunos, form.oficina_id],
  )

  const itensDisponiveis = useMemo(
    () => itens
      .filter(item => item.oficina_id === form.oficina_id)
      .map(item => {
        const emprestado = ativosPorItem.get(item.id) || 0
        const total = Number(item.quantidade_total) || 1
        return {
          ...item,
          disponivel: Math.max(total - emprestado, 0),
        }
      })
      .filter(item => item.disponivel > 0),
    [ativosPorItem, form.oficina_id, itens],
  )

  const itemSelecionado = itensDisponiveis.find(item => item.id === form.inventario_item_id)

  useEffect(() => {
    if (!form.oficina_id && oficinas.length === 1) {
      setForm(prev => ({ ...prev, oficina_id: oficinas[0].id }))
    }
  }, [form.oficina_id, oficinas])

  useEffect(() => {
    if (
      form.aluno_id
      && !alunosDaOficina.some(aluno => aluno.id === form.aluno_id)
    ) {
      setForm(prev => ({ ...prev, aluno_id: '' }))
    }

    if (
      form.inventario_item_id
      && !itensDisponiveis.some(item => item.id === form.inventario_item_id)
    ) {
      setForm(prev => ({ ...prev, inventario_item_id: '', quantidade: '1' }))
    }
  }, [alunosDaOficina, form.aluno_id, form.inventario_item_id, itensDisponiveis])

  async function salvar() {
    const quantidade = Number(form.quantidade || 1)

    if (!form.oficina_id) {
      setErro('Selecione a oficina do empréstimo.')
      return
    }

    if (!form.aluno_id) {
      setErro('Selecione o aluno.')
      return
    }

    if (!form.inventario_item_id) {
      setErro('Selecione o item do estoque.')
      return
    }

    if (!foto) {
      setErro('Adicione a foto do aluno com o instrumento.')
      return
    }

    if (!itemSelecionado) {
      setErro('O item escolhido não está mais disponível.')
      return
    }

    if (itemSelecionado.modo_controle === 'quantidade') {
      if (quantidade < 1 || quantidade > itemSelecionado.disponivel) {
        setErro('A quantidade informada está fora do disponível.')
        return
      }
    }

    setLoading(true)
    setErro('')

    try {
      const foto_entrega_path = await uploadPhoto(
        foto,
        `emprestimos/${form.oficina_id}/${form.aluno_id}`,
      )

      const payload = {
        inventario_item_id: form.inventario_item_id,
        aluno_id: form.aluno_id,
        oficina_id: form.oficina_id,
        turma_id: null,
        quantidade: itemSelecionado.modo_controle === 'quantidade' ? quantidade : 1,
        periodo_letivo: periodoLetivo,
        data_emprestimo: form.data_emprestimo || DATA_INICIAL_REGISTROS,
        status: 'emprestado',
        estado_emprestimo: form.estado_emprestimo,
        foto_entrega_path,
        observacoes_emprestimo: form.observacoes_emprestimo.trim() || null,
        created_by: perfil?.id || null,
        updated_by: perfil?.id || null,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase.from('inventario_emprestimos').insert(payload)

      if (error) throw error

      onSaved()
    } catch (error) {
      console.error('Erro ao registrar empréstimo:', error)
      setErro(error?.message || 'Não foi possível registrar o empréstimo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModalShell
      title="Entregar Item"
      subtitle="Vincule um instrumento ou acessório a um aluno."
      onClose={onClose}
      footer={(
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary px-4 py-2 text-sm">
            Cancelar
          </button>

          <button
            onClick={salvar}
            disabled={loading}
            className="btn-primary flex-1 flex items-center justify-center gap-2 py-2 text-sm disabled:opacity-50"
          >
            {loading
              ? <><Loader size={14} className="animate-spin" /> Salvando...</>
              : <><Check size={14} /> Confirmar entrega</>}
          </button>
        </div>
      )}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="mis-label">Oficina</label>
          <select
            className="mis-input"
            value={form.oficina_id}
            onChange={event => setForm(prev => ({ ...prev, oficina_id: event.target.value }))}
          >
            <option value="">Selecione</option>
            {oficinas.map(oficina => (
              <option key={oficina.id} value={oficina.id}>
                {oficina.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mis-label">Aluno</label>
          <select
            className="mis-input"
            value={form.aluno_id}
            onChange={event => setForm(prev => ({ ...prev, aluno_id: event.target.value }))}
          >
            <option value="">Selecione</option>
            {alunosDaOficina.map(aluno => (
              <option key={aluno.id} value={aluno.id}>
                {aluno.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="mis-label">Item disponível</label>
          <select
            className="mis-input"
            value={form.inventario_item_id}
            onChange={event => setForm(prev => ({ ...prev, inventario_item_id: event.target.value, quantidade: '1' }))}
          >
            <option value="">Selecione</option>
            {itensDisponiveis.map(item => (
              <option key={item.id} value={item.id}>
                {item.nome}
                {item.numero_patrimonio ? ` · Patrimônio ${item.numero_patrimonio}` : ''}
                {item.modo_controle === 'quantidade' ? ` · ${item.disponivel} disponíveis` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mis-label">Data da entrega</label>
          <input
            className="mis-input"
            type="date"
            value={form.data_emprestimo}
            onChange={event => setForm(prev => ({ ...prev, data_emprestimo: event.target.value }))}
          />
        </div>
      </div>

      {itemSelecionado?.modo_controle === 'quantidade' && (
        <div>
          <label className="mis-label">Quantidade</label>
          <input
            className="mis-input"
            type="number"
            min="1"
            max={itemSelecionado.disponivel}
            value={form.quantidade}
            onChange={event => setForm(prev => ({ ...prev, quantidade: event.target.value }))}
          />
          <p className="text-xs text-mis-texto2 mt-1">
            Disponível agora: {itemSelecionado.disponivel}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="mis-label">Estado na entrega</label>
          <select
            className="mis-input"
            value={form.estado_emprestimo}
            onChange={event => setForm(prev => ({ ...prev, estado_emprestimo: event.target.value }))}
          >
            {ESTADOS_ITEM.map(estado => (
              <option key={estado} value={estado}>
                {estado}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-amarelo/10 border border-amarelo/20 rounded-xl px-4 py-3">
          <p className="text-xs font-semibold text-amarelo uppercase tracking-wide">Data sugerida</p>
          <p className="text-sm text-mis-texto mt-1">
            Registros antigos podem começar em {formatDateBr(DATA_INICIAL_REGISTROS)}.
          </p>
        </div>
      </div>

      <FileInputCard
        label="Foto do aluno com o item"
        helper="PNG, JPG ou WEBP. Essa imagem fica vinculada à entrega."
        file={foto}
        onChange={setFoto}
        required
      />

      <div>
        <label className="mis-label">Observações</label>
        <textarea
          className="mis-input resize-none"
          rows={3}
          placeholder="Ex: entregue com estojo, bocal e correia."
          value={form.observacoes_emprestimo}
          onChange={event => setForm(prev => ({ ...prev, observacoes_emprestimo: event.target.value }))}
        />
      </div>

      {erro && (
        <div className="bg-red-900/30 border border-red-800 text-red-400 text-xs rounded-lg px-3 py-2 flex items-center gap-2">
          <AlertCircle size={13} /> {erro}
        </div>
      )}
    </ModalShell>
  )
}

function ModalDevolucao({ aluno, emprestimos, perfil, onClose, onSaved }) {
  const [emprestimoId, setEmprestimoId] = useState(emprestimos[0]?.id || '')
  const [dataDevolucao, setDataDevolucao] = useState(getTodayIso())
  const [estadoDevolucao, setEstadoDevolucao] = useState('bom')
  const [observacoes, setObservacoes] = useState('')
  const [foto, setFoto] = useState(null)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const emprestimoSelecionado = emprestimos.find(emprestimo => emprestimo.id === emprestimoId)

  async function salvar() {
    if (!emprestimoSelecionado) {
      setErro('Selecione o item que será devolvido.')
      return
    }

    setLoading(true)
    setErro('')

    try {
      const foto_devolucao_path = foto
        ? await uploadPhoto(
          foto,
          `devolucoes/${emprestimoSelecionado.oficina_id}/${emprestimoSelecionado.aluno_id}`,
        )
        : null

      const payload = {
        status: 'devolvido',
        data_devolucao: dataDevolucao || getTodayIso(),
        estado_devolucao: estadoDevolucao,
        foto_devolucao_path,
        observacoes_devolucao: observacoes.trim() || null,
        updated_by: perfil?.id || null,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from('inventario_emprestimos')
        .update(payload)
        .eq('id', emprestimoSelecionado.id)

      if (error) throw error

      onSaved()
    } catch (error) {
      console.error('Erro ao registrar devolução:', error)
      setErro(error?.message || 'Não foi possível concluir a devolução.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModalShell
      title="Registrar Devolução"
      subtitle={`Aluno: ${aluno.nome}`}
      onClose={onClose}
      footer={(
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary px-4 py-2 text-sm">
            Cancelar
          </button>

          <button
            onClick={salvar}
            disabled={loading}
            className="btn-primary flex-1 flex items-center justify-center gap-2 py-2 text-sm disabled:opacity-50"
          >
            {loading
              ? <><Loader size={14} className="animate-spin" /> Salvando...</>
              : <><Undo2 size={14} /> Confirmar devolução</>}
          </button>
        </div>
      )}
    >
      <div>
        <label className="mis-label">Item emprestado</label>
        <select
          className="mis-input"
          value={emprestimoId}
          onChange={event => setEmprestimoId(event.target.value)}
        >
          {emprestimos.map(emprestimo => (
            <option key={emprestimo.id} value={emprestimo.id}>
              {emprestimo.item_nome}
              {emprestimo.numero_patrimonio ? ` · Patrimônio ${emprestimo.numero_patrimonio}` : ''}
              {emprestimo.quantidade > 1 ? ` · ${emprestimo.quantidade} un.` : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="mis-label">Data da devolução</label>
          <input
            className="mis-input"
            type="date"
            value={dataDevolucao}
            onChange={event => setDataDevolucao(event.target.value)}
          />
        </div>

        <div>
          <label className="mis-label">Estado na devolução</label>
          <select
            className="mis-input"
            value={estadoDevolucao}
            onChange={event => setEstadoDevolucao(event.target.value)}
          >
            {ESTADOS_ITEM.map(estado => (
              <option key={estado} value={estado}>
                {estado}
              </option>
            ))}
          </select>
        </div>
      </div>

      <FileInputCard
        label="Foto da devolução"
        helper="Opcional, útil para registrar o estado do material na volta."
        file={foto}
        onChange={setFoto}
      />

      <div>
        <label className="mis-label">Observações</label>
        <textarea
          className="mis-input resize-none"
          rows={3}
          placeholder="Ex: devolvido com leves marcas de uso."
          value={observacoes}
          onChange={event => setObservacoes(event.target.value)}
        />
      </div>

      {erro && (
        <div className="bg-red-900/30 border border-red-800 text-red-400 text-xs rounded-lg px-3 py-2 flex items-center gap-2">
          <AlertCircle size={13} /> {erro}
        </div>
      )}
    </ModalShell>
  )
}

export default function Inventario() {
  const { perfil, isDiretor, isDev } = useAuth()
  const { periodoLetivo, somenteLeitura } = usePeriodo()

  const [loading, setLoading] = useState(true)
  const [erroCarregamento, setErroCarregamento] = useState('')
  const [oficinas, setOficinas] = useState([])
  const [itens, setItens] = useState([])
  const [emprestimos, setEmprestimos] = useState([])
  const [alunos, setAlunos] = useState([])
  const [busca, setBusca] = useState('')
  const [filtroOficina, setFiltroOficina] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [mostrarFiltros, setMostrarFiltros] = useState(false)
  const [modalNovoItem, setModalNovoItem] = useState(false)
  const [contextoEmprestimo, setContextoEmprestimo] = useState(null)
  const [contextoDevolucao, setContextoDevolucao] = useState(null)

  const podeCadastrarItem = Boolean(isDiretor || isDev)
  const podeMovimentar = !somenteLeitura

  const carregarDados = useCallback(async () => {
    if (!perfil?.id) return

    setLoading(true)
    setErroCarregamento('')

    try {
      const { data: oficinasData, error: erroOficinas } = await supabase
        .from('oficinas')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome')

      if (erroOficinas) throw erroOficinas

      let oficinasPermitidas = oficinasData || []

      if (!isDiretor && !isDev) {
        const { data: turmasProfessor, error: erroTurmas } = await supabase
          .from('turmas')
          .select('oficina_id, oficinas(id, nome)')
          .eq('professor_id', perfil.id)
          .eq('ativa', true)

        if (erroTurmas) throw erroTurmas

        const idsPermitidos = new Set((turmasProfessor || []).map(turma => turma.oficina_id).filter(Boolean))
        oficinasPermitidas = (oficinasData || []).filter(oficina => idsPermitidos.has(oficina.id))
      }

      const idsOficinasPermitidas = oficinasPermitidas.map(oficina => oficina.id)

      if (idsOficinasPermitidas.length === 0) {
        setOficinas([])
        setItens([])
        setEmprestimos([])
        setAlunos([])
        setLoading(false)
        return
      }

      const itensQuery = supabase
        .from('inventario_itens')
        .select(`
          id,
          nome,
          categoria,
          oficina_id,
          modo_controle,
          quantidade_total,
          marca,
          modelo,
          numero_patrimonio,
          numero_serie,
          estado,
          descricao,
          ativo,
          created_at,
          updated_at,
          oficinas (id, nome)
        `)
        .eq('ativo', true)
        .in('oficina_id', idsOficinasPermitidas)
        .order('nome')

      const emprestimosQuery = supabase
        .from('inventario_emprestimos')
        .select(`
          id,
          inventario_item_id,
          aluno_id,
          oficina_id,
          turma_id,
          quantidade,
          periodo_letivo,
          data_emprestimo,
          data_devolucao,
          status,
          estado_emprestimo,
          estado_devolucao,
          foto_entrega_path,
          foto_devolucao_path,
          observacoes_emprestimo,
          observacoes_devolucao,
          created_at,
          updated_at,
          inventario_itens (
            id,
            nome,
            categoria,
            modo_controle,
            quantidade_total,
            numero_patrimonio,
            numero_serie
          ),
          alunos (
            id,
            nome,
            numero_matricula,
            foto_url
          ),
          oficinas (
            id,
            nome
          )
        `)
        .in('oficina_id', idsOficinasPermitidas)
        .eq('periodo_letivo', periodoLetivo)
        .order('created_at', { ascending: false })

      const matriculasQuery = supabase
        .from('matriculas_oficinas')
        .select(`
          oficina_id,
          oficinas (id, nome),
          alunos!inner (
            id,
            nome,
            numero_matricula,
            foto_url,
            status
          )
        `)
        .in('oficina_id', idsOficinasPermitidas)
        .eq('periodo_letivo', periodoLetivo)
        .eq('alunos.status', 'ativo')

      const [
        { data: itensData, error: erroItens },
        { data: emprestimosData, error: erroEmprestimos },
        { data: matriculasData, error: erroMatriculas },
      ] = await Promise.all([itensQuery, emprestimosQuery, matriculasQuery])

      if (erroItens) throw erroItens
      if (erroEmprestimos) throw erroEmprestimos
      if (erroMatriculas) throw erroMatriculas

      const emprestimosComFotos = await attachSignedUrls(emprestimosData || [])

      setOficinas(oficinasPermitidas)
      setItens(
        (itensData || []).map(item => ({
          ...item,
          oficina: unwrapRelation(item.oficinas),
        })),
      )
      setEmprestimos(
        emprestimosComFotos.map(emprestimo => {
          const item = unwrapRelation(emprestimo.inventario_itens)
          const aluno = unwrapRelation(emprestimo.alunos)
          const oficina = unwrapRelation(emprestimo.oficinas)

          return {
            ...emprestimo,
            item_nome: item?.nome || 'Item',
            categoria: item?.categoria || 'Outro',
            numero_patrimonio: item?.numero_patrimonio || null,
            numero_serie: item?.numero_serie || null,
            aluno_nome: aluno?.nome || 'Aluno',
            aluno_foto: aluno?.foto_url || null,
            numero_matricula: aluno?.numero_matricula || '',
            oficina_nome: oficina?.nome || 'Oficina',
          }
        }),
      )
      setAlunos(groupStudentsByOffice(matriculasData || []))
    } catch (error) {
      console.error('Erro ao carregar inventário:', error)
      const message = error?.message || 'Não foi possível carregar o inventário.'
      setErroCarregamento(
        /inventario_itens|inventario_emprestimos/i.test(message)
          ? 'O módulo foi integrado ao sistema, mas as tabelas do Inventário ainda não existem no banco. Execute a migration `supabase/migrations/20260819_inventario.sql` no Supabase e recarregue a página.'
          : message,
      )
      setOficinas([])
      setItens([])
      setEmprestimos([])
      setAlunos([])
    } finally {
      setLoading(false)
    }
  }, [isDev, isDiretor, periodoLetivo, perfil?.id])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  useEffect(() => {
    if (oficinas.length === 1 && !filtroOficina) {
      setFiltroOficina(oficinas[0].id)
    }

    if (filtroOficina && !oficinas.some(oficina => oficina.id === filtroOficina)) {
      setFiltroOficina('')
    }
  }, [filtroOficina, oficinas])

  const emprestimosAtivos = useMemo(
    () => emprestimos.filter(emprestimo => emprestimo.status === 'emprestado' && !emprestimo.data_devolucao),
    [emprestimos],
  )

  const ativosPorItem = useMemo(
    () => buildActiveLoanMap(emprestimosAtivos),
    [emprestimosAtivos],
  )

  const buscaNormalizada = normalizeText(busca)

  const itensFiltradosPorOficina = useMemo(
    () => itens.filter(item => !filtroOficina || item.oficina_id === filtroOficina),
    [filtroOficina, itens],
  )

  const resumoEstoque = useMemo(() => {
    const map = new Map()

    for (const item of itensFiltradosPorOficina) {
      const emprestado = ativosPorItem.get(item.id) || 0
      const total = Number(item.quantidade_total) || 1
      const key = `${item.oficina_id}::${item.categoria}::${normalizeText(item.nome)}`

      if (!map.has(key)) {
        map.set(key, {
          key,
          nome: item.nome,
          categoria: item.categoria,
          oficina_nome: item.oficina?.nome || 'Oficina',
          total: 0,
          emprestado: 0,
          item_count: 0,
        })
      }

      const current = map.get(key)
      current.total += total
      current.emprestado += emprestado
      current.item_count += 1
    }

    return [...map.values()]
      .map(item => ({
        ...item,
        disponivel: Math.max(item.total - item.emprestado, 0),
      }))
      .filter(item => !buscaNormalizada || normalizeText(`${item.nome} ${item.oficina_nome}`).includes(buscaNormalizada))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  }, [ativosPorItem, buscaNormalizada, itensFiltradosPorOficina])

  const emprestimosAtivosPorAluno = useMemo(() => {
    const map = new Map()

    for (const emprestimo of emprestimosAtivos) {
      if (!map.has(emprestimo.aluno_id)) {
        map.set(emprestimo.aluno_id, [])
      }

      map.get(emprestimo.aluno_id).push(emprestimo)
    }

    return map
  }, [emprestimosAtivos])

  const alunosFiltrados = useMemo(() => {
    return alunos
      .filter(aluno => {
        const oficinasAluno = aluno.oficinas || []
        const emprestimosAluno = emprestimosAtivosPorAluno.get(aluno.id) || []

        if (filtroOficina && !oficinasAluno.some(oficina => oficina.id === filtroOficina)) {
          return false
        }

        if (filtroStatus === 'com-emprestimo' && emprestimosAluno.length === 0) {
          return false
        }

        if (filtroStatus === 'sem-emprestimo' && emprestimosAluno.length > 0) {
          return false
        }

        if (!buscaNormalizada) return true

        const estoqueDoAluno = emprestimosAluno.map(emprestimo => emprestimo.item_nome).join(' ')
        return normalizeText(`${aluno.nome} ${aluno.numero_matricula} ${estoqueDoAluno}`).includes(buscaNormalizada)
      })
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  }, [alunos, buscaNormalizada, emprestimosAtivosPorAluno, filtroOficina, filtroStatus])

  const movimentacoesRecentes = useMemo(() => {
    return emprestimos
      .filter(emprestimo => !filtroOficina || emprestimo.oficina_id === filtroOficina)
      .filter(emprestimo => {
        if (!buscaNormalizada) return true
        return normalizeText(`${emprestimo.aluno_nome} ${emprestimo.item_nome} ${emprestimo.oficina_nome}`).includes(buscaNormalizada)
      })
      .slice(0, 8)
  }, [buscaNormalizada, emprestimos, filtroOficina])

  const totalEstoque = useMemo(
    () => itensFiltradosPorOficina.reduce((total, item) => total + (Number(item.quantidade_total) || 1), 0),
    [itensFiltradosPorOficina],
  )

  const totalEmprestado = useMemo(
    () => itensFiltradosPorOficina.reduce((total, item) => total + (ativosPorItem.get(item.id) || 0), 0),
    [ativosPorItem, itensFiltradosPorOficina],
  )

  const totalDisponivel = Math.max(totalEstoque - totalEmprestado, 0)

  const alunosComMaterial = useMemo(() => {
    const ids = new Set(
      emprestimosAtivos
        .filter(emprestimo => !filtroOficina || emprestimo.oficina_id === filtroOficina)
        .map(emprestimo => emprestimo.aluno_id),
    )
    return ids.size
  }, [emprestimosAtivos, filtroOficina])

  function abrirEmprestimo(aluno = null) {
    setContextoEmprestimo({
      aluno_id: aluno?.id || null,
      oficina_id: filtroOficina || aluno?.oficinas?.[0]?.id || '',
    })
  }

  function abrirDevolucao(aluno) {
    const ativos = emprestimosAtivosPorAluno.get(aluno.id) || []
    setContextoDevolucao({
      aluno,
      emprestimos: ativos,
    })
  }

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Inventário</h1>
          <p className="text-mis-texto2 text-sm mt-1">
            Controle de itens por oficina, aluno e período letivo.
          </p>
        </div>

        <div className="flex flex-col gap-2 shrink-0">
          <button
            onClick={() => abrirEmprestimo()}
            disabled={!podeMovimentar || itens.length === 0 || alunos.length === 0}
            className="btn-secondary flex items-center gap-2 px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check size={14} /> Entregar item
          </button>

          {podeCadastrarItem && (
            <button
              onClick={() => setModalNovoItem(true)}
              disabled={!podeMovimentar}
              className="btn-primary flex items-center gap-2 px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={14} /> Cadastrar item
            </button>
          )}
        </div>
      </div>

      {somenteLeitura && (
        <div className="mis-card border-amarelo/30 bg-amarelo/5">
          <div className="flex items-start gap-3">
            <ShieldAlert size={18} className="text-amarelo mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-mis-texto">
                Período {periodoLetivo} em modo de consulta
              </p>
              <p className="text-xs text-mis-texto2 mt-1">
                Cadastros e movimentações estão bloqueados fora do período atual ({PERIODO_ATUAL}).
              </p>
            </div>
          </div>
        </div>
      )}

      {erroCarregamento && (
        <div className="mis-card border-red-900/40">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-400">Inventário indisponível</p>
              <p className="text-xs text-mis-texto2 mt-1 whitespace-pre-line">
                {erroCarregamento}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <MetricCard
          icon={Boxes}
          label="Itens em estoque"
          value={loading ? '…' : totalEstoque}
          hint="Soma das unidades cadastradas"
          bgClass="bg-amarelo/10"
          iconClass="text-amarelo"
        />

        <MetricCard
          icon={Package}
          label="Disponíveis"
          value={loading ? '…' : totalDisponivel}
          hint="Livres para novos empréstimos"
          bgClass="bg-verde/10"
          iconClass="text-verde"
        />

        <MetricCard
          icon={ClipboardList}
          label="Emprestados"
          value={loading ? '…' : totalEmprestado}
          hint={`Período ${periodoLetivo}`}
          bgClass="bg-azul/10"
          iconClass="text-azul"
        />

        <MetricCard
          icon={Users}
          label="Alunos com material"
          value={loading ? '…' : alunosComMaterial}
          hint="Com vínculo ativo"
          bgClass="bg-marrom/10"
          iconClass="text-marrom"
        />
      </div>

      <div className="mis-card">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-mis-texto2" />
            <input
              className="mis-input pl-9"
              placeholder="Buscar aluno, item ou matrícula..."
              value={busca}
              onChange={event => setBusca(event.target.value)}
            />
          </div>

          <button
            onClick={() => setMostrarFiltros(prev => !prev)}
            className={`btn-secondary flex items-center gap-2 px-4 ${mostrarFiltros ? 'border-amarelo text-amarelo' : ''}`}
          >
            <SlidersHorizontal size={16} />
            Filtros
          </button>
        </div>

        {mostrarFiltros && (
          <div className="mt-4 pt-4 border-t border-mis-borda grid grid-cols-1 md:grid-cols-2 gap-3 animate-fade-in">
            <div>
              <label className="mis-label">Oficina</label>
              <select
                className="mis-input"
                value={filtroOficina}
                onChange={event => setFiltroOficina(event.target.value)}
              >
                <option value="">Todas as oficinas</option>
                {oficinas.map(oficina => (
                  <option key={oficina.id} value={oficina.id}>
                    {oficina.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mis-label">Status dos alunos</label>
              <select
                className="mis-input"
                value={filtroStatus}
                onChange={event => setFiltroStatus(event.target.value)}
              >
                <option value="todos">Todos</option>
                <option value="com-emprestimo">Com item</option>
                <option value="sem-emprestimo">Sem item</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_1.4fr] gap-4">
        <div className="mis-card">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="section-title">Resumo do Estoque</h2>
              <p className="text-xs text-mis-texto2 mt-1">
                Quantidade total, emprestada e disponível por item.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-amarelo border-t-transparent rounded-full animate-spin" />
                <span className="text-mis-texto2 text-sm">Carregando estoque...</span>
              </div>
            </div>
          ) : resumoEstoque.length === 0 ? (
            <div className="py-14 text-center">
              <Boxes size={34} className="text-mis-borda mx-auto mb-3" />
              <p className="text-sm font-semibold text-mis-texto">
                Nenhum item cadastrado
              </p>
              <p className="text-xs text-mis-texto2 mt-1">
                {podeCadastrarItem
                  ? 'Cadastre o primeiro item do Inventário para começar o controle.'
                  : 'O diretor ainda não cadastrou itens para as oficinas visíveis neste perfil.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[34rem] overflow-y-auto pr-1">
              {resumoEstoque.map(item => (
                <div key={item.key} className="bg-mis-bg3 border border-mis-borda rounded-xl p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-mis-texto truncate">{item.nome}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        <span className="badge badge-amarelo">{item.categoria}</span>
                        <span className="badge badge-gray">{item.oficina_nome}</span>
                      </div>
                    </div>

                    <span className={`badge ${
                      item.disponivel === 0
                        ? 'badge-red'
                        : item.emprestado > 0
                          ? 'badge-azul'
                          : 'badge-verde'
                    }`}>
                      {item.disponivel === 0
                        ? 'Esgotado'
                        : item.emprestado > 0
                          ? 'Em uso'
                          : 'Disponível'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {[
                      { label: 'Total', value: item.total, color: 'text-mis-texto' },
                      { label: 'Emprestado', value: item.emprestado, color: 'text-azul' },
                      { label: 'Disponível', value: item.disponivel, color: 'text-verde' },
                    ].map(stat => (
                      <div key={stat.label} className="rounded-lg bg-mis-bg2 border border-mis-borda px-3 py-2">
                        <p className={`text-sm font-black ${stat.color}`}>{stat.value}</p>
                        <p className="text-[11px] text-mis-texto2 mt-0.5">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mis-card">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="section-title">Alunos por Oficina</h2>
              <p className="text-xs text-mis-texto2 mt-1">
                Cards com foto, vínculo atual e ações de empréstimo/devolução.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-amarelo border-t-transparent rounded-full animate-spin" />
                <span className="text-mis-texto2 text-sm">Carregando alunos...</span>
              </div>
            </div>
          ) : alunosFiltrados.length === 0 ? (
            <div className="py-14 text-center">
              <Users size={34} className="text-mis-borda mx-auto mb-3" />
              <p className="text-sm font-semibold text-mis-texto">
                Nenhum aluno encontrado
              </p>
              <p className="text-xs text-mis-texto2 mt-1">
                Ajuste o filtro de oficina ou a busca para localizar os cards.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[34rem] overflow-y-auto pr-1">
              {alunosFiltrados.map(aluno => {
                const emprestimosAluno = emprestimosAtivosPorAluno.get(aluno.id) || []
                const temItem = emprestimosAluno.length > 0

                return (
                  <div key={aluno.id} className="bg-mis-bg3 border border-mis-borda rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amarelo/20 to-amarelo/5 border border-amarelo/20 flex items-center justify-center overflow-hidden shrink-0">
                        {aluno.foto_url ? (
                          <img
                            src={aluno.foto_url}
                            alt={aluno.nome}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-base font-black text-amarelo">
                            {getInitials(aluno.nome)}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-mis-texto truncate">
                            {aluno.nome}
                          </p>

                          <span className={`badge ${temItem ? 'badge-verde' : 'badge-gray'}`}>
                            {temItem ? 'Com item' : 'Sem item'}
                          </span>
                        </div>

                        <p className="text-xs text-mis-texto2 font-mono mt-0.5">
                          {aluno.numero_matricula}
                        </p>

                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {aluno.oficinas.map(oficina => (
                            <span key={oficina.id} className="badge badge-amarelo">
                              {oficina.nome}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      {temItem ? emprestimosAluno.map(emprestimo => (
                        <div key={emprestimo.id} className="rounded-xl bg-mis-bg2 border border-mis-borda px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-mis-texto truncate">
                              {emprestimo.item_nome}
                              {emprestimo.numero_patrimonio ? ` · ${emprestimo.numero_patrimonio}` : ''}
                            </p>

                            <span className="badge badge-azul">
                              {emprestimo.quantidade > 1 ? `${emprestimo.quantidade} un.` : '1 un.'}
                            </span>
                          </div>

                          <p className="text-xs text-mis-texto2 mt-1">
                            Desde {formatDateBr(emprestimo.data_emprestimo || DATA_INICIAL_REGISTROS)}
                          </p>
                        </div>
                      )) : (
                        <div className="rounded-xl bg-mis-bg2 border border-dashed border-mis-borda px-3 py-4 text-center">
                          <p className="text-sm text-mis-texto2">
                            Nenhum item vinculado no período {periodoLetivo}.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => abrirEmprestimo(aluno)}
                        disabled={!podeMovimentar || itensFiltradosPorOficina.length === 0}
                        className="btn-secondary flex-1 flex items-center justify-center gap-2 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Check size={14} /> Entregar
                      </button>

                      <button
                        onClick={() => abrirDevolucao(aluno)}
                        disabled={!podeMovimentar || !temItem}
                        className="btn-primary flex-1 flex items-center justify-center gap-2 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Undo2 size={14} /> Devolver
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="mis-card">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="section-title">Movimentações Recentes</h2>
            <p className="text-xs text-mis-texto2 mt-1">
              Empréstimos e devoluções do período {periodoLetivo}.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader size={18} className="animate-spin text-amarelo" />
          </div>
        ) : movimentacoesRecentes.length === 0 ? (
          <p className="text-sm text-mis-texto2 text-center py-8">
            Nenhuma movimentação registrada ainda.
          </p>
        ) : (
          <div className="space-y-2">
            {movimentacoesRecentes.map(emprestimo => (
              <div key={emprestimo.id} className="bg-mis-bg3 border border-mis-borda rounded-xl p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-mis-texto truncate">
                        {emprestimo.aluno_nome}
                      </p>
                      <span className={`badge ${emprestimo.status === 'devolvido' ? 'badge-gray' : 'badge-verde'}`}>
                        {emprestimo.status === 'devolvido' ? 'Devolvido' : 'Emprestado'}
                      </span>
                    </div>

                    <p className="text-xs text-mis-texto2 mt-1">
                      {emprestimo.item_nome}
                      {emprestimo.numero_patrimonio ? ` · Patrimônio ${emprestimo.numero_patrimonio}` : ''}
                      {' · '}
                      {emprestimo.oficina_nome}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xs text-amarelo font-bold">
                      {formatDateShort(emprestimo.status === 'devolvido'
                        ? emprestimo.data_devolucao
                        : emprestimo.data_emprestimo)}
                    </p>
                    <p className="text-[11px] text-mis-texto2 mt-0.5">
                      {emprestimo.quantidade > 1 ? `${emprestimo.quantidade} un.` : '1 un.'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalNovoItem && (
        <ModalNovoItem
          oficinas={oficinas}
          oficinaInicial={filtroOficina}
          perfil={perfil}
          onClose={() => setModalNovoItem(false)}
          onSaved={() => {
            setModalNovoItem(false)
            carregarDados()
          }}
        />
      )}

      {contextoEmprestimo && (
        <ModalEmprestimo
          oficinas={oficinas}
          alunos={alunos}
          itens={itens}
          emprestimosAtivos={emprestimosAtivos}
          contexto={contextoEmprestimo}
          perfil={perfil}
          periodoLetivo={periodoLetivo}
          onClose={() => setContextoEmprestimo(null)}
          onSaved={() => {
            setContextoEmprestimo(null)
            carregarDados()
          }}
        />
      )}

      {contextoDevolucao && (
        <ModalDevolucao
          aluno={contextoDevolucao.aluno}
          emprestimos={contextoDevolucao.emprestimos}
          perfil={perfil}
          onClose={() => setContextoDevolucao(null)}
          onSaved={() => {
            setContextoDevolucao(null)
            carregarDados()
          }}
        />
      )}
    </div>
  )
}
