import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../services/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario]   = useState(null)
  const [perfil,  setPerfil]    = useState(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    // Verifica sessão ativa ao carregar
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUsuario(session.user)
        buscarPerfil(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Escuta mudanças de auth — ignora INITIAL_SESSION (já tratado acima)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return  // evita race condition

      if (session?.user) {
        setUsuario(session.user)
        buscarPerfil(session.user.id)
      } else {
        setUsuario(null)
        setPerfil(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function buscarPerfil(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (data) setPerfil(data)
    setLoading(false)
  }

  async function login(email, senha) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) throw error
    return data
  }

  async function logout() {
    await supabase.auth.signOut()
    window.history.pushState(null, '', '/login')
    window.onpopstate = () => window.history.pushState(null, '', '/login')
  }

  async function recuperarSenha(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })
    if (error) throw error
  }

  const isDiretor   = perfil?.perfil === 'diretor'
  const isProfessor = perfil?.perfil === 'professor'

  return (
    <AuthContext.Provider value={{
      usuario, perfil, loading,
      login, logout, recuperarSenha,
      isDiretor, isProfessor
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}