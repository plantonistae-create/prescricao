/* Exportação Word (.docx) nativa, sem bibliotecas externas e sem diálogo de impressão. */
(function(){
  'use strict';
  const ns='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const utf8 = s => new TextEncoder().encode(s);
  function xml(s){return String(s??'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&apos;');}
  function paragraph(s,opts={}){
    const pr='<w:pPr><w:spacing w:before="0" w:after="'+(opts.after??40)+'"/>'+
      (opts.center?'<w:jc w:val="center"/>':'')+
      (opts.page?'<w:pageBreakBefore/>':'')+'</w:pPr>';
    const run='<w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>'+
      '<w:sz w:val="'+(opts.size??17)+'"/>'+(opts.bold?'<w:b/>':'')+'</w:rPr>'+
      '<w:t xml:space="preserve">'+xml(s)+'</w:t></w:r>';
    return '<w:p>'+pr+run+'</w:p>';
  }
  function cell(s,bold=false,width=1500){
    return '<w:tc><w:tcPr><w:tcW w:w="'+width+'" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>'+
      paragraph(s,{bold,size:bold?16:15,after:0})+'</w:tc>';
  }
  // A4 paisagem: área útil 15.838 twips, grade de 15.400 twips para não cortar.
  function table(rows,widths,{minHeight=0}={}){
    if(!widths?.length || !rows.every(r=>r.length===widths.length) ||
        widths.reduce((a,b)=>a+b,0)>15838){
      throw new Error('Grade DOCX inválida');
    }
    const total=widths.reduce((a,b)=>a+b,0);
    const grid='<w:tblGrid>'+widths.map(w=>'<w:gridCol w:w="'+w+'"/>').join('')+'</w:tblGrid>';
    const pr='<w:tblPr><w:tblW w:w="'+total+'" w:type="dxa"/>'+
      '<w:tblLayout w:type="fixed"/>'+
      '<w:tblBorders><w:top w:val="single" w:sz="4"/><w:left w:val="single" w:sz="4"/>'+
      '<w:bottom w:val="single" w:sz="4"/><w:right w:val="single" w:sz="4"/>'+
      '<w:insideH w:val="single" w:sz="3"/><w:insideV w:val="single" w:sz="3"/></w:tblBorders>'+
      '<w:tblCellMar><w:top w:w="24" w:type="dxa"/><w:bottom w:w="24" w:type="dxa"/>'+
      '<w:left w:w="45" w:type="dxa"/><w:right w:w="45" w:type="dxa"/></w:tblCellMar></w:tblPr>';
    return '<w:tbl>'+pr+grid+rows.map((row,i)=>{
      const header=i===0?'<w:tblHeader w:val="true"/>':'';
      const height=minHeight?'<w:trHeight w:val="'+minHeight+'" w:hRule="atLeast"/>':'';
      return '<w:tr><w:trPr>'+header+height+'</w:trPr>'+
        row.map((v,j)=>cell(v,i===0,widths[j])).join('')+'</w:tr>';
    }).join('')+'</w:tbl>';
  }
    function wordXml(){
    const v=id=>document.getElementById(id)?.value?.trim()||'';
    const paciente=v('pName')||'Não informado';
    const data=v('pDate')||'';
    const idade=v('pAge')||'';
    const documento=v('pDoc')||'';
    const itens=buildPrescriptionItems();
    let body=paragraph('PRESCRIÇÃO MÉDICA — LEITO DE OBSERVAÇÃO',{bold:true,size:26,center:true,after:120});
    body+=paragraph('Paciente: '+paciente+'    Idade: '+idade+'    CPF/CNS: '+documento+'    Data: '+data,{size:18,after:120});
    const itensLinhas=[['Nº','PRESCRIÇÃO / CONDUTA','OBSERVAÇÕES']];
    itens.forEach((it,i)=>itensLinhas.push([String(i+1),it.texto||'',it.obs||'']));
    while(itensLinhas.length<22)itensLinhas.push(['','','']);
    body+=table(itensLinhas,[550,11950,2900],{minHeight:180});
    body+=paragraph('Assinatura e carimbo do(a) médico(a): ___________________________________________________',{after:120});
    body+=paragraph('FICHA DO PACIENTE NO LEITO DE OBSERVAÇÃO',{bold:true,size:24,center:true,page:true,after:140});
    body+=paragraph('Paciente: '+paciente+'    Idade: '+idade+'    CPF/CNS: '+documento+'    Data: '+data,{size:18,after:100});
    body+=paragraph('SINAIS VITAIS / EVOLUÇÃO',{bold:true,size:19,after:70});
    const vitais=[['DATA / HORA','PA','FC','FR','SatO₂','TAX','HGT']];
    for(let i=0;i<13;i++)vitais.push(['','','','','','','']);
    body+=table(vitais,[2500,1700,1700,1700,1700,1700,4400],{minHeight:220});
    body+=paragraph('RELATÓRIO / ANOTAÇÕES DE ENFERMAGEM',{bold:true,size:19,after:70});
    const enfermagem=[['DATA / HORA','EVOLUÇÃO / ANOTAÇÕES','RESPONSÁVEL']];
    for(let i=0;i<6;i++)enfermagem.push(['','','']);
    body+=table(enfermagem,[2400,10400,2600],{minHeight:275});
    body+=paragraph('Assinatura do(a) enfermeiro(a) responsável: _________________________________________________',{after:60});
    body+='<w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/>'+
      '<w:pgMar w:top="450" w:right="500" w:bottom="450" w:left="500" w:header="200" w:footer="200" w:gutter="0"/></w:sectPr>';
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
      '<w:document xmlns:w="'+ns+'"><w:body>'+body+'</w:body></w:document>';
  }
  function crc32(bytes){
    let c=0xFFFFFFFF;
    for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xEDB88320:0);}
    return (c^0xFFFFFFFF)>>>0;
  }
  // ZIP com método STORE. É um DOCX OOXML real, editável e independente de CDN.
  function packageDocx(files){
    const chunks=[];const central=[];let offset=0;let centralSize=0;
    const put16=(view,off,n)=>view.setUint16(off,n,true);
    const put32=(view,off,n)=>view.setUint32(off,n>>>0,true);
    for(const item of files){
      const name=utf8(item.name),data=utf8(item.content),crc=crc32(data);
      const lh=new Uint8Array(30+name.length),lv=new DataView(lh.buffer);
      put32(lv,0,0x04034b50);put16(lv,4,20);put16(lv,6,0x0800);
      put16(lv,8,0);put32(lv,14,crc);put32(lv,18,data.length);put32(lv,22,data.length);
      put16(lv,26,name.length);lh.set(name,30);chunks.push(lh,data);
      const cd=new Uint8Array(46+name.length),cv=new DataView(cd.buffer);
      put32(cv,0,0x02014b50);put16(cv,4,20);put16(cv,6,20);put16(cv,8,0x0800);
      put16(cv,10,0);put32(cv,16,crc);put32(cv,20,data.length);put32(cv,24,data.length);
      put16(cv,28,name.length);put32(cv,42,offset);cd.set(name,46);
      central.push(cd);centralSize+=cd.length;
      offset+=lh.length+data.length;
    }
    const end=new Uint8Array(22),ev=new DataView(end.buffer);
    put32(ev,0,0x06054b50);put16(ev,8,files.length);put16(ev,10,files.length);
    put32(ev,12,centralSize);put32(ev,16,offset);
    return new Blob([...chunks,...central,end],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
  }
  function gerarWord(){
    const contentTypes='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'+
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'+
      '<Default Extension="xml" ContentType="application/xml"/>'+
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>';
    const rels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
    const arquivo=packageDocx([
      {name:'[Content_Types].xml',content:contentTypes},
      {name:'_rels/.rels',content:rels},
      {name:'word/document.xml',content:wordXml()}
    ]);
    const paciente=(document.getElementById('pName')?.value||'prescricao').trim()
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9 _-]/g,'')
      .replace(/\s+/g,'_').slice(0,45)||'prescricao';
    const url=URL.createObjectURL(arquivo);
    const link=document.createElement('a');
    link.href=url;link.download='Prescricao_'+paciente+'.docx';
    document.body.appendChild(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),30000);
  }
  window.exportarPrescricaoWord=gerarWord;
  window.abrirRevisaoWord=function(){
    window.abrirRevisaoImpressao('impressao'); // preserva o checklist de revisão clínica
    const modal=document.getElementById('reviewOverlay');
    if(!modal)return;
    const title=modal.querySelector('#reviewTitle');
    const button=modal.querySelector('#reviewPrintBtn');
    const hint=modal.querySelector('#reviewExportHint');
    if(title)title.textContent='Revisar e salvar Word';
    if(button){
      button.textContent=(modal.querySelector('.review-list')?'Baixar Word mesmo assim':'Baixar Word (.docx)');
      button.onclick=function(){window.fecharRevisao();gerarWord();};
    }
    if(hint){
      hint.style.display='block';
      hint.textContent='Download direto de arquivo .docx editável (prescrição e ficha de observação). A ficha GIF e o cartão da ceftriaxona permanecem no fluxo de impressão.';
    }
  };
  function trocarBotoes(){
    document.querySelectorAll('button[onclick*="abrirRevisaoPDF"]').forEach(btn=>{
      btn.textContent='⬇ Salvar Word';
      btn.setAttribute('onclick','abrirRevisaoWord()');
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',trocarBotoes);
  else trocarBotoes();
})();