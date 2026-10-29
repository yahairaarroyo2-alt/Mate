// Verificador INDEPENDIENTE de respuestas — no usa ninguna función de la app para calcular.
// Lee el enunciado de cada ejercicio, recalcula la respuesta con su propio evaluador de
// fracciones/enteros (y parsers por módulo) y la compara con ej.respuesta. Así se atrapan
// generadores que guardan una respuesta que no corresponde a lo que se ve en pantalla
// (el autotest de app.js no puede: solo comprueba que la respuesta guardada pase el
// verificador de la propia app, y eso es circular).
//
// Cómo correrlo: abrir la app en el navegador (index.html, no ?test), y en la consola:
//   (0,eval)(await (await fetch('verificar-respuestas.js?'+Date.now())).text())
// Imprime un resumen por módulo: "ok", "FALLA n" con ejemplos, o "NO RECONOCIDO" si un
// enunciado nuevo no calza con ningún parser (hay que agregarle el parser, no ignorarlo).
// 3ª auditoría (2026-09-18): 33.300 ejercicios, 0 fallos, tras corregir 2 bugs que encontró.
// 4ª (2026-10-29): se agregaron verificadores EXACTOS (fracciones, BigInt en el interés compuesto) para los caps. 6-8 (decimales, porcientos, interés, fórmulas, comercial, compras, aplicaciones,
//   raíces/Pitágoras sin figura) y para Circuitos (Ohm, Watt, serie, paralelo, resistividad). Encontró nombres ambiguos en "Leer y escribir decimales" ("sesenta y seis centésimas" = 0.66 y 60.06).
//   Sin verificador (no se puede comprobar con otra cuenta): los temas de preguntas fijas de World Culture y Repaso de ayudante, las partes de caps. 6-8 que dependen de un dibujo
//   (dec-grafica, geometria-dec, las figuras de razones y de Pitágoras), la propina "Regla Especial" y "Despeje las fórmulas" de Watt (NO RECONOCIDO).
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
C['comparar-enteros']=(ej,t)=>{ let m; if(m=/¿Cuál es (menor|mayor): (−?\d+) ó (−?\d+) \?/.exec(t)){ const a=N(m[2])[0], b=N(m[3])[0]; const s=a===b?'Son iguales':(m[1]==='menor')===(a<b)?m[2]:m[3]; return {mine:s, ok:s===ej.respuesta}; }
  const [a,b]=N(t.replace(/^[^?]*\?/,'')); const s=a<b?'<':a>b?'>':'='; return {mine:s, ok:s===ej.respuesta}; };
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
C['ecuaciones-lineales']=(ej,t,h0)=>{ const h=clean((/<b>([^<]*)<\/b>/.exec(h0)||[])[1]||''); const [L,R]=h.split('='); const letra=(h.match(/[a-z]/)||[])[0]; const v0=String(ej.respuesta).replace('−','-'); const rep=s=>s.replace(new RegExp('(\\d)'+letra,'g'),'$1*'+letra).replace(new RegExp(letra,'g'),'('+v0+')'); const l=val(ev(rep(L))), r=val(ev(rep(R))); return {mine:l+'='+r, ok:Math.abs(l-r)<1e-9}; };
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
C['suma-resta-frac']=(ej,t,h)=>{ if(/Halla el MCD|caja con libros/.test(t)) return null; const f=evalTras(h);
  if(ej.tipo==='opciones'){ const [n,d]=String(ej.respuesta).replace(/−/g,'-').split('/').map(Number); return {mine:f, ok:fracOk(f,{n,d:d||1})}; }
  return {mine:f, ok:fracOk(f,ej.respuesta)}; };
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
// ─── capítulo 5 (2026-09-30) ───
const respVal=ej=>ej.tipo==='num'?Fr(Math.round(ej.respuesta*1e6),1e6):ej.tipo==='mixto'?Fr(ej.respuesta.e*ej.respuesta.d+ej.respuesta.n,ej.respuesta.d):Fr(ej.respuesta.n,ej.respuesta.d);
const nn=s=>+String(s).replace(/,/g,'');
// valores en el orden del texto: "7 [1/6]" (mixto) cuenta como UNO, comas de miles fuera
const mv=t=>{ const out=[]; t.replace(/(−?)(\d[\d,]*) \[(\d+)\/(\d+)\]|(−?)\[(\d+)\/(\d+)\]|(\d[\d,]*)/g,(m,s1,e,n,d,s2,n2,d2,i)=>{ if(e!==undefined) out.push(Fr((s1?-1:1)*(nn(e)*+d+ +n),+d)); else if(n2!==undefined) out.push(Fr((s2?-1:1)*+n2,+d2)); else out.push(Fr(nn(i))); return m; }); return out; };
const ok5=(r,ej)=>({mine:r, ok:eq(Fr(r.n,r.d),respVal(ej))});
const ecuacion=h=>h.split('<br><b>')[1].replace(/<\/b>\s*$/,'');
const sustituye=(e,L,v)=>e.replace(new RegExp('\\)\\s*'+L,'g'),')*'+L).replace(new RegExp(L,'g'),`(${v.n}/${v.d})`);
C['ecuaciones-frac']=(ej,t,h)=>{ const e=toExpr(ecuacion(h)); const L=(e.match(/[xytm]/)||[])[0]; if(!L) return null; const v=Fr(ej.respuesta.n,ej.respuesta.d);
  const [A,B]=sustituye(e,L,v).split('='); const a=parse(A), b=parse(B); return {mine:`${a.n}/${a.d} vs ${b.n}/${b.d}`, ok:eq(a,b)}; };
C['proporciones']=(ej,t,h)=>{ if(ej.tipo==='opciones'){ const {vals:v}=tokens(t.replace(/^[^:]*:/,'')); if(v.length!==2) return null; const a=mul(v[0],Fr(1)), b=v[1]; const es=eq(a,b)?'Cierta':'Falsa'; return {mine:es, ok:es===ej.respuesta}; }
  const [A,B]=sustituye(toExpr(ecuacion(h)),'x',respVal(ej)).split('='); const a=parse(A), b=parse(B); return {mine:`${a.n}/${a.d} vs ${b.n}/${b.d}`, ok:eq(a,b)}; };
C['aplicaciones-frac']=(ej,t)=>{ const v=mv(t); let r;
  if(/concreto/.test(t)) r=add(sub(sub(v[0],v[1]),v[2]),v[3]); else if(/clavo/.test(t)) r=v.reduce(add);
  else if(/triángulo/.test(t)) r=sub(sub(v[0],v[1]),v[2]); else if(/soga/.test(t)) r=sub(sub(v[2],v[0]),v[1]);
  else if(/rebajó/.test(t)) r=sub(v[0],v[1]); else if(/tanque/.test(t)) r=sub(sub(v[0],v[1]),v[2]);
  else if(/recién nacidos/.test(t)) r=v.reduce(add); else return null; return ok5(r,ej); };
C['promedio-frac']=(ej,t)=>{ let s=t; if(s.includes(':')) s=s.slice(s.indexOf(':')+1); else if(s.includes('caminó')) s=s.slice(s.indexOf('caminó')); const v=mv(s); if(v.length<3) return null; return ok5(div(v.reduce(add),Fr(v.length)),ej); };
const PAL={'Un':1,'Dos':2,'Tres':3,'Cuatro':4,'Cinco':5,'Seis':6,'Siete':7,'Ocho':8,'Nueve':9};
const DPAL={medio:2,mitades:2,tercio:3,tercios:3,cuarto:4,cuartos:4,quinto:5,quintos:5,sexto:6,sextos:6,'séptimo':7,'séptimos':7,octavo:8,octavos:8,noveno:9,novenos:9,'décimo':10,'décimos':10};
C['de-multiplicar']=(ej,t)=>{ let m, r;
  if(m=/según se indica: (\d+)% de ([\d,]+)/.exec(t)) r=Fr(+m[1]*nn(m[2]),100);
  else if(m=/según se indica: (\S+) (\S+) de ([\d,]+)/.exec(t)) r=Fr(PAL[m[1]]*nn(m[3]),DPAL[m[2]]);
  else if(m=/pasados años ([\d,]+) de un total de ([\d,]+)/.exec(t)) r=Fr(nn(m[1]),nn(m[2]));
  else if(m=/De un total de ([\d,]+) calorías, ([\d,]+)/.exec(t)) r=Fr(nn(m[2]),nn(m[1]));
  else if(m=/paga \$([\d,]+) mensualmente de hipoteca\. Si sus gastos mensuales totalizan \$([\d,]+)/.exec(t)) r=Fr(nn(m[1]),nn(m[2]));
  else if(m=/encontró que ([\d,]+) de cada ([\d,]+) árboles/.exec(t)) r=Fr(nn(m[2])-nn(m[1]),nn(m[2]));
  else if(m=/Si (\d+) estudiantes de una clase son fumadores y (\d+) no/.exec(t)) r=Fr(+m[2],+m[1]+ +m[2]);
  else if(m=/ahorra \[(\d+)\/(\d+)\] de su ingreso total.*ahorra \$([\d,]+)/.exec(t)) r=Fr(nn(m[3])*+m[2],+m[1]);
  else if(m=/dos terceras partes.*es \$([\d,]+)/.exec(t)) r=Fr(nn(m[1])*3,2);
  else if(m=/es de 15%.*se ganó \$([\d,]+)/.exec(t)) r=Fr(nn(m[1])*20,3);
  else if(m=/Cuatro quintos.*registraron (\d+) pulg/.exec(t)) r=Fr(+m[1]*5,4);
  else if(m=/descuento" de \[(\d+)\/(\d+)\].* en \$(\d+)\./.exec(t)) r=Fr(+m[3]*+m[2],+m[2]-+m[1]);
  else if(m=/que \[(\d+)\/(\d+)\] de su propiedad.*?, \[(\d+)\/(\d+)\] para su hijo menor, \[(\d+)\/(\d+)\] para su hija/.exec(t)) r=sub(Fr(1),add(add(Fr(+m[1],+m[2]),Fr(+m[3],+m[4])),Fr(+m[5],+m[6])));
  else return null; return ok5(r,ej); };
C['razon-unitaria-prop']=(ej,t)=>{ let m, r; const v=mv(t);
  if(m=/familia de (\d+) cuestan \$([\d,]+)/.exec(t)) r=Fr(nn(m[2]),+m[1]);
  else if(m=/usa (\d+) galones de gasolina para viajar ([\d,]+) millas/.exec(t)) r=Fr(nn(m[2]),+m[1]);
  else if(m=/Una clase de (\d+) estudiantes gastó \$([\d,]+)/.exec(t)) r=Fr(nn(m[2]),+m[1]);
  else if(/carne molida|maquinista/.test(t)) r=div(v[0],v[1]);
  else if(m=/familia de (\d+) miembros consume (\d+) galones/.exec(t)) r=Fr(+m[2],+m[1]);
  else if(m=/recorre (\d+) millas con (\d+) galones.*recorrer (\d+) millas/.exec(t)) r=Fr(+m[2]*+m[3],+m[1]);
  else if(m=/producir (\d+) bombillas en (\d+) minutos.*producir (\d+) bombillas/.exec(t)) r=Fr(+m[2]*+m[3],+m[1]);
  else if(/Un auto recorre/.test(t)) r=div(mul(v[0],v[2]),v[1]);
  else if(/receta/.test(t)) r=div(mul(v[1],v[2]),v[0]);
  else if(m=/Juan gana \$(\d+) en (\d+) días.*en (\d+) días/.exec(t)) r=Fr(+m[1]*+m[3],+m[2]);
  else if(/mapa/.test(t)) r=div(mul(v[1],v[2]),v[0]);
  else return null; return ok5(r,ej); };
C['geometria-frac']=(ej,t)=>{ const v=mv(t); const two=Fr(2), half=Fr(1,2); let r;
  if(/área de un rectángulo cuyo largo/.test(t)) r=mul(v[0],v[1]);
  else if(/perímetro de un rectángulo que mide/.test(t)) r=add(mul(two,v[0]),mul(two,v[1]));
  else if(/perímetro de un cuadrado/.test(t)) r=mul(Fr(4),v[0]);
  else if(/área de un cuadrado/.test(t)) r=mul(v[0],v[0]);
  else if(/área de un triángulo/.test(t)) r=mul(half,mul(v[0],v[1]));
  else if(/área de un paralelogramo/.test(t)) r=mul(v[0],v[1]);
  else if(/paralelogramo tiene base/.test(t)) r=div(v[1],v[0]);
  else if(/área de un trapecio/.test(t)) r=mul(half,mul(add(v[0],v[1]),v[2]));
  else if(/volumen de un sólido rectangular/.test(t)) r=mul(mul(v[0],v[1]),v[2]);
  else if(/volumen de un cubo/.test(t)) r=mul(mul(v[0],v[0]),v[0]);
  else if(/superficie de una caja/.test(t)) r=mul(two,add(add(mul(v[0],v[1]),mul(v[1],v[2])),mul(v[2],v[0])));
  else if(/superficie de un cubo/.test(t)) r=mul(Fr(6),mul(v[0],v[0]));
  else if(/largo de un rectángulo que tiene ancho/.test(t)) r=div(v[1],v[0]);
  else if(/perímetro de un rectángulo es/.test(t)) r=div(sub(v[0],mul(two,v[1])),two);
  else return null; return ok5(r,ej); };
C['semejantes']=(ej,t,h)=>{ if(ej.tipo==='angulo2'){ const L=[...h.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map(m=>parseInt(m[1])); const [a,b,c,A]=L; const x=A*b/a, y=A*c/a; return {mine:{a:x,b:y}, ok:x===ej.respuesta.a&&y===ej.respuesta.b}; }
  const v=mv(t); let r; if(/fotografía/.test(t)) r=div(mul(v[0],v[2]),v[1]); else if(/En la pequeña/.test(t)) r=div(mul(v[3],v[1]),v[0]); else return null; return ok5(r,ej); };
// Repaso (5.5) y Autoevaluación (5.6) del cap. 5: banco fijo del libro. La respuesta se recalcula
// con el evaluador propio a partir de los DATOS DEL E-BOOK (pág. 293-295), no de lo que calcula la app.
// "L=R" = proporción cierta/falsa por productos cruzados (en la misma unidad).
const LIBRO5={
 'repaso-cap5':{1:'-10/(-5/3)',2:'(-5-3)/(4/3)',3:'(1/5+1/3)*15',4:'(-7/10-1/2)*5',5:'(10/3)/(2/3+1)',6:'(5/6)/(2/3-1/2)',7:'(3-1/5)/(2-1/4)',
   8:'(7/3-3/2)/(5/4-1/2)',9:'(5/2+3/2)/3',10:'(17/3-16/3)*3',11:['(4+1/2)*(1+5/9)=2*(3+1/2)','(2+1/2)*36=3*25'],12:['5*104=13*40','10*4=20*16'],
   13:['13*30/6','2*5/4','15*(6+2/5)/12'],14:['5/7*1785','3/2*500','80/100*725','40/100*(-135)','1/7*49/50','2/3*35/6','4/9*(-9/16)'],
   15:'2/3*63',16:'(2+2/5)/120',17:'120/(20/100)',18:['10/100*1/3','1/3-10/100*1/3'],19:'14/(4/5)',20:'22/(6+22)',21:'32/12',22:'(1+1/2)*200000/100',
   23:['240/(18+4/5)','240/(18+4/5)*(1+1/4)'],24:'40*200/35',25:'380*4/(8+1/2)',
   26:['((2+1/4)+5/8+(1+1/2))/3','((6+1/10)+(2+1/2)+(5+3/4)+(3+2/5))/4','((4+5/12)+(3+3/8)+(10+1/3))/3'],
   29:'1/8*7/9',30:'24/(3/4)',31:'4*1/10',32:'(115-2*(40+1/2))/2',33:['(10/3)^3','(15/2)^3'],34:'(3+1/3)*4/5*(2+2/5)',
   35:['2*((14+1/4)*(18+2/5)+(18+2/5)*(5+1/2)+(5+1/2)*(14+1/4))','(14+1/4)*(18+2/5)*(5+1/2)'],36:['2*9/3','4*9/3']},
 'autoeval-cap5':{1:'(5/4)/3',2:'8/3-2/5',3:'1/2-1/4',4:'(11/2-1/2)/(6/5)',5:'23*105/15',6:'12*21/35',7:'3*12=(1+1/2)*12*2',8:'8/7+1',9:'32*150/40',
   10:'(40+2/3)+(45+1/3)+(58+1/2)+(23+1/2)',11:'180/(90/100)',14:'(16+1/2)*(12+1/3)',15:'(4+4/5)*(3+2/5)*(6+3/5)',16:'2*(19/2*19/2)+4*(19/2*17/5)',17:'4*10/5'}};
const qStr=s=>{ s=String(s).replace(/−/g,'-').trim(); let m;
  if(m=/^(-?)(\d+) (\d+)\/(\d+)$/.exec(s)) return Fr((m[1]?-1:1)*(+m[2]*+m[4]+ +m[3]),+m[4]);
  if(m=/^(-?\d+)\/(\d+)$/.exec(s)) return Fr(+m[1],+m[2]); return Fr(+s,1); };
const libro5=id=>(ej,t)=>{ const m=/Ejercicio (\d+)/.exec(t); if(!m) return null; const e=LIBRO5[id][m[1]]; if(e==null) return {mine:'no está en el libro',ok:false};
  const mine=(Array.isArray(e)?e:[e]).map(x=> x.includes('=') ? (eq(parse(x.split('=')[0]),parse(x.split('=')[1]))?'Cierta':'Falsa') : parse(x));
  const app= ej.tipo==='multi' ? ej.respuesta.map((r,i)=>ej.campos[i].ops ? r : qStr(r))
    : ej.tipo==='angulo2' ? [Fr(ej.respuesta.a),Fr(ej.respuesta.b)] : ej.tipo==='opciones' ? [ej.respuesta]
    : ej.tipo==='frac' ? [Fr(ej.respuesta.n,ej.respuesta.d)] : ej.tipo==='mixto' ? [Fr(ej.respuesta.e*ej.respuesta.d+ej.respuesta.n,ej.respuesta.d)] : [Fr(ej.respuesta)];
  const ok=app.length===mine.length && app.every((a,i)=> typeof a==='string' ? a===mine[i] : eq(a,mine[i]));
  return {mine:mine.map(v=>typeof v==='string'?v:v.n+'/'+v.d), ok}; };
C['repaso-cap5']=libro5('repaso-cap5'); C['autoeval-cap5']=libro5('autoeval-cap5');
// Repaso (4.5) y Autoevaluación (4.6) del cap. 4: igual, desde el ENUNCIADO del libro (pág. 249-251).
// "ALG:" = con letras, en sintaxis JS: se compara con la respuesta de la app sustituyendo valores.
// "TXT:" = respuesta de texto (propiedades); "ND" = no definido.
const LIBRO4={
 'repaso-cap4':{1:['6/35+5/7+4/5','1/3+3/5+11/15','9/16+13/24+7/16','2/14+3/4-11/28'],
   2:['ALG:2/(3*x)+13/(4*x)+17/(6*x)','(5+2/3)+(2+1/4)+(9+5/6)','ALG:2*a/(3*b)-5/(6*b)+a/(9*b)','(1+3/5)-(2+1/2)+(3+11/15)'],
   3:['3/4-2/3','14/3-(-15/4)','ALG:3/x-9/x','ALG:19/y-40/(7*y)'],4:['(1+3/4)+(2+1/2)','(2+1/5)-(3+4/5)','-15/7+(2+6/7)','-(3+3/4)-4'],
   5:['3/5+7/15+5/6','21/16+7/12-5/24','15/45-9/27+1/5','1/10-(-3/10)-4/15'],
   6:['ALG:x/15-1/3-2/15','ALG:7/(6*x)-1/(8*x)+2/(3*x)','ALG:3/(2*x)-5/(4*x)+9/(5*x)','ALG:2*x/3-5/(2*x)+x/6'],
   7:['1/2*(-3/5)*(10/9)','3/11*7/2*44/5','(-4/25)*(5/3)*(-2/3)*5','(81/100)*(150/(-54))*5','(4+1/5)*(5+3/5)*(3+4/7)'],
   8:['ALG:2/3*(-3*c/(4*x))*(2*x**2/c**2)','ALG:15*a**2*x/(4*b)*(6*a*b/(5*x**2))*(2/(3*a))','ALG:(-8*x*y**2/(16*m**3))*(-8*m/(3*y))*15*m**2'],
   9:'TXT:Propiedad Asociativa',10:'TXT:Cero como factor',11:'TXT:Inverso Multiplicativo',12:'TXT:Propiedad Conmutativa',13:'TXT:Propiedad Asociativa',
   14:'TXT:Identidad de la Multiplicación',15:'TXT:Identidad de la Multiplicación',
   16:['1/(7/5)','1/(-14)','ALG:1/(1/(13*x**2))','ND'],17:['1/(8/5)','1/14','ND','1/(-37/25)'],
   18:'9/64/(-27/80)',19:'(-24/36)/(-8/9)',20:'ALG:25/(-7*x)/(32*x/14)',21:'5/6*3/10/(15/(-4))',22:'7/8*15/4/(5/2)',
   23:'ALG:8*a**2*x/(5*y**2)/(4*a/(15*x*y))*(11*y**3/(2*a*x**2))',24:'ALG:5*y*a**2/(8*a*y)*(24/(10*a))/(16*y**2/(9*a))',
   25:['5/6/(3/4)+4/5*25/16','(2+1/2)*(3+1/5)/(3/4)+7/10','24/25/(3-(3/5+7/10*2/3)*(3/2)^2)'],
   26:['4-4/7/(1+3/5)','(2+7/10)/(5+1/4)-4/7','2/3+8/9*(2+1/4)'],
   27:['(3/4+1/2)/(1-1/3)','(5/9-4/3)/(16/21+6/7)','((6+1/10)-(3+1/5))/((2+1/5)+(1+1/2))'],
   28:['ALG:(4/(3*x))/(8/(9*x))','(1/3-2)/(1/3+2)','ALG:(7*x/8-x/4)/(x+x/4)','(-(3+4/5))/(3/4+1/5)'],29:'(5/7-(2+1/3))/(-(2+1/4)+7/8)'},
 'autoeval-cap4':{1:'5/6+7/8',2:'(4+3/5)*(-(7+1/2))',3:'ALG:1/(-a/(2*x))',4:'ALG:3/(8*a)-4/(5*a)',5:'(7+3/8)-4',6:'ALG:5*x/y**2/(15*x**2/y**3)',
   7:'7/6/(5/3)*5/14/(1/2)',8:'(-5/6+1/2)/(3/8-(-1/12))',9:'3/5+((1+1/2)*((4+1/4)-(3+1/2)))/(2/5)',10:'(1+1/5)+15/16/(2+1/2)-13/10',
   11:'ALG:x/5*1/3-2/5/3',12:'((1+3/10)+(2+4/5))/((2+3/5)-(1+1/3))'}};
const jsExpr=s=>String(s).replace(/−/g,'-').replace(/²/g,'^2').replace(/\s+/g,'').replace(/(\d|[a-z]|\))(?=[a-z(])/g,'$1*').replace(/\^/g,'**');
const VARS4=[{a:1.3,b:2.1,c:-0.7,m:1.9,x:2.7,y:-1.4},{a:-0.6,b:1.5,c:2.2,m:-1.1,x:1.6,y:3.3}];
const algVal=(e,v)=>Function('a','b','c','m','x','y','return ('+e+')')(v.a,v.b,v.c,v.m,v.x,v.y);
const algEq=(appS,orig)=>VARS4.every(v=>{ const p=algVal(jsExpr(appS),v), q=algVal(orig,v); return isFinite(p)&&Math.abs(p-q)<1e-9*Math.max(1,Math.abs(q)); });
const libro4=id=>(ej,t)=>{ const m=/Ejercicio (\d+)/.exec(t); if(!m) return null; const e=LIBRO4[id][m[1]]; if(e==null) return {mine:'no está en el libro',ok:false};
  const es=Array.isArray(e)?e:[e];
  const app= ej.tipo==='multi' ? ej.respuesta : ej.tipo==='opciones' ? [ej.respuesta]
    : ej.tipo==='frac' ? [ej.respuesta.n+'/'+ej.respuesta.d] : ej.tipo==='mixto' ? [ej.respuesta.e+' '+ej.respuesta.n+'/'+ej.respuesta.d] : [String(ej.respuesta)];
  const ok=app.length===es.length && es.every((x,i)=>{ const a=app[i];
    if(x==='ND') return a==='No definido'; if(x.startsWith('TXT:')) return a===x.slice(4);
    if(x.startsWith('ALG:')) return algEq(/^-?\d+ \d+\/\d+$/.test(a) ? (q=>q.n+'/'+q.d)(qStr(a)) : a, x.slice(4));   // "1 1/2" no es "11/2"
    return eq(qStr(a),parse(x)); });
  return {mine:es.map(x=>/^(ALG|TXT):|^ND$/.test(x)?x:(v=>v.n+'/'+v.d)(parse(x))), ok}; };
C['repaso-cap4']=libro4('repaso-cap4'); C['autoeval-cap4']=libro4('autoeval-cap4');
// Tarea y Quiz 5.1–5.3 (tipos de EducoSoft): cada respuesta se recalcula LEYENDO el enunciado
const S5=s=>String(s).replace(/<svg[\s\S]*?<\/svg>/g,'').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
const dcm=s=>{ const f=parseFloat(s); return Fr(Math.round(f*10),10); };
const mcCheck=(ej,mine)=>{ const vals=ej.opciones.map(o=>/^Ninguno/.test(o)?null:ev(o)); const iguales=vals.filter(v=>v&&eq(v,mine)).length;
  const i=vals.findIndex(v=>v&&eq(v,mine)); const esp=i>=0?ej.opciones[i]:ej.opciones[ej.opciones.length-1];
  return {mine:mine.n+'/'+mine.d, ok: ej.respuesta===esp && iguales<=1}; };
C['educo-cap5']=(ej,t,h)=>{ const s=S5(h); let m;
  if(/Halla el valor de x para la ecuación dada/.test(t)){ m=/x \+ (\d+) (\d+) = (\d+) (\d+)$/.exec(s); if(!m) return null; return ok5(sub(Fr(+m[3],+m[4]),Fr(+m[1],+m[2])),ej); }
  if(/^Resuelve la ecuación:/.test(t)){ m=/(\d+) [a-z] (\d+) = (\d+) (\d+)$/.exec(s)||/(\d+)[a-z] (\d+) = (\d+) (\d+)$/.exec(s); if(!m) return null; return ok5(div(mul(Fr(+m[3]),Fr(+m[2])),mul(Fr(+m[1]),Fr(+m[4]))),ej); }
  if(/Determina si la proporción dada a continuación/.test(t)){ const q=s.replace(/^.*continuación es cierta o falsa\.\s*/,''); let es;
    if(/pies/.test(q)){ m=/^(\d+) pies (\d+) pulgadas = (\d+) yardas (\d+) pies/.exec(q); if(!m) return null; es=12*m[1]*m[4]===3*m[3]*m[2]; }
    else { m=/^(\d+) (\d+) = (\d+) (\d+)$/.exec(q); if(!m) return null; es=m[1]*m[4]===m[2]*m[3]; }
    return {mine:es?'Cierta':'Falsa', ok:ej.respuesta===(es?'Cierta':'Falsa')}; }
  if(/Halla el término que falta/.test(t)){ m=/(\d+) es a x como (\d+) es a (\d+)/.exec(s); if(!m) return null; return ok5(Fr(m[1]*m[3],+m[2]),ej); }
  if(/^Resuelve la proporción\./.test(t)){ const q=s.replace(/^Resuelve la proporción\.\s*/,'');
    if(m=/^(\d+) (\d+) (\d+) x = (\d+) (\d+)$/.exec(q)) return ok5(div(mul(Fr(m[1]*m[3]+ +m[2],+m[3]),Fr(+m[5])),Fr(+m[4])),ej);
    if(m=/^x (\d+) = ([\d.]+) ([\d.]+)$/.exec(q)) return ok5(div(mul(Fr(+m[1]),dcm(m[2])),dcm(m[3])),ej);
    if(m=/^(\d+) x = ([\d.]+) ([\d.]+)$/.exec(q)) return ok5(div(mul(Fr(+m[1]),dcm(m[3])),dcm(m[2])),ej);
    return null; }
  if(/La suma de los lados de un triángulo/.test(t)){ const v=mv(t); if(v.length<3) return null; return ok5(sub(sub(v[0],v[1]),v[2]),ej); }
  if(/promedio del siguiente par de fracciones/.test(t)){ const v=mv(t.replace(/^.*fracciones\./,'')); if(v.length<2) return null; return ok5(div(add(v[0],v[1]),Fr(2)),ej); }
  if(/Un estudiante planifica gastar|Un estacionamiento puede acomodar/.test(t)){ const v=mv(t); const f=v.find(x=>x.d!==1), W=v.find(x=>x.d===1); if(!f||!W) return null; return ok5(mul(f,W),ej); }
  if(/La propina promedio es/.test(t)){ const v=mv(t); if(v.length<2) return null; return ok5(div(v[1],v[0]),ej); }
  if(/Si un árbol de/.test(t)){ m=/árbol de (\d+) pies.*sombra de (\d+) pies.*sombra mide (\d+) pies/.exec(t); if(!m) return null; return ok5(Fr(m[1]*m[3],+m[2]),ej); }
  if(/Un camión de concreto/.test(t)){ const v=mv(t.replace(/^Un camión de concreto/,'')); if(v.length<4) return null; return ok5(add(sub(sub(v[0],v[1]),v[2]),v[3]),ej); }
  if(/Durante el año pasado/.test(t)){ const v=mv(t.replace(/^Durante el año pasado,/,'')).slice(0,2); if(v.length<2) return null; return ok5(div(v[0],v[1]),ej); }
  if(/pies cúbicos hay en la figura dada/.test(t)){ m=/(\d+) 3 yd = (\d+) pies/.exec(s); if(!m) return null; const n=+m[2], V=n**3, Sf=6*n*n; if(+m[1]!==n) return null;
    const ok=ej.respuesta[0]===V&&ej.respuesta[1]===Sf; return {mine:[V,Sf],ok}; }
  if(/Dado un par de triángulos semejantes/.test(t)){ const L=[...h.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map(x=>parseInt(x[1])); const [a,b,c,A]=L; if(!(a&&b&&c&&A)) return null; const x=b*A/a, y=c*A/a; return {mine:{a:x,b:y}, ok:x===ej.respuesta.a&&y===ej.respuesta.b}; }
  if(/cociente de/.test(t)&&/igual a 1/.test(t)){ m=/cociente de (\d+) (\d+) y (\d+) (\d+) es igual/.exec(s); if(!m) return null; return mcCheck(ej,sub(Fr(1),div(Fr(+m[1],+m[2]),Fr(+m[3],+m[4])))); }
  if(/^Resuelve para x ?:/.test(t)){ m=/1 (\d+) x \+ (\d+) = (−?\d+)/.exec(s); if(!m) return null; return mcCheck(ej,mul(Fr(+m[1]),sub(Fr(+m[3].replace('−','-')),Fr(+m[2])))); }
  if(/^Resuelve para y ?:/.test(t)){ m=/^Resuelve para y ?: (\d+) (\d+) = (\d+) (\d+) y/.exec(s); if(!m) return null; return mcCheck(ej,Fr(+m[1],+m[3])); }
  if(/^Si .*entonces a = \?/.test(t)){ m=/(\d+) a = (\d+) (\d+)/.exec(s); if(!m) return null; return mcCheck(ej,Fr(m[1]*m[3],+m[2])); }
  if(/^Identifica la solución de/.test(t)){ m=/1 (\d+) x = (\d+)/.exec(s); if(!m) return null; return mcCheck(ej,Fr(m[1]*m[2])); }
  if(/^Resuelve: /.test(t)){ m=/(\d+) (\d+) y − (\d+) (\d+) = (\d+) (\d+)/.exec(s); if(!m) return null; return mcCheck(ej,div(add(Fr(+m[5],+m[6]),Fr(+m[3],+m[4])),Fr(+m[1],+m[2]))); }
  return null; };
// Práctica del Examen Departamental (tipos de EducoSoft, caps. 1–5): cada respuesta se recalcula LEYENDO el enunciado
const NINGUNO='Ninguno de los anteriores', SUPN={'²':2,'³':3,'⁴':4,'⁵':5,'⁶':6,'⁷':7,'⁸':8,'⁹':9};
const mcStr=(ej,esp)=>{ const i=ej.opciones.findIndex(o=>o===esp); const dup=ej.opciones.filter(o=>o===esp).length;
  return {mine:esp, ok: dup<=1 && ej.respuesta===(i>=0?esp:NINGUNO)}; };
const fnTxt=(s,x)=>Function('x','return ('+s.replace(/−/g,'-').replace(/(\d)\s*x/g,'$1*x').replace(/(\d|x|\))\s*\(/g,'$1*(')+')')(x);
const W2N={un:1,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9};
const angPoly=(pts)=>{ const p=pts.trim().split(/\s+/).map(q=>q.split(',').map(Number)); let ag=0,re=0;
  for(let i=0;i<p.length;i++){ const a=p[(i+p.length-1)%p.length],b=p[i],c=p[(i+1)%p.length]; const v1=[a[0]-b[0],a[1]-b[1]],v2=[c[0]-b[0],c[1]-b[1]];
    const g=Math.acos((v1[0]*v2[0]+v1[1]*v2[1])/(Math.hypot(...v1)*Math.hypot(...v2)))*180/Math.PI; if(Math.abs(g-90)<0.5) re++; else if(g<90) ag++; }
  return [ag,re]; };
const gcdArr=a=>a.reduce((x,y)=>G(x,y),0);
C['educo-dep']=(ej,t,h)=>{ const s=S5(h); let m;
  if(/Completa las oraciones siguientes/.test(t)){ m=/(\d+)\((\d+) [+−] (\d+)\) = /.exec(s); if(!m) return null; return {mine:[+m[2],+m[3]], ok:ej.respuesta[0]===+m[2]&&ej.respuesta[1]===+m[3]}; }
  if(/suplemento de un ángulo es/.test(t)){ m=/es (\d+)°/.exec(s); if(!m) return null; const v=+m[1]-90; return {mine:v, ok:ej.respuesta===v}; }
  if(/complemento de un ángulo es/.test(t)){ m=/es (\d+)°/.exec(s); if(!m) return null; const v=90+ +m[1]; return {mine:v, ok:ej.respuesta===v}; }
  if(/en forma corta usando una potencia de 10/.test(t)){ m=/Escribe \$?([\d,]+) en forma corta/.exec(s); if(!m) return null; const d=m[1].replace(/,/g,''); const c=d.replace(/0+$/,''), k=d.length-c.length; return {mine:[+c,k], ok:ej.respuesta[0]===+c&&ej.respuesta[1]===k}; }
  if(/aseveraciones es cierta/.test(t)){ const mp=/P: La parte variable de (−?)(\d*)([a-z])([²³⁴⁵⁶⁷⁸⁹])? es ([^.]*)\./.exec(s), mq=/Q: La expresión (.*) tiene solamente (un|dos|tres) términos?\./.exec(s); if(!mp||!mq) return null;
    const e=SUPN[mp[4]]||1, esp=mp[3]+(mp[4]||''); const pOk=mp[5].trim()===esp;
    const terms=mq[1].replace(/^−/,'').split(/ [+−] /).length, qOk=W2N[mq[2]]===terms;
    const r=pOk&&qOk?'Ambos P y Q':pOk?'P solamente':qOk?'Q solamente':'Ni P ni Q'; return {mine:r, ok:ej.respuesta===r}; }
  if(/ángulos agudos y todos los ángulos rectos/.test(t)){ const polys=[...h.matchAll(/<polygon points="([^"]+)"/g)].map(x=>angPoly(x[1])); if(!polys.length) return null;
    const A=polys.reduce((x,y)=>x+y[0],0), Rr=polys.reduce((x,y)=>x+y[1],0); return {mine:[A,Rr], ok:ej.respuesta[0]===A&&ej.respuesta[1]===Rr}; }
  if(/^Resta: /.test(t)){ m=/^Resta: (\d+) − (\(−)?(\d+)\)?$/.exec(s); if(!m) return null; const v=m[2]?+m[1]+ +m[3]:+m[1]-+m[3]; return mcStr(ej,String(v).replace('-','−')); }
  if(/^Evalúa /.test(t)){ m=/^Evalúa \(−(\d+)\) (\d) ?\./.exec(s); if(!m) return null; const v=(-m[1])**+m[2]; return mcStr(ej,String(v).replace('-','−')); }
  if(/Convierte a una expresión algebraica/.test(t)){ const fr=s.replace(/^.*desconocido:\s*/,'').replace(/\s*\.\s*$/,''); let f;
    if(m=/^(\w+) menos que (\w+) veces un número$/.exec(fr)) f=x=>W2N[m[2]]*x-W2N[m[1]];
    else if(m=/^(\w+) más que (\w+) veces un número$/.exec(fr)) f=x=>W2N[m[2]]*x+W2N[m[1]];
    else if(m=/^(\w+) veces la suma de un número y (\w+)$/.exec(fr)) f=x=>W2N[m[1]]*(x+W2N[m[2]]);
    else if(m=/^la diferencia entre (\w+) y (\w+) veces un número$/.exec(fr)) f=x=>W2N[m[1]]-W2N[m[2]]*x; else return null;
    const hits=ej.opciones.filter(o=>o!==NINGUNO&&[3,7,-2].every(x=>fnTxt(o,x)===f(x))); const esp=hits.length===1?hits[0]:(hits.length===0?NINGUNO:'AMBIGUA');
    return {mine:esp, ok:esp!=='AMBIGUA'&&ej.respuesta===esp}; }
  if(/^Resuelve la ecuación: /.test(t)){ m=/(\d+)x ([+−]) (\d+) = (−?\d+)$/.exec(s); if(!m) return null; const b=m[2]==='−'?-m[3]:+m[3], x=Fr(+m[4].replace('−','-')-b,+m[1]);
    const vals=ej.opciones.map(o=>{ if(o===NINGUNO) return null; const q=/^x = (−?\d+)(?:\/(\d+))?$/.exec(o); return q?Fr(+q[1].replace('−','-'),+(q[2]||1)):undefined; });
    if(vals.includes(undefined)) return null; const i=vals.findIndex(v=>v&&eq(v,x)); return {mine:x.n+'/'+x.d, ok: vals.filter(v=>v&&eq(v,x)).length<=1 && ej.respuesta===(i>=0?ej.opciones[i]:NINGUNO)}; }
  if(/^Halla el perímetro de la siguiente figura/.test(t)){ const L=[...h.matchAll(/<text[^>]*>(\d+) ([a-z]+)<\/text>/g)].map(x=>[+x[1],x[2]]); if(L.length!==3) return null; const P=L[0][0]+L[1][0]+L[2][0]; return mcStr(ej,`${P} ${L[0][1]}`); }
  if(/^El promedio de /.test(t)){ m=/^El promedio de (\w+) números es (\d+)\. Si (\w+) de los números son ([\d, y]+), halla/.exec(s); if(!m) return null; const n=W2N[m[1]], A=+m[2], suma=(m[4].match(/\d+/g)||[]).reduce((x,y)=>x+ +y,0); return mcStr(ej,String(n*A-suma)); }
  if(/razón unitaria/.test(t)){ const nums=(s.replace(/,/g,'').match(/\d+/g)||[]).map(Number); if(nums.length<2) return null; const k=/pagaron/.test(s)?nums[1]/nums[0]:nums[0]/nums[1]; const hit=ej.opciones.find(o=>o!==NINGUNO&&Math.abs(parseFloat(o)-k)<1e-9); return {mine:k, ok:ej.respuesta===(hit||NINGUNO)}; }
  if(/^Factoriza completamente/.test(t)){ const ex=s.replace(/^Factoriza completamente:\s*/,''); const P=txt=>txt.split(' + ').map(z=>{ const q=/^(\d*)([a-z])?([²³⁴⁵⁶⁷⁸⁹])?([a-z])?([²³⁴⁵⁶⁷⁸⁹])?$/.exec(z); if(!q) return null; const o={c:q[1]===''?1:+q[1],e:{}}; if(q[2]) o.e[q[2]]=SUPN[q[3]]||1; if(q[4]) o.e[q[4]]=SUPN[q[5]]||1; return o; });
    const E=P(ex); if(E.includes(null)) return null; const val=(T,env)=>T.reduce((a,o)=>a+o.c*Object.entries(o.e).reduce((p,[l,e])=>p*env[l]**e,1),0);
    const letras=[...new Set(E.flatMap(o=>Object.keys(o.e)))]; const envs=[{[letras[0]]:2,[letras[1]]:3},{[letras[0]]:5,[letras[1]]:2}];
    const completa=o=>{ const q=/^(\d*)([a-z])?([²³⁴⁵⁶⁷⁸⁹])?([a-z])?([²³⁴⁵⁶⁷⁸⁹])?\((.*)\)$/.exec(o); if(!q) return false; const G0={c:q[1]===''?1:+q[1],e:{}}; if(q[2]) G0.e[q[2]]=SUPN[q[3]]||1; if(q[4]) G0.e[q[4]]=SUPN[q[5]]||1;
      const I=P(q[6]); if(I.includes(null)) return false; const prod=envs.every(env=>val(I,env)*G0.c*Object.entries(G0.e).reduce((p,[l,e])=>p*env[l]**e,1)===val(E,env)); if(!prod) return false;
      const g=gcdArr([...I.map(z=>z.c)]); const comunes=letras.filter(l=>I.every(z=>(z.e[l]||0)>0)); return prod&&g===1&&comunes.length===0; };
    const hits=ej.opciones.filter(o=>o!==NINGUNO&&completa(o)); const esp=hits.length===1?hits[0]:(hits.length===0?NINGUNO:'AMBIGUA'); return {mine:esp, ok:esp!=='AMBIGUA'&&ej.respuesta===esp}; }
  if(/^Halla la suma: /.test(t)){ const v=mv(t.replace(/^Halla la suma:/,'')); if(v.length<2) return null; return mcCheck(ej,add(v[0],v[1])); }
  if(/^Simplifica: /.test(t)){ const v=mv(t.replace(/^Simplifica:/,'')); if(v.length<3) return null; return mcCheck(ej,add(v[0],mul(v[1],v[2]))); }
  return null; };
// ─── capítulos 6, 7 y 8 (decimales, porcientos, interés) — verificadores independientes (2026-10-29) ───
// Todo con fracciones exactas (Fr): nada de coma flotante, y sin usar ninguna función de la app. Los enunciados que no reconocen devuelven null ("NO RECONOCIDO").
const D=s=>{ s=String(s).replace(/[−–]/g,'-').replace(/[$,\s%]/g,''); const m=/^(-?)(\d*)(?:\.(\d+))?$/.exec(s); if(!m||(m[2]===''&&!m[3])) throw new Error('no es decimal: '+s); const k=(m[3]||'').length; return Fr((m[1]?-1:1)*+((m[2]||'0')+(m[3]||'')),10**k); };
// redondeo "medio hacia arriba" (alejándose del cero), k = lugares decimales (0 = entero, −1 = decena)
const RD=(f,k)=>{ const neg=f.n<0, a=Math.abs(f.n); if(k>=0){ const q=Math.floor((2*a*10**k+f.d)/(2*f.d)); return Fr(neg?-q:q,10**k); } const p=10**-k, q=Math.floor((2*a+f.d*p)/(2*f.d*p)); return Fr((neg?-q:q)*p,1); };
const LUG={'décima':1,'centésima':2,'milésima':3,'diez milésima':4,'decena':-1,'centena':-2};
const lugDe=t=>{ let m; if(m=/a (\d+) lugares decimales/.exec(t)) return +m[1]; if(/un lugar decimal/.test(t)) return 1; if(/al entero más cercano|al dólar/.test(t)) return 0; if(m=/a la (diez milésima|milésima|centésima|décima|decena|centena) más cercana/.exec(t)) return LUG[m[1]]; if(/al centavo/.test(t)) return 2; return null; };
const igual=(f,resp,tol=1e-9)=>Math.abs(val(f)-resp)<tol;
const res=(f,ej,tol)=>({mine:+val(f).toFixed(9), ok:igual(f,ej.respuesta,tol)});
// "1,174.44" / "−5.2" / "[7/8]" / "4 [22/7]" / "66[2/3]" → fracción exacta
const numTxt=s=>{ s=s.trim().replace(/[−–]/g,'-').replace(/(\d),(?=\d{3})/g,'$1'); let m; if(m=/^(-?)\s*(\d+)?\s*\[(\d+)\/(\d+)\]$/.exec(s)){ const f=add(Fr(+(m[2]||0)),Fr(+m[3],+m[4])); return m[1]?Fr(-f.n,f.d):f; } return D(s); };
// ── palabras ↔ número (estricto: cada palabra solo donde corresponde) ──
const W_UN={un:1,uno:1,una:1,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9}, W_TE={diez:10,once:11,doce:12,trece:13,catorce:14,quince:15,dieciséis:16,diecisiete:17,dieciocho:18,diecinueve:19,veinte:20,veintiuno:21,veintiún:21,veintidós:22,veintitrés:23,veinticuatro:24,veinticinco:25,veintiséis:26,veintisiete:27,veintiocho:28,veintinueve:29};
const W_DE={treinta:30,cuarenta:40,cincuenta:50,sesenta:60,setenta:70,ochenta:80,noventa:90}, W_CE={cien:100,ciento:100,doscientos:200,trescientos:300,cuatrocientos:400,quinientos:500,seiscientos:600,setecientos:700,ochocientos:800,novecientos:900};
function wEnt(tk){ const k=tk.indexOf('mil'); if(k>=0){ const a=k===0?1:wEnt(tk.slice(0,k)), b=k+1<tk.length?wEnt(tk.slice(k+1)):0; return a==null||b==null?null:a*1000+b; }
  let v=0,i=0; if(tk[i] in W_CE){ v+=W_CE[tk[i]]; i++; }
  if(i<tk.length){ const w=tk[i]; if(w in W_TE){ v+=W_TE[w]; i++; } else if(w in W_DE){ v+=W_DE[w]; i++; if(tk[i]==='y'){ if(tk[i+1] in W_UN){ v+=W_UN[tk[i+1]]; i+=2; } else return null; } } else if(w in W_UN){ v+=W_UN[w]; i++; } else return null; }
  return i===tk.length?v:null; }
// nombre de un decimal → {vals:[todas las lecturas posibles]}; "cincuenta y cuatro centésimas" puede ser 0.54 o 50.04 (si hay más de una lectura, el nombre es ambiguo)
function wDec(txt){ let tk=txt.toLowerCase().replace(/[.,]/g,'').split(/\s+/).filter(Boolean); let lug=0;
  const fin=tk.slice(-2).join(' '), ult=tk[tk.length-1];
  if(/^décimas?$/.test(ult)) lug=1; else if(/^centésimas?$/.test(ult)) lug=2; else if(fin==='diez milésimas'||fin==='diez milésima') lug=4; else if(fin==='cien milésimas'||fin==='cien milésima') lug=5; else if(/^milésimas?$/.test(ult)) lug=3; else if(/^millonésimas?$/.test(ult)) lug=6;
  if(!lug){ const v=wEnt(tk); return {vals:v==null?[]:[Fr(v)]}; }
  tk=tk.slice(0,tk.length-(lug===4||lug===5?2:1)); const vals=[]; const F=a=>{ const v=wEnt(a); return v!=null&&v>=1&&v<10**lug?v:null; };
  { const f=F(tk); if(f!=null) vals.push(Fr(f,10**lug)); }
  // lectura con parte entera: no vale cuando la entera acaba en decena sola (30, 40… 130…) y el numerador es de una cifra con centésimas o más: "sesenta y seis centésimas" es 0.66
  // (esos 60.06 la app NO los genera; si lo hiciera, el nombre se leería de dos maneras y el ejercicio sería ambiguo)
  tk.forEach((w,j)=>{ if(w==='y'&&j>0){ const e=wEnt(tk.slice(0,j)), f=F(tk.slice(j+1)); if(e!=null&&f!=null&&!(lug>=2&&f<10&&e%10===0&&e%100>=30)) vals.push(add(Fr(e),Fr(f,10**lug))); } });
  return {vals:vals.filter((x,i,a)=>a.findIndex(y=>eq(x,y))===i)}; }
C['dec-palabras']=(ej,t)=>{ let m;
  if(m=/^Escribe el nombre en palabras para el número decimal dado: (.+)$/.exec(t)){ const x=D(m[1]), buenas=ej.opciones.filter(o=>{ const w=wDec(o); return w.vals.some(v=>eq(v,x)); });
    const lec=wDec(ej.respuesta).vals; if(lec.length>1) return {mine:'AMBIGUA: "'+ej.respuesta+'" se lee '+lec.map(v=>val(v)).join(' o '), ok:false};
    return {mine:buenas.join(' | '), ok:buenas.length===1&&buenas[0]===ej.respuesta}; }
  if(m=/^Escribe el número decimal como una fracción \(no la reduzcas\): (.+)$/.exec(t)){ const s=m[1].trim().replace(/,/g,''), k=(s.split('.')[1]||'').length, n=+s.replace('.',''); return {mine:n+'/'+10**k, ok:ej.respuesta.n===n&&ej.respuesta.d===10**k}; }
  if(m=/^Escribe el número dado en notación decimal: (.+)$/.exec(t)){ const f=numTxt(m[1]); return res(f,ej); }
  if(m=/^Escribe el número decimal del nombre en palabras: (.+)$/.exec(t)){ const w=wDec(m[1]); if(w.vals.length!==1) return {mine:w.vals.length?'AMBIGUA: '+w.vals.map(v=>val(v)).join(' o '):'no entendí el nombre', ok:false}; return res(w.vals[0],ej); }
  return null; };
C['dec-redondear']=(ej,t)=>{ let m, f, k;
  if(m=/^Redondea el número(?: decimal)? .*?: (.+)$/.exec(t)){ f=D(m[1]); k=lugDe(t); }
  else if(m=/balance en la cuenta .* aparece como \$(\d[\d,]*(?:\.\d+)?)\. ¿Cuál es el balance al centavo/.exec(t)){ f=D(m[1]); k=2; }
  else if(m=/va a deducir \$(\d[\d,]*(?:\.\d+)?) en su planilla .* al dólar/.exec(t)){ f=D(m[1]); k=0; }
  else return null;
  if(k==null) return null; return res(RD(f,k),ej); };
C['dec-comparar']=(ej,t)=>{ let m;
  if(m=/^Halla el valor absoluto del número: \|(.+)\|$/.exec(t)){ const f=D(m[1]); return res(Fr(Math.abs(f.n),f.d),ej); }
  if(m=/^Escribe el símbolo de desigualdad apropiado entre los dos decimales: (.+?) ___ (.+)$/.exec(t)){ const a=D(m[1]), b=D(m[2]), c=a.n*b.d-b.n*a.d, s=c<0?'<':c>0?'>':'='; return {mine:s, ok:s===ej.respuesta}; }
  if(/^Escribe los números dados en orden ascendente/.test(t)){ const v=ej.opciones.map(o=>val(D(o))), orden=[...v.keys()].sort((x,y)=>v[x]-v[y]); return {mine:orden, ok:JSON.stringify(orden)===JSON.stringify(ej.respuesta)}; }
  return null; };
C['suma-resta-dec']=(ej,t,h)=>{ let m, f;
  const cuerpo=s=>ev(s.replace(/^.*?:\s*/,''));
  if(m=/^(?:Halla la diferencia|Suma los decimales|Halla la suma indicada|Halla la diferencia indicada): (.+)$/.exec(t)) f=ev(m[1].replace(/\[(\d+)\/(\d+)\]/g,'($1/$2)'));
  else if(m=/^Resta (\d[\d,]*(?:\.\d+)?) de ([\d.,]+?)(?: y redondea la diferencia a la (.+?) más cercana)?\.$/.exec(t)){ f=sub(D(m[2]),D(m[1])); if(m[3]) f=RD(f,lugDe('a la '+m[3]+' más cercana')); }
  else if(m=/^Resta la diferencia de (\d[\d,]*(?:\.\d+)?) y (\d[\d,]*(?:\.\d+)?) de la suma de (\d[\d,]*(?:\.\d+)?) y (\d[\d,]*(?:\.\d+)?)\.$/.exec(t)) f=sub(add(D(m[3]),D(m[4])),sub(D(m[1]),D(m[2])));
  else if(m=/^Suma la suma de (\d[\d,]*(?:\.\d+)?) y (\d[\d,]*(?:\.\d+)?) a la diferencia entre (\d[\d,]*(?:\.\d+)?) y (\d[\d,]*(?:\.\d+)?)\.$/.exec(t)) f=add(add(D(m[1]),D(m[2])),sub(D(m[3]),D(m[4])));
  else if(m=/^Suma la diferencia de (\d[\d,]*(?:\.\d+)?) y (\d[\d,]*(?:\.\d+)?) a la diferencia entre (\d[\d,]*(?:\.\d+)?) y (\d[\d,]*(?:\.\d+)?)\.$/.exec(t)) f=add(sub(D(m[1]),D(m[2])),sub(D(m[3]),D(m[4])));
  else if(m=/^Estima la (suma|diferencia) redondeando cada número al número cardinal más cercano\. (.+)$/.exec(t)){ const xs=m[2].split(/ [+−-] /).map(s=>RD(D(s),0)), ops=m[2].match(/ [+−-] /g).map(o=>o.trim()); f=xs.reduce((a,x,i)=>i===0?x:ops[i-1]==='+'?add(a,x):sub(a,x)); }
  else if(m=/^Estima la (suma|diferencia) usando estimación frontal \(.*?\)\. (.+)$/.exec(t)){ const front=x=>{ const a=Math.abs(val(x)); if(a===0) return Fr(0); const e=Math.floor(Math.log10(a)), p=e>=0?Fr(10**e):Fr(1,10**-e), q=RD(div(Fr(Math.abs(x.n),x.d),p),0); return mul(q,p); };
    const xs=m[2].split(/ [+−-] /).map(s=>front(D(s))), ops=m[2].match(/ [+−-] /g).map(o=>o.trim()); f=xs.reduce((a,x,i)=>i===0?x:ops[i-1]==='+'?add(a,x):sub(a,x)); }
  else if(m=/^Simplifica combinando términos semejantes: ((?:[\d.]+[a-z]( [+−] )?)+)$/.exec(t)){
    const ts=m[1].split(/ (?=[+−] )/); let tot=Fr(0), letra; ts.forEach((s,i)=>{ const q=/^(?:([+−]) )?([\d.]+)([a-z])$/.exec(s.trim()); letra=q[3]; const v=D(q[2]); tot=(q[1]==='−')?sub(tot,v):add(tot,v); });
    const txt=(val(tot)<0?'−':'')+String(Math.abs(val(tot)))+letra; return {mine:txt, ok:String(ej.respuesta).replace(/<[^>]+>/g,'')===txt}; }
  else return null;
  return res(f,ej); };
C['mult-div-dec']=(ej,t)=>{ let m, f;
  if(m=/^Halla el cociente: (.+?) ÷ (.+)$/.exec(t)){ f=div(D(m[1]),D(m[2])); }
  else if(m=/^Divide y redondea el cociente a la (.+?) más cercana: (.+?) ÷ (.+)$/.exec(t)){ f=RD(div(D(m[2]),D(m[3])),lugDe('a la '+m[1]+' más cercana')); }
  else if(m=/^Calcula el producto indicado: (.+)$/.exec(t)){ f=m[1].split(' × ').map(s=>D(s.replace(/[()]/g,''))).reduce(mul); }
  else if(m=/^Halla el (?:producto|cociente) mentalmente moviendo el punto decimal: (.+?) (×|÷) (10\^(\d+)|[\d,]+)$/.exec(t)){ const p=m[4]?10**+m[4]:+m[3].replace(/,/g,''); f=m[2]==='×'?mul(D(m[1]),Fr(p)):div(D(m[1]),Fr(p)); }
  else return null;
  return res(f,ej); };
C['dec-fraccion']=(ej,t)=>{ let m, f;
  const aDec=(fr,k)=>k==null?fr:RD(fr,k);
  if(m=/^Cambia (?:la fracción|el número mixto) a (?:forma decimal|un número decimal(?: y redondea a la (.+?) más cercana)?)(?:\. Si el decimal es infinito.*)?: (.+)$/.exec(t)){ const fr=numTxt(m[2]); const k=m[1]?lugDe('a la '+m[1]+' más cercana'):null;
    if(/overline/.test(String(ej.respuesta))){ const txt=String(ej.respuesta).replace(/<span[^>]*>(.*?)<\/span>/,'($1)').replace(/−/g,'-'); const mm=/^(-?)(\d*)\.(\d*)\((\d+)\)$/.exec(txt); if(!mm) return null;   // 0.41(6) = 0.41666…
      const pre=+(mm[2]+mm[3]), full=+(mm[2]+mm[3]+mm[4]), x=Fr(full-pre,(10**mm[4].length-1)*10**mm[3].length); const sg=mm[1]?Fr(-x.n,x.d):x; return {mine:txt, ok:eq(sg,fr)}; }
    return res(aDec(fr,k),ej); }
  if(m=/^Cambia el número de forma decimal a forma fraccionaria y redúcelo a sus términos más simples: (.+)$/.exec(t)){ f=D(m[1]); return {mine:f.n+'/'+f.d, ok:ej.respuesta.n===f.n&&ej.respuesta.d===f.d}; }
  if(m=/^Cambia el número de forma decimal a forma de número mixto y redúcelo a sus términos más simples: (.+)$/.exec(t)){ f=D(m[1]); const neg=f.n<0, a=Math.abs(f.n), e=Math.floor(a/f.d), r=Fr(a-e*f.d,f.d); const R={e:neg?-e:e,n:r.n,d:r.d}; return {mine:R, ok:ej.respuesta.e===R.e&&ej.respuesta.n===R.n&&ej.respuesta.d===R.d}; }
  return null; };
C['orden-op-dec']=(ej,t,h)=>{ let m;
  const E=s=>ev(s.replace(/\[/g,'(').replace(/\]/g,')').replace(/\(([\d.]+)\)\(([\d.]+)\)/g,'($1)*($2)'));
  if(m=/^Simplifica la expresión numérica: (.+)$/.exec(clean(h).replace(/\[(\d+)\/(\d+)\]/g,'[$1/$2]'))){ const cuerpo=toExpr(h).replace(/^.*?expresión numérica:\s*/,''); return res(parse(cuerpo.replace(/\[/g,'(').replace(/\]/g,')')),ej); }
  if(m=/^Evalúa la expresión para x = ([\d.]+) y y = ([\d.]+): (.+)$/.exec(t)){ const x=D(m[1]), y=D(m[2]); let e=m[3].replace(/−/g,'-').replace(/(\d)([xy])/g,'$1*$2').replace(/([xy])([xy])/g,'$1*$2').replace(/(\d)([xy])/g,'$1*$2'); e=e.replace(/x/g,'('+m[1]+')').replace(/y/g,'('+m[2]+')'); return res(parse(e.replace(/\s+/g,' ')),ej); }
  return null; };
C['promedio-dec']=(ej,t)=>{ let m, lista, k=null;
  if(m=/^Halla el promedio(?: \(redondea a la (.+?) más cercana\))?: (.+)$/.exec(t)){ lista=m[2]; k=m[1]?lugDe('a la '+m[1]+' más cercana'):null; }
  else if(m=/fue(?: \(en dólares\))?: (.+?)\. ¿Cuál es el promedio(, redondeado a la centésima)?\?$/.exec(t)){ lista=m[1]; k=m[2]?2:null; }
  else return null;
  const xs=lista.split(/,\s*/).map(s=>D(s.replace(/[^\d.\-−]/g,''))); const f=div(xs.reduce(add),Fr(xs.length)); return res(k==null?f:RD(f,k),ej); };
C['porciento-conv']=(ej,t)=>{ let m, f;
  if(m=/^Escribe el porciento como un número decimal: (.+)%$/.exec(t)) return res(div(numTxt(m[1]),Fr(100)),ej);
  if(m=/^Escribe el número decimal como un porciento: (.+)$/.exec(t)) return res(mul(D(m[1]),Fr(100)),ej);
  if(m=/^Cambia el porciento a una fracción y redúcela a sus términos más simples: (.+)%$/.exec(t)){ f=div(numTxt(m[1]),Fr(100)); const R=ej.respuesta; if(typeof R==='number') return {mine:f.n/f.d, ok:f.d===1&&f.n===R}; if(ej.tipo==='mixto'){ const e=Math.floor(f.n/f.d), r=Fr(f.n-e*f.d,f.d); return {mine:e+' '+r.n+'/'+r.d, ok:R.e===e&&R.n===r.n&&R.d===r.d}; } return {mine:f.n+'/'+f.d, ok:R.n===f.n&&R.d===f.d}; }
  if(m=/^Escribe el número como un porciento\. Redondea a la décima de porciento más cercana: (.+)$/.exec(t)) return res(RD(mul(numTxt(m[1]),Fr(100)),1),ej);
  if(m=/^Convierte el porciento a un decimal redondeado a la (.+?) más cercana: (.+)%$/.exec(t)) return res(RD(div(numTxt(m[2]),Fr(100)),lugDe('a la '+m[1]+' más cercana')),ej);
  if(/^Halla el porciento de ganancia de cada inversión/.test(t)){ const g=[...t.matchAll(/\((a|b)\) \$(\d[\d,]*(?:\.\d+)?) de ganancia al invertir \$(\d[\d,]*(?:\.\d+)?)/g)].map(q=>({l:'('+q[1]+')',p:div(D(q[2]),D(q[3]))})); if(g.length!==2) return null; const mejor=g[0].p.n*g[1].p.d>g[1].p.n*g[0].p.d?g[0].l:g[1].l; return {mine:mejor, ok:mejor===ej.respuesta}; }
  return null; };
C['porciento-formula']=(ej,t)=>{ let m;
  const nP=s=>numTxt(s.replace(/%$/,''));
  if(m=/^¿([\d.]+(?:\[\d+\/\d+\])?)% de (\d[\d,]*(?:\.\d+)?) es qué número\?(?: Redondea a la centésima\.)?$/.exec(t)){ const f=div(mul(nP(m[1]),D(m[2])),Fr(100)); return res(/Redondea/.test(t)?RD(f,2):f,ej); }
  if(m=/^¿Qué porciento de (\d[\d,]*(?:\.\d+)?) es (\d[\d,]*(?:\.\d+)?)\?$/.exec(t)) return res(mul(div(D(m[2]),D(m[1])),Fr(100)),ej);
  if(m=/^¿(\d[\d,]*(?:\.\d+)?) es ([\d.]+)% de qué número\?$/.exec(t)) return res(div(mul(D(m[1]),Fr(100)),D(m[2])),ej);
  if(m=/^¿([\d.]+)% de qué número es (\d[\d,]*(?:\.\d+)?)\?$/.exec(t)) return res(div(mul(D(m[2]),Fr(100)),D(m[1])),ej);
  if(m=/^(?:El|La) .* (aumentó|bajó) de \$?(\d[\d,]*(?:\.\d+)?) a \$?(\d[\d,]*(?:\.\d+)?)\. ¿Cuál es el porciento de (?:aumento|disminución)\?$/.exec(t)){ const a=D(m[2]), b=D(m[3]); return res(mul(div(Fr(Math.abs(b.n*a.d-a.n*b.d),a.d*b.d),a),Fr(100)),ej); }
  if(m=/^Un mineral contiene ([\d.]+)% de cobre\. ¿Cuántos kilogramos del mineral contienen (\d[\d,]*(?:\.\d+)?) kg de cobre\?$/.exec(t)) return res(div(mul(D(m[2]),Fr(100)),D(m[1])),ej);
  if(m=/el ([\d.]+)% de los estudiantes son varones y el número de niñas es (\d[\d,]*(?:\.\d+)?)\. ¿Cuántos varones hay\?$/.exec(t)){ const p=D(m[1]), niñas=D(m[2]); const total=div(mul(niñas,Fr(100)),sub(Fr(100),p)); return res(mul(total,div(p,Fr(100))),ej); }
  if(m=/compró un auto en \$(\d[\d,]*(?:\.\d+)?)\. Hizo un pronto pago de ([\d.]+)%\. Halla la cantidad del préstamo\.$/.exec(t)) return res(mul(D(m[1]),sub(Fr(1),div(D(m[2]),Fr(100)))),ej);
  if(m=/aumentó ([\d.]+)% desde el último censo\. Si la población anterior era de (\d[\d,]*(?:\.\d+)?) habitantes/.exec(t)) return res(mul(D(m[2]),add(Fr(1),div(D(m[1]),Fr(100)))),ej);
  if(m=/deprecia a una tasa de ([\d.]+)% por año\. Si la maquinaria nueva cuesta \$(\d[\d,]*(?:\.\d+)?), ¿cuál será su valor después de (\d+) años?\?$/.exec(t)){ let v=D(m[2]); const r=sub(Fr(1),div(D(m[1]),Fr(100))); for(let i=0;i<+m[3];i++) v=mul(v,r); return res(RD(v,2),ej); }
  return null; };
C['interes']=(ej,t)=>{ let m;
  const num=s=>D(s.replace(/\$/g,''));
  if(m=/Halla el interés simple usando la fórmula I = Prt: Principal = \$(\d[\d,]*(?:\.\d+)?), tasa = ([\d.]+)%, tiempo = ([\d.]+) (años?|meses|días)(?: \(usa (\d+) días en un año\))?\.(?: Redondea al centavo más cercano\.)?/.exec(t)){
    const P=num(m[1]), r=div(D(m[2]),Fr(100)); let tm=D(m[3]); tm=m[4]==='meses'?div(tm,Fr(12)):m[4]==='días'?div(tm,Fr(+m[5])):tm; const I=mul(mul(P,r),tm); return res(/Redondea/.test(t)?RD(I,2):I,ej); }
  if(m=/Halla la cantidad \(principal \+ interés\) que se tendrá: Principal = \$(\d[\d,]*(?:\.\d+)?), tasa = ([\d.]+)% de interés simple, tiempo = ([\d.]+) años?\.(?: Redondea al centavo más cercano\.)?/.exec(t)){ const P=num(m[1]), A=add(P,mul(mul(P,div(D(m[2]),Fr(100))),D(m[3]))); return res(/Redondea/.test(t)?RD(A,2):A,ej); }
  if(m=/^¿A qué tasa porcentual \$(\d[\d,]*(?:\.\d+)?) ganarán un interés simple de \$(\d[\d,]*(?:\.\d+)?) en (\d+(?:\.\d+)?) (años|meses)\?$/.exec(t)){ const tm=m[4]==='meses'?div(D(m[3]),Fr(12)):D(m[3]); return res(mul(div(div(num(m[2]),num(m[1])),tm),Fr(100)),ej); }
  if(m=/^(?:Carmen|Arnaldo|Rita) tomó prestados \$(\d[\d,]*(?:\.\d+)?) a un interés simple de ([\d.]+)%\. Después de cierto tiempo devolvió \$(\d[\d,]*(?:\.\d+)?) y saldó la cuenta/.exec(t)){ const P=num(m[1]); return res(div(sub(num(m[3]),P),mul(P,div(D(m[2]),Fr(100)))),ej); }
  if(m=/^Halla (?:la cantidad|el interés compuesto) sobre \$(\d[\d,]*(?:\.\d+)?) por ([\d.]+) años? al ([\d.]+)% compuesto (anual|semestral|trimestral|mensual)\. Redondea al centavo\.$/.exec(t)){
    // exacto con BigInt: P·(1 + i)^períodos sin coma flotante; "interés" = cantidad − P; al centavo (medio hacia arriba)
    const n={anual:1,semestral:2,trimestral:4,mensual:12}[m[4]], P=num(m[1]), per=Math.round(val(D(m[2]))*n), i=div(D(m[3]),Fr(100*n)); let N=BigInt(P.n), Dn=BigInt(P.d); const a=BigInt(i.d+i.n), b=BigInt(i.d); for(let k=0;k<per;k++){ N*=a; Dn*=b; }
    if(/interés compuesto/.test(t)){ N=N*BigInt(P.d)-BigInt(P.n)*Dn; Dn=Dn*BigInt(P.d); }
    const c=(N*200n+Dn)/(2n*Dn), mine=Number(c)/100; return {mine, ok:Math.abs(mine-ej.respuesta)<1e-9}; }
  return null; };
C['ecuaciones-dec']=(ej,t,h)=>{ // sustituye la respuesta en la ecuación: los dos lados tienen que dar lo mismo (no la resuelve: la comprueba)
  const m=/^Resuelve la ecuación(?: para ([a-z]))?(?: y verifica(?: tu| la)? respuesta)?: /.exec(t); if(!m) return null;
  const e=toExpr(h).replace(/(\d),(?=\d{3})/g,'$1').replace(/^.*?(?:respuesta|para [a-z]|ecuación):\s*/,'').replace(/\)\s*([a-z])/g,')*$1').replace(/([a-z])\s*\(/g,'$1*(');
  const letra=(e.match(/[a-z]/)||[])[0]; if(!letra||e.split('=').length!==2) return null;
  const r=ej.respuesta, F=typeof r==='object'?Fr(r.n,r.d):D(String(r)), v='('+F.n+'/'+F.d+')';
  const [L,Rr]=e.split('=').map(x=>x.replace(new RegExp(letra,'g'),v)); const a=parse(L), b=parse(Rr); return {mine:val(a)+' vs '+val(b), ok:eq(a,b)}; };
C['raices-pitagoras']=(ej,t)=>{ let m;
  if(m=/^Determina si el número dado es un cuadrado perfecto: ([\d,]+)$/.exec(t)){ const n=+m[1].replace(/,/g,''), r=Math.round(Math.sqrt(n)), v=r*r===n; return {mine:v, ok:v===ej.respuesta}; }
  if(m=/trío de números representa los lados de un triángulo rectángulo: \((\d+), (\d+), (\d+)\)$/.exec(t)){ const [a,b,c]=[+m[1],+m[2],+m[3]].sort((x,y)=>x-y), v=a*a+b*b===c*c; return {mine:v, ok:v===ej.respuesta}; }
  if(m=/^¿Entre qué dos enteros consecutivos se encuentra √(\d+)\?$/.exec(t)){ const n=+m[1]; let a=Math.floor(Math.sqrt(n)); while(a*a>n) a--; while((a+1)*(a+1)<=n) a++; return {mine:[a,a+1], ok:ej.respuesta.a===a&&ej.respuesta.b===a+1}; }
  if(m=/^Halla el valor de la expresión: (−)?(\()?√(\d+)\)?(\^2)?$/.exec(t)){ const n=+m[3], r=Math.round(Math.sqrt(n)); if(r*r!==n) return null; const v=m[4]?n:(m[1]?-r:r); return {mine:v, ok:v===ej.respuesta}; }
  if(m=/^Estima el valor de la raíz cuadrada a un lugar decimal \(redondea a la décima\): √(\d+)$/.exec(t)){ const n=+m[1]; let k=Math.floor(Math.sqrt(100*n)+0.5); while((2*k-1)**2>400*n) k--; while((2*k+1)**2<=400*n) k++; return {mine:k/10, ok:Math.abs(k/10-ej.respuesta)<1e-9}; }
  return null; };

const NM='(\\d[\\d,]*(?:\\.\\d+)?)';
const RX=(fuente)=>new RegExp(fuente.split('NUM').join(NM));   // NUM = un número del enunciado: 1,174.44 (sin tragarse el punto final de la oración)
C['formulas-dec']=(ej,t)=>{ let m; const tn=t.replace(/−/g,'-');
  const dado=tn.slice(tn.indexOf('dado')+4);   // los datos van DESPUÉS de "dado" (antes está la fórmula, que también tiene "V = …")
  const g=(k)=>{ const q=new RegExp('(?:^|[ ,])'+k+' = (-?\\d[\\d,]*(?:\\.\\d+)?)').exec(dado); return q?D(q[1]):null; };
  if(m=RX('^Usa la fórmula F = 1\\.8C \\+ 32 para hallar la temperatura en (Fahrenheit|Celsius) que corresponde a (-?\\d[\\d.]*)° (?:C|F)\\.$').exec(tn)){ const x=D(m[2]), f=m[1]==='Fahrenheit'?add(mul(D('1.8'),x),Fr(32)):div(sub(x,Fr(32)),D('1.8')); return res(f,ej); }
  if(/^Resuelve para la desconocida\. l = a \+ \(n - 1\)d/.test(tn)){ const n=g('n'), a=g('a'), d=g('d'); return res(add(a,mul(sub(n,Fr(1)),d)),ej); }
  if(/^Resuelve para la desconocida\. S = \[n\/2\]\(a \+ l\); halla S/.test(tn)){ const n=g('n'), a=g('a'), l=g('l'); return res(mul(div(n,Fr(2)),add(a,l)),ej); }
  if(/^Resuelve para la desconocida\. A = P \+ Prt; halla P/.test(tn)){ const A=g('A'), r=g('r'), tt=g('t'); return res(div(A,add(Fr(1),mul(r,tt))),ej); }
  if(/^Resuelve para la desconocida\. V = πr\^2h; halla V/.test(tn)){ const r=g('r'), hh=g('h'), pi=g('π'); return res(RD(mul(mul(pi,mul(r,r)),hh),2),ej); }
  if(/^Resuelve para la desconocida\. V = 3\.14r\^2h; halla h/.test(tn)){ const V=g('V'), r=g('r'); return res(RD(div(V,mul(D('3.14'),mul(r,r))),2),ej); }
  if(/^Resuelve para la desconocida\. A = \[1\/2\]h\(b \+ c\); halla h/.test(tn)){ const A=g('A'), b=g('b'), c=g('c'); return res(div(mul(A,Fr(2)),add(b,c)),ej); }
  return null; };
C['comercial-dec']=(ej,t)=>{ let m; const P=s=>D(s), pc=s=>div(D(s),Fr(100));
  const c2=f=>RD(f,2), ceil2=f=>{ const x=mul(f,Fr(100)), q=Math.ceil(x.n/x.d); return Fr(q,100); };
  if(m=RX('^Un artículo que cuesta \\$NUM tiene un margen de ganancia de NUM% basado en el costo\\. ¿Cuál es su precio de venta\\?$').exec(t)) return res(c2(mul(P(m[1]),add(Fr(1),pc(m[2])))),ej);
  if(m=RX('^Halla el precio de venta de una lavadora listada en \\$NUM y vendida con un descuento de NUM%\\.$').exec(t)) return res(c2(mul(P(m[1]),sub(Fr(1),pc(m[2])))),ej);
  if(m=RX('^Una tienda anunció un descuento de NUM% en todo\\. Halla el precio marcado de una camisa si se vende en \\$NUM\\.$').exec(t)) return res(c2(div(P(m[2]),sub(Fr(1),pc(m[1])))),ej);
  if(m=RX('^Compraste (?:un artículo de|artículos de) (.+?)\\. El impuesto de venta es NUM%\\. ¿Cuál es el costo total\\? \\(El impuesto se redondea al centavo mayor\\.\\)$').exec(t)){ const sub_=m[1].split(/, /).map(s=>P(s.replace('$',''))).reduce(add), imp=ceil2(mul(sub_,pc(m[2]))); return res(add(sub_,imp),ej); }
  if(m=RX('^Halla el precio de un escritorio listado en \\$NUM y vendido con descuentos sucesivos de NUM% y NUM%\\.$').exec(t)) return res(c2(mul(mul(P(m[1]),sub(Fr(1),pc(m[2]))),sub(Fr(1),pc(m[3])))),ej);
  if(m=RX('^A un artículo que le cuesta al dueño de una tienda \\$NUM se le suma un margen de ganancia de \\$NUM\\. ¿Cuál es el porciento de margen de ganancia basado en el (costo|precio de venta)\\? Redondea a la décima de porciento\\.$').exec(t)){ const c=P(m[1]), g_=P(m[2]); const base=m[3]==='costo'?c:add(c,g_); return res(RD(mul(div(g_,base),Fr(100)),1),ej); }
  if(m=RX('^Una cámara está a la venta en \\$NUM\\. Si el margen de ganancia es NUM% del precio de venta, ¿cuál es el costo de la cámara\\?$').exec(t)) return res(c2(mul(P(m[1]),sub(Fr(1),pc(m[2])))),ej);
  if(m=RX('tiene un salario semanal de \\$NUM más NUM% de comisión en las ventas(?: sobre \\$NUM)?\\. Halla su ingreso de la semana si sus ventas fueron \\$NUM\\.$').exec(t)){ const base=m[3]?P(m[3]):Fr(0); return res(add(P(m[1]),mul(pc(m[2]),sub(P(m[4]),base))),ej); }
  if(m=RX('^Una casa se compró por \\$NUM y se vendió por \\$NUM\\. ¿Cuál es el porciento de ganancia\\?$').exec(t)){ const a=P(m[1]); return res(mul(div(sub(P(m[2]),a),a),Fr(100)),ej); }
  return null; };
C['compras-grandes']=(ej,t)=>{ let m; const P=s=>D(s), pc=s=>div(D(s),Fr(100));
  const arr=(mine)=>({mine, ok:Array.isArray(ej.respuesta)&&ej.respuesta.length===mine.length&&mine.every((v,i)=>Math.abs(v-ej.respuesta[i])<0.005)});
  if(m=RX('^Carla desea comprar un automóvil valorado en \\$NUM\\. Su cooperativa le presta el NUM% del costo\\. Tiene que pagar un impuesto de ventas del NUM% y un cargo de licencia de \\$NUM\\. ¿Cuánto dinero en efectivo necesita\\?$').exec(t)){ const p=P(m[1]); return res(add(add(sub(p,mul(p,pc(m[2]))),mul(p,pc(m[3]))),P(m[4])),ej); }
  if(m=RX('^Hace cinco años Juan compró una casa valorada en \\$NUM\\. Cuando la vendió este año, la propiedad había apreciado un NUM% del valor de compra\\. ¿Cuál fue su ganancia en la venta\\?$').exec(t)) return res(mul(P(m[1]),pc(m[2])),ej);
  if(m=RX('^Un automóvil que cuesta \\$NUM al contado se vendió con un pronto pago de \\$NUM\\. El resto será pagado en (\\d+) meses con un cargo anual de NUM%\\. Halla \\(a\\) el cargo por financiamiento; \\(b\\) el pago mensual\\.$').exec(t)){
    const resto=sub(P(m[1]),P(m[2])), cargo=mul(mul(resto,pc(m[4])),div(Fr(+m[3]),Fr(12))), mensual=RD(div(add(resto,cargo),Fr(+m[3])),2); return arr([val(cargo),val(mensual)]); }
  if(m=RX('^Una casa se vendió en \\$NUM\\. El comprador tiene que dar un pronto pago del NUM% del precio de venta, pagar un cargo de préstamo de NUM% de la hipoteca, \\$NUM por el seguro contra incendios, \\$NUM por los cargos de registro, \\$NUM por los impuestos y \\$NUM por honorarios legales\\. Halla \\(a\\) el pronto pago, \\(b\\) la hipoteca y \\(c\\) el efectivo que necesita\\.$').exec(t)){
    const precio=P(m[1]), pronto=mul(precio,pc(m[2])), hip=sub(precio,pronto), cargo=mul(hip,pc(m[3])), efectivo=[pronto,cargo,P(m[4]),P(m[5]),P(m[6]),P(m[7])].reduce(add); return arr([val(pronto),val(hip),val(efectivo)]); }
  return null; };
// la propina con la Regla Especial del libro: se redondea la cuenta al dólar, el 10% (÷ 10) más su mitad (el 5%) = el 15% de esa cuenta redondeada
{ const f0=C['comercial-dec']; C['comercial-dec']=(ej,t,h)=>{ const m=RX('^Usa la Regla Especial para calcular una propina de 15%: la cuenta es de \\$NUM incluyendo el impuesto\\. ¿De cuánto será la propina\\?$').exec(t.replace(/\s+([.,?:;!)%])/g,'$1'));
  if(!m) return f0(ej,t,h); return res(mul(RD(D(m[1]),0),D('0.15')),ej); }; }
// diferencia entre el interés compuesto anual y el simple: P·((1+r)^n − 1) − P·r·n, exacto con BigInt y al centavo
{ const f0=C['interes']; C['interes']=(ej,t,h)=>{ const m=RX('^Halla la diferencia entre el interés compuesto anual y el interés simple sobre \\$NUM por (\\d+) años al NUM% por año\\.$').exec(t.replace(/\s+([.,?:;!)%])/g,'$1'));
  if(!m) return f0(ej,t,h); const P=D(m[1]), n=+m[2], r=div(D(m[3]),Fr(100));
  let N=BigInt(P.n), Dn=BigInt(P.d); const a=BigInt(r.d+r.n), b=BigInt(r.d); for(let k=0;k<n;k++){ N*=a; Dn*=b; }
  // compuesto − principal − simple, todo sobre Dn·P.d·r.d
  const simple=mul(mul(P,r),Fr(n)), num=N*BigInt(P.d)-BigInt(P.n)*Dn;   // (compuesto − P) = num / (Dn·P.d)
  const den=Dn*BigInt(P.d), sN=BigInt(simple.n), sD=BigInt(simple.d), X=num*sD-sN*den, Y=den*sD;   // X / Y
  const c=(X*200n+Y)/(2n*Y), mine=Number(c)/100; return {mine, ok:Math.abs(mine-ej.respuesta)<1e-9}; }; }
// clean() deja espacios sueltos ("Resta 58.4 de 253.58 ." / "para x : [1/5]" / "$ 125.66" / "12 %"): se acomodan antes de leer cada enunciado
['dec-palabras','dec-redondear','dec-comparar','suma-resta-dec','mult-div-dec','dec-fraccion','orden-op-dec','promedio-dec','porciento-conv','porciento-formula','interes','ecuaciones-dec','raices-pitagoras','formulas-dec','comercial-dec','compras-grandes'].forEach(id=>{
  const f=C[id]; C[id]=(ej,t,h)=>f(ej,t.replace(/\s+([.,?:;!)%])/g,'$1').replace(/([(¿¡$])\s+/g,'$1'),h); });

C['aplicaciones-dec']=(ej,t)=>{ let m; const P=s=>D(s.replace('$','')), pc=s=>div(D(s),Fr(100)), c2=f=>RD(f,2);
  t=t.replace(/\s+([.,?:;!)%])/g,'$1').replace(/([(¿¡$])\s+/g,'$1');
  const par=(mine)=>({mine, ok:Array.isArray(ej.respuesta)&&ej.respuesta.length===mine.length&&mine.every((v,i)=>Math.abs(v-ej.respuesta[i])<0.005)});
  if(m=RX('^En un mapa, 1 pulgada representa NUM millas\\. La distancia entre dos ciudades en el mapa es NUM pulgadas\\. ¿Cuántas millas hay entre las ciudades\\?$').exec(t)) return res(mul(P(m[1]),P(m[2])),ej);
  if(m=RX('^Halla el NUM% de \\$NUM\\.( Redondea al centavo\\.)?$').exec(t)){ const f=mul(pc(m[1]),P(m[2])); return res(m[3]?c2(f):f,ej); }
  if(m=RX('^El costo total (?:de|del) (.+?) y (?:de|del) (.+?) es \\$NUM\\. Si (.+?) cuesta \\$NUM menos que (.+?), ¿cuál es el costo de cada uno\\?$').exec(t)){ const T=P(m[3]), d=P(m[5]); return par([val(c2(div(sub(T,d),Fr(2)))),val(c2(div(add(T,d),Fr(2))))]); }
  if(m=RX('^Si (?:los|las|el|la) .+? cuest(?:an|a) \\$NUM la libra, ¿cuántas libras se pueden comprar con \\$NUM\\? Redondea a la centésima\\.$').exec(t)) return res(RD(div(P(m[2]),P(m[1])),2),ej);
  if(m=RX('^¿Cuál es la mejor compra para (.+?): NUM onzas por \\$NUM ó NUM onzas por \\$NUM\\?$').exec(t)){ const a=div(P(m[3]),P(m[2])), b=div(P(m[5]),P(m[4])), mejor=a.n*b.d<b.n*a.d?m[2]+' onzas por $'+m[3]:m[4]+' onzas por $'+m[5]; return {mine:mejor, ok:mejor===ej.respuesta}; }
  if(m=RX('^Si NUM .+? cuestan \\$NUM, ¿cuál es el costo por .+?\\? Redondea al centavo más cercano\\.$').exec(t)) return res(c2(div(P(m[2]),P(m[1]))),ej);
  if(m=RX('recorrió NUM millas en NUM horas\\. ¿Cuál fue su velocidad promedio en millas por hora\\? Redondea a la décima\\.$').exec(t)) return res(RD(div(P(m[1]),P(m[2])),1),ej);
  if(m=RX('vendió camisetas a \\$NUM cada una en una feria\\. ¿Cuánto ganó por la venta de (\\d+) camisetas, si cada una le costó \\$NUM y pagó \\$NUM por la renta del kiosco\\?$').exec(t)) return res(sub(mul(sub(P(m[1]),P(m[3])),Fr(+m[2])),P(m[4])),ej);
  if(m=RX('^[^\\s]+ tenía \\$NUM en su cuenta de cheques\\. Escribió cheques por (.+?)\\. Luego hizo un depósito de \\$NUM\\. ¿Cuál es el balance en la cuenta\\?$').exec(t)){ const cheques=m[2].split(/, /).map(P).reduce(add); return res(add(sub(P(m[1]),cheques),P(m[3])),ej); }
  if(m=RX('^Antes de las deducciones, el ingreso bruto mensual de [^\\s]+ es \\$NUM\\. Sus deducciones fueron: (.+?)\\. Halla el pago neto').exec(t)){ const ded=[...m[2].matchAll(/\$(\d[\d,]*(?:\.\d+)?)/g)].map(q=>P(q[1])); return res(ded.reduce(sub,P(m[1])),ej); }
  return null; };

// ── Circuitos Eléctricos (ETRE 160): con los datos del enunciado se calcula todo (Rt, It, Vt, V / I / P de cada resistor) y cada casilla se compara por su etiqueta ──
// (coma flotante normal: las respuestas del curso van redondeadas y se aceptan con ~1 % de margen)
const PREF={k:1e3,K:1e3,M:1e6,m:1e-3,'µ':1e-6,u:1e-6,'':1};
const unidades=t=>[...t.matchAll(/(\d+(?:\.\d+)?)\s*([kKMmµu]?)\s*(Ω|V|A|w|W)(?![a-zA-Z])/g)].map(q=>({v:+q[1]*PREF[q[2]], u:q[3]==='w'?'W':q[3]}));
const casiIgual=(mine,resp)=>Math.abs(mine-resp)<=Math.max(1e-12,0.011*Math.abs(mine));
const resCirc=(ej,mine,etiqs)=>{ const malos=[]; (etiqs||[0]).forEach((e,i)=>{ if(mine[i]==null||!casiIgual(mine[i],ej.respuesta[i])) malos.push((typeof e==='string'?e:i)+': app='+ej.respuesta[i]+' mío='+(mine[i]==null?'?':+mine[i].toPrecision(5))); }); return {mine:mine.map(x=>x==null?null:+x.toPrecision(5)), ok:malos.length===0&&mine.length===ej.respuesta.length, msg:malos.join('; ')}; };
C['circ-resistividad']=(ej,t)=>{ const m=/resistencia de (\d+) pies de cable .*Dato de la tabla 8: AWG #\d+ = (\d+(?:\.\d+)?) Ω por cada 1000 ft/.exec(t); if(!m) return null; return resCirc(ej,[+m[1]*+m[2]/1000]); };
C['circ-ley-ohm']=(ej,t)=>{ let m;
  const pares=[...t.matchAll(/R\d = (\d+(?:\.\d+)?)\s*([kKMmµu]?)Ω con I = (\d+(?:\.\d+)?)\s*([kKMmµu]?)A/g)];
  if(pares.length){ return resCirc(ej,pares.map(q=>(+q[1]*PREF[q[2]])*(+q[3]*PREF[q[4]])),ej.campos.map(c=>c.et)); }
  const u=unidades(t.replace(/\[dibujo\]/g,'')), V=u.find(x=>x.u==='V'), A=u.find(x=>x.u==='A'), R=u.find(x=>x.u==='Ω');
  if(/I = \?/.test(t)&&V&&R) return resCirc(ej,[V.v/R.v]);
  if(/R = \?/.test(t)&&V&&A) return resCirc(ej,[V.v/A.v]);
  if(/Vs = \?/.test(t)&&A&&R) return resCirc(ej,[A.v*R.v]);
  return null; };
C['circ-ley-watt']=(ej,t)=>{ const u=unidades(t.replace(/\[dibujo\]/g,'')), V=u.find(x=>x.u==='V'), A=u.find(x=>x.u==='A'), R=u.find(x=>x.u==='Ω'), W=u.find(x=>x.u==='W');
  if(/Determine (?:la (?:cantidad de )?)?potencia/.test(t)){ if(V&&A) return resCirc(ej,[V.v*A.v]); if(A&&R) return resCirc(ej,[A.v*A.v*R.v]); if(V&&R) return resCirc(ej,[V.v*V.v/R.v]); }
  if(/Cual es la corriente/.test(t)){ if(W&&R) return resCirc(ej,[Math.sqrt(W.v/R.v)]); if(W&&V) return resCirc(ej,[W.v/V.v]); }
  return null; };
// serie y paralelo: se calcula todo y cada casilla busca su etiqueta (Rtotal, Itotal, Vtotal, VR1, IR2, PR3, PT / Ptotal)
function circuito(t,paralelo){ const dat=t.replace(/^.*?⏎/,'')===t?t:t;   // el enunciado entero: los nombres de abajo ("Rtotal", "VR1") no llevan "="
  const R=[...dat.matchAll(/\bR(\d) = (\d+(?:\.\d+)?)\s*([kKMmµu]?)Ω/g)].map(q=>({n:q[1],v:+q[2]*PREF[q[3]]})); if(!R.length) return null;
  const V=/\b(?:V|Vt|VT|E) = (\d+(?:\.\d+)?)\s*([kKMmµu]?)V/.exec(dat), I=/\b(?:I|IT|It) = (\d+(?:\.\d+)?)\s*([kKMmµu]?)A/.exec(dat);
  const Rt=paralelo?1/R.reduce((a,r)=>a+1/r.v,0):R.reduce((a,r)=>a+r.v,0); let Vt, It;
  if(V){ Vt=+V[1]*PREF[V[2]]; It=Vt/Rt; } else if(I){ It=+I[1]*PREF[I[2]]; Vt=It*Rt; } else return null;
  const q={Rtotal:Rt, Rt:Rt, Itotal:It, Vtotal:Vt, PT:Vt*It, Ptotal:Vt*It};
  R.forEach(r=>{ if(paralelo){ q['IR'+r.n]=Vt/r.v; q['PR'+r.n]=Vt*Vt/r.v; q['VR'+r.n]=Vt; } else { q['VR'+r.n]=It*r.v; q['IR'+r.n]=It; q['PR'+r.n]=It*It*r.v; } });
  return q; }
const circGen=(paralelo)=>(ej,t)=>{ const sinDib=t.replace(/\[dibujo\]/g,'').replace(/\b([IVRP]) (T|t|total|R\d)\b/g,'$1$2');   // clean() deja "I T" / "V R1" donde el enunciado tiene subíndices
  let m; if(m=/resistencias de ([\d.]+)Ω, ([\d.]+)Ω, ([\d.]+)Ω, ([\d.]+)Ω y R/.exec(sinDib)){ const u=unidades(sinDib.replace(/resistencias de.*$/,'')), V=u.find(x=>x.u==='V'), A=u.find(x=>x.u==='A'); if(!V||!A) return null; const Rt=V.v/A.v; return resCirc(ej,[Rt,Rt-(+m[1]+ +m[2]+ +m[3]+ +m[4])],['Rt','R']); }
  const q=circuito(sinDib,paralelo); if(!q) return null;
  const etiqs=ej.campos.map(c=>c.et.replace(/<sub>(.*?)<\/sub>/g,'$1')); const mine=etiqs.map(e=>q[e]);
  return resCirc(ej,mine,etiqs); };
C['circ-serie']=circGen(false);
C['circ-paralelo']=circGen(true);
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
