import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { ArrowLeft, Music } from 'lucide-react'

export default function RecoverPassword() {
  const { recuperarSenha } = useAuth()
  const [email, setEmail]     = useState('')
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro]       = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      await recuperarSenha(email)
      setEnviado(true)
    } catch {
      setErro('Não foi possível enviar o e-mail. Verifique o endereço.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-mis-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14
                          bg-amarelo rounded-2xl mb-4">
            <Music size={28} className="text-black" />
          </div>
          <h1 className="text-2xl font-black text-mis-texto font-poppins">Recuperar Senha</h1>
          <p className="text-mis-texto2 text-sm mt-1">Made In Sertão — Escola de Música</p>
        </div>

        <div className="mis-card">
          {enviado ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">📬</div>
              <p className="text-mis-texto font-semibold mb-1">E-mail enviado!</p>
              <p className="text-mis-texto2 text-sm">
                Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-mis-texto2 mb-2">
                Informe seu e-mail para receber o link de recuperação.
              </p>
              <div>
                <label className="mis-label">E-mail</label>
                <input
                  type="email"
                  className="mis-input"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              {erro && (
                <div className="bg-red-900/30 border border-red-800 text-red-400 text-xs rounded-lg px-3 py-2">
                  {erro}
                </div>
              )}
              <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
                {loading ? 'Enviando...' : 'Enviar link de recuperação'}
              </button>
            </form>
          )}
        </div>

        <div className="text-center mt-4">
          <Link to="/login" className="text-xs text-mis-texto2 hover:text-amarelo
                                        transition-colors flex items-center justify-center gap-1">
            <ArrowLeft size={12} /> Voltar ao login
          </Link>
        </div>
      </div>
    </div>
  )
}