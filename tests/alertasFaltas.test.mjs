import test from 'node:test'
import assert from 'node:assert/strict'
import { calcularAlertasFaltas, carregarAlertasFaltas } from '../src/utils/alertasFaltas.js'

const turma = { id: 'bateria-1', nome: 'Bateria I' }
const vinculo = {
  turma_id: turma.id, aluno_id: 'ana',
  alunos: { id: 'ana', nome: 'Ana', status: 'ativo' },
}
const registro = (data, status, alunoId = 'ana', turmaId = turma.id) => ({
  turma_id: turmaId, aluno_id: alunoId, data_aula: data, status,
})
const calcular = (frequencias, vinculos = [vinculo], turmas = [turma]) =>
  calcularAlertasFaltas({ turmas, vinculos, frequencias, hoje: '2026-10-06' })

test('duas faltas em aulas consecutivas geram alerta mesmo atravessando meses', () => {
  const [alerta] = calcular([
    registro('2026-09-30', 'ausente'), registro('2026-10-02', 'ausente'),
  ])
  assert.equal(alerta.alunoNome, 'Ana')
  assert.equal(alerta.turmaNome, 'Bateria I')
  assert.equal(alerta.faltasConsecutivas, 2)
  assert.deepEqual(alerta.datasFaltas, ['2026-10-02', '2026-09-30'])
})

test('o alerta continua ativo com três ou mais faltas seguidas', () => {
  const [alerta] = calcular([
    registro('2026-09-28', 'ausente'), registro('2026-09-30', 'ausente'),
    registro('2026-10-02', 'ausente'),
  ])
  assert.equal(alerta.faltasConsecutivas, 3)
})

for (const status of ['presente', 'justificado']) {
  test(`${status} na última aula encerra uma sequência de faltas`, () => {
    assert.deepEqual(calcular([
      registro('2026-09-28', 'ausente'), registro('2026-09-30', 'ausente'),
      registro('2026-10-02', status),
    ]), [])
  })
  test(`${status} entre duas faltas impede alerta por faltas isoladas`, () => {
    assert.deepEqual(calcular([
      registro('2026-09-28', 'ausente'), registro('2026-09-30', status),
      registro('2026-10-02', 'ausente'),
    ]), [])
  })
}

test('somente alunos vinculados à turma oficial entram no alerta', () => {
  assert.deepEqual(calcular([
    registro('2026-09-30', 'ausente', 'apenas-matriculado'),
    registro('2026-10-02', 'ausente', 'apenas-matriculado'),
  ]), [])
  assert.deepEqual(calcular([
    registro('2026-09-30', 'ausente'), registro('2026-10-02', 'ausente'),
  ], []), [])
})

test('faltas de turmas diferentes não são somadas', () => {
  const outraTurma = { id: 'bateria-2', nome: 'Bateria II' }
  assert.deepEqual(calcular([
    registro('2026-09-30', 'ausente'),
    registro('2026-10-02', 'ausente', 'ana', outraTurma.id),
  ], [vinculo, { ...vinculo, turma_id: outraTurma.id }], [turma, outraTurma]), [])
})

test('registros de uma turma fora da seleção do professor são ignorados', () => {
  assert.deepEqual(calcular([
    registro('2026-09-30', 'ausente', 'ana', 'outra-turma'),
    registro('2026-10-02', 'ausente', 'ana', 'outra-turma'),
  ], [{ ...vinculo, turma_id: 'outra-turma' }]), [])
})

test('aluno inativo ou vínculo sem aluno visível não gera alerta', () => {
  const frequencias = [registro('2026-09-30', 'ausente'), registro('2026-10-02', 'ausente')]
  assert.deepEqual(calcular(frequencias, [{ ...vinculo, alunos: { ...vinculo.alunos, status: 'inativo' } }]), [])
  assert.deepEqual(calcular(frequencias, [{ ...vinculo, alunos: null }]), [])
})

test('uma chamada sem marcação do aluno interrompe a sequência comprovada', () => {
  assert.deepEqual(calcular([
    registro('2026-09-28', 'ausente'), registro('2026-09-30', 'presente', 'outro-aluno'),
    registro('2026-10-02', 'ausente'),
  ]), [])
  assert.deepEqual(calcular([
    registro('2026-09-28', 'ausente'), registro('2026-09-30', 'ausente'),
    registro('2026-10-02', 'presente', 'outro-aluno'),
  ]), [])
})

test('dias sem aula registrada, vínculos sem data e registros futuros não contam como faltas', () => {
  const [alerta] = calcular([
    registro(null, 'presente'), registro('2026-09-28', 'ausente'),
    registro('2026-10-02', 'ausente'), registro('2026-10-10', 'presente'),
  ])
  assert.equal(alerta.faltasConsecutivas, 2)
  assert.deepEqual(calcular([
    registro('2026-10-02', 'ausente'), registro('2026-10-10', 'ausente'),
  ]), [])
})

test('registros e vínculos duplicados não multiplicam os alertas', () => {
  assert.deepEqual(calcular([
    registro('2026-10-02', 'ausente'), registro('2026-10-02', 'ausente'),
  ]), [])
  assert.equal(calcular([
    registro('2026-09-30', 'ausente'), registro('2026-10-02', 'ausente'),
  ], [vinculo, { ...vinculo, alunos: [vinculo.alunos] }]).length, 1)
  assert.deepEqual(calcular([
    registro('2026-09-30', 'ausente'), registro('2026-10-02', 'ausente'),
    registro('2026-10-02', 'presente'), registro('2026-10-02', 'ausente'),
  ]), [])
})

function bancoFicticio(dados, falha = null) {
  const consultas = []
  return {
    consultas,
    from(tabela) {
      const filtros = []
      const consulta = { tabela, filtros }
      return {
        select(colunas) { consulta.colunas = colunas; return this },
        eq(campo, valor) { filtros.push(['eq', campo, valor]); return this },
        in(campo, valores) { filtros.push(['in', campo, valores]); return this },
        is(campo, valor) { filtros.push(['is', campo, valor]); return this },
        not(campo, operador, valor) { filtros.push(['not', campo, valor, operador]); return this },
        gte(campo, valor) { filtros.push(['gte', campo, valor]); return this },
        lte(campo, valor) { filtros.push(['lte', campo, valor]); return this },
        order(campo) { consulta.ordem = campo; return this },
        async range(inicio, fim) {
          consultas.push({ ...consulta, intervalo: [inicio, fim] })
          if (tabela === falha) return { data: null, error: new Error('Falha de consulta') }
          const linhas = (dados[tabela] || []).filter(item => filtros.every(([operador, campo, valor]) => {
            if (operador === 'eq' || operador === 'is') return item[campo] === valor
            if (operador === 'in') return valor.includes(item[campo])
            if (operador === 'not') return item[campo] !== valor
            if (operador === 'gte') return item[campo] !== null && item[campo] >= valor
            if (operador === 'lte') return item[campo] !== null && item[campo] <= valor
            return false
          }))
          return { data: linhas.slice(inicio, fim + 1), error: null }
        },
      }
    },
  }
}

const turmaCompleta = { ...turma, professor_id: 'professor', periodo_letivo: '2026.2', ano_letivo: 2026, ativa: true }
const parametros = { professorId: 'professor', periodoLetivo: '2026.2', hoje: '2026-10-06' }

test('consulta somente turmas ativas do professor e do período, sem usar matrículas de oficinas', async () => {
  const client = bancoFicticio({
    turmas: [turmaCompleta, { ...turmaCompleta, id: 'outro-professor', professor_id: 'outro' },
      { ...turmaCompleta, id: 'historica', periodo_letivo: '2026.1' },
      { ...turmaCompleta, id: 'inativa', ativa: false }],
    frequencias: [{ ...vinculo, data_aula: null },
      registro('2026-09-30', 'ausente'), registro('2026-10-02', 'ausente')],
  })
  const alertas = await carregarAlertasFaltas(client, parametros)
  assert.equal(alertas.length, 1)
  assert.equal(alertas[0].turmaId, turma.id)
  assert.ok(client.consultas.every(consulta => ['turmas', 'frequencias'].includes(consulta.tabela)))
  assert.ok(client.consultas.filter(consulta => consulta.tabela === 'frequencias')
    .every(consulta => consulta.filtros.some(([tipo, campo, valor]) => tipo === 'in' && campo === 'turma_id' && valor.length === 1 && valor[0] === turma.id)))
})

test('histórico acima de mil registros é paginado sem perder as faltas mais recentes', async () => {
  const client = bancoFicticio({
    turmas: [turmaCompleta],
    frequencias: [{ ...vinculo, data_aula: null },
      ...Array.from({ length: 999 }, (_, i) => registro('2026-08-01', 'presente', `outro-${i}`)),
      registro('2026-09-30', 'ausente'), registro('2026-10-02', 'ausente')],
  })
  assert.equal((await carregarAlertasFaltas(client, parametros))[0].faltasConsecutivas, 2)
  assert.ok(client.consultas.some(consulta => consulta.intervalo[0] === 1000))
})

test('não mistura faltas de semestres anteriores com as atuais', async () => {
  const client = bancoFicticio({ turmas: [turmaCompleta], frequencias: [
    { ...vinculo, data_aula: null }, registro('2026-06-30', 'ausente'),
    registro('2026-07-02', 'ausente'),
  ] })
  assert.deepEqual(await carregarAlertasFaltas(client, parametros), [])
})

test('professor sem turmas não consulta frequências', async () => {
  const client = bancoFicticio({ turmas: [] })
  assert.deepEqual(await carregarAlertasFaltas(client, parametros), [])
  assert.equal(client.consultas.length, 1)
})

test('erro ao consultar frequência é propagado, sem afirmar que não há alertas', async () => {
  const client = bancoFicticio({ turmas: [turmaCompleta] }, 'frequencias')
  await assert.rejects(carregarAlertasFaltas(client, parametros), /Falha de consulta/)
})
