import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 })
  }

  try {
    const body = await req.json()
    const { conteudo, metodologia, materiais } = body

    const prompt = `Voce e um professor de musica especialista. Com base nas informacoes abaixo, gere um resumo conciso do Plano Mensal (4 a 6 topicos com bullet • ) para o relatorio SECULT-CE. Responda APENAS com os topicos, sem introducao, sem titulo, sem conclusao.

Conteudo da aula: ${conteudo}
${metodologia ? 'Metodologia: ' + metodologia : ''}
${materiais ? 'Materiais: ' + materiais : ''}

Gere em portugues, profissional e objetivo:`

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey ?? '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    const data = await response.json()
    const texto = data.content?.[0]?.text ?? ''

    return new Response(JSON.stringify({ texto }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (e) {
    return new Response(JSON.stringify({ erro: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})