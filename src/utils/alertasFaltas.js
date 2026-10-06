const STATUS_FALTA = 'ausente'

export function calcularAlertasFaltas({ turmas, vinculos, frequencias, hoje }) {
  const turmasPorId = new Map(turmas.map(turma => [turma.id, turma]))
  const diasPorTurma = new Map()
  const registrosPorTurma = new Map()

  for (const frequencia of frequencias) {
    const { turma_id, aluno_id, data_aula, status } = frequencia
    if (!turmasPorId.has(turma_id) || !data_aula || data_aula > hoje) continue

    if (!diasPorTurma.has(turma_id)) {
      diasPorTurma.set(turma_id, new Set())
      registrosPorTurma.set(turma_id, new Map())
    }
    diasPorTurma.get(turma_id).add(data_aula)

    const registros = registrosPorTurma.get(turma_id)
    const chave = JSON.stringify([aluno_id, data_aula])
    // Registros duplicados ou conflitantes não podem criar uma falsa sequência.
    registros.set(chave, registros.has(chave) && registros.get(chave) !== status ? null : status)
  }

  const diasOrdenados = new Map(
    [...diasPorTurma].map(([turmaId, dias]) => [turmaId, [...dias].sort().reverse()]),
  )
  const alertas = []
  const alunosVerificados = new Set()

  for (const vinculo of vinculos) {
    const turma = turmasPorId.get(vinculo.turma_id)
    const aluno = Array.isArray(vinculo.alunos) ? vinculo.alunos[0] : vinculo.alunos
    if (!turma || !aluno || aluno.status !== 'ativo' || !vinculo.aluno_id) continue

    const chaveVinculo = JSON.stringify([turma.id, vinculo.aluno_id])
    if (alunosVerificados.has(chaveVinculo)) continue
    alunosVerificados.add(chaveVinculo)

    const registros = registrosPorTurma.get(turma.id)
    const datasFaltas = []
    for (const dia of diasOrdenados.get(turma.id) || []) {
      // Uma chamada não preenchida também impede afirmar faltas consecutivas.
      if (registros.get(JSON.stringify([vinculo.aluno_id, dia])) !== STATUS_FALTA) break
      datasFaltas.push(dia)
    }

    if (datasFaltas.length >= 2) {
      alertas.push({
        turmaId: turma.id,
        turmaNome: turma.nome,
        alunoId: vinculo.aluno_id,
        alunoNome: aluno.nome,
        faltasConsecutivas: datasFaltas.length,
        datasFaltas,
      })
    }
  }

  return alertas.sort((a, b) =>
    b.faltasConsecutivas - a.faltasConsecutivas ||
    a.turmaNome.localeCompare(b.turmaNome, 'pt-BR') ||
    a.alunoNome.localeCompare(b.alunoNome, 'pt-BR'),
  )
}

const TAMANHO_PAGINA = 1000

async function buscarTodasPaginas(criarConsulta) {
  const registros = []
  for (let inicio = 0; ; inicio += TAMANHO_PAGINA) {
    const { data, error } = await criarConsulta().range(inicio, inicio + TAMANHO_PAGINA - 1)
    if (error) throw error
    registros.push(...(data || []))
    if (!data || data.length < TAMANHO_PAGINA) return registros
  }
}

export async function carregarAlertasFaltas(client, { professorId, periodoLetivo, hoje }) {
  const [ano, semestre] = periodoLetivo.split('.')
  const inicioPeriodo = `${ano}-${semestre === '2' ? '07' : '01'}-01`
  const turmas = await buscarTodasPaginas(() => client
    .from('turmas')
    .select('id, nome')
    .eq('professor_id', professorId)
    .eq('ano_letivo', Number(ano))
    .eq('periodo_letivo', periodoLetivo)
    .eq('ativa', true)
    .order('id'),
  )
  if (turmas.length === 0) return []

  const turmaIds = turmas.map(turma => turma.id)
  const [vinculos, frequencias] = await Promise.all([
    buscarTodasPaginas(() => client
      .from('frequencias')
      .select('turma_id, aluno_id, alunos(id, nome, status)')
      .in('turma_id', turmaIds)
      .is('data_aula', null)
      .order('id'),
    ),
    buscarTodasPaginas(() => client
      .from('frequencias')
      .select('turma_id, aluno_id, data_aula, status')
      .in('turma_id', turmaIds)
      .not('data_aula', 'is', null)
      .gte('data_aula', inicioPeriodo)
      .lte('data_aula', hoje)
      .order('id'),
    ),
  ])

  return calcularAlertasFaltas({ turmas, vinculos, frequencias, hoje })
}

export function dataHojeEscola() {
  const partes = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Fortaleza', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const valores = Object.fromEntries(partes.map(parte => [parte.type, parte.value]))
  return `${valores.year}-${valores.month}-${valores.day}`
}
