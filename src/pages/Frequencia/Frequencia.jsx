import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabase'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  Users,
  Save,
  Loader,
  CheckCircle,
  BookOpen
} from 'lucide-react'

const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro'
]

const ANO_ATUAL = new Date().getFullYear()

// Período letivo que será utilizado nesta página
const PERIODO_ATUAL = '2026.2'

const STATUS_CONFIG = {
  presente: {
    label: 'P',
    cor: 'bg-verde text-white',
    borda: 'border-verde',
    hover: 'hover:bg-verde/80'
  },

  ausente: {
    label: 'F',
    cor: 'bg-red-500 text-white',
    borda: 'border-red-500',
    hover: 'hover:bg-red-400'
  },

  justificado: {
    label: 'J',
    cor: 'bg-amarelo text-black',
    borda: 'border-amarelo',
    hover: 'hover:bg-amarelo/80'
  },

  vazio: {
    label: '—',
    cor: 'bg-mis-bg3 text-mis-texto2',
    borda: 'border-mis-borda',
    hover: 'hover:bg-mis-borda/50'
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// MODAL AULA
// ─────────────────────────────────────────────────────────────────────────────

function ModalAula({
  turma,
  data,
  alunos,
  frequencias,
  onSalvar,
  onClose
}) {
  const [local, setLocal] = useState(() => {
    const map = {}

    alunos.forEach(aluno => {
      const frequencia = frequencias.find(
        f =>
          f.aluno_id === aluno.id &&
          f.data_aula === data
      )

      map[aluno.id] = frequencia?.status || null
    })

    return map
  })

  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')


  function marcarTodos(status) {
    const novo = {}

    alunos.forEach(aluno => {
      novo[aluno.id] = status
    })

    setLocal(novo)
  }


  async function salvar() {
    setSalvando(true)
    setErro('')

    try {
      const upserts = alunos
        .filter(aluno => local[aluno.id] !== null)
        .map(aluno => ({
          turma_id: turma.id,
          aluno_id: aluno.id,
          data_aula: data,
          status: local[aluno.id]
        }))


      const deletes = alunos.filter(
        aluno => local[aluno.id] === null
      )


      // Salva ou atualiza frequências
      if (upserts.length > 0) {
        const { error } = await supabase
          .from('frequencias')
          .upsert(
            upserts,
            {
              onConflict: 'turma_id,aluno_id,data_aula'
            }
          )

        if (error) {
          throw error
        }
      }


      // Remove frequência caso o status tenha sido desmarcado
      for (const aluno of deletes) {
        const { error } = await supabase
          .from('frequencias')
          .delete()
          .eq('turma_id', turma.id)
          .eq('aluno_id', aluno.id)
          .eq('data_aula', data)

        if (error) {
          throw error
        }
      }


      onSalvar()

    } catch (e) {

      console.error('Erro ao salvar frequência:', e)

      setErro(
        'Erro ao salvar: ' +
        (e?.message || 'Erro desconhecido')
      )

    } finally {

      setSalvando(false)

    }
  }


  const [yyyy, mm, dd] = data.split('-')

  const dataFmt = `${dd}/${mm}/${yyyy}`


  const presentes = Object
    .values(local)
    .filter(status => status === 'presente')
    .length


  const ausentes = Object
    .values(local)
    .filter(status => status === 'ausente')
    .length


  const justificados = Object
    .values(local)
    .filter(status => status === 'justificado')
    .length


  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">

      <div className="bg-mis-bg2 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col border border-mis-borda shadow-2xl">


        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-mis-borda">

          <div>

            <h2 className="font-bold text-mis-texto text-sm">
              {turma.nome}
            </h2>

            <p className="text-xs text-mis-texto2 flex items-center gap-1 mt-0.5">

              <Calendar size={11} />

              {dataFmt}

            </p>

          </div>


          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-mis-borda/50 flex items-center justify-center text-mis-texto2"
          >
            <X size={16} />
          </button>

        </div>


        {/* Estatísticas */}
        <div className="flex gap-2 px-5 py-3 border-b border-mis-borda">

          {[
            {
              label: 'Presentes',
              valor: presentes,
              cor: 'text-verde'
            },

            {
              label: 'Faltas',
              valor: ausentes,
              cor: 'text-red-400'
            },

            {
              label: 'Justif.',
              valor: justificados,
              cor: 'text-amarelo'
            }

          ].map((item, index) => (

            <div
              key={index}
              className="flex-1 text-center bg-mis-bg3 rounded-xl py-2 border border-mis-borda"
            >

              <p className={`text-lg font-black ${item.cor}`}>
                {item.valor}
              </p>

              <p className="text-xs text-mis-texto2">
                {item.label}
              </p>

            </div>

          ))}

        </div>


        {/* Ações rápidas */}
        <div className="flex gap-2 px-5 py-3 border-b border-mis-borda">

          <span className="text-xs text-mis-texto2 self-center mr-1">
            Marcar todos:
          </span>


          {[
            'presente',
            'ausente',
            'justificado'
          ].map(status => {

            const config = STATUS_CONFIG[status]

            return (

              <button
                key={status}
                onClick={() => marcarTodos(status)}
                className={
                  `px-2.5 py-1 rounded-lg text-xs font-bold border
                  ${config.cor}
                  ${config.borda}
                  ${config.hover}
                  transition-colors`
                }
              >

                {config.label}

              </button>

            )

          })}

        </div>


        {/* Lista de alunos */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">

          {alunos.length === 0 ? (

            <div className="text-center py-8">

              <Users
                size={32}
                className="text-mis-texto2 mx-auto mb-2"
              />

              <p className="text-mis-texto2 text-sm">
                Nenhum aluno vinculado a esta turma
              </p>

              <p className="text-xs text-mis-texto2 mt-1">
                Vá em Turmas e adicione alunos
              </p>

            </div>

          ) : (

            alunos.map((aluno, index) => {

              const statusAtual = local[aluno.id]


              const opcoes = [

                {
                  status: 'presente',
                  label: 'Presente',
                  config: STATUS_CONFIG.presente
                },

                {
                  status: 'ausente',
                  label: 'Falta',
                  config: STATUS_CONFIG.ausente
                },

                {
                  status: 'justificado',
                  label: 'Justif.',
                  config: STATUS_CONFIG.justificado
                }

              ]


              return (

                <div
                  key={aluno.id}
                  className="bg-mis-bg3 rounded-xl border border-mis-borda px-3 py-2.5"
                >

                  <div className="flex items-center gap-2 mb-2">

                    <span className="text-xs text-mis-texto2 shrink-0">
                      {index + 1}.
                    </span>

                    <p className="text-sm font-medium text-mis-texto truncate">
                      {aluno.nome}
                    </p>

                  </div>


                  <div className="flex gap-2">

                    {opcoes.map(
                      ({
                        status,
                        label,
                        config
                      }) => {

                        const ativo =
                          statusAtual === status


                        return (

                          <button
                            key={status}

                            onClick={() =>
                              setLocal(prev => ({
                                ...prev,

                                [aluno.id]:
                                  ativo
                                    ? null
                                    : status
                              }))
                            }

                            className={
                              'flex-1 py-1.5 rounded-lg font-bold text-xs border-2 transition-all ' +

                              (
                                ativo

                                  ? `${config.cor} ${config.borda}`

                                  : 'bg-mis-bg2 border-mis-borda text-mis-texto2 hover:border-mis-texto2'
                              )
                            }
                          >

                            {label}

                          </button>

                        )

                      }
                    )}

                  </div>

                </div>

              )

            })

          )}

        </div>


        {/* Erro */}
        {erro && (

          <p className="text-xs text-red-400 px-5 pb-2">
            {erro}
          </p>

        )}


        {/* Footer */}
        <div className="p-4 border-t border-mis-borda flex gap-2">

          <button
            onClick={onClose}
            className="btn-ghost flex-1 py-2.5 text-sm"
          >
            Cancelar
          </button>


          <button
            onClick={salvar}

            disabled={
              salvando ||
              alunos.length === 0
            }

            className="btn-primary flex-1 py-2.5 text-sm flex items-center justify-center gap-2"
          >

            {salvando ? (

              <>
                <Loader
                  size={14}
                  className="animate-spin"
                />

                Salvando...
              </>

            ) : (

              <>
                <Save size={14} />

                Salvar Frequência
              </>

            )}

          </button>

        </div>

      </div>

    </div>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export default function Frequencia() {

  const [turmas, setTurmas] = useState([])

  const [turmaSel, setTurmaSel] = useState('')

  const [mes, setMes] = useState(
    new Date().getMonth()
  )

  const [alunos, setAlunos] = useState([])

  const [frequencias, setFrequencias] = useState([])

  const [loadingAlunos, setLoadingAlunos] =
    useState(false)

  const [modalData, setModalData] =
    useState(null)

  const [salvandoOk, setSalvandoOk] =
    useState(false)


  // ─────────────────────────────────────────────
  // Dias do mês
  // ─────────────────────────────────────────────

  const diasDoMes = (() => {

    const dias = []

    const total = new Date(
      ANO_ATUAL,
      mes + 1,
      0
    ).getDate()


    for (
      let dia = 1;
      dia <= total;
      dia++
    ) {

      dias.push(
        `${ANO_ATUAL}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
      )

    }


    return dias

  })()


  // ─────────────────────────────────────────────
  // CARREGA SOMENTE TURMAS DO 2026.2
  // ─────────────────────────────────────────────

  useEffect(() => {

    async function carregarTurmas() {

      try {

        const {
          data,
          error
        } = await supabase

          .from('turmas')

          .select(
            'id, nome, oficinas(nome)'
          )

          .eq(
            'ano_letivo',
            ANO_ATUAL
          )

          .eq(
            'periodo_letivo',
            PERIODO_ATUAL
          )

          .eq(
            'ativa',
            true
          )

          .order('nome')


        if (error) {
          throw error
        }


        const listaTurmas =
          data || []


        setTurmas(listaTurmas)


        if (
          listaTurmas.length > 0
        ) {

          setTurmaSel(
            listaTurmas[0].id
          )

        } else {

          setTurmaSel('')

        }


      } catch (error) {

        console.error(
          'Erro ao carregar turmas:',
          error
        )

        setTurmas([])

        setTurmaSel('')

      }

    }


    carregarTurmas()

  }, [])


  // ─────────────────────────────────────────────
  // CARREGA ALUNOS + FREQUÊNCIAS
  // ─────────────────────────────────────────────

  const carregar = useCallback(
    async () => {

      if (!turmaSel) {

        setAlunos([])

        setFrequencias([])

        return

      }


      setLoadingAlunos(true)


      try {

        const dataInicio =
          `${ANO_ATUAL}-${String(mes + 1).padStart(2, '0')}-01`


        const ultimoDia =
          new Date(
            ANO_ATUAL,
            mes + 1,
            0
          ).getDate()


        const dataFim =
          `${ANO_ATUAL}-${String(mes + 1).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`


        // Busca alunos vinculados à turma
        // Vínculos possuem data_aula = null

        const {
          data: vinculos,
          error: erroVinculos
        } = await supabase

          .from('frequencias')

          .select(
            'aluno_id, alunos(id, nome, numero_matricula)'
          )

          .eq(
            'turma_id',
            turmaSel
          )

          .is(
            'data_aula',
            null
          )


        if (erroVinculos) {
          throw erroVinculos
        }


        const listaAlunos =
          (vinculos || [])

            .map(
              vinculo =>
                vinculo.alunos
            )

            .filter(Boolean)

            .sort(
              (a, b) =>
                a.nome.localeCompare(
                  b.nome
                )
            )


        setAlunos(listaAlunos)


        // Busca frequências do mês
        // Apenas registros com data_aula preenchida

        const {
          data: freqs,
          error: erroFreqs
        } = await supabase

          .from('frequencias')

          .select('*')

          .eq(
            'turma_id',
            turmaSel
          )

          .not(
            'data_aula',
            'is',
            null
          )

          .gte(
            'data_aula',
            dataInicio
          )

          .lte(
            'data_aula',
            dataFim
          )


        if (erroFreqs) {
          throw erroFreqs
        }


        setFrequencias(
          freqs || []
        )


      } catch (error) {

        console.error(
          'Erro ao carregar frequência:',
          error
        )

        setAlunos([])

        setFrequencias([])


      } finally {

        setLoadingAlunos(false)

      }

    },

    [
      turmaSel,
      mes
    ]
  )


  useEffect(() => {

    carregar()

  }, [carregar])


  // ─────────────────────────────────────────────
  // ESTATÍSTICAS
  // ─────────────────────────────────────────────

  const totalPresencas =
    frequencias.filter(
      f =>
        f.status === 'presente'
    ).length


  const totalFaltas =
    frequencias.filter(
      f =>
        f.status === 'ausente'
    ).length


  const totalJustif =
    frequencias.filter(
      f =>
        f.status === 'justificado'
    ).length


  const diasComAula =
    [
      ...new Set(
        frequencias
          .map(f => f.data_aula)
          .filter(Boolean)
      )
    ].sort()


  function getStatusDia(data) {

    const freqsDia =
      frequencias.filter(
        f =>
          f.data_aula === data
      )


    if (
      freqsDia.length === 0
    ) {
      return null
    }


    return 'completo'
  }


  const fmtDia = data =>
    data.split('-')[2]


  const turmaSelecionada =
    turmas.find(
      turma =>
        turma.id === turmaSel
    )


  const turmaParaModal =
    turmaSelecionada

      ? {
          id: turmaSelecionada.id,
          nome: turmaSelecionada.nome
        }

      : null


  const hoje = (() => {

    const data = new Date()

    return (
      `${data.getFullYear()}-` +
      `${String(data.getMonth() + 1).padStart(2, '0')}-` +
      `${String(data.getDate()).padStart(2, '0')}`
    )

  })()


  return (

    <div className="animate-fade-in">


      {/* Header */}
      <div className="mb-6 flex items-center gap-3">

        <div>

          <h1 className="page-title">
            Frequência
          </h1>

          <p className="text-mis-texto2 text-sm mt-1">
            Controle de presença por turma
          </p>

        </div>


        <button

          onClick={() =>
            setModalData(hoje)
          }

          disabled={
            !turmaSel ||
            alunos.length === 0
          }

          className="btn-primary ml-auto flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >

          <Calendar size={14} />

          Registrar Hoje

        </button>

      </div>


      {/* Filtros */}
      <div className="mis-card mb-5">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">


          {/* TURMA */}
          <div>

            <label className="mis-label">
              Turma
            </label>


            <select

              className="mis-input"

              value={turmaSel}

              onChange={e =>
                setTurmaSel(
                  e.target.value
                )
              }
            >

              {turmas.length === 0 && (

                <option value="">
                  Nenhuma turma cadastrada em {PERIODO_ATUAL}
                </option>

              )}


              {turmas.map(
                turma => (

                  <option
                    key={turma.id}
                    value={turma.id}
                  >

                    {turma.nome}

                    {turma.oficinas?.nome
                      ? ` (${turma.oficinas.nome})`
                      : ''
                    }

                  </option>

                )
              )}

            </select>

          </div>


          {/* MÊS */}
          <div>

            <label className="mis-label">
              Mês
            </label>


            <div className="flex items-center gap-2">


              <button

                onClick={() =>
                  setMes(
                    atual =>
                      atual === 0
                        ? 11
                        : atual - 1
                  )
                }

                className="w-9 h-9 rounded-xl border border-mis-borda flex items-center justify-center hover:bg-mis-borda/50 text-mis-texto2 transition-colors"
              >

                <ChevronLeft size={16} />

              </button>


              <div className="flex-1 mis-input text-center font-medium text-mis-texto">

                {MESES[mes]} {ANO_ATUAL}

              </div>


              <button

                onClick={() =>
                  setMes(
                    atual =>
                      atual === 11
                        ? 0
                        : atual + 1
                  )
                }

                className="w-9 h-9 rounded-xl border border-mis-borda flex items-center justify-center hover:bg-mis-borda/50 text-mis-texto2 transition-colors"
              >

                <ChevronRight size={16} />

              </button>


            </div>

          </div>

        </div>

      </div>


      {/* Informações dos alunos vinculados */}
      {turmaSel && (

        <div className="mis-card mb-5 flex items-center justify-between">

          <div className="flex items-center gap-2">

            <Users
              size={16}
              className="text-azul"
            />

            <span className="text-sm text-mis-texto">

              <strong>
                {alunos.length}
              </strong>

              {' '}

              aluno
              {alunos.length !== 1
                ? 's'
                : ''
              }

              {' '}

              vinculado
              {alunos.length !== 1
                ? 's'
                : ''
              }

              {' '}a esta turma

            </span>

          </div>


          {alunos.length === 0 && (

            <span className="text-xs text-amarelo">

              Vá em Turmas → Alunos para vincular

            </span>

          )}

        </div>

      )}


      {/* Estatísticas */}
      <div className="grid grid-cols-3 gap-3 mb-5">

        {[
          {
            label: 'Presenças',
            valor: totalPresencas,
            cor: 'text-verde',
            bg: 'bg-verde/10'
          },

          {
            label: 'Faltas',
            valor: totalFaltas,
            cor: 'text-red-400',
            bg: 'bg-red-900/20'
          },

          {
            label: 'Justif.',
            valor: totalJustif,
            cor: 'text-amarelo',
            bg: 'bg-amarelo/10'
          }

        ].map(
          (item, index) => (

            <div

              key={index}

              className={`${item.bg} rounded-2xl p-4 border border-mis-borda text-center`}
            >

              <p className={`text-3xl font-black ${item.cor}`}>

                {item.valor}

              </p>


              <p className="text-xs text-mis-texto2 mt-1">

                {item.label}

              </p>

            </div>

          )
        )}

      </div>


      {/* Calendário */}
      <div className="mis-card mb-5">

        <div className="flex items-center justify-between mb-3">

          <p className="text-xs font-semibold text-mis-texto2 uppercase tracking-wide">

            Clique em um dia para registrar

          </p>


          <span className="text-xs text-mis-texto2">

            {diasComAula.length} aulas registradas

          </span>

        </div>


        <div className="flex flex-wrap gap-1.5">

          {diasDoMes.map(
            dia => {

              const status =
                getStatusDia(dia)


              return (

                <button

                  key={dia}

                  onClick={() =>
                    setModalData(dia)
                  }

                  disabled={
                    alunos.length === 0
                  }

                  className={
                    `w-10 h-10 rounded-xl text-xs font-bold border-2 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed

                    ${
                      dia === hoje
                        ? 'ring-2 ring-amarelo ring-offset-1 ring-offset-mis-bg2'
                        : ''
                    }

                    ${
                      status === 'completo'

                        ? 'bg-verde/20 border-verde text-verde'

                        : 'bg-mis-bg3 border-mis-borda text-mis-texto2 hover:border-mis-texto2'
                    }`
                  }
                >

                  {fmtDia(dia)}

                </button>

              )

            }
          )}

        </div>


        <div className="flex gap-4 mt-3 text-xs text-mis-texto2">

          <span className="flex items-center gap-1">

            <span className="w-2 h-2 rounded-full bg-verde inline-block" />

            Com registro

          </span>


          <span className="flex items-center gap-1">

            <span className="w-2 h-2 rounded-full bg-mis-borda inline-block" />

            Sem registro

          </span>

        </div>

      </div>


      {/* Conteúdo principal */}

      {loadingAlunos ? (

        <div className="mis-card flex items-center justify-center py-8">

          <Loader
            size={20}
            className="animate-spin text-amarelo"
          />

        </div>

      ) : turmas.length === 0 ? (

        <div className="mis-card text-center py-8">

          <BookOpen
            size={32}
            className="text-mis-texto2 mx-auto mb-2"
          />


          <p className="text-mis-texto2 text-sm">

            Nenhuma turma cadastrada em {PERIODO_ATUAL}

          </p>


          <p className="text-xs text-mis-texto2 mt-1">

            Crie turmas primeiro em Turmas

          </p>

        </div>

      ) : alunos.length === 0 ? (

        <div className="mis-card text-center py-8">

          <Users
            size={32}
            className="text-mis-texto2 mx-auto mb-2"
          />


          <p className="text-mis-texto2 text-sm">

            Nenhum aluno vinculado a esta turma

          </p>


          <p className="text-xs text-mis-texto2 mt-1">

            Vá em Turmas → clique no ícone de pessoas → selecione os alunos

          </p>

        </div>

      ) : diasComAula.length === 0 ? (

        <div className="mis-card text-center py-8">

          <BookOpen
            size={32}
            className="text-mis-texto2 mx-auto mb-2"
          />


          <p className="text-mis-texto2 text-sm">

            Nenhuma aula registrada em {MESES[mes]}

          </p>


          <p className="text-xs text-mis-texto2 mt-1">

            Clique em um dia acima para registrar a frequência

          </p>

        </div>

      ) : (

        <div className="mis-card">

          <p className="text-xs font-semibold text-mis-texto2 uppercase tracking-wide mb-3">

            Aulas registradas

          </p>


          <div className="space-y-2">

            {diasComAula.map(
              dia => {

                const [
                  yyyy,
                  mm,
                  dd
                ] = dia.split('-')


                const dataFmt =
                  `${dd}/${mm}/${yyyy}`


                const presentes =
                  frequencias.filter(
                    f =>
                      f.data_aula === dia &&
                      f.status === 'presente'
                  ).length


                const faltas =
                  frequencias.filter(
                    f =>
                      f.data_aula === dia &&
                      f.status === 'ausente'
                  ).length


                const justificados =
                  frequencias.filter(
                    f =>
                      f.data_aula === dia &&
                      f.status === 'justificado'
                  ).length


                const nomeTurma =
                  turmaSelecionada?.nome || ''


                return (

                  <div

                    key={dia}

                    className="rounded-xl border border-mis-borda px-4 py-3 bg-mis-bg3/30"
                  >

                    <div className="flex items-center justify-between gap-3 mb-2">

                      <div>

                        <p className="text-sm font-semibold text-mis-texto">

                          {nomeTurma}

                        </p>


                        <p className="text-xs text-mis-texto2">

                          {dataFmt}

                        </p>

                      </div>


                      <div className="flex items-center gap-2">

                        <button

                          onClick={() =>
                            setModalData(dia)
                          }

                          className="text-xs px-2.5 py-1 rounded-lg border border-mis-borda text-mis-texto2 hover:text-mis-texto hover:border-mis-texto transition"
                        >

                          Editar

                        </button>


                        <button

                          onClick={async () => {

                            if (
                              !confirm(
                                `Excluir frequência do dia ${dataFmt}?`
                              )
                            ) {
                              return
                            }


                            const {
                              error
                            } = await supabase

                              .from('frequencias')

                              .delete()

                              .eq(
                                'turma_id',
                                turmaSel
                              )

                              .eq(
                                'data_aula',
                                dia
                              )

                              .not(
                                'data_aula',
                                'is',
                                null
                              )


                            if (error) {

                              console.error(
                                'Erro ao excluir frequência:',
                                error
                              )

                              alert(
                                'Erro ao excluir frequência.'
                              )

                              return

                            }


                            carregar()

                          }}

                          className="text-xs px-2.5 py-1 rounded-lg border border-red-900/40 text-red-400 hover:bg-red-900/20 transition"
                        >

                          Excluir

                        </button>

                      </div>

                    </div>


                    <div className="flex items-center gap-4 text-xs">

                      <span className="flex items-center gap-1.5 text-verde font-semibold">

                        <span className="w-5 h-5 rounded-md bg-verde/20 flex items-center justify-center font-black">

                          P

                        </span>

                        {presentes}

                      </span>


                      <span className="flex items-center gap-1.5 text-red-400 font-semibold">

                        <span className="w-5 h-5 rounded-md bg-red-900/20 flex items-center justify-center font-black">

                          F

                        </span>

                        {faltas}

                      </span>


                      <span className="flex items-center gap-1.5 text-amarelo font-semibold">

                        <span className="w-5 h-5 rounded-md bg-amarelo/20 flex items-center justify-center font-black">

                          J

                        </span>

                        {justificados}

                      </span>

                    </div>

                  </div>

                )

              }
            )}

          </div>

        </div>

      )}


      {/* Modal */}
      {modalData && turmaParaModal && (

        <ModalAula

          turma={turmaParaModal}

          data={modalData}

          alunos={alunos}

          frequencias={frequencias}

          onClose={() =>
            setModalData(null)
          }

          onSalvar={() => {

            setModalData(null)

            setSalvandoOk(true)

            setTimeout(
              () =>
                setSalvandoOk(false),
              2000
            )

            carregar()

          }}

        />

      )}


      {/* Confirmação */}
      {salvandoOk && (

        <div className="fixed bottom-6 right-6 bg-verde text-white px-4 py-3 rounded-xl flex items-center gap-2 shadow-lg animate-fade-in z-50">

          <CheckCircle size={16} />

          Frequência salva!

        </div>

      )}

    </div>
  )
}
