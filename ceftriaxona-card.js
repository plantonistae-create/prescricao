/* Ceftriaxona: cartão reproduz a página do PDF fornecido, sem reconstruir campos ou brasões.
 * O PDF original, imutável, fica em ./assets/ceftriaxona_cartao_original.pdf.
 * Imagem de impressão = renderização direta da página 1 do arquivo original.
 * AbrirAbaDeImpressao copia o HTML da folha, por isso a URL da imagem é absoluta.
 */
(function(){
  'use strict';
  const pdfUrl=new URL('./assets/ceftriaxona_cartao_original.pdf', document.baseURI).href;
  const imagemUrl=new URL('./assets/ceftriaxona_pagina_original.png', document.baseURI).href;
  window.CEFTRIAXONA_PDF_ORIGINAL=pdfUrl;

  const style=document.createElement('style');
  style.id='cefCardStyles';
  style.textContent=[
    '#cefCardSheet{display:none;}',
    '#cefCardSheet.cef-card-sheet{background:#fff !important; padding:0 !important; box-sizing:border-box; align-items:center; justify-content:center; overflow:hidden;}',
    '#cefCardSheet .cef-original-page{display:block; width:100%; height:100%; object-fit:contain; object-position:center; border:0; margin:0;}',
    '@media print{#cefCardSheet.cef-card-sheet{display:flex !important; page-break-before:always !important; break-before:page !important;}}'
  ].join('\n');
  document.head.appendChild(style);

  const sheet=document.createElement('div');
  sheet.id='cefCardSheet';
  sheet.className='gif-sheet cef-card-sheet vazia';
  sheet.setAttribute('data-pdf-original',pdfUrl);
  const img=document.createElement('img');
  img.className='cef-original-page';
  img.src=imagemUrl;
  img.alt='Cartão controle de dose – ceftriaxona; duas vias em A4 paisagem, extraído do PDF original';
  img.loading='eager';
  img.decoding='sync';
  sheet.appendChild(img);
  document.body.appendChild(sheet);

  // Mantém a impressão da ficha GIF (2 páginas retrato) e as demais folhas intactas.
  const originalMontar=window.montarFichaGIF;
  if(typeof originalMontar==='function'){
    window.montarFichaGIF=function(){
      const result=originalMontar.apply(this,arguments);
      sheet.classList.toggle('vazia',!temCeftriaxona());
      return result;
    };
  }
})();
