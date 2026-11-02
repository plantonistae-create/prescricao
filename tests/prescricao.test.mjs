import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = file => fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const html = read('index.html');
const bic = read('bic-presets.js');
const cef = read('ceftriaxona-card.js');
const word = read('prescription-word.js');

test('JavaScript está sintaticamente íntegro em todos os scripts', () => {
  for(const js of [bic,cef,word]) assert.doesNotThrow(()=>new vm.Script(js));
  for(const tag of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)){
    if(tag[1].trim()) assert.doesNotThrow(()=>new vm.Script(tag[1]));
  }
});

test('a atualização está restrita à prescrição e os novos atalhos são carregados', () => {
  for(const src of ['./bic-presets.js','./ceftriaxona-card.js','./prescription-word.js'])
    assert.ok(html.includes('src="'+src+'"'));
  for(const name of ['Clopidogrel 75mg comprimido','Paracetamol 500mg comprimido',
    'Brometo de ipratrópio 0,25mg/mL'])
    assert.ok(html.includes(name));
  assert.equal((html.match(/obs:"HGT abaixo de 70"/g)||[]).length,2);
  assert.equal((html.match(/dose:"4 ampolas de 10mL \(40mL\)"/g)||[]).length,2);
  assert.ok(html.includes('abrirRevisaoWord()'));
  assert.ok(!html.includes('>⬇ Salvar PDF</button>'));
});

function mockBIC(){
  const byId={},handlers={},meds=[];
  const el=(id,value='')=>({id,value,textContent:'',innerHTML:'',
    focus(){},addEventListener(kind,fn){handlers[id+':'+kind]=fn;}});
  for(const [id,value] of Object.entries({
    bicMedicamento:'midazolam',bicConcentracao:'0',bicVelocidade:'',
    bicMensagem:'',bicAdicionar:''
  })) byId[id]=el(id,value);
  const host={insertBefore(node){byId[node.id]=node;}};
  const card={querySelector(){return {textContent:'Medicações Isoladas'}},parentNode:host};
  const document={readyState:'complete',querySelectorAll(){return [card];},
    getElementById(id){return byId[id];},createElement(){return {
      id:'',innerHTML:'',querySelector(sel){return byId[sel.slice(1)]}
    };}};
  const addMed=(name,dose,via,dil)=>meds.push({name,dose,via,dil});
  vm.runInNewContext(bic,{document,meds,addMed,renderMeds:()=>{}});
  return {byId,handlers,meds};
}

test('seis preparos BIC produzem concentração, volume final, EV e mL/h corretos',()=>{
  const {byId,handlers,meds}=mockBIC();
  const esperado=[
    ['midazolam','0,8 mg/mL',250],
    ['midazolam','1 mg/mL',100],
    ['midazolam','2 mg/mL',100],
    ['fentanil','5 mcg/mL',500],
    ['fentanil','8 mcg/mL',250],
    ['fentanil','10 mcg/mL',200]
  ];
  for(let c=0;c<esperado.length;c++){
    const [type,conc,volume]=esperado[c];
    byId.bicMedicamento.value=type;
    handlers['bicMedicamento:change']();
    byId.bicConcentracao.value=String(c%3);
    byId.bicVelocidade.value='1,5';
    handlers['bicAdicionar:click']();
    const item=meds.at(-1);
    assert.equal(item.via,'EV');
    assert.ok(item.dose.includes(conc));
    assert.ok(item.dose.includes('volume final '+volume+' mL'));
    assert.equal(item.aprazoTexto,'BIC contínua — 1,5 mL/h');
  }
  assert.equal(meds.length,6);
  for(const invalid of ['', '0','-1','abc','1.2.3']){
    byId.bicVelocidade.value=invalid;
    handlers['bicAdicionar:click']();
  }
  assert.equal(meds.length,6,'sem prescrição quando velocidade é inválida');
});

test('exportação .docx tem partes OOXML válidas e preserva conteúdo especial', async()=>{
  let blob,download;
  const values={pName:'Teste & Segurança',pAge:'44',pDoc:'A<123',pDate:'01/11/2026'};
  const document={readyState:'loading',addEventListener(){},querySelectorAll(){return [];},
    getElementById(id){return {value:values[id]||''}},createElement(){
      return {click(){download=this.download;},remove(){}};
    },body:{appendChild(){}}};
  const window={};
  const URL={
    createObjectURL(value){blob=value;return 'blob:teste';},
    revokeObjectURL(){}
  };
  vm.runInNewContext(word,{document,window,URL,Blob,TextEncoder,
    buildPrescriptionItems:()=>[{texto:'Midazolam BIC — 0,8 mg/mL — 1,5 mL/h',obs:'Testar & confirmar'}],
    setTimeout:()=>{}});
  window.exportarPrescricaoWord();
  assert.match(download,/^Prescricao_.*\.docx$/);
  assert.equal(blob.type,'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  const bytes=new Uint8Array(await blob.arrayBuffer());
  const view=new DataView(bytes.buffer);
  const dec=new TextDecoder();
  let off=0;const parts={};
  while(off+30<bytes.length && view.getUint32(off,true)===0x04034b50){
    const n=view.getUint16(off+26,true),extra=view.getUint16(off+28,true),size=view.getUint32(off+18,true);
    const name=dec.decode(bytes.subarray(off+30,off+30+n));
    const content=dec.decode(bytes.subarray(off+30+n+extra,off+30+n+extra+size));
    parts[name]=content;
    off+=30+n+extra+size;
  }
  assert.equal(view.getUint32(off,true),0x02014b50);
  assert.deepEqual(Object.keys(parts).sort(),['_rels/.rels','[Content_Types].xml','word/document.xml'].sort());
  assert.match(parts['word/document.xml'],/Midazolam BIC/);
  assert.match(parts['word/document.xml'],/A&lt;123/);
  assert.match(parts['word/document.xml'],/Teste &amp; Segurança/);
  assert.match(parts['word/document.xml'],/orient="landscape"/);
});

test('ceftriaxona anexa cartão extra sem remover a ficha GIF',()=>{
  assert.match(html,/ids:\s*\['printSheet',\s*'printSheet2',\s*'printSheet3'\]\.concat\(temCeftriaxona\(\)\s*\?\s*\['cefCardSheet'\]/);
  assert.match(html,/ids:\s*\['gifSheet1',\s*'gifSheet2'\]/);
  assert.match(cef,/CARTÃO CONTROLE DE DOSE/);
  assert.match(cef,/class="cef-dual"/);
  assert.match(cef,/function\(\)\{/);
});
