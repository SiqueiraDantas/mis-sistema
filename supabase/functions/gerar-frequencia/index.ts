import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const MESES_UPPER = ['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO']
const CINZA = 'EFEFEF'

function esc(s: string) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

const B = `<w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>`

function tc(text: string, w: number, opts: { bold?:boolean, center?:boolean, shade?:string, size?:number, span?:number } = {}) {
  const span = opts.span || 1
  return `<w:tc>
  <w:tcPr>
    <w:tcW w:w="${w}" w:type="dxa"/>
    ${span>1?`<w:gridSpan w:val="${span}"/>`:''}
    <w:tcBorders>${B}</w:tcBorders>
    ${opts.shade?`<w:shd w:val="clear" w:color="auto" w:fill="${opts.shade}"/>`:''}
    <w:tcMar><w:top w:w="60" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tcMar>
    <w:vAlign w:val="center"/>
  </w:tcPr>
  <w:p>
    <w:pPr>
      <w:spacing w:before="0" w:after="0"/>
      <w:jc w:val="${opts.center?'center':'left'}"/>
    </w:pPr>
    <w:r>
      <w:rPr>
        <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
        <w:sz w:val="${(opts.size||8)*2}"/>
        ${opts.bold?'<w:b/>':''}
      </w:rPr>
      <w:t xml:space="preserve">${esc(text)}</w:t>
    </w:r>
  </w:p>
</w:tc>`
}

function tr(height: number, cells: string) {
  return `<w:tr><w:trPr><w:trHeight w:val="${height}"/></w:trPr>${cells}</w:tr>`
}

function gerarDocx(dados: {
  oficina: string, professor: string, mes: number, ano: number,
  alunos: { id: string; nome: string }[],
  diasComAula: string[],
  frequencias: { aluno_id: string; data_aula: string; status: string }[],
  conteudos: string[],
}): Uint8Array {
  const { oficina, professor, mes, ano, alunos, diasComAula, frequencias, conteudos } = dados
  const numDias = Math.min(diasComAula.length, 22)
  const dias = diasComAula.slice(0, numDias)

  const TOTAL=14570, C_NUM=380, C_NOME=2800, C_IDADE=520
  const C_DIA = Math.floor((TOTAL-C_NUM-C_NOME-C_IDADE)/Math.max(numDias,1))
  const N = 2+numDias+1

  const spanDiasL = Math.ceil(numDias/2)
  const spanDiasR = numDias - spanDiasL
  const spanL = 2 + spanDiasL
  const spanR = spanDiasR + 1
  const wL = C_NUM + C_NOME + C_DIA*spanDiasL
  const wR = C_DIA*spanDiasR + C_IDADE

  function getStatus(id: string, dia: string) {
    const data = `${ano}-${String(mes+1).padStart(2,'0')}-${dia}`
    const f = frequencias.find(f => f.aluno_id === id && f.data_aula === data)
    if (!f) return ''
    return f.status === 'presente' ? 'P' : f.status === 'ausente' ? 'F' : f.status === 'justificado' ? 'J' : ''
  }

  const colWidths = [C_NUM, C_NOME, ...Array(numDias).fill(C_DIA), C_IDADE]

  const mainRows = [
    tr(340, tc('INSTITUIÇÃO: ASSOCIAÇÃO MUSICAL DE MADALENA', TOTAL, {span:N, shade:CINZA, bold:true, size:8})),
    tr(340, tc('PROJETO: MADE IN SERTÃO – ESCOLA DE MÚSICA DE MADALENA', TOTAL, {span:N, shade:CINZA, bold:true, size:8})),
    tr(340, tc(`CURSO: ${oficina.toUpperCase()}`, wL, {span:spanL, shade:CINZA, bold:true, size:8}) + tc('CARGA HORÁRIA: 21h/a mês', wR, {span:spanR, shade:CINZA, bold:true, size:8})),
    tr(340, tc('LINGUAGEM ARTÍSTICA / FAZER CULTURAL: MÚSICA', wL, {span:spanL, shade:CINZA, bold:true, size:8}) + tc('HORÁRIO:', wR, {span:spanR, shade:CINZA, bold:true, size:8})),
    tr(340, tc('MODALIDADE:   PRESENCIAL ( x  )    ON-LINE (   )     HÍBRIDO (   )', TOTAL, {span:N, shade:CINZA, bold:true, size:8})),
    tr(340, tc(`PROFESSOR: ${professor.toUpperCase()}`, TOTAL, {span:N, shade:CINZA, bold:true, size:8})),
    tr(180, tc('', TOTAL, {span:N})),
    tr(380,
      tc('Nº', C_NUM, {center:true, bold:true, shade:CINZA, size:8}) +
      tc('NOME', C_NOME, {center:true, bold:true, shade:CINZA, size:8}) +
      tc(`${MESES_UPPER[mes]}/${ano}`, C_DIA*numDias, {span:numDias, center:true, bold:true, shade:CINZA, size:8}) +
      tc('IDADE', C_IDADE, {center:true, bold:true, shade:CINZA, size:8})
    ),
    tr(340,
      tc('', C_NUM, {shade:CINZA}) + tc('', C_NOME, {shade:CINZA}) +
      dias.map(d => tc(d, C_DIA, {center:true, bold:true, shade:CINZA, size:8})).join('') +
      tc('', C_IDADE, {shade:CINZA})
    ),
    ...alunos.map((a, i) => tr(320,
      tc(String(i+1), C_NUM, {center:true, shade:CINZA, size:8}) +
      tc(a.nome, C_NOME, {size:8}) +
      dias.map(d => tc(getStatus(a.id, d), C_DIA, {center:true, size:8})).join('') +
      tc('', C_IDADE, {center:true, shade:CINZA, size:8})
    )),
  ].join('')

  const mainTable = `<w:tbl><w:tblPr><w:tblW w:w="${TOTAL}" w:type="dxa"/><w:tblBorders>${B}</w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>${colWidths.map(w=>`<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${mainRows}</w:tbl>`

  const hS = Math.floor(TOTAL/2)
  const cRows = [
    tr(380, tc('CONTEÚDO PROGRAMÁTICO', TOTAL, {center:true, bold:true, shade:CINZA, size:8})),
    ...(conteudos.length > 0 ? conteudos.map(t => tr(300, tc(t, TOTAL, {size:8}))) : [tr(300, tc('', TOTAL, {size:8}))]),
  ].join('')
  const cTable = `<w:tbl><w:tblPr><w:tblW w:w="${TOTAL}" w:type="dxa"/><w:tblBorders>${B}</w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="${TOTAL}"/></w:tblGrid>${cRows}</w:tbl>`

  const sRows = [
    tr(700, tc('', hS) + tc('', TOTAL-hS)),
    `<w:tr>${tc('ASSINATURA DO(A) PROFESSOR(A)', hS, {center:true, bold:true, size:8})}${tc('ASSINATURA DO(A) COORDENADOR(A) PEDAGÓGICO(A)', TOTAL-hS, {center:true, bold:true, size:8})}</w:tr>`,
  ].join('')
  const sTable = `<w:tbl><w:tblPr><w:tblW w:w="${TOTAL}" w:type="dxa"/><w:tblBorders>${B}</w:tblBorders></w:tblPr><w:tblGrid><w:gridCol w:w="${hS}"/><w:gridCol w:w="${TOTAL-hS}"/></w:tblGrid>${sRows}</w:tbl>`

  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" mc:Ignorable="w14 wp14">
<w:body>
<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="120"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:sz w:val="24"/></w:rPr><w:t>FREQUÊNCIA DE ALUNOS</w:t></w:r></w:p>
${mainTable}
<w:p><w:pPr><w:spacing w:before="200" w:after="0"/></w:pPr></w:p>
${cTable}
<w:p><w:pPr><w:spacing w:before="200" w:after="0"/></w:pPr></w:p>
${sTable}
<w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr>
</w:body></w:document>`

  const enc = new TextEncoder()
  const files = [
    {name:'[Content_Types].xml', data:enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`)},
    {name:'_rels/.rels', data:enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`)},
    {name:'word/document.xml', data:enc.encode(docXml)},
    {name:'word/_rels/document.xml.rels', data:enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`)},
  ]
  return buildZip(files)
}

function buildZip(files:{name:string;data:Uint8Array}[]): Uint8Array {
  const parts:Uint8Array[]=[], cd:Uint8Array[]=[]
  let off=0
  for(const f of files){
    const name=new TextEncoder().encode(f.name), data=f.data, crc=crc32(data)
    const lh=new Uint8Array(30+name.length), lv=new DataView(lh.buffer)
    lv.setUint32(0,0x04034b50,true);lv.setUint16(4,20,true);lv.setUint16(6,0,true);lv.setUint16(8,0,true);lv.setUint16(10,0,true);lv.setUint16(12,0,true)
    lv.setUint32(14,crc,true);lv.setUint32(18,data.length,true);lv.setUint32(22,data.length,true);lv.setUint16(26,name.length,true);lv.setUint16(28,0,true);lh.set(name,30)
    const ce=new Uint8Array(46+name.length), cv=new DataView(ce.buffer)
    cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0,true);cv.setUint16(10,0,true);cv.setUint16(12,0,true);cv.setUint16(14,0,true)
    cv.setUint32(16,crc,true);cv.setUint32(20,data.length,true);cv.setUint32(24,data.length,true);cv.setUint16(28,name.length,true);cv.setUint16(30,0,true);cv.setUint16(32,0,true)
    cv.setUint16(34,0,true);cv.setUint16(36,0,true);cv.setUint32(38,0,true);cv.setUint32(42,off,true);ce.set(name,46)
    parts.push(lh,data);cd.push(ce);off+=lh.length+data.length
  }
  const cdd=cat(cd), eocd=new Uint8Array(22), ev=new DataView(eocd.buffer)
  ev.setUint32(0,0x06054b50,true);ev.setUint16(4,0,true);ev.setUint16(6,0,true);ev.setUint16(8,files.length,true);ev.setUint16(10,files.length,true)
  ev.setUint32(12,cdd.length,true);ev.setUint32(16,off,true);ev.setUint16(20,0,true)
  return cat([...parts,cdd,eocd])
}

function cat(a:Uint8Array[]): Uint8Array {
  const t=a.reduce((n,x)=>n+x.length,0), o=new Uint8Array(t); let p=0
  for(const x of a){o.set(x,p);p+=x.length}; return o
}

function crc32(d:Uint8Array): number {
  const t:number[]=[]
  for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c}
  let c=0xFFFFFFFF
  for(let i=0;i<d.length;i++)c=(c>>>8)^t[(c^d[i])&0xFF]
  return(c^0xFFFFFFFF)>>>0
}

serve(async (req) => {
  if(req.method==='OPTIONS') return new Response('ok',{headers:CORS})
  try {
    const {oficina_id, data_inicio, data_fim} = await req.json()
    if(!oficina_id || !data_inicio || !data_fim)
      return new Response(JSON.stringify({erro:'oficina_id, data_inicio e data_fim são obrigatórios'}),{status:400,headers:{...CORS,'Content-Type':'application/json'}})

    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const m1 = data_inicio
    const m2 = data_fim
    // Pegar mês/ano do intervalo para o cabeçalho
    const dataRef = new Date(data_inicio + 'T12:00:00')
    const mes = dataRef.getMonth()
    const ano = dataRef.getFullYear()

    const [{data:of_},{data:mat},{data:freqs},{data:planos},{data:prof}] = await Promise.all([
      sb.from('oficinas').select('id,nome').eq('id',oficina_id).single(),
      sb.from('matriculas_oficinas').select('aluno_id,alunos(id,nome)').eq('oficina_id',oficina_id),
      sb.from('frequencias').select('aluno_id,data_aula,status').eq('turma_id',oficina_id).gte('data_aula',m1).lte('data_aula',m2),
      sb.from('planos_aula').select('conteudo').gte('data_aula',m1).lte('data_aula',m2).not('conteudo','is',null).order('data_aula'),
      sb.from('profiles').select('nome').eq('role','professor').limit(1).single(),
    ])

    if(!of_) return new Response(JSON.stringify({erro:'Oficina não encontrada'}),{status:404,headers:{...CORS,'Content-Type':'application/json'}})

    const alunos = (mat||[]).map((m:any)=>m.alunos).filter(Boolean).sort((a:any,b:any)=>a.nome.localeCompare(b.nome))
    const diasComAula = [...new Set((freqs||[]).map((f:any)=>f.data_aula))].sort().map((d:string)=>d.split('-')[2])
    const conteudos = [...new Set((planos||[]).map((p:any)=>p.conteudo).filter(Boolean))] as string[]

    const bytes = gerarDocx({ oficina:of_.nome, professor:prof?.nome||'', mes, ano, alunos, diasComAula, frequencias:freqs||[], conteudos })

    return new Response(bytes, {headers:{
      ...CORS,
      'Content-Type':'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition':`attachment; filename="Frequencia_${of_.nome.replace(/\s+/g,'_')}_${MESES[mes]}_${ano}.docx"`,
    }})
  } catch(err:any) {
    console.error(err)
    return new Response(JSON.stringify({erro:err.message}),{status:500,headers:{...CORS,'Content-Type':'application/json'}})
  }
})