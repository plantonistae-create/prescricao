/* Cartão de controle de doses da ceftriaxona: 2 vias na mesma folha A4 paisagem.
   Reconstrução dos campos do PDF fornecido pelo serviço, sem dados pré-preenchidos. */
(function(){
  'use strict';
  const css=String.raw;
  function metade(){
    const grade=Array.from({length:7},()=>'<tr><td>&nbsp;</td><td></td><td></td><td></td></tr>').join('');
    return [
      '<section class="cef-half">',
      '<div class="cef-logo-row"><div class="cef-brand"><strong>SESAU</strong><small>Secretaria Municipal de Saúde</small></div>',
      '<span class="cef-brasao">✚</span><span class="cef-brasao">✚</span></div>',
      '<div class="cef-unit">CRS COOPHAVILA II</div>',
      '<div class="cef-title">CARTÃO CONTROLE DE DOSE – CEFTRIAXONA</div>',
      '<div class="cef-body">',
      '<div>[&nbsp; ] PACIENTE ORIUNDO DE SERVIÇOS EXTERNOS¹</div>',
      '<div>[&nbsp; ] PACIENTE INTERNO</div>',
      '<div>UNIDADE DE ORIGEM: <span class="cef-line"></span></div>',
      '<h4>DADOS DO PACIENTE</h4>',
      '<div>NOME: <span class="cef-line"></span></div>',
      '<div class="cef-flex"><span>DN: ____/____/________</span><span>CPF: <span class="cef-line"></span></span></div>',
      '<div class="cef-flex"><span>CNS: <span class="cef-line"></span></span><span>PRONTUÁRIO: <span class="cef-line"></span></span></div>',
      '<h4>MÉDICO PRESCRITOR</h4>',
      '<div class="cef-flex"><span>NOME: <span class="cef-line"></span></span><span>CRM: <span class="cef-line"></span></span></div>',
      '<div class="cef-dose"><b>CONTROLE DE DOSE:</b> POSOLOGIA CEFTRIAXONA ____ g EV ______ POR _____ dias.</div>',
      '<table class="cef-rows"><thead><tr><th>DIA</th><th>DATA</th><th>DOSE</th><th>HORA</th></tr></thead><tbody>',
      grade,'</tbody></table>',
      '<div class="cef-foot">1: PACIENTES EXTERNOS, LIBERAÇÃO SOMENTE COM RECEITA DE ORIGEM</div>',
      '<div class="cef-sign">ASSINATURA E CARIMBO MÉDICO/FARMACÊUTICO: ______________________</div>',
      '</div></section>'
    ].join('');
  }
  const style=document.createElement('style');
  style.id='cefCardStyles';
  style.textContent=[
    '#cefCardSheet{display:none;}',
    '#cefCardSheet.cef-card-sheet{padding:5mm !important;box-sizing:border-box;color:#111;background:white;font-family:Arial,sans-serif;}',
    '#cefCardSheet .cef-dual{display:flex;gap:8mm;height:100%;width:100%;}',
    '.cef-half{box-sizing:border-box;width:50%;height:100%;border:1px solid #222;padding:3mm 3mm 2mm;display:flex;flex-direction:column;overflow:hidden;}',
    '.cef-logo-row{display:flex;height:16mm;align-items:flex-start;gap:8px;}',
    '.cef-brand strong{display:block;color:#176da0;font:bold 23px Arial;line-height:1;}',
    '.cef-brand small{display:block;font-size:7px;}',
    '.cef-brasao{font-size:28px;color:#517f9b;text-align:center;margin-left:auto;}',
    '.cef-brasao img{max-width:55px;max-height:44px;object-fit:contain;}',
    '.cef-unit{font-size:17px;line-height:1.3;}',
    '.cef-title{text-align:center;font-weight:700;font-size:11px;margin:6mm 0 5mm;}',
    '.cef-body{font-size:9.5px;line-height:1.5;display:flex;flex-direction:column;flex:1;}',
    '.cef-body h4{font-size:10px;margin:4mm 0 1mm;}',
    '.cef-line{display:inline-block;min-width:33mm;border-bottom:1px solid #333;height:10px;flex:1;}',
    '.cef-flex{display:flex;gap:5mm;justify-content:space-between;margin-top:2mm;}',
    '.cef-flex > span{display:flex;align-items:baseline;flex:1;gap:2mm;}',
    '.cef-dose{font-size:8.7px;white-space:nowrap;margin-top:5mm;}',
    '.cef-rows{width:100%;border-collapse:collapse;table-layout:fixed;font-size:9px;}',
    '.cef-rows th,.cef-rows td{border:1px solid #333;height:9mm;text-align:center;padding:0;}',
    '.cef-rows th{height:5mm;}',
    '.cef-foot{border:1px solid #333;text-align:center;font-size:7.5px;margin-top:3mm;}',
    '.cef-sign{font-size:8px;font-weight:700;margin-top:auto;white-space:nowrap;padding-bottom:2mm;}',
    '@media print{#cefCardSheet.cef-card-sheet{display:flex !important;page-break-before:always !important;break-before:page !important;}}'
  ].join('\n');
  document.head.appendChild(style);
  const sheet=document.createElement('div');
  sheet.id='cefCardSheet';
  sheet.className='gif-sheet cef-card-sheet vazia';
  sheet.innerHTML='<div class="cef-dual">'+metade()+metade()+'</div>';
  // Reutiliza os símbolos institucionais já incorporados ao modelo de impressão.
  const logos=Array.from(document.querySelectorAll('#printSheet .ps-headtable .ps-logo img'));
  if(logos.length>=2){
    sheet.querySelectorAll('.cef-half').forEach(half=>{
      half.querySelectorAll('.cef-brasao').forEach((slot,i)=>{
        const src=logos[i]?.getAttribute('src');
        if(src && src.startsWith('data:image/')){
          const img=document.createElement('img');img.src=src;img.alt='Identificação institucional';
          slot.textContent='';slot.appendChild(img);
        }
      });
    });
  }
  document.body.appendChild(sheet);
  // Não muda a saída da ficha GIF; o cartão é incluído na mesma tarefa A4 paisagem da prescrição.
  const originalMontar=window.montarFichaGIF;
  if(typeof originalMontar==='function'){
    window.montarFichaGIF=function(){
      const r=originalMontar.apply(this,arguments);
      sheet.classList.toggle('vazia',!temCeftriaxona());
      return r;
    };
  }
})();