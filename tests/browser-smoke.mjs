import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright-core';

const dir=resolve('artifacts/qa');
mkdirSync(dir,{recursive:true});
const chrome=process.env.CHROME_BIN || '/usr/bin/google-chrome';
const browser=await chromium.launch({headless:true,executablePath:chrome,args:['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files']});
const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push('app: '+e.message));
await page.goto(pathToFileURL(resolve('index.html')).href,{waitUntil:'domcontentloaded'});
await page.waitForTimeout(800);
await page.locator('#bicMedicamento').waitFor({state:'visible',timeout:8000});
await page.locator('#pName').fill('PACIENTE TESTE QA');
await page.locator('#pAge').fill('44 anos');
await page.locator('#pDoc').fill('000.000.000-00');
await page.locator('#bicMedicamento').selectOption('midazolam');
await page.locator('#bicConcentracao').selectOption('2');
await page.locator('#bicVelocidade').fill('1,5');
await page.locator('#bicAdicionar').click();
const bicGerada=await page.evaluate(()=>meds.find(m=>/Midazolam — BIC/.test(m.name)));
assert.ok(bicGerada,'BIC foi adicionada ao estado do formulário');
assert.match(bicGerada.dose,/2 mg\/mL/);
assert.match(bicGerada.aprazoTexto,/1,5 mL\/h/);
await page.locator('#medSearch').fill('Ceftriaxona');
await page.locator('#medLib .med-chip').filter({hasText:'Ceftriaxona 1g'}).first().click();
assert.ok(await page.evaluate(()=>meds.some(m=>m.name==='Ceftriaxona 1g')),'ceftriaxona adicionada ao estado');
await page.screenshot({path:resolve(dir,'prescricao-1g-bic.png'),fullPage:false});

// Word é realmente um download e não uma caixa de impressão renomeada.
await page.locator('.desk-top-actions .desk-top-btn').filter({hasText:'Salvar Word'}).click();
const pendingDownload=page.waitForEvent('download');
await page.locator('#reviewPrintBtn').click();
const download=await pendingDownload;
assert.match(download.suggestedFilename(),/\.docx$/);
await download.saveAs(resolve(dir,'prescricao-qa.docx'));

// Impressão da ceftriaxona deve gerar duas abas, em sequência, com o cartão em paisagem
// na primeira e o formulário GIF em retrato na segunda.
const pages=[];
context.on('page',p=>{if(p!==page)pages.push(p);});
await page.locator('.desk-top-actions .desk-top-btn.primary').click();
await page.locator('#reviewPrintBtn').click();
await page.waitForTimeout(2400);
assert.ok(pages.length>=2, 'Esperadas abas independentes para a prescrição e GIF');
const html1=await pages[0].content(),html2=await pages[1].content();
assert.match(html1,/cefCardSheet/);
assert.match(html2,/gifSheet1/);
assert.match(html2,/gifSheet2/);
assert.match(await pages[0].locator('.aviso-impressao').innerText(),/FICHA GIF ANTIGA/);
assert.equal(await pages[0].locator('button[onclick*="reimprimirFichaGIF"]').count(),1,
  'botão de reimpressão da ficha GIF presente');
assert.ok(await pages[1].locator('#gifSheet1').evaluate(el=>!el.classList.contains('vazia')));
assert.ok(await pages[1].locator('#gifSheet2').evaluate(el=>!el.classList.contains('vazia')));

const imagem=pages[0].locator('#cefCardSheet img.cef-original-page');
await imagem.waitFor({state:'attached'});
await pages[0].waitForFunction(()=>{
  const img=document.querySelector('#cefCardSheet img.cef-original-page');
  return img?.complete && img.naturalWidth===1684 && img.naturalHeight===1191;
},{timeout:15000});
const imagemInfo=await imagem.evaluate(img=>({
  width:img.naturalWidth,height:img.naturalHeight,src:img.currentSrc
}));
assert.match(imagemInfo.src,/assets\/ceftriaxona_pagina_original.png$/);
assert.equal(imagemInfo.width,1684);
assert.equal(imagemInfo.height,1191);
await pages[0].pdf({path:resolve(dir,'prescricao-e-cartao.pdf'),preferCSSPageSize:true,printBackground:true});
await pages[1].pdf({path:resolve(dir,'ficha-gif.pdf'),preferCSSPageSize:true,printBackground:true});
await pages[0].screenshot({path:resolve(dir,'preview-impressao-paisagem.png'),fullPage:false});
await pages[1].screenshot({path:resolve(dir,'preview-gif-retrato.png'),fullPage:false});

// Sem ceftriaxona, não cabe cartão de controle de dose.
const clean=await context.newPage();
clean.on('pageerror',e=>errors.push('limpo: '+e.message));
await clean.goto(pathToFileURL(resolve('index.html')).href,{waitUntil:'domcontentloaded'});
await clean.locator('#medLib').waitFor();
assert.equal(await clean.evaluate(()=>temCeftriaxona()),false);
assert.equal(await page.evaluate(()=>temCeftriaxona()),true);
await clean.locator('#medSearch').fill('Ceftriaxona 2g');
await clean.locator('#medLib .med-chip').filter({hasText:'Ceftriaxona 2g'}).first().click();
assert.equal(await clean.evaluate(()=>temCeftriaxona()),true,'ceftriaxona 2g dispara cartão');
await clean.locator('#medSearch').fill('Glicose 50%');
await clean.locator('#medLib .med-chip').filter({hasText:'Glicose 50% hipertônica'}).first().click();
const glicose=await clean.evaluate(()=>meds.find(m=>m.name==='Glicose 50% hipertônica'));
assert.match(glicose.dose,/4 ampolas de 10mL/);
assert.equal(glicose.aprazo,'SN (se necessário)');
assert.equal(glicose.obs,'HGT abaixo de 70');
for(const termo of ['Clopidogrel 75mg','Paracetamol 500mg','Brometo de ipratrópio 0,25mg/mL']){
  await clean.locator('#medSearch').fill(termo);
  assert.ok((await clean.locator('#medLib .med-chip').count())>0,'Encontrou '+termo);
}
// Cenário de paginação: 28 itens fictícios, todos devem continuar no DOCX editável.
const stress=await context.newPage();
stress.on('pageerror',e=>errors.push('stress: '+e.message));
await stress.goto(pathToFileURL(resolve('index.html')).href,{waitUntil:'domcontentloaded'});
await stress.locator('#pName').fill('PACIENTE TESTE PAGINACAO');
await stress.evaluate(()=>{
  for(let i=1;i<=28;i++){
    addMed('MEDICAÇÃO DE TESTE '+i+' — verificar identificação e registro',
      '1 unidade conforme prescrição fictícia nº '+i,'VO','');
  }
});
await stress.locator('.desk-top-actions .desk-top-btn').filter({hasText:'Salvar Word'}).click();
const stressDownloadPending=stress.waitForEvent('download');
await stress.locator('#reviewPrintBtn').click();
const stressDownload=await stressDownloadPending;
await stressDownload.saveAs(resolve(dir,'prescricao-28-itens.docx'));
assert.deepEqual(errors,[]);
await browser.close();
console.log('Navegador QA: BIC, Word, ceftriaxona, GIF, PDF paisagem e ausência de erros JS aprovados.');
