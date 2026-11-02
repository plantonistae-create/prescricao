/* BIC: preparos informados pelo serviço; sem taxa pré-definida. */
(function(){
  'use strict';
  const PREPAROS = {
    fentanil: {nome:'Fentanil',estoque:50,unidade:'mcg',opcoes:[
      {concentracao:5,ampolas:5,sf:450},
      {concentracao:8,ampolas:4,sf:210},
      {concentracao:10,ampolas:4,sf:160}]},
    midazolam: {nome:'Midazolam',estoque:5,unidade:'mg',opcoes:[
      {concentracao:0.8,ampolas:4,sf:210},
      {concentracao:1,ampolas:2,sf:80},
      {concentracao:2,ampolas:4,sf:60}]}
  };
  const fmt=x=>String(x).replace('.',',');
  function opcoesPreparo(tipo){
    const cfg=PREPAROS[tipo];
    return cfg.opcoes.map((p,i)=>{
      const volume=p.ampolas*10+p.sf;
      const calculada=(p.ampolas*10*cfg.estoque)/volume;
      if(Math.abs(calculada-p.concentracao)>1e-9)throw new Error('Concentração inconsistente — BIC '+cfg.nome);
      return '<option value="'+i+'">'+fmt(p.concentracao)+' '+cfg.unidade+'/mL — '+p.ampolas+' ampolas de 10 mL + '+p.sf+' mL SF 0,9% (volume final '+volume+' mL)</option>';
    }).join('');
  }
  function atualizarOpcoesBIC(){
    const tipo=document.getElementById('bicMedicamento')?.value;
    const sel=document.getElementById('bicConcentracao');
    if(sel && PREPAROS[tipo])sel.innerHTML=opcoesPreparo(tipo);
  }
  function adicionarBIC(){
    const tipo=document.getElementById('bicMedicamento')?.value;
    const cfg=PREPAROS[tipo];
    const indice=Number(document.getElementById('bicConcentracao')?.value);
    const p=cfg?.opcoes[indice];
    const texto=(document.getElementById('bicVelocidade')?.value||'').trim();
    const positivo=/^\d+(?:[.,]\d{1,2})?$/.test(texto) && Number(texto.replace(',','.'))>0;
    const msg=document.getElementById('bicMensagem');
    if(!p || !positivo){
      if(msg)msg.textContent='Informe uma diluição e uma velocidade positiva, em mL/h (sem taxa automática).';
      document.getElementById('bicVelocidade')?.focus();
      return;
    }
    const total=p.ampolas*10+p.sf;
    const descricao=fmt(p.concentracao)+' '+cfg.unidade+'/mL; preparo: '+p.ampolas+
      ' ampolas de 10 mL ('+cfg.estoque+' '+cfg.unidade+'/mL) + '+p.sf+
      ' mL de SF 0,9% (volume final '+total+' mL)';
    const nome=cfg.nome+' — BIC';
    const anterior=meds.length;
    addMed(nome,descricao,'EV','');
    if(meds.length===anterior)return; // usuário cancelou ocorrência duplicada
    const m=meds[meds.length-1];
    m.aprazo='__custom__';
    m.aprazoTexto='BIC contínua — '+fmt(texto.replace(',','.'))+' mL/h';
    m.obs='Conferir preparo e programação da bomba de infusão antes de administrar.';
    renderMeds();
    if(msg)msg.textContent=cfg.nome+' adicionado. Revise os campos editáveis da medicação.';
    document.getElementById('bicVelocidade').value='';
  }
  function iniciar(){
    const destino=[...document.querySelectorAll('.wrap .card')].find(
      el=>el.querySelector('h2')?.textContent.trim().startsWith('Medicações Isoladas')
    );
    if(!destino || document.getElementById('bicCard'))return;
    const card=document.createElement('div');
    card.id='bicCard';card.className='card';
    card.innerHTML=[
      '<h2>Infusão contínua · BIC</h2>',
      '<div class="card-note">Atalho de preparo para <strong>midazolam</strong> e <strong>fentanil</strong>. As concentrações são as informadas pelo serviço. Nenhuma velocidade é sugerida; confirme a prescrição, a concentração e o preparo antes da administração.</div>',
      '<div class="field"><label>Medicação</label><select id="bicMedicamento">',
      '<option value="midazolam">Midazolam — ampola de 10 mL a 5 mg/mL</option>',
      '<option value="fentanil">Fentanil — ampola de 10 mL a 50 mcg/mL</option></select></div>',
      '<div class="field"><label>Concentração / diluição</label><select id="bicConcentracao"></select></div>',
      '<div class="field"><label>Velocidade prescrita (mL/h)</label>',
      '<input id="bicVelocidade" type="text" inputmode="decimal" autocomplete="off" placeholder="Informe a velocidade em mL/h"></div>',
      '<button class="btn btn-teal" type="button" id="bicAdicionar">+ Adicionar BIC à prescrição</button>',
      '<div id="bicMensagem" class="card-note" role="status" aria-live="polite" style="margin-top:8px;"></div>'
    ].join('');
    destino.parentNode.insertBefore(card,destino);
    card.querySelector('#bicMedicamento').addEventListener('change',atualizarOpcoesBIC);
    card.querySelector('#bicAdicionar').addEventListener('click',adicionarBIC);
    atualizarOpcoesBIC();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciar);
  else iniciar();
})();