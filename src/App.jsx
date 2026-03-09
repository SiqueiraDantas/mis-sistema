import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { PrivateRoute, RoleRoute } from './routes/PrivateRoute'

// Auth
import Login from './pages/Auth/Login'
import RecoverPassword from './pages/Auth/RecoverPassword'

// Público
import Matricula from './pages/Matricula/Matricula'

// Interno
import Layout from './components/Layout/Layout'
import ProfessorDashboard from './pages/Dashboard/ProfessorDashboard'
import DiretorDashboard from './pages/Dashboard/DiretorDashboard'
import PlanosAula from './pages/PlanosAula/PlanosAula'
import Frequencia from './pages/Frequencia/Frequencia'
import Alunos from './pages/Alunos/Alunos'
import Turmas from './pages/Turmas/Turmas'
import Relatorios from './pages/Diretor/Relatorios'
import DevPanel from './pages/Dev/DevPanel'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* PÚBLICO */}
          <Route path="/matricula" element={<Matricula />} />

          {/* AUTH */}
          <Route path="/login" element={<Login />} />
          <Route path="/recuperar-senha" element={<RecoverPassword />} />

          {/* SISTEMA INTERNO */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<ProfessorDashboard />} />
            <Route path="turmas" element={<Turmas />} />
            <Route path="planos-aula" element={<PlanosAula />} />
            <Route path="frequencia" element={<Frequencia />} />

            <Route
              path="alunos"
              element={
                <RoleRoute perfil="diretor">
                  <Alunos />
                </RoleRoute>
              }
            />

            <Route
              path="diretor"
              element={
                <RoleRoute perfil="diretor">
                  <DiretorDashboard />
                </RoleRoute>
              }
            />

            <Route
              path="relatorios"
              element={
                <RoleRoute perfil="diretor">
                  <Relatorios />
                </RoleRoute>
              }
            />

            <Route
              path="dev-panel"
              element={
                <RoleRoute perfil="dev">
                  <DevPanel />
                </RoleRoute>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}