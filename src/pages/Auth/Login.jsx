import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabase'
import { Eye, EyeOff } from 'lucide-react'
import logoMadeInSertao from '../../assets/logo-madeinsertao.png'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setLoading(true)

    try {
      const data = await login(email, senha)

      // Registrar login na tabela de logs
      try {
        await supabase.from('login_logs').insert({
          usuario_id: data?.user?.id || null,
          email: email,
        })
      } catch {
        // Não bloquear login se o registro falhar
      }

      navigate('/dashboard', { replace: true })
    } catch (err) {
      setErro('E-mail ou senha incorretos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-mis-bg flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-amarelo/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-azul/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img
              src={logoMadeInSertao}
              alt="Logo Made In Sertão"
              className="w-20 h-20 object-contain mx-auto"
            />
          </div>

          <h1 className="text-2xl font-black text-mis-texto font-poppins">
            Made In Sertão
          </h1>
          <p className="text-mis-texto2 text-sm mt-1">
            Sistema de Gestão — Escola de Música
          </p>
        </div>

        <div className="mis-card">
          <h2 className="text-base font-bold text-mis-texto mb-5">
            Entrar no sistema
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mis-label">E-mail</label>
              <input
                type="email"
                className="mis-input"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="mis-label">Senha</label>
              <div className="relative">
                <input
                  type={mostrar ? 'text' : 'password'}
                  className="mis-input pr-10"
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                />

                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-mis-texto2 hover:text-mis-texto transition-colors"
                  onClick={() => setMostrar(!mostrar)}
                >
                  {mostrar ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {erro && (
              <div className="bg-red-900/30 border border-red-800 text-red-400 text-xs rounded-lg px-3 py-2">
                {erro}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link
              to="/recuperar-senha"
              className="text-xs text-mis-texto2 hover:text-amarelo transition-colors"
            >
              Esqueci minha senha
            </Link>
          </div>
        </div>

        <p className="text-center mt-5 text-xs text-mis-texto2">
          Responsável?{' '}
          <Link
            to="/matricula"
            className="text-amarelo hover:underline font-medium"
          >
            Faça a matrícula aqui →
          </Link>
        </p>
      </div>
    </div>
  )
}