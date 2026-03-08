import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function esc(s: string) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}
const B = `<w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>`
const CINZA = 'D9D9D9'
const TOTAL = 9750
const COLS = [4830, 300, 1140, 3480]

function tc(children: string, w: number, opts: { span?:number, shade?:string, vAlign?:string } = {}) {
  const span = opts.span || 1
  return `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${span>1?`<w:gridSpan w:val="${span}"/>`:''}
<w:tcBorders>${B}</w:tcBorders>${opts.shade?`<w:shd w:val="clear" w:color="auto" w:fill="${opts.shade}"/>`:''}
<w:vAlign w:val="${opts.vAlign||'center'}"/></w:tcPr>${children}</w:tc>`
}
function para(runs: string, center = false) {
  return `<w:p><w:pPr><w:spacing w:before="40" w:after="40"/>${center?'<w:jc w:val="center"/>':''}</w:pPr>${runs}</w:p>`
}
function run(text: string, bold = false) {
  return `<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/>${bold?'<w:b/>':''}</w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r>`
}
function tr(height: number, cells: string) {
  return `<w:tr><w:trPr><w:trHeight w:val="${height}"/></w:trPr>${cells}</w:tr>`
}
function fmtDate(d: string) {
  if (!d) return ''
  const [y,m,dd] = d.split('-')
  return `${dd}/${m}/${y}`
}

function gerarDocx(d: {
  numeroRelatorio: string, tipoParcial: boolean, dataEmissao: string,
  periodoInicio: string, periodoFim: string, orgao: string, parceiro: string,
  numeroInstrumento: string, objeto: string, metas: string,
  percentualExecucao: string, totalAlunos: number, acoesDesenvolvidas: string,
  nomeResponsavel: string, cpfResponsavel: string,
}): Uint8Array {
  const rows = [
    tr(606, tc(para(run('Identificação', true), true), TOTAL, {span:4, shade:CINZA})),
    tr(710,
      tc(para(run('Nº do Relatório: ', true)+run(d.numeroRelatorio))+
         para(run('Tipo do Relatório: ', true)+run('Parcial')+run(d.tipoParcial?' ( X )':'  (   )')+run('   ')+run('Final', true)+run(!d.tipoParcial?' ( X )':'  (   )')),
         COLS[0]+COLS[1]+COLS[2], {span:3})+
      tc(para(run('Data: ', true)+run(d.dataEmissao)), COLS[3])
    ),
    tr(535, tc(para(run('Período Analisado: ', true)+run(`${fmtDate(d.periodoInicio)} - ${fmtDate(d.periodoFim)}`)), TOTAL, {span:4})),
    tr(516, tc(para(run('Órgão: ', true)+run(d.orgao)), TOTAL, {span:4})),
    tr(524, tc(para(run('Parceiro: ', true)+run(d.parceiro)), TOTAL, {span:4})),
    tr(546, tc(para(run('Nº do Instrumento: ', true)+run(d.numeroInstrumento)), TOTAL, {span:4})),
    tr(919, tc(para(run('Objeto: ', true)+run(d.objeto)), TOTAL, {span:4})),
    tr(552, tc(para(run('Relatório', true), true), TOTAL, {span:4, shade:CINZA})),
    tr(1680,
      tc(para(run('Meta(as) do Período:', true))+para(run(d.metas)), COLS[0], {vAlign:'top'})+
      tc(para(run('Percentual de Execução do Período:', true))+para(run(d.percentualExecucao))+
         para(run(''))+para(run('Total de Alunos Beneficiados no Período:', true))+para(run(String(d.totalAlunos))),
         COLS[1]+COLS[2]+COLS[3], {span:3, vAlign:'top'})
    ),
    tr(1791, tc(para(run('Ações desenvolvidas:', true))+para(run(d.acoesDesenvolvidas)), TOTAL, {span:4, vAlign:'top'})),
    tr(552, tc(para(run('Responsável pela Emissão', true), true), TOTAL, {span:4, shade:CINZA})),
    tr(488,
      tc(para(run('Nome: ', true)+run(d.nomeResponsavel)), COLS[0]+COLS[1]+COLS[2], {span:3})+
      tc(para(run('CPF: ', true)+run(d.cpfResponsavel)), COLS[3])
    ),
    tr(538, tc(para(run('Assinatura:', true)), TOTAL, {span:4})),
  ].join('')

  const tbl = `<w:tbl><w:tblPr><w:tblW w:w="${TOTAL}" w:type="dxa"/><w:tblBorders>${B}</w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>${COLS.map(w=>`<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${rows}</w:tbl>`
  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" mc:Ignorable="w14 wp14">
<w:body>
<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="200"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="22"/></w:rPr><w:t>RELATÓRIO DE EXECUÇÃO DO OBJETO</w:t></w:r></w:p>
${tbl}
<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1418" w:right="1701" w:bottom="1418" w:left="1701" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr>
</w:body></w:document>`

  const enc = new TextEncoder()
  const files = [
    {name:'[Content_Types].xml',data:enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`)},
    {name:'_rels/.rels',data:enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`)},
    {name:'word/document.xml',data:enc.encode(docXml)},
    {name:'word/_rels/document.xml.rels',data:enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`)},
  ]
  return buildZip(files)
}

function buildZip(files:{name:string;data:Uint8Array}[]): Uint8Array {
  const parts:Uint8Array[]=[], cd:Uint8Array[]=[]
  let off=0
  for(const f of files){
    const name=new TextEncoder().encode(f.name),data=f.data,crc=crc32(data)
    const lh=new Uint8Array(30+name.length),lv=new DataView(lh.buffer)
    lv.setUint32(0,0x04034b50,true);lv.setUint16(4,20,true);lv.setUint16(6,0,true);lv.setUint16(8,0,true);lv.setUint16(10,0,true);lv.setUint16(12,0,true)
    lv.setUint32(14,crc,true);lv.setUint32(18,data.length,true);lv.setUint32(22,data.length,true);lv.setUint16(26,name.length,true);lv.setUint16(28,0,true);lh.set(name,30)
    const ce=new Uint8Array(46+name.length),cv=new DataView(ce.buffer)
    cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0,true);cv.setUint16(10,0,true);cv.setUint16(12,0,true);cv.setUint16(14,0,true)
    cv.setUint32(16,crc,true);cv.setUint32(20,data.length,true);cv.setUint32(24,data.length,true);cv.setUint16(28,name.length,true);cv.setUint16(30,0,true);cv.setUint16(32,0,true)
    cv.setUint16(34,0,true);cv.setUint16(36,0,true);cv.setUint32(38,0,true);cv.setUint32(42,off,true);ce.set(name,46)
    parts.push(lh,data);cd.push(ce);off+=lh.length+data.length
  }
  const cdd=cat(cd),eocd=new Uint8Array(22),ev=new DataView(eocd.buffer)
  ev.setUint32(0,0x06054b50,true);ev.setUint16(4,0,true);ev.setUint16(6,0,true);ev.setUint16(8,files.length,true);ev.setUint16(10,files.length,true)
  ev.setUint32(12,cdd.length,true);ev.setUint32(16,off,true);ev.setUint16(20,0,true)
  return cat([...parts,cdd,eocd])
}
function cat(a:Uint8Array[]): Uint8Array {
  const t=a.reduce((n,x)=>n+x.length,0),o=new Uint8Array(t);let p=0
  for(const x of a){o.set(x,p);p+=x.length};return o
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
    const body = await req.json()
    const { data_inicio, data_fim, numero_relatorio, tipo_parcial, nome_responsavel, cpf_responsavel, acoes_desenvolvidas, numero_instrumento } = body

    if(!data_inicio || !data_fim)
      return new Response(JSON.stringify({erro:'data_inicio e data_fim são obrigatórios'}),{status:400,headers:{...CORS,'Content-Type':'application/json'}})

    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const [{data:freqs},{data:matriculas},{data:planos},{data:aulas}] = await Promise.all([
      sb.from('frequencias').select('status').gte('data_aula',data_inicio).lte('data_aula',data_fim),
      sb.from('matriculas_oficinas').select('aluno_id'),
      sb.from('planos_aula').select('objetivos').gte('data_aula',data_inicio).lte('data_aula',data_fim).not('objetivos','is',null),
      sb.from('planos_aula').select('data_aula').gte('data_aula',data_inicio).lte('data_aula',data_fim),
    ])

    const totalAulas = (aulas||[]).length
    const totalFreqs = (freqs||[]).length
    const presencas = (freqs||[]).filter((f:any)=>f.status==='presente').length
    const percentual = totalFreqs > 0 ? Math.round((presencas/totalFreqs)*100) : 0
    const totalAlunos = new Set((matriculas||[]).map((m:any)=>m.aluno_id)).size
    const metas = [...new Set((planos||[]).map((p:any)=>p.objetivos).filter(Boolean))].join('; ') ||
      'Realizar aulas de música nas oficinas do projeto MADE IN SERTÃO.'

    const dataRef = new Date(data_inicio+'T12:00:00')
    const mes = MESES[dataRef.getMonth()]
    const ano = dataRef.getFullYear()

    const bytes = gerarDocx({
      numeroRelatorio: numero_relatorio||'001',
      tipoParcial: tipo_parcial !== false,
      dataEmissao: new Date().toLocaleDateString('pt-BR'),
      periodoInicio: data_inicio, periodoFim: data_fim,
      orgao: 'SECRETARIA DE CULTURA DO ESTADO DO CEARÁ – SECULT',
      parceiro: 'ASSOCIAÇÃO MUSICAL DE MADALENA',
      numeroInstrumento: numero_instrumento||'',
      objeto: 'Execução do Projeto MADE IN SERTÃO – Escola de Música de Madalena, com oferta de oficinas de música para crianças e jovens do município.',
      metas,
      percentualExecucao: `${percentual}%`,
      totalAlunos,
      acoesDesenvolvidas: acoes_desenvolvidas||`Foram realizadas ${totalAulas} aulas de música nas oficinas do projeto, beneficiando ${totalAlunos} alunos com atividades práticas e teóricas.`,
      nomeResponsavel: nome_responsavel||'',
      cpfResponsavel: cpf_responsavel||'',
    })

    return new Response(bytes,{headers:{
      ...CORS,
      'Content-Type':'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition':`attachment; filename="Relatorio_Execucao_${mes}_${ano}.docx"`,
    }})
  } catch(err:any) {
    console.error(err)
    return new Response(JSON.stringify({erro:err.message}),{status:500,headers:{...CORS,'Content-Type':'application/json'}})
  }
})