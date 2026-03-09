import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

// Rota que exige login
export function PrivateRoute({ children }) {
  const { usuario, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (!usuario) return <Navigate to="/login" replace />

  return children
}

// Rota que exige perfil específico
export function RoleRoute({ children, perfil }) {
  const { usuario, perfil: p, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (!usuario) return <Navigate to="/login" replace />

  const perfilAtual = p?.perfil?.toLowerCase?.().trim?.()

  if (perfilAtual !== perfil.toLowerCase().trim()) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-mis-bg flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-amarelo border-t-transparent rounded-full animate-spin" />
        <span className="text-mis-texto2 text-sm font-poppins">Carregando...</span>
      </div>
    </div>
  )
}