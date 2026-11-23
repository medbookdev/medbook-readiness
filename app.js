'use strict';
const data=JSON.parse(document.getElementById('dataset').textContent), $=id=>document.getElementById(id);
const el=(tag,cls,text)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(text)x.textContent=text;return x;};
const sEl=(tag,attrs={},value='')=>{const x=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.entries(attrs).forEach(([k,v])=>x.setAttribute(k,v));if(value)x.textContent=value;return x;};
const english=document.documentElement.lang==='en';
const ui=data.ui||{
  related:'Связанные пути', diagram:'UML-диаграмма действий.', evidence:'Показать подтверждение.',
  notes:['Справочники на демо, решение врача на стенде','Импорт работает, разбор ИИ выключен','Часть приёма собрана','Реестр доступен, сквозная выдача не подтверждена','Два модуля в релизе','Обмен сменами проверен на стенде','Часть операций проверена отдельно','Модель в приложении выключена','Общая сборка ожидает выпуска'], aiStates:['Модель ответила отдельно','Проверено частично на стенде','Проверка целостности упала','Справочник проверен на стенде','Проверка изменения прав упала','Проверка подмены пакета упала','Проверка сброса кэша упала','Трассировка проверена на стенде','Есть сбой при смене учреждения'],
  shown:'Показано требований: {count} из 396.', empty:'Совпадений нет. Измените запрос или состояние.',
  report:'Отчёт', listed:'Требований в списке', release:'Сверка с релизом',
  uncompared:'Файл в релизе отдельно не сверяли.', acceptance:'Критерий приёмки'
};
const states=data.states,colors={live:'#146348',stand:'#155785',demo:'#77501b',part:'#665185',fail:'#90382d',off:'#874641',gap:'#546063',hold:'#963d33'};
const byKey=Object.fromEntries(data.flows.map(f=>[f.key,f]));let active=null, roleIndex=0;
const findRole=key=>data.overview.findIndex(x=>x[1].some(pair=>pair[1]===key));
const wrap=(str,n)=>{const result=[];let l='';for(const w of str.split(' ')){if(l&&l.length+1+w.length>n){result.push(l);l='';}l=l?l+' '+w:w;}if(l)result.push(l);return result;};
function toggle(label,selected,action){const b=el('button','',label);b.type='button';b.setAttribute('aria-pressed',String(selected));b.onclick=action;return b;}
function updateLanguageLink(){
  const link=$('language-switch');
  if(!link)return;
  const target=new URL(link.dataset.page,location.href);
  target.hash=location.hash;
  if(active!=='care'&&!location.hash.startsWith('#flow-'))target.searchParams.set('route',active);
  link.href=target.href;
}
function choose(key,record=true){if(!byKey[key])return;active=key;roleIndex=findRole(key);
  if(record&&location.hash!=='#flow-'+key)history.pushState(null,'','#flow-'+key);
  updateLanguageLink();
  $('role-tabs').replaceChildren(...data.overview.map(([n,p],i)=>toggle(n,i===roleIndex,()=>choose(p[0][1]))));
  $('path-tabs').replaceChildren(...data.overview[roleIndex][1].map(([n,k])=>toggle(n,k===key,()=>choose(k))));
  const f=byKey[key];$('journey-name').textContent=f.name;$('journey-goal').textContent=f.goal;$('puml').href=key+(english?'-en':'')+'.puml';
  $('steps').replaceChildren(...f.steps.map((s,i)=>{const d=el('details','step');d.id='step-'+i;const h=el('summary','',s.label);h.append(el('small','',s.role+' · '+states[s.state]));d.append(h,el('p','',s.proof));d.open=i===0;return d;}));
  const relations={care:['visit','clinic'],visit:['lab','medication'],whoop:['ai'],staff:['clinic'],clinic:['staff','care'],medication:['visit'],lab:['visit'],ai:['whoop'],release:['care','staff']};
  const rel=el('p','rel',ui.related+': ');relations[key].forEach((k,i)=>{if(i)rel.append(' · ');const a=el('a','',byKey[k].name);a.href='#flow-'+k;rel.append(a);});$('steps').append(rel);diagram(f);
}
function selectStep(i){for(const d of $('steps').querySelectorAll('details'))d.open=d.id==='step-'+i;const d=$('step-'+i);d.querySelector('summary').focus({preventScroll:true});d.scrollIntoView({block:'nearest',behavior:'instant'});for(const item of $('graph').querySelectorAll('.act'))item.classList.toggle('sel',item.dataset.i===String(i));}
function diagram(f){
  const svg=sEl('svg',{class:'flow-svg',viewBox:'0 0 356 550',role:'group','aria-label':ui.diagram+' '+f.name});const defs=sEl('defs'),m=sEl('marker',{id:'arrow',viewBox:'0 0 8 8',refX:7,refY:4,markerWidth:6,markerHeight:6,orient:'auto'});m.append(sEl('path',{d:'M0 0L8 4L0 8z',fill:'#637e70'}));defs.append(m);svg.append(defs);
  const stroke=(d,arrow=true)=>svg.append(sEl('path',{d,fill:'none',stroke:'#637e70','stroke-width':1.5,...(arrow?{'marker-end':'url(#arrow)'}:{})}));
  const txt=(x,y,v,size=15,weight=500,fill='#203b34')=>sEl('text',{x,y,'text-anchor':'middle','font-family':'Arial, sans-serif','font-size':size,'font-weight':weight,fill},v);
  const end=(x,y)=>{svg.append(sEl('circle',{cx:x,cy:y,r:7,stroke:'#314e40','stroke-width':1.3,fill:'none'}),sEl('circle',{cx:x,cy:y,r:4,fill:'#314e40'}));};
  function block(i,y){const s=f.steps[i],ls=wrap(s.label,32),h=48+(ls.length-1)*18,cx=191;
    const g=sEl('g',{class:'act'+(i===0?' sel':''),tabindex:0,role:'button','aria-label':s.label+'. '+states[s.state]+'. '+ui.evidence});g.dataset.i=i;
    g.append(sEl('rect',{x:46,y,width:290,height:h,rx:11,fill:'#fff',stroke:'#a6bdb0','stroke-width':1.3}));ls.forEach((t,j)=>g.append(txt(cx,y+19+j*18,t,15,650)));g.append(txt(cx,y+h-9,states[s.state],13.5,650,colors[s.state]));g.onclick=()=>selectStep(i);g.onkeydown=e=>{if([' ','Enter'].includes(e.key)){e.preventDefault();selectStep(i);}};svg.append(g);return y+h;}
  function series(list,y,first=true){let last=y;list.forEach((i,j)=>{if(j||first)stroke('M191 '+last+'v18');last=block(i,last+(j||first?20:0));});return last;}
  const cfg=f.spec;svg.append(sEl('circle',{cx:191,cy:14,r:5.5,fill:'#314e40'}));let y=20;
  if(cfg[0]==='SEQ'){y=series(cfg[1],y);stroke('M191 '+y+'v16');end(191,y+25);y+=40;}
  else{let pre=[],pairs=[],label;if(cfg[0]==='MID'){pre=cfg[1];label=cfg[2];pairs=[[cfg[3],cfg[4]],[cfg[5],cfg[6]],[cfg[7],cfg[8]]];}else if(cfg[0]==='IF'){label=cfg[1];pairs=[[cfg[2],cfg[3]],[cfg[4],cfg[5]]];}else{label=cfg[1];pairs=cfg[2];}
    if(pre.length)y=series(pre,y);stroke('M191 '+y+'v15');y+=29;
    svg.append(sEl('path',{d:'M191 '+(y-12)+'l15 12 -15 12 -15 -12z',fill:'#fce9c4',stroke:'#8e703b'}));svg.append(txt(191,y+34,label,14,600));const trunkStart=y;stroke('M176 '+y+'H21',false);y+=49;const branchY=[];
    for(const [name,ids] of pairs){const yy=y+17;branchY.push(yy);stroke('M21 '+yy+'h21');svg.append(txt(191,y+13,name,14,650));y=series(ids,y+24,false);stroke('M191 '+y+'v13');end(191,y+22);y+=42;}stroke('M21 '+trunkStart+'V'+branchY.at(-1),false);
  }
  svg.setAttribute('viewBox','0 0 356 '+y);$('graph').replaceChildren(svg);
}
let index=0;
for(const [label,links] of data.overview){const lane=el('div','lane');lane.append(el('strong','',label));for(const [n,k] of links){const x=el('div','route-link'),a=el('a','',n);a.href='#flow-'+k;x.append(a,el('small','',ui.notes[index++]));lane.append(x);}$('all-map').append(lane);}
data.ai.forEach(([key,done,open],i)=>{const d=el('details'),s=el('summary','',(i<8?(i+1)+'. ':'')+key);s.append(el('span','status',ui.aiStates[i]));d.append(s,el('p','',done),el('p','',open));$('ai-list').append(d);});
const filterStates=[...new Set(data.register.map(r=>r.state))];for(const t of filterStates){const o=el('option','',t);o.value=t;$('stage').append(o);}
const norm=x=>x.toLocaleLowerCase(document.documentElement.lang).replaceAll('ё','е').trim();
function registry(){const q=norm($('q').value),stage=$('stage').value,vs=data.register.filter(r=>(!stage||r.state===stage)&&(!q||norm([r.id,r.section,r.title,r.original].join(' ')).includes(q)));$('count').textContent=vs.length?ui.shown.replace('{count}',vs.length):ui.empty;$('groups').replaceChildren();
  const all=new Map();for(const row of vs){if(!all.has(row.dom))all.set(row.dom,[]);all.get(row.dom).push(row);}for(const [n,items] of all){const d=el('details'),s=el('summary','',String(n).padStart(2,'0')+'. '+items[0].section);s.append(el('span','status',ui.report+': '+items[0].review.toLowerCase()+' · '+ui.listed.toLowerCase()+': '+items.length));d.append(s);d.open=!!q&&vs.length<=15;for(const r of items){const cap=el('div','cap');cap.append(el('b','',r.title),el('span','',r.id+' · '+r.state),el('span','',r.match===(english?'Outside this sample':'Вне этой выборки')?ui.uncompared:ui.release+': '+r.match.toLowerCase()+'.'));d.append(cap);}$('groups').append(d);}}
$('q').oninput=registry;$('stage').onchange=registry;registry();
for(const [n,t,why,accept] of data.next){const r=el('div','road'),p=el('p','',why);p.append(el('small','',ui.acceptance+': '+accept));r.append(el('span','',n),el('strong','',t),p);$('road').append(r);}
function hashState(first=false){const k=location.hash.slice(6);if(location.hash.startsWith('#flow-')&&byKey[k]){choose(k,false);$('overview').scrollIntoView({block:'start'});}else if(first){const queryRoute=new URLSearchParams(location.search).get('route');choose(byKey[queryRoute]?queryRoute:'care',false);}else{updateLanguageLink();}}
hashState(true);window.addEventListener('hashchange',()=>hashState());
document.addEventListener('click',e=>{
  const a=e.target.closest('a[href^="#flow-"]');
  if(!a||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;
  const key=a.getAttribute('href').slice(6);if(!byKey[key])return;
  e.preventDefault();choose(key);$('overview').scrollIntoView({block:'start'});
});
