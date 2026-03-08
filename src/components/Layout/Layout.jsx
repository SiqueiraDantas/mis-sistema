import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import logoMadeInSertao from '../../assets/logo-madeinsertao.png'
import {
  LayoutDashboard, Users, ClipboardList, BookOpen,
  BarChart2, FileText, GraduationCap, Menu, LogOut, ChevronRight
} from 'lucide-react'

const menuProfessor = [
  { path: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/alunos',      icon: Users,            label: 'Alunos' },
  { path: '/turmas',      icon: GraduationCap,    label: 'Turmas' },
  { path: '/frequencia',  icon: ClipboardList,    label: 'Frequência' },
  { path: '/planos-aula', icon: BookOpen,         label: 'Planos de Aula' },
]

const menuDiretor = [
  ...menuProfessor,
  { path: '/relatorios',  icon: FileText,         label: 'Relatórios' },
  { path: '/diretor',     icon: BarChart2,        label: 'Painel Diretor' },
]

export default function Layout() {
  const { perfil, logout, isDiretor } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()

  const menu = isDiretor ? menuDiretor : menuProfessor

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen bg-mis-bg">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed top-0 left-0 h-full w-60 bg-mis-bg2 border-r border-mis-borda z-30
        flex flex-col transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static md:z-auto
      `}>
        <div className="p-5 border-b border-mis-borda">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amarelo rounded-md flex items-center justify-center p-2 overflow-hidden">
              <img
                src={logoMadeInSertao}
                alt="Logo Made In Sertão"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <p className="text-xs font-bold text-mis-texto leading-tight">Made In Sertão</p>
              <p className="text-xs text-mis-texto2">Escola de Música</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {menu.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `sidebar-item ${isActive ? 'active' : ''}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon size={16} />
              <span>{item.label}</span>
              <ChevronRight size={12} className="ml-auto opacity-30" />
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-mis-borda">
          <div className="mis-card p-3 mb-2">
            <p className="text-xs font-semibold text-mis-texto truncate">
              {perfil?.nome || 'Usuário'}
            </p>
            <span className={`badge mt-1 ${isDiretor ? 'badge-amarelo' : 'badge-azul'}`}>
              {isDiretor ? 'Diretor' : 'Professor'}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="sidebar-item w-full text-red-400 hover:text-red-300 hover:bg-red-900/20"
          >
            <LogOut size={16} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-mis-bg2 border-b border-mis-borda px-4 flex items-center justify-between sticky top-0 z-10">
          <button
            className="md:hidden text-mis-texto2 hover:text-mis-texto"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>
          <div className="hidden md:block" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-mis-texto2 font-mono">
              {new Date().toLocaleDateString('pt-BR', {
                weekday: 'short',
                day: '2-digit',
                month: 'short'
              })}
            </span>
          </div>
        </header>

        <main className="flex-1 p-5 md:p-6 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  )
}