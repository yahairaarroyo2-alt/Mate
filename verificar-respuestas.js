// Verificador INDEPENDIENTE de respuestas — no usa ninguna función de la app para calcular.
// Lee el enunciado de cada ejercicio, recalcula la respuesta con su propio evaluador de
// fracciones/enteros (y parsers por módulo) y la compara con ej.respuesta. Así se atrapan
// generadores que guardan una respuesta que no corresponde a lo que se ve en pantalla
// (el autotest de index.html no puede: solo comprueba que la respuesta guardada pase el
// verificador de la propia app, y eso es circular).
//
// Cómo correrlo: abrir la app en el navegador (index.html, no ?test), y en la consola:
//   (0,eval)(await (await fetch('verificar-respuestas.js?'+Date.now())).text())
// Imprime un resumen por módulo: "ok", "FALLA n" con ejemplos, o "NO RECONOCIDO" si un
// enunciado nuevo no calza con ningún parser (hay que agregarle el parser, no ignorarlo).
// 3ª auditoría (2026-09-18): 33.300 ejercicios, 0 fallos, tras corregir 2 bugs que encontró.
(function(){
const G=(a,b)=>{a=Math.abs(a);b=Math.abs(b);while(b){[a,b]=[b,a%b];}return a;};
const Fr=(n,d=1)=>{ if(d<0){n=-n;d=-d;} const g=G(n,d)||1; return {n:n/g,d:d/g}; };
const add=(a,b)=>Fr(a.n*b.d+b.n*a.d,a.d*b.d), sub=(a,b)=>add(a,{n:-b.n,d:b.d}), mul=(a,b)=>Fr(a.n*b.n,a.d*b.d);
const div=(a,b)=>{ if(b.n===0) throw new Error('div0'); return Fr(a.n*b.d,a.d*b.n); };
const val=f=>f.n/f.d;
const isPrime=n=>{ if(n<2) return false; for(let i=2;i*i<=n;i++) if(n%i===0) return false; return true; };
const lcm=(a,b)=>Math.abs(a*b)/G(a,b);
function toExpr(html){
  let s=html;
  const re=/<span class="fr"><b>((?:(?!<span)[\s\S])*?)<\/b><i>((?:(?!<span)[\s\S])*?)<\/i><\/span>/;
  while(re.test(s)) s=s.replace(re,'{($1)/($2)}');
  s=s.replace(/<sup>([^<]*)<\/sup>/g,'^$1').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ');
  s=s.replace(/−/g,'-').replace(/×/g,'*').replace(/÷/g,'/').replace(/²/g,'^2');
  s=s.replace(/(^|[^\d.])(-?)(\d+)\s*\{([^{}]*)\}/g,(m,pre,sg,e,f)=>`${pre}${sg}(${e}+${f})`);
  s=s.replace(/\{/g,'(').replace(/\}/g,')');
  s=s.replace(/(\d)\s*\(/g,'$1*(').replace(/\)\s*\(/g,')*(').replace(/(\d)\s*([a-z])/g,'$1*$2').replace(/\)\s*(\d)/g,')*$1');
  return s.replace(/\s+/g,' ').trim();
}
function parse(s){
  let i=0; const skip=()=>{while(s[i]===' ')i++;};
  function expr(){ skip(); let v=term(); skip(); while(s[i]==='+'||s[i]==='-'){ const op=s[i++]; const t=term(); v= op==='+'?add(v,t):sub(v,t); skip(); } return v; }
  function term(){ skip(); let v=unary(); skip(); while(s[i]==='*'||s[i]==='/'){ const op=s[i++]; const u=unary(); v= op==='*'?mul(v,u):div(v,u); skip(); } return v; }
  function unary(){ skip(); if(s[i]==='-'){ i++; const u=unary(); return {n:-u.n,d:u.d}; } if(s[i]==='+'){ i++; return unary(); } return power(); }
  function power(){ let a=atom(); skip(); if(s[i]==='^'){ i++; skip(); let e=''; while(/\d/.test(s[i]||'')) e+=s[i++]; e=+e; let r={n:1,d:1}; for(let k=0;k<e;k++) r=mul(r,a); return r; } return a; }
  function atom(){ skip(); if(s[i]==='('){ i++; const v=expr(); skip(); if(s[i]!==')') throw new Error('expected ) at '+i+' in '+s); i++; return v; }
    if(s[i]==='|'){ i++; const v=expr(); skip(); if(s[i]!=='|') throw new Error('expected | in '+s); i++; return {n:Math.abs(v.n),d:v.d}; }
    const m=/^\d+(\.\d+)?/.exec(s.slice(i)); if(!m) throw new Error('num at '+i+' in "'+s+'"'); i+=m[0].length;
    if(m[1]){ const dec=m[1].length-1; return Fr(Math.round(parseFloat(m[0])*10**dec),10**dec); } return {n:+m[0],d:1}; }
  const v=expr(); skip(); if(i<s.length) throw new Error('trailing "'+s.slice(i)+'" in "'+s+'"'); return v;
}
const ev=html=>parse(toExpr(html));
const clean=e=>e.replace(/<span class="fr"><b>([^<]*)<\/b><i>([^<]*)<\/i><\/span>/g,'[$1/$2]').replace(/<sup>([^<]*)<\/sup>/g,'^$1').replace(/<svg[\s\S]*?<\/svg>/g,'').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
const nums=t=>(t.match(/-?\d+(\.\d+)?/g)||[]).map(Number);
const N=t=>nums(t.replace(/−/g,'-'));
// tokens de valores (fracciones, enteros, con signo) en el orden en que aparecen + esqueleto
function tokens(t){ const vals=[]; const sk=t.replace(/\(−\[(\d+)\/(\d+)\]\)|−\[(\d+)\/(\d+)\]|\[(\d+)\/(\d+)\]|\(−(\d+)\)|−(\d+)|(\d+)/g,(m,a,b,c,d,e,f,g,h,i)=>{ if(a) vals.push(Fr(-a,b)); else if(c) vals.push(Fr(-c,d)); else if(e) vals.push(Fr(+e,f)); else if(g) vals.push(Fr(-g)); else if(h) vals.push(Fr(-h)); else vals.push(Fr(+i)); return 'V'; }).replace(/\s+/g,''); return {vals, sk}; }
const eq=(a,b)=>a.n===b.n&&a.d===b.d;
function propiedad(t, mult){
  const {vals:v, sk}=tokens(t); const o=mult?'×':'+';
  if(sk===`V${o}V=V${o}V`) return eq(v[0],v[3])&&eq(v[1],v[2]) ? 'Conmutativa' : 'INVALIDA';
  if(sk===`(V${o}V)${o}V=V${o}(V${o}V)`) return eq(v[0],v[3])&&eq(v[1],v[4])&&eq(v[2],v[5]) ? 'Asociativa' : 'INVALIDA';
  if(sk===`V${o}V=V`){
    if(!mult){ if(v[1].n===0&&eq(v[0],v[2])) return 'Identidad'; if(v[0].n===0&&eq(v[1],v[2])) return 'Identidad'; if(add(v[0],v[1]).n===0&&v[2].n===0) return 'Inverso'; }
    else { if(eq(v[1],Fr(1))&&eq(v[0],v[2])) return 'Identidad'; if(eq(v[0],Fr(1))&&eq(v[1],v[2])) return 'Identidad'; if((v[0].n===0||v[1].n===0)&&v[2].n===0) return 'Cero como factor'; if(eq(mul(v[0],v[1]),Fr(1))&&eq(v[2],Fr(1))) return 'Inverso'; }
    return 'INVALIDA';
  }
  if(sk==='V(V+V)=V×V+V×V') return eq(v[0],v[3])&&eq(v[0],v[5])&&eq(v[1],v[4])&&eq(v[2],v[6]) ? 'Distributiva' : 'INVALIDA';
  return null;
}
const X=1000;   // con x=10, "10 − x" y "x − 10" coincidían (los dos dan 0): falso positivo
function frase(fz){ let m;
  if(m=/^(\d+) más que un número x$/.exec(fz)) return X+ +m[1];
  if(m=/^(\d+) menos que un número x$/.exec(fz)) return X- +m[1];
  if(/^el doble de un número x$/.test(fz)) return 2*X;
  if(/^el triple de un número x$/.test(fz)) return 3*X;
  if(m=/^un número x dividido entre (\d+)$/.exec(fz)) return X/ +m[1];
  if(m=/^el triple de un número x, aumentado en (\d+)$/.exec(fz)) return 3*X+ +m[1];
  return null; }
function opcionVal(o){ let s=o.replace(/−/g,'-').replace(/÷/g,'/').replace(/×/g,'*').replace(/x²/g,'(x*x)').replace(/(\d)x/g,'$1*x').replace(/(\d)\(/g,'$1*(').replace(/x\(/g,'x*(').replace(/x/g,'('+X+')'); return val(parse(s)); }
// ─── checks por módulo: devuelven {mine, ok} o null si no reconocen el enunciado ───
const numOk=(mine,resp,tol=0.011)=>Math.abs(mine-resp)<tol;
const fracOk=(mine,resp)=>eq(Fr(mine.n,mine.d),Fr(resp.n,resp.d));
const C={};
C['conjuntos-numericos']=(ej,t)=>{ const m=/pertenece (.+?) \?/.exec(t); if(!m) return null; const x=m[1].trim(); let mine;
  if(/^√(\d+)$/.test(x)){ const k=+x.slice(1); mine=Number.isInteger(Math.sqrt(k))?'Natural':'Irracional'; }
  else if(x==='π') mine='Irracional'; else if(/^-?\d+$/.test(x)) mine= +x>0?'Natural':'Entero'; else if(/^\[-?\d+\/\d+\]$/.test(x)) mine='Racional'; else return null;
  return {mine, ok:mine===ej.respuesta}; };
C['valor-absoluto']=(ej,t,h)=>{ let m; if(m=/Halla el opuesto de (−?\d+)/.exec(t)) { const v=-N(m[1])[0]; return {mine:v, ok:v===ej.respuesta}; }
  if(/^Calcula:/.test(t)){ const v=val(ev(h.replace(/Calcula:/,''))); return {mine:v, ok:v===ej.respuesta}; } return null; };
C['reglas-signos']=(ej,t,h)=>{ const v=val(ev(h.replace(/=\s*$/,''))); return {mine:v, ok:v===ej.respuesta}; };
C['comparar-enteros']=(ej,t)=>{ const [a,b]=N(t.replace(/^[^?]*\?/,'')); const s=a<b?'<':a>b?'>':'='; return {mine:s, ok:s===ej.respuesta}; };
C['problemas-enteros']=(ej,t)=>{ let m,v;
  if(m=/temperatura era de (−?\d+)° y bajó (\d+)°/.exec(t)) v=N(m[1])[0]-+m[2];
  else if(m=/subió de (−?\d+)° a (−?\d+)°/.exec(t)) v=N(m[2])[0]-N(m[1])[0];
  else if(m=/Tenías \$(\d+) .* retiraste \$(\d+)/.exec(t)) v=+m[1]-+m[2];
  else if(m=/buzo está a (\d+) pies .* desciende (\d+) pies/.exec(t)) v=-(+m[1]+ +m[2]);
  else if(m=/ganó (\d+) yardas .* perdió (\d+) yardas/.exec(t)) v=+m[1]-+m[2]; else return null;
  return {mine:v, ok:v===ej.respuesta}; };
C['orden-operaciones-1']=(ej,t,h)=>{ let x=h; const m=/Si x = (\d+), calcula:(.*)$/.exec(clean(h)); if(m) x=m[2].replace(/x/g,'('+m[1]+')'); const v=val(ev(x)); return {mine:v, ok:v===ej.respuesta}; };
C['potencias-10']=(ej,t)=>{ let m; if(m=/Completa el exponente: (\d+) = (\d+) × 10\^\?/.exec(t)){ const v=Math.round(Math.log10(+m[1]/+m[2])); return {mine:v, ok:v===ej.respuesta && +m[2]*10**v===+m[1]}; }
  if(m=/Halla el valor: (\d+) × 10\^(\d+)/.exec(t)){ const v=+m[1]*10**+m[2]; return {mine:v, ok:v===ej.respuesta}; } return null; };
C['lenguaje-algebraico']=(ej,t)=>{ const m=/En la expresión (.+?) , ¿cuál es (el coeficiente|la constante)\?/.exec(t); if(!m) return null; const e=m[1].replace(/−/g,'-').replace(/\s+/g,''); const mm=/^(-?\d*)([a-z])([+-]\d+)$/.exec(e); if(!mm) return null; const coef=mm[1]===''?1:mm[1]==='-'?-1:+mm[1]; const cons=+mm[3]; const v=m[2]==='el coeficiente'?coef:cons; return {mine:v, ok:v===ej.respuesta}; };
C['traducir-algebra']=(ej,t)=>{ const m=/"\s*(.+?)\s*"/.exec(t); if(!m) return null; const fv=frase(m[1]); if(fv==null) return null; const ov=opcionVal(ej.respuesta); const otros=ej.opciones.filter(o=>o!==ej.respuesta).map(opcionVal); return {mine:fv+' (otras: '+otros.join(',')+')', ok:Math.abs(fv-ov)<1e-9 && !otros.some(o=>Math.abs(o-fv)<1e-9)}; };
// el "=" de la igualdad se busca DESPUÉS de convertir el html: class="fr" también tiene un "="
C['propiedades']=(ej,t,h)=>{ const e=t.replace(/^.*igualdad\? /,''); const [L,R]=toExpr(h.replace(/^.*igualdad\?\s*/,'')).split('='); const iguales=eq(parse(L),parse(R)); const p2=propiedad(e,false)||propiedad(e,true); return {mine:(p2)+(iguales?'':' [LADOS NO IGUALES]'), ok:p2===ej.respuesta&&iguales}; };
C['terminos-semejantes']=(ej,t)=>{ let m; if(m=/^\((\d+)([a-z])\)\((\d+)([a-z])\) = ___/.exec(t)) { const v=+m[1]*+m[3]; return {mine:v, ok:v===ej.respuesta&&m[2]===m[4]}; }
  if(m=/^(\d+)([a-z]) (\+|−) (\d+)([a-z]) = ___/.exec(t)){ const v=m[3]==='+'?+m[1]+ +m[4]:+m[1]-+m[4]; return {mine:v, ok:v===ej.respuesta&&m[2]===m[5]}; }
  if(m=/combinar estos términos\? (\d+)([a-z]) \+ (\d+)([a-z])/.exec(t)){ const v=m[2]===m[4]; return {mine:v, ok:v===ej.respuesta}; } return null; };
C['ecuaciones-lineales']=(ej,t,h)=>{ const [L,R]=h.split('='); const letra=(t.match(/[a-z]/)||[])[0]; const rep=s=>s.replace(new RegExp(letra,'g'),'('+ej.respuesta+')'); const l=val(ev(rep(L))), r=val(ev(rep(R))); return {mine:l+'='+r, ok:Math.abs(l-r)<1e-9}; };
C['problemas-verbales-alg']=(ej,t)=>{ let m,v; if(m=/Se retiraron (\d+) y quedaron (\d+)/.exec(t)) v=+m[1]+ +m[2]; else if(m=/^(\d+) boletos cuestan en total \$(\d+)/.exec(t)) v=+m[2]/+m[1]; else if(m=/repartieron (\d+) lápices .* entre (\d+) estudiantes/.exec(t)) v=+m[1]/+m[2]; else if(m=/le dio \$(\d+) más y ahora tiene \$(\d+)/.exec(t)) v=+m[2]-+m[1]; else return null; return {mine:v, ok:v===ej.respuesta}; };
C['promedio']=(ej,t)=>{ let m; if(m=/^Halla el promedio de: (.+)$/.exec(t)){ const xs=N(m[1]); const v=Math.round(xs.reduce((a,b)=>a+b,0)/xs.length*100)/100; return {mine:v, ok:Math.abs(v-ej.respuesta)<1e-9}; }
  if(m=/El promedio de estos (\d+) números es (\d+) : (.+?), y x \. Halla x\./.exec(t)){ const k=+m[1], med=+m[2], xs=N(m[3]); if(xs.length!==k-1) return {mine:'cuenta mal', ok:false}; const v=med*k-xs.reduce((a,b)=>a+b,0); return {mine:v, ok:v===ej.respuesta}; } return null; };
C['angulos']=(ej,t)=>{ let m; if(m=/complemento de un ángulo de (\d+)°/.exec(t)){ const v=90-+m[1]; return {mine:v, ok:v===ej.respuesta}; } if(m=/suplemento de un ángulo de (\d+)°/.exec(t)){ const v=180-+m[1]; return {mine:v, ok:v===ej.respuesta}; }
  if(m=/Uno de los ángulos mide (\d+)°/.exec(t)){ const v=+m[1]; return {mine:v, ok:v===ej.respuesta}; } if(m=/Un ángulo mide (\d+)° \. ¿Cómo se clasifica\?/.exec(t)){ const d=+m[1]; const v=d<90?'Agudo':d===90?'Recto':d<180?'Obtuso':'Llano'; return {mine:v, ok:v===ej.respuesta}; } return null; };
C['angulos-figura']=(ej,t)=>{ const m=/m∠1 = (\d+)°/.exec(t); if(!m) return null; const g=+m[1]; return {mine:{a:180-g,b:g}, ok:ej.respuesta.a===180-g&&ej.respuesta.b===g}; };
C['triangulos']=(ej,t)=>{ const m=/lados de (\d+), (\d+) y (\d+)/.exec(t); if(!m) return null; const [a,b,c]=[+m[1],+m[2],+m[3]]; const ig=(a===b)+(b===c)+(a===c); const v=ig===3?'Equilátero':ig===1?'Isósceles':'Escaleno'; const valido=a+b>c&&a+c>b&&b+c>a; return {mine:v+(valido?'':' [TRIÁNGULO IMPOSIBLE]'), ok:v===ej.respuesta&&valido}; };
C['perimetro-area']=(ej,t)=>{ let m,v; const pi=3.14;
  if(m=/área de un rectángulo de (\d+) por (\d+)/.exec(t)) v=+m[1]*+m[2]; else if(m=/perímetro de un rectángulo de (\d+) por (\d+)/.exec(t)) v=2*(+m[1]+ +m[2]);
  else if(m=/circunferencia de un círculo con radio (\d+)/.exec(t)) v=2*pi*+m[1]; else if(m=/área de un círculo con radio (\d+)/.exec(t)) v=pi*m[1]*m[1];
  else if(m=/perímetro de un rombo de lado (\d+)/.exec(t)) v=4*+m[1]; else if(m=/área de un rombo con diagonales (\d+) y (\d+)/.exec(t)) v=+m[1]*+m[2]/2;
  else if(m=/área de un trapecio con bases (\d+) y (\d+), y altura (\d+)/.exec(t)) v=(+m[1]+ +m[2])*+m[3]/2; else if(m=/perímetro de un trapecio con lados (\d+), (\d+), (\d+) y (\d+)/.exec(t)) v=+m[1]+ +m[2]+ +m[3]+ +m[4];
  else if(m=/perímetro de un romboide con lados (\d+) y (\d+)/.exec(t)) v=2*(+m[1]+ +m[2]); else if(m=/área de un romboide con base (\d+) y altura (\d+)/.exec(t)) v=+m[1]*+m[2];
  else if(m=/área de un cuadrado de lado (\d+)/.exec(t)) v=m[1]*m[1]; else if(m=/perímetro de un cuadrado de lado (\d+)/.exec(t)) v=4*+m[1];
  else if(m=/área de un triángulo con base (\d+) y altura (\d+)/.exec(t)) v=+m[1]*+m[2]/2; else if(m=/perímetro de un triángulo con lados (\d+), (\d+) y (\d+)/.exec(t)) v=+m[1]+ +m[2]+ +m[3]; else return null;
  v=Math.round(v*100)/100; return {mine:v, ok:Math.abs(v-ej.respuesta)<1e-6}; };
C['divisibilidad']=(ej,t)=>{ const m=/¿Es (\d+) divisible por (\d+) \?/.exec(t); if(!m) return null; const v=+m[1]%+m[2]===0; return {mine:v, ok:v===ej.respuesta}; };
C['primos']=(ej,t)=>{ const m=/¿Es (\d+) un número primo\?/.exec(t); if(!m) return null; const v=isPrime(+m[1]); return {mine:v, ok:v===ej.respuesta}; };
C['factorizacion']=(ej,t)=>{ const m=/factorización prima de (\d+)/.exec(t); if(!m) return null; let prod=1, ok=true; for(const [p,e] of Object.entries(ej.respuesta)){ if(!isPrime(+p)) ok=false; prod*=(+p)**e; } return {mine:prod, ok:ok&&prod===+m[1]}; };
C['mcm-listado']=(ej,t)=>{ const m=/MCM de (\d+) y (\d+)/.exec(t); if(!m) return null; const v=lcm(+m[1],+m[2]); return {mine:v, ok:v===ej.respuesta}; };
C['mcm-factores']=(ej,t)=>{ let xs; let m; if(m=/campana suena cada (\d+) minutos y otra cada (\d+)/.exec(t)) xs=[+m[1],+m[2]]; else if(m=/MCM de ([\d, ]+) usando/.exec(t)) xs=N(m[1]); else if(m=/paquetes de (\d+) , los platos de (\d+) y las servilletas de (\d+)/.exec(t)) xs=[+m[1],+m[2],+m[3]]; else return null; const v=xs.reduce(lcm); return {mine:v, ok:v===ej.respuesta}; };
C['mcd']=(ej,t)=>{ let xs,m; if(m=/hoja mide (\d+) cm por (\d+) cm/.exec(t)) xs=[+m[1],+m[2]]; else if(m=/MCD de ([\d, ]+) \./.exec(t)) xs=N(m[1]); else return null; const v=xs.reduce(G); return {mine:v, ok:v===ej.respuesta}; };
C['frac-equivalentes']=(ej,t)=>{ let m; if(m=/Completa: \[(\d+)\/(\d+)\] = \[\?\/(\d+)\]/.exec(t)){ const v=+m[1]*+m[3]/+m[2]; return {mine:v, ok:v===ej.respuesta&&Number.isInteger(v)}; } if(m=/Completa: \[(\d+)\/(\d+)\] = \[(\d+)\/\?\]/.exec(t)){ const v=+m[2]*+m[3]/+m[1]; return {mine:v, ok:v===ej.respuesta&&Number.isInteger(v)}; } return null; };
C['simplificar']=(ej,t)=>{ let m,f; if(m=/Simplifica \[(\d+)\/(\d+)\]/.exec(t)) f=Fr(+m[1],+m[2]); else if(m=/libro tiene (\d+) páginas y ya ha leído (\d+)/.exec(t)) f=Fr(+m[2],+m[1]); else return null; return {mine:f, ok:fracOk(f,ej.respuesta)}; };
C['comparar']=(ej,t)=>{ let m; if(m=/\[(\d+)\/(\d+)\] ___ \[(\d+)\/(\d+)\]/.exec(t)){ const a=+m[1]/+m[2], b=+m[3]/+m[4]; const s=Math.abs(a-b)<1e-12?'=':a<b?'<':'>'; return {mine:s, ok:s===ej.respuesta}; }
  if(/Ordena estas fracciones/.test(t)){ const asc=/menor a mayor/.test(t); const idx=ej.opciones.map((f,i)=>({i,v:f.n/f.d})).sort((x,y)=>asc?x.v-y.v:y.v-x.v).map(o=>o.i); return {mine:idx, ok:JSON.stringify(idx)===JSON.stringify(ej.respuesta)}; } return null; };
C['mixtos']=(ej,t)=>{ let m; if(m=/número mixto (\d+) \[(\d+)\/(\d+)\] en fracción impropia/.exec(t)){ const f=Fr(+m[1]*+m[3]+ +m[2],+m[3]); return {mine:f, ok:fracOk(f,ej.respuesta)}; }
  if(m=/Convierte \[(\d+)\/(\d+)\] en número mixto/.exec(t)){ const n=+m[1],d=+m[2]; const e=Math.floor(n/d), r=n-e*d; const ok=ej.respuesta.e===e&&ej.respuesta.n===r&&ej.respuesta.d===d; return {mine:{e,n:r,d}, ok}; } return null; };
C['razones']=(ej,t)=>{ let m; if(m=/varilla mide (\d+) cm y otra mide (\d+) cm/.exec(t)||/hay (\d+) niñas y (\d+) niños/.exec(t)||/razón de (\d+) a (\d+)/.exec(t)){ const f=Fr(+m[1],+m[2]); return {mine:f, ok:fracOk(f,ej.respuesta)}; } return null; };
C['tasas-porciento']=(ej,t)=>{ let m; if(m=/Escribe (\d+)% como fracción/.exec(t)){ const f=Fr(+m[1],100); return {mine:f, ok:fracOk(f,ej.respuesta)}; }
  if(m=/Escribe \[(\d+)\/(\d+)\] como porciento/.exec(t)){ const v=+m[1]*100/+m[2]; return {mine:v, ok:Math.abs(v-ej.respuesta)<1e-9}; }
  if(m=/recorre (\d+) millas en (\d+) horas/.exec(t)||/produce (\d+) piezas en (\d+) minutos/.exec(t)){ const v=+m[1]/+m[2]; return {mine:v, ok:v===ej.respuesta}; }
  if(m=/bolsa de (\d+) libras de arroz cuesta \$(\d+)/.exec(t)){ const v=+m[2]/+m[1]; return {mine:v, ok:v===ej.respuesta}; }
  if(m=/tasa de (\d+) millas a (\d+) galones/.exec(t)||/hay (\d+) estudiantes y (\d+) computadoras/.exec(t)||/usa (\d+) tazas de harina para (\d+) huevos/.exec(t)){ const f=Fr(+m[1],+m[2]); return {mine:f, ok:fracOk(f,ej.respuesta)}; } return null; };
const evalTras=(h)=>ev(h.replace(/^[\s\S]*?:/,''));
C['suma-resta-frac']=(ej,t,h)=>{ const f=evalTras(h); return {mine:f, ok:fracOk(f,ej.respuesta)}; };
C['mult-div-frac']=C['suma-resta-frac'];
C['orden-op-frac']=C['suma-resta-frac'];
C['resta-mental-frac']=(ej,t,h)=>{ let m; if(m=/Resta \[(\d+)\/(\d+)\] de \[(\d+)\/(\d+)\]/.exec(t)){ const f=sub(Fr(+m[3],+m[4]),Fr(+m[1],+m[2])); return {mine:f, ok:fracOk(f,ej.respuesta)}; }
  if(/^Resta mentalmente/.test(t)){ const f=evalTras(h); if(ej.tipo==='mixto'){ const r=ej.respuesta; const g=Fr(r.e*r.d+r.n,r.d); return {mine:f, ok:eq(f,g)&&r.n<r.d&&G(r.n,r.d)===1}; } return {mine:f, ok:fracOk(f,ej.respuesta)}; } return null; };
C['propiedades-frac']=(ej,t,h)=>{ const mult=/multiplicación/.test(t); const e=t.replace(/^.*ilustra\? /,''); const [L,R]=toExpr(h.replace(/^.*ilustra\?\s*/,'')).split('='); const iguales=eq(parse(L),parse(R)); const p=propiedad(e,mult); return {mine:p+(iguales?'':' [LADOS NO IGUALES]'), ok:p===ej.respuesta&&iguales}; };
C['reciproco']=(ej,t,h)=>{ const {vals}=tokens(t.replace(/^.*?(recíproco de|Completa:)/,'$1')); const x=vals[vals.length-1]; if(!x) return null;
  if(ej.tipo==='opciones'){ const v=x.n===0?'No está definido':'?'; return {mine:v, ok:v===ej.respuesta}; }
  if(/Completa:/.test(t)){ const f=parse(toExpr(h.replace(/^[\s\S]*Completa:/,'')).split('=')[0]); return {mine:f, ok:fracOk(f,ej.respuesta)}; }
  if(x.n===0) return {mine:'indefinido', ok:false}; const f=Fr(x.d,x.n); return {mine:f, ok:fracOk(f,ej.respuesta)}; };
C['frac-compleja']=(ej,t,h)=>{ let m; if(m=/La suma de (.+?) y (.+?) se va a dividir por la diferencia entre (.+?) y (.+?)\./.exec(t)){ const {vals}=tokens(m[0]); if(vals.length!==4) return null; const f=div(add(vals[0],vals[1]),sub(vals[2],vals[3])); return {mine:f, ok:fracOk(f,ej.respuesta)}; }
  const f=evalTras(h); return {mine:f, ok:fracOk(f,ej.respuesta)}; };
// ─── corrida ───
const out={}, POR=300;
for(const m of MODULOS){ const r={ver:0,unv:0,fallos:[],errores:[]}; out[m.id]=r; const chk=C[m.id]; if(!chk){ r.sinCheck=true; continue; }
  for(const nv of ['facil','medio','dificil']) for(let i=0;i<POR;i++){ const ej=m.gen(nv); const t=clean(ej.enunciado); let res;
    try{ res=chk(ej,t,ej.enunciado); }catch(e){ if(r.errores.length<3) r.errores.push(t+' :: '+e.message); continue; }
    if(res==null){ r.unv++; if(r.fallos.length<2&&r.unv<3) r.fallos.push('NO RECONOCIDO: '+t); continue; }
    r.ver++;
    let simpleOk=true; if(ej.tipo==='frac'&&ej.pedirSimple){ const {n,d}=ej.respuesta; simpleOk=d>0&&G(n,d)===1; }
    if(!res.ok||!simpleOk){ if(r.fallos.length<4) r.fallos.push((simpleOk?'':'[NO SIMPLIFICADA] ')+t+' | app='+JSON.stringify(ej.respuesta)+' | mío='+JSON.stringify(res.mine)); r.nf=(r.nf||0)+1; }
  } }
let txt=''; let totalVer=0,totalFallos=0,totalUnv=0;
for(const [id,r] of Object.entries(out)){ totalVer+=r.ver; totalFallos+=r.nf||0; totalUnv+=r.unv; const flag=r.sinCheck?'SIN CHECK':(r.nf?'FALLA '+r.nf:'ok'); txt+=`${flag.padEnd(10)} ${id}: ${r.ver} verificados${r.unv?', '+r.unv+' no reconocidos':''}${r.errores.length?', errores: '+r.errores.join(' || '):''}\n`; for(const f of r.fallos) txt+='     '+f+'\n'; }
return `TOTAL verificados=${totalVer} fallos=${totalFallos} noReconocidos=${totalUnv}\n`+txt;
})()
