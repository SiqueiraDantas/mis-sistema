import { useState } from 'react'
import { supabase } from '../../services/supabase'
import {
  Music,
  ChevronRight,
  ChevronLeft,
  Check,
  AlertCircle,
  User,
  Guitar,
  Users,
} from 'lucide-react'

const OFICINAS = [
  'Flauta Doce', 'Clarinete', 'Trompete', 'Trombone', 'Saxofone',
  'Trompa', 'Euphonio', 'Tuba', 'Percussão', 'Bateria',
  'Flauta Transversal', 'Flauta Doce (Macaoca)', 'Violão (Macaoca)',
]

const ESCOLAS = [
  'CEI José Alzir Silva Lima',
  'CEI José Hermínio Rodrigues do Nascimento',
  'CEI Mãe Toinha',
  'CEI Maria da Conceição Barros Pinho',
  'CEI Maria de Lourdes Bezerra Costa',
  'CEI Maria Mirtes Costa Salgado',
  'CEI Sara Rosita Ferreira',
  'CEI Terezinha Mariano Germano',
  'EEF 25 de Maio I',
  'EEF Álvaro de Araújo Carneiro',
  'EEF Dau Alberto',
  'EEF Francisco Correia Lima',
  'EEF João Costa',
  'EEF José Severo de Pinho',
  'EEF Margarida Alves',
  'EEF Padre Jaime Felício',
  'EEF Paula Queiroz',
  'EEF Vicente Patrício de Almeida',
  'EEIF Antonio Alves da Silva',
  'EEIF Comunidade Pau Ferros',
  'EEIF Damião Carneiro',
  'EEIF Eliônia Campos',
  'EEEP João Jackson Lobo Guerra',
  'EEEP Venceslau Vieira Batista',
  'EEM Alfredo Machado',
  'IEST Santa Teresinha Instituto Educacional',
  'IFCE Campus Boa Viagem',
]

const BAIRROS = [
  'Centro',
  'Santa Teresinha',
  'Henrique Jorge',
  'São José',
  'Boa Vista',
  'Alto da Alegria',
  'Bairro dos Pinhos',
  'Nova Madalena',
  'Madalena Velha',
  'Santana',
  'Macaoca',
  'Cajazeiras',
  'União',
  'Cacimba Nova',
  'Paus Branco',
]

const PROGRAMAS_SOCIAIS = ['Bolsa Família', 'Pé-de-Meia', 'Cesta Básica', 'Nenhum']
const ANO_ATUAL = new Date().getFullYear()

function StepIndicator({ step, total }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={`
              w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
              ${i + 1 < step
                ? 'bg-verde text-white'
                : i + 1 === step
                  ? 'bg-amarelo text-black'
                  : 'bg-mis-bg3 text-mis-texto2 border border-mis-borda'}
            `}
          >
            {i + 1 < step ? <Check size={14} /> : i + 1}
          </div>
          {i < total - 1 && (
            <div className={`w-8 h-0.5 ${i + 1 < step ? 'bg-verde' : 'bg-mis-borda'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

function Label({ children, required }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-widest text-mis-texto2 mb-1.5">
      {children} {required && <span className="text-amarelo">*</span>}
    </label>
  )
}

function Input({ label, required, error, ...props }) {
  return (
    <div>
      {label && <Label required={required}>{label}</Label>}
      <input
        className={`w-full bg-mis-bg3 border ${error ? 'border-red-500' : 'border-mis-borda'} text-mis-texto rounded-lg px-3 py-2.5 text-sm font-poppins outline-none transition-colors focus:border-amarelo placeholder:text-mis-texto2`}
        {...props}
      />
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  )
}

function Select({ label, required, error, children, ...props }) {
  return (
    <div>
      {label && <Label required={required}>{label}</Label>}
      <select
        className={`w-full bg-mis-bg3 border ${error ? 'border-red-500' : 'border-mis-borda'} text-mis-texto rounded-lg px-3 py-2.5 text-sm font-poppins outline-none transition-colors focus:border-amarelo`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  )
}

export default function Matricula() {
  const [step, setStep] = useState(1)
  const [enviado, setEnviado] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erroGeral, setErroGeral] = useState('')
  const [numeroMatricula, setNumeroMatricula] = useState('')
  const [erros, setErros] = useState({})
  const [aceitouTermos, setAceitouTermos] = useState(false)

  const [form, setForm] = useState({
    nome: '',
    idade: '',
    cpf: '',
    telefone: '',
    sexo: '',
    raca: '',
    religiao: '',
    escola: '',
    bairro: '',
    rede_ensino: '',
    tipo_matricula: 'matricula',
    pcd: 'nao',
    oficinas: [],
    resp_nome: '',
    resp_telefone: '',
    resp_email: '',
    integrantes_familia: '',
    programas_sociais: [],
  })

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    setErros(e => ({ ...e, [field]: '' }))
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
      let lista = [...f.programas_sociais]

      if (programa === 'Nenhum') {
        return {
          ...f,
          programas_sociais: lista.includes('Nenhum') ? [] : ['Nenhum']
        }
      }

      lista = lista.filter(item => item !== 'Nenhum')

      return {
        ...f,
        programas_sociais: lista.includes(programa)
          ? lista.filter(item => item !== programa)
          : [...lista, programa]
      }
    })
  }

  function validarStep1() {
    const e = {}

    if (!form.nome.trim()) e.nome = 'Nome obrigatório'
    if (!form.idade) e.idade = 'Idade obrigatória'
    else if (Number(form.idade) < 8 || Number(form.idade) > 18) e.idade = 'Idade deve ser entre 8 e 18 anos'
    if (!form.cpf.trim()) e.cpf = 'CPF obrigatório'
    if (!form.telefone.trim()) e.telefone = 'Telefone obrigatório'
    if (form.oficinas.length === 0) e.oficinas = 'Selecione ao menos uma oficina'
    if (!form.sexo) e.sexo = 'Sexo obrigatório'
    if (!form.raca) e.raca = 'Raça obrigatória'
    if (!form.escola) e.escola = 'Escola obrigatória'
    if (!form.bairro) e.bairro = 'Bairro obrigatório'
    if (!form.rede_ensino) e.rede_ensino = 'Rede de ensino obrigatória'
    if (!form.tipo_matricula) e.tipo_matricula = 'Tipo de matrícula obrigatório'
    if (!form.pcd) e.pcd = 'Campo obrigatório'

    setErros(e)
    return Object.keys(e).length === 0
  }

  function validarStep2() {
    const e = {}

    if (!form.resp_nome.trim()) e.resp_nome = 'Nome do responsável obrigatório'
    if (!form.resp_telefone.trim()) e.resp_telefone = 'Telefone do responsável obrigatório'

    setErros(e)
    return Object.keys(e).length === 0
  }

  function avancar() {
    if (step === 1 && !validarStep1()) return
    if (step === 2 && !validarStep2()) return
    setStep(s => s + 1)
    window.scrollTo(0, 0)
  }

  function voltar() {
    setStep(s => s - 1)
    window.scrollTo(0, 0)
  }

  async function enviar() {
    if (!aceitouTermos) {
      setErroGeral('Você precisa aceitar os termos para continuar.')
      return
    }

    setLoading(true)
    setErroGeral('')

    try {
      const oficinasSelecionadas = [...new Set(form.oficinas)].filter(Boolean)

      if (oficinasSelecionadas.length === 0) {
        throw new Error('Nenhuma oficina foi selecionada.')
      }

      const numMatricula = `${ANO_ATUAL}-${form.tipo_matricula === 'rematricula' ? 'B' : 'A'}-MAD-${Date.now().toString().slice(-6)}`

      const { error: errAluno } = await supabase
        .from('alunos')
        .insert({
          numero_matricula: numMatricula,
          tipo: form.tipo_matricula,
          nome: form.nome.trim(),
          cpf: form.cpf.trim(),
          telefone: form.telefone.trim(),
          idade: form.idade ? Number(form.idade) : null,
          data_nascimento: null,
          sexo:
            form.sexo === 'Masculino'
              ? 'M'
              : form.sexo === 'Feminino'
                ? 'F'
                : 'O',
          raca: form.raca,
          religiao: form.religiao || null,
          bairro: form.bairro,
          rede_ensino: form.rede_ensino,
          escola_origem: form.escola,
          programa_social: form.programas_sociais,
          integrantes_familia: form.integrantes_familia
            ? Number(form.integrantes_familia)
            : null,
          pcd: form.pcd === 'sim',
          status: 'ativo',
          ano_letivo: ANO_ATUAL,
        })

      if (errAluno) throw errAluno

      const { data: alunoBuscado, error: errBuscaAluno } = await supabase
        .from('alunos')
        .select('id, numero_matricula')
        .eq('numero_matricula', numMatricula)
        .order('id', { ascending: false })
        .limit(1)
        .single()

      if (errBuscaAluno) throw errBuscaAluno

      const { error: errResponsavel } = await supabase
        .from('responsaveis')
        .insert({
          aluno_id: alunoBuscado.id,
          nome: form.resp_nome.trim(),
          telefone: form.resp_telefone.trim(),
          email: form.resp_email?.trim() || null,
        })

      if (errResponsavel) throw errResponsavel

      const { data: oficinasDB, error: errBuscaOficinas } = await supabase
        .from('oficinas')
        .select('id, nome')
        .in('nome', oficinasSelecionadas)

      if (errBuscaOficinas) throw errBuscaOficinas

      if (!oficinasDB || oficinasDB.length === 0) {
        throw new Error('Nenhuma oficina selecionada foi encontrada no banco.')
      }

      if (oficinasDB.length !== oficinasSelecionadas.length) {
        const nomesEncontrados = oficinasDB.map(o => o.nome)
        const nomesFaltando = oficinasSelecionadas.filter(nome => !nomesEncontrados.includes(nome))
        throw new Error(`Algumas oficinas não foram encontradas: ${nomesFaltando.join(', ')}`)
      }

      const payloadOficinas = oficinasDB.map(oficina => ({
        aluno_id: alunoBuscado.id,
        oficina_id: oficina.id,
        ano_letivo: ANO_ATUAL,
      }))

     const { error: errMatriculas } = await supabase
  .from('matriculas_oficinas')
  .upsert(payloadOficinas, { onConflict: 'aluno_id,oficina_id,ano_letivo' })
  
      if (errMatriculas) throw errMatriculas

      setNumeroMatricula(alunoBuscado.numero_matricula)
      setEnviado(true)
      window.scrollTo(0, 0)
    } catch (err) {
      console.error('Erro ao enviar matrícula:', err)
      setErroGeral(err?.message || 'Erro ao enviar matrícula. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (enviado) {
    return (
      <div className="min-h-screen bg-mis-bg flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-verde/20 border border-verde/30 rounded-full mb-6">
            <Check size={40} className="text-verde-light" />
          </div>

          <h1 className="text-2xl font-black text-mis-texto font-poppins mb-2">
            Matrícula Enviada!
          </h1>

          <p className="text-mis-texto2 text-sm mb-6">
            A matrícula de <strong className="text-mis-texto">{form.nome}</strong> foi registrada com sucesso.
          </p>

          <div className="mis-card mb-6">
            <p className="text-xs text-mis-texto2 mb-1 uppercase tracking-widest font-semibold">
              Número de Matrícula
            </p>
            <p className="text-2xl font-black text-amarelo font-mono">{numeroMatricula}</p>
            <p className="text-xs text-mis-texto2 mt-2">
              Guarde este número para consultas futuras.
            </p>
          </div>

          <div className="mis-card text-left">
            <p className="text-xs font-semibold text-mis-texto2 uppercase tracking-widest mb-3">
              Oficinas inscritas
            </p>
            <div className="flex flex-wrap gap-2">
              {form.oficinas.map(oficina => (
                <span key={oficina} className="badge badge-amarelo">
                  {oficina}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-mis-bg py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-amarelo rounded-2xl mb-4">
            <Music size={28} className="text-black" />
          </div>
          <h1 className="text-2xl font-black text-mis-texto font-poppins">Made In Sertão</h1>
          <p className="text-mis-texto2 text-sm mt-1">Portal de Matrícula {ANO_ATUAL}</p>
        </div>

        <StepIndicator step={step} total={3} />

        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div className="mis-card">
              <h2 className="section-title mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-amarelo/20 text-amarelo rounded flex items-center justify-center">
                  <User size={14} />
                </span>
                Dados do Aluno
              </h2>

              <div className="space-y-4">
                <Input
                  label="Nome completo"
                  required
                  placeholder="Nome do aluno"
                  value={form.nome}
                  onChange={e => set('nome', e.target.value)}
                  error={erros.nome}
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Idade"
                    required
                    type="number"
                    min="8"
                    max="18"
                    placeholder="Ex: 14"
                    value={form.idade}
                    onChange={e => set('idade', e.target.value)}
                    error={erros.idade}
                  />

                  <Input
                    label="CPF"
                    required
                    placeholder="000.000.000-00"
                    value={form.cpf}
                    onChange={e => set('cpf', e.target.value)}
                    error={erros.cpf}
                  />
                </div>

                <Input
                  label="Telefone"
                  required
                  placeholder="(00) 00000-0000"
                  value={form.telefone}
                  onChange={e => set('telefone', e.target.value)}
                  error={erros.telefone}
                />
              </div>
            </div>

            <div className="mis-card">
              <h2 className="section-title mb-1 flex items-center gap-2">
                <span className="w-6 h-6 bg-amarelo/20 text-amarelo rounded flex items-center justify-center">
                  <Guitar size={14} />
                </span>
                Oficinas
              </h2>

              <p className="text-xs text-mis-texto2 mb-4">Selecione uma ou mais oficinas.</p>

              <div className="grid grid-cols-2 gap-2">
                {OFICINAS.map(oficina => (
                  <button
                    key={oficina}
                    type="button"
                    onClick={() => toggleOficina(oficina)}
                    className={`
                      flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-left
                      border transition-all duration-150
                      ${form.oficinas.includes(oficina)
                        ? 'bg-amarelo/15 border-amarelo text-amarelo'
                        : 'bg-mis-bg3 border-mis-borda text-mis-texto2 hover:border-amarelo/50'}
                    `}
                  >
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                        form.oficinas.includes(oficina)
                          ? 'bg-amarelo border-amarelo'
                          : 'border-mis-borda'
                      }`}
                    >
                      {form.oficinas.includes(oficina) && <Check size={10} className="text-black" />}
                    </div>
                    {oficina}
                  </button>
                ))}
              </div>

              {erros.oficinas && <p className="text-red-400 text-xs mt-2">{erros.oficinas}</p>}
            </div>

            <div className="mis-card">
              <h2 className="section-title mb-4">Informações Complementares</h2>

              <div className="space-y-4">
                <Select
                  label="Sexo"
                  required
                  value={form.sexo}
                  onChange={e => set('sexo', e.target.value)}
                  error={erros.sexo}
                >
                  <option value="">Selecione</option>
                  <option>Masculino</option>
                  <option>Feminino</option>
                  <option>Outro</option>
                </Select>

                <Select
                  label="Raça"
                  required
                  value={form.raca}
                  onChange={e => set('raca', e.target.value)}
                  error={erros.raca}
                >
                  <option value="">Selecione</option>
                  <option>Branca</option>
                  <option>Preta</option>
                  <option>Parda</option>
                  <option>Amarela</option>
                  <option>Indígena</option>
                  <option>Prefiro não informar</option>
                </Select>

                <Select
                  label="Religião"
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
                </Select>

                <Select
                  label="Escola onde estuda"
                  required
                  value={form.escola}
                  onChange={e => set('escola', e.target.value)}
                  error={erros.escola}
                >
                  <option value="">Selecione a escola</option>
                  {ESCOLAS.map(escola => (
                    <option key={escola}>{escola}</option>
                  ))}
                </Select>

                <Select
                  label="Bairro onde mora"
                  required
                  value={form.bairro}
                  onChange={e => set('bairro', e.target.value)}
                  error={erros.bairro}
                >
                  <option value="">Selecione o bairro</option>
                  {BAIRROS.map(bairro => (
                    <option key={bairro}>{bairro}</option>
                  ))}
                </Select>

                <Select
                  label="Rede de Ensino"
                  required
                  value={form.rede_ensino}
                  onChange={e => set('rede_ensino', e.target.value)}
                  error={erros.rede_ensino}
                >
                  <option value="">Selecione</option>
                  <option>Pública</option>
                  <option>Privada</option>
                  <option>Não estuda</option>
                </Select>

                <Select
                  label="Tipo de Matrícula"
                  required
                  value={form.tipo_matricula}
                  onChange={e => set('tipo_matricula', e.target.value)}
                  error={erros.tipo_matricula}
                >
                  <option value="matricula">Matrícula (novo aluno)</option>
                  <option value="rematricula">Rematrícula (aluno já inscrito)</option>
                </Select>

                <div>
                  <Label required>PCD (Pessoa com Deficiência)?</Label>
                  <div className="flex gap-3 mt-1">
                    {['nao', 'sim'].map(valor => (
                      <button
                        key={valor}
                        type="button"
                        onClick={() => set('pcd', valor)}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-all ${
                          form.pcd === valor
                            ? 'bg-amarelo/15 border-amarelo text-amarelo'
                            : 'bg-mis-bg3 border-mis-borda text-mis-texto2'
                        }`}
                      >
                        {valor === 'nao' ? 'Não' : 'Sim'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="mis-card">
              <h2 className="section-title mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-azul/20 text-azul rounded flex items-center justify-center">
                  <Users size={14} />
                </span>
                Dados do Responsável
              </h2>

              <div className="space-y-4">
                <Input
                  label="Nome completo"
                  required
                  placeholder="Nome do responsável"
                  value={form.resp_nome}
                  onChange={e => set('resp_nome', e.target.value)}
                  error={erros.resp_nome}
                />

                <Input
                  label="Telefone"
                  required
                  placeholder="(00) 00000-0000"
                  value={form.resp_telefone}
                  onChange={e => set('resp_telefone', e.target.value)}
                  error={erros.resp_telefone}
                />

                <Input
                  label="E-mail"
                  type="email"
                  placeholder="email@exemplo.com (opcional)"
                  value={form.resp_email}
                  onChange={e => set('resp_email', e.target.value)}
                />

                <Input
                  label="Nº de Integrantes na Família"
                  type="number"
                  min="1"
                  placeholder="Ex: 4"
                  value={form.integrantes_familia}
                  onChange={e => set('integrantes_familia', e.target.value)}
                />

                <div>
                  <Label>Programas Sociais</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {PROGRAMAS_SOCIAIS.map(programa => (
                      <button
                        key={programa}
                        type="button"
                        onClick={() => togglePrograma(programa)}
                        className={`
                          flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-left
                          border transition-all duration-150
                          ${form.programas_sociais.includes(programa)
                            ? 'bg-azul/15 border-azul text-azul-light'
                            : 'bg-mis-bg3 border-mis-borda text-mis-texto2 hover:border-azul/50'}
                        `}
                      >
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                            form.programas_sociais.includes(programa)
                              ? 'bg-azul border-azul'
                              : 'border-mis-borda'
                          }`}
                        >
                          {form.programas_sociais.includes(programa) && (
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
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <div className="mis-card">
              <h2 className="section-title mb-4">Revisão dos Dados</h2>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-mis-borda">
                  <span className="text-mis-texto2">Aluno</span>
                  <span className="text-mis-texto font-medium">{form.nome}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-mis-borda">
                  <span className="text-mis-texto2">Idade</span>
                  <span className="text-mis-texto">{form.idade} anos</span>
                </div>

                <div className="flex justify-between py-2 border-b border-mis-borda">
                  <span className="text-mis-texto2">CPF</span>
                  <span className="text-mis-texto">{form.cpf}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-mis-borda">
                  <span className="text-mis-texto2">Tipo</span>
                  <span className="text-mis-texto capitalize">{form.tipo_matricula}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-mis-borda">
                  <span className="text-mis-texto2">Escola</span>
                  <span className="text-mis-texto text-right max-w-[60%]">{form.escola}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-mis-borda">
                  <span className="text-mis-texto2">Bairro</span>
                  <span className="text-mis-texto">{form.bairro}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-mis-borda">
                  <span className="text-mis-texto2">Responsável</span>
                  <span className="text-mis-texto">{form.resp_nome}</span>
                </div>

                <div className="py-2">
                  <span className="text-mis-texto2 block mb-2">Oficinas</span>
                  <div className="flex flex-wrap gap-1">
                    {form.oficinas.map(oficina => (
                      <span key={oficina} className="badge badge-amarelo">
                        {oficina}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mis-card border border-amarelo/20">
              <h3 className="text-sm font-bold text-mis-texto mb-3 flex items-center gap-2">
                <AlertCircle size={16} className="text-amarelo" />
                Termo de Uso de Imagem
              </h3>

              <p className="text-xs text-mis-texto2 leading-relaxed mb-4">
                Ao enviar esta matrícula, o responsável legal declara estar ciente e de acordo que a
                <strong className="text-mis-texto"> Escola de Música Made In Sertão</strong> poderá
                utilizar imagens e vídeos do(a) aluno(a) capturados durante as atividades do programa
                para fins de divulgação institucional em redes sociais, materiais gráficos, relatórios
                e demais canais de comunicação oficiais da escola, sem qualquer ônus. O responsável
                poderá revogar esta autorização a qualquer momento mediante solicitação formal à
                coordenação da escola.
              </p>

              <button
                type="button"
                onClick={() => setAceitouTermos(!aceitouTermos)}
                className={`
                  flex items-center gap-3 w-full text-left px-3 py-2 rounded-lg border transition-all
                  ${aceitouTermos ? 'bg-verde/10 border-verde/40' : 'bg-mis-bg3 border-mis-borda'}
                `}
              >
                <div
                  className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${
                    aceitouTermos ? 'bg-verde border-verde' : 'border-mis-borda'
                  }`}
                >
                  {aceitouTermos && <Check size={12} className="text-white" />}
                </div>
                <span className="text-xs text-mis-texto">
                  Li e estou de acordo com o termo de uso de imagem.
                </span>
              </button>
            </div>

            {erroGeral && (
              <div className="bg-red-900/30 border border-red-800 text-red-400 text-sm rounded-lg px-4 py-3 flex items-center gap-2">
                <AlertCircle size={16} />
                {erroGeral}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 mt-6">
          {step > 1 && (
            <button
              type="button"
              onClick={voltar}
              className="btn-secondary flex items-center gap-2 px-5 py-3"
            >
              <ChevronLeft size={16} />
              Voltar
            </button>
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={avancar}
              className="btn-primary flex-1 flex items-center justify-center gap-2 py-3"
            >
              Próximo <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={enviar}
              disabled={loading}
              className="btn-primary flex-1 flex items-center justify-center gap-2 py-3"
            >
              {loading
                ? <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                : 'Enviar Matrícula'}
            </button>
          )}
        </div>

        <p className="text-center text-xs text-mis-texto2 mt-6 pb-8">
          Made In Sertão — Escola de Música de Madalena © {ANO_ATUAL}
        </p>
      </div>
    </div>
  )
}