import { useEffect, useState } from 'react'
import { TriangleAlert, Loader } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { usePeriodo } from '../contexts/PeriodoContext'
import { supabase } from '../services/supabase'
import { carregarAlertasFaltas, dataHojeEscola } from '../utils/alertasFaltas'

const formatarData = data => data.split('-').reverse().join('/')

export default function AlertasFaltasProfessor() {
  const { perfil, isProfessor } = useAuth()
  const { periodoLetivo } = usePeriodo()
  const professorId = perfil?.id
  const [resultado, setResultado] = useState(null)
  const [tentativa, setTentativa] = useState(0)
  const chave = `${professorId}:${periodoLetivo}:${tentativa}`

  useEffect(() => {
    if (!isProfessor || !professorId) return
    let ativo = true

    carregarAlertasFaltas(supabase, { professorId, periodoLetivo, hoje: dataHojeEscola() })
      .then(alertas => {
        if (ativo) setResultado({ chave, alertas, erro: false })
      })
      .catch(() => {
        if (ativo) setResultado({ chave, alertas: [], erro: true })
      })

    return () => { ativo = false }
  }, [professorId, isProfessor, periodoLetivo, chave])

  if (!isProfessor || !professorId) return null

  const carregando = resultado?.chave !== chave
  const alertas = carregando ? [] : resultado.alertas

  if (carregando) {
    return (
      <div className="mis-card flex items-center gap-2 text-xs text-mis-texto2" role="status">
        <Loader size={14} className="animate-spin" />
        <span>Verificando faltas nas suas turmas...</span>
      </div>
    )
  }

  if (resultado.erro) {
    return (
      <div className="mis-card border-amarelo/30" role="status">
        <p className="text-sm text-amarelo">Não foi possível verificar os alertas de faltas.</p>
        <button onClick={() => setTentativa(valor => valor + 1)} className="btn-secondary mt-3">
          Tentar novamente
        </button>
      </div>
    )
  }

  if (alertas.length === 0) return null

  return (
    <section className="mis-card border-amarelo/40 bg-amarelo/10" aria-labelledby="titulo-alertas-faltas" role="status" aria-live="polite">
      <div className="flex items-start gap-3">
        <TriangleAlert size={22} className="text-amarelo shrink-0 mt-0.5" />
        <div>
          <h2 id="titulo-alertas-faltas" className="text-sm font-bold text-amarelo">Atenção: faltas consecutivas</h2>
          <p className="text-xs text-mis-texto mt-1">
            Alunos das suas turmas com duas ou mais faltas seguidas nas últimas aulas registradas.
          </p>
        </div>
      </div>
      <ul className="mt-4 space-y-2">
        {alertas.map(alerta => (
          <li key={`${alerta.turmaId}:${alerta.alunoId}`} className="rounded-xl bg-mis-bg2 border border-amarelo/20 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-mis-texto break-words">{alerta.alunoNome}</p>
              <span className="badge badge-amarelo shrink-0">{alerta.faltasConsecutivas} faltas seguidas</span>
            </div>
            <p className="text-xs text-mis-texto2 mt-1">{alerta.turmaNome}</p>
            <p className="text-xs text-mis-texto2 mt-1">
              Últimas faltas: {alerta.datasFaltas.slice(0, 2).reverse().map(formatarData).join(' e ')}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
