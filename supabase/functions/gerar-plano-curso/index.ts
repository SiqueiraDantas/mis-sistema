import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function esc(s: string): string {
  if (!s) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '</w:t><w:br/><w:t xml:space="preserve">')
}

const FONT = 'Montserrat'

function rpr(bold: boolean, sz: number): string {
  const b = bold ? `<w:b w:val="1"/><w:bCs w:val="1"/>` : ''
  return `<w:rPr><w:rFonts w:ascii="${FONT}" w:cs="${FONT}" w:hAnsi="${FONT}"/>${b}<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr>`
}

function cell(text: string, span: number, bold: boolean, sz: number, shade?: string): string {
  const gs = span > 1 ? `<w:gridSpan w:val="${span}"/>` : ''
  const shd = shade ? `<w:shd w:fill="${shade}" w:val="clear"/>` : ''
  return `<w:tc><w:tcPr>${gs}${shd}</w:tcPr>
    <w:p><w:pPr><w:widowControl w:val="0"/><w:spacing w:line="240" w:lineRule="auto"/></w:pPr>
    <w:r>${rpr(bold, sz)}<w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>
  </w:tc>`
}

function cellTwoLines(label: string, value: string, span: number, shade?: string): string {
  const gs = span > 1 ? `<w:gridSpan w:val="${span}"/>` : ''
  const shd = shade ? `<w:shd w:fill="${shade}" w:val="clear"/>` : ''
  return `<w:tc><w:tcPr>${gs}${shd}</w:tcPr>
    <w:p><w:pPr><w:widowControl w:val="0"/><w:spacing w:line="240" w:lineRule="auto"/></w:pPr>
    <w:r>${rpr(true, 16)}<w:t xml:space="preserve">${esc(label)}</w:t></w:r></w:p>
    <w:p><w:pPr><w:widowControl w:val="0"/><w:spacing w:line="240" w:lineRule="auto"/></w:pPr>
    <w:r>${rpr(false, 20)}<w:t xml:space="preserve">${esc(value)}</w:t></w:r></w:p>
  </w:tc>`
}

function row(height: number, ...cells: string[]): string {
  return `<w:tr>
    <w:trPr><w:cantSplit w:val="0"/><w:trHeight w:val="${height}" w:hRule="atLeast"/></w:trPr>
    ${cells.join('')}
  </w:tr>`
}

// Tabela principal com 6 colunas: 1230 | 2145 | 2340 | 1365 | 1185 | 1350 = 9615
function buildDocx(data: any): any {
  const { turma, professor, planos, dataInicio, dataFim } = data
  const nomeCurso = turma?.oficinas?.nome || turma?.nome || ''
  const nomeProfessor = (professor?.nome || '').toUpperCase()
  const emailProfessor = professor?.email_contato || professor?.email || ''
  const telProfessor = professor?.telefone || ''
  const miniCurriculo = professor?.mini_curriculo || ''
  const vagas = String(turma?.vagas || '')
  const horario = turma?.horario_inicio ? String(turma.horario_inicio).slice(0, 5) + 'h' : ''
  const cargaHoraria = (planos.length * 1.5).toFixed(1) + ' h/a'
  const planoMensal = planos.find((p: any) => p.plano_mensal)?.plano_mensal || ''

  const fmtDate = (d: string) => {
    const [y, m, dd] = d.split('-')
    return `${dd}/${m}/${y}`
  }

  const W = 9615
  const tblBorders = `<w:tblBorders>
    <w:top w:color="000000" w:space="0" w:sz="8" w:val="single"/>
    <w:left w:color="000000" w:space="0" w:sz="8" w:val="single"/>
    <w:bottom w:color="000000" w:space="0" w:sz="8" w:val="single"/>
    <w:right w:color="000000" w:space="0" w:sz="8" w:val="single"/>
    <w:insideH w:color="000000" w:space="0" w:sz="8" w:val="single"/>
    <w:insideV w:color="000000" w:space="0" w:sz="8" w:val="single"/>
  </w:tblBorders>`

  // Tabela principal cabecalho (6 cols)
  const tblGrid6 = `<w:tblGrid>
    <w:gridCol w:w="1230"/><w:gridCol w:w="2145"/><w:gridCol w:w="2340"/>
    <w:gridCol w:w="1365"/><w:gridCol w:w="1185"/><w:gridCol w:w="1350"/>
  </w:tblGrid>`

  const tblCabecalho = `<w:tbl>
    <w:tblPr><w:tblW w:w="${W}" w:type="dxa"/><w:jc w:val="center"/>${tblBorders}<w:tblLayout w:type="fixed"/></w:tblPr>
    ${tblGrid6}
    ${row(360,
      cell('ENTIDADE:', 1, true, 16, 'efefef'),
      cell('ASSOCIACAO MUSICAL DE MADALENA', 5, false, 24)
    )}
    ${row(360,
      cell('PROJETO:', 1, true, 16, 'efefef'),
      cell('MADE IN SERTAO - ESCOLA DE MUSICA DE MADALENA', 5, false, 24)
    )}
    ${row(630,
      cell('NOME DO CURSO:', 1, true, 16, 'efefef'),
      cell(nomeCurso, 2, false, 24),
      cell(`VAGAS: ${vagas}`, 1, false, 20, 'efefef'),
      cell('CARGA HORARIA:', 1, true, 16, 'efefef'),
      cell(cargaHoraria, 1, false, 24)
    )}
    ${row(360,
      cell('DATA:', 1, true, 16, 'efefef'),
      cell(`${fmtDate(dataInicio)}`, 2, false, 24),
      cell('', 1, false, 16),
      cell('HORARIO:', 1, true, 16, 'efefef'),
      cell(horario, 1, false, 24)
    )}
    ${row(480,
      cellTwoLines('NOME DO PROFESSOR (A):', nomeProfessor, 2, 'efefef'),
      cellTwoLines('E-MAIL:', emailProfessor, 2, 'efefef'),
      cellTwoLines('TELEFONE:', telProfessor, 2, 'efefef')
    )}
  </w:tbl>`

  // Tabela mini curriculo (1 col)
  const tblGrid1 = `<w:tblGrid><w:gridCol w:w="${W}"/></w:tblGrid>`

  const tblCurriculo = `<w:tbl>
    <w:tblPr><w:tblW w:w="${W}" w:type="dxa"/><w:jc w:val="center"/>${tblBorders}<w:tblLayout w:type="fixed"/></w:tblPr>
    ${tblGrid1}
    ${row(360, cell('MINI CURRICULO DO PROFESSOR:', 1, true, 16, 'efefef'))}
    ${row(600, cell(miniCurriculo || ' ', 1, false, 20))}
  </w:tbl>`

  // Tabela plano mensal
  const tblPlanoMensal = planoMensal ? `<w:tbl>
    <w:tblPr><w:tblW w:w="${W}" w:type="dxa"/><w:jc w:val="center"/>${tblBorders}<w:tblLayout w:type="fixed"/></w:tblPr>
    ${tblGrid1}
    ${row(360, cell(`Plano Mensal - ${nomeCurso}`, 1, true, 18, 'efefef'))}
    ${row(600, cell(planoMensal, 1, false, 18))}
  </w:tbl>` : ''

  // Tabela aulas (4 cols)
  const tblGrid4 = `<w:tblGrid>
    <w:gridCol w:w="1400"/><w:gridCol w:w="2738"/><w:gridCol w:w="2738"/><w:gridCol w:w="2739"/>
  </w:tblGrid>`

  const aulaRows = planos.map((pl: any) =>
    row(360,
      cell(fmtDate(pl.data_aula), 1, false, 18),
      cell(pl.conteudo || '', 1, false, 18),
      cell(pl.metodologia || '', 1, false, 18),
      cell(pl.materiais || '', 1, false, 18)
    )
  ).join('')

  const tblAulas = `<w:tbl>
    <w:tblPr><w:tblW w:w="${W}" w:type="dxa"/><w:jc w:val="center"/>${tblBorders}<w:tblLayout w:type="fixed"/></w:tblPr>
    ${tblGrid4}
    ${row(360,
      cell('DATA:', 1, true, 16, 'efefef'),
      cell('CONTEUDO:', 1, true, 16, 'efefef'),
      cell('METODOLOGIA DA AULA:', 1, true, 16, 'efefef'),
      cell('NECESSIDADES TECNICAS / MATERIAIS', 1, true, 16, 'efefef')
    )}
    ${aulaRows}
  </w:tbl>`

  // Tabela assinaturas
  const tblGrid2 = `<w:tblGrid><w:gridCol w:w="4807"/><w:gridCol w:w="4808"/></w:tblGrid>`
  const tblAssina = `<w:tbl>
    <w:tblPr><w:tblW w:w="${W}" w:type="dxa"/><w:jc w:val="center"/>
      <w:tblBorders>
        <w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/>
        <w:insideH w:val="none"/><w:insideV w:val="none"/>
      </w:tblBorders>
    </w:tblPr>
    ${tblGrid2}
    <w:tr>
      <w:tc><w:tcPr><w:tcBorders><w:top w:color="000000" w:sz="8" w:val="single"/></w:tcBorders></w:tcPr>
        <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r>${rpr(true, 18)}<w:t>PROFESSOR(A)</w:t></w:r></w:p></w:tc>
      <w:tc><w:tcPr><w:tcBorders><w:top w:color="000000" w:sz="8" w:val="single"/></w:tcBorders></w:tcPr>
        <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r>${rpr(true, 18)}<w:t>COORDENACAO PEDAGOGICA</w:t></w:r></w:p></w:tc>
    </w:tr>
  </w:tbl>`

  const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>
  <w:p><w:pPr><w:keepNext w:val="1"/><w:jc w:val="center"/><w:spacing w:line="360" w:lineRule="auto"/></w:pPr>
    <w:r><w:rPr><w:rFonts w:ascii="${FONT}" w:hAnsi="${FONT}"/><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>
    <w:t>PLANO DE CURSO</w:t></w:r></w:p>
  ${tblCabecalho}
  <w:p><w:pPr><w:spacing w:after="80"/></w:pPr></w:p>
  ${tblCurriculo}
  <w:p><w:pPr><w:spacing w:after="80"/></w:pPr></w:p>
  ${tblPlanoMensal}
  ${tblPlanoMensal ? '<w:p><w:pPr><w:spacing w:after="80"/></w:pPr></w:p>' : ''}
  ${tblAulas}
  <w:p><w:pPr><w:spacing w:after="80"/></w:pPr></w:p>
  <w:p><w:pPr><w:jc w:val="center"/></w:pPr>
    <w:r><w:rPr><w:rFonts w:ascii="${FONT}" w:hAnsi="${FONT}"/><w:sz w:val="18"/></w:rPr>
    <w:t>Madalena, ${hoje}</w:t></w:r></w:p>
  <w:p><w:pPr><w:spacing w:after="720"/></w:pPr></w:p>
  ${tblAssina}
  <w:sectPr>
    <w:pgSz w:w="11906" w:h="16838"/>
    <w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/>
  </w:sectPr>
</w:body>
</w:document>`

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`

  const relsMain = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`

  const wordRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`

  return { docXml, contentTypes, relsMain, wordRels }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { turma_id, professor_id, data_inicio, data_fim } = await req.json()
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    const [{ data: turma }, { data: professor }, { data: planos }] = await Promise.all([
      supabase.from('turmas').select('*, oficinas(nome)').eq('id', turma_id).single(),
      supabase.from('profiles').select('*').eq('id', professor_id).single(),
      supabase.from('planos_aula').select('*').eq('turma_id', turma_id)
        .gte('data_aula', data_inicio).lte('data_aula', data_fim).order('data_aula'),
    ])
    if (!planos || planos.length === 0) {
      return new Response(JSON.stringify({ erro: 'Nenhum plano encontrado no periodo selecionado' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' }
      })
    }
    const result = buildDocx({ turma, professor, planos, dataInicio: data_inicio, dataFim: data_fim })
    return new Response(JSON.stringify({ ...result, ok: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' }
    })
  } catch (e) {
    return new Response(JSON.stringify({ erro: String(e) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
    })
  }
})