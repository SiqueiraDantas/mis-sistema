import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useAuth } from './AuthContext'

const PeriodoContext = createContext(null)

export const PERIODO_ATUAL = '2026.2'
export const PERIODOS_DISPONIVEIS = ['2026.2', '2026.1']

const STORAGE_KEY = 'mis-periodo-letivo'

export function PeriodoProvider({ children }) {
  const { isDiretor, isDev } = useAuth()
  const podeTrocarPeriodo = Boolean(isDiretor || isDev)

  const [periodoLetivo, setPeriodoLetivoState] = useState(PERIODO_ATUAL)

  useEffect(() => {
    if (!podeTrocarPeriodo) {
      setPeriodoLetivoState(PERIODO_ATUAL)
      return
    }

    const periodoSalvo = localStorage.getItem(STORAGE_KEY)

    if (PERIODOS_DISPONIVEIS.includes(periodoSalvo)) {
      setPeriodoLetivoState(periodoSalvo)
    } else {
      setPeriodoLetivoState(PERIODO_ATUAL)
    }
  }, [podeTrocarPeriodo])

  const setPeriodoLetivo = useCallback(
    novoPeriodo => {
      if (!podeTrocarPeriodo) {
        setPeriodoLetivoState(PERIODO_ATUAL)
        return
      }

      if (!PERIODOS_DISPONIVEIS.includes(novoPeriodo)) return

      setPeriodoLetivoState(novoPeriodo)
      localStorage.setItem(STORAGE_KEY, novoPeriodo)
    },
    [podeTrocarPeriodo],
  )

  const somenteLeitura = periodoLetivo !== PERIODO_ATUAL

  const value = useMemo(
    () => ({
      periodoLetivo,
      setPeriodoLetivo,
      periodosDisponiveis: PERIODOS_DISPONIVEIS,
      periodoAtual: PERIODO_ATUAL,
      podeTrocarPeriodo,
      somenteLeitura,
    }),
    [
      periodoLetivo,
      setPeriodoLetivo,
      podeTrocarPeriodo,
      somenteLeitura,
    ],
  )

  return (
    <PeriodoContext.Provider value={value}>
      {children}
    </PeriodoContext.Provider>
  )
}

export function usePeriodo() {
  const context = useContext(PeriodoContext)

  if (!context) {
    throw new Error(
      'usePeriodo deve ser usado dentro de PeriodoProvider.',
    )
  }

  return context
}
