# CLAUDE.md — Mate (práctica de matemáticas)

## Qué es

App de práctica de matemáticas en español (capítulos 1-3 de un curso de álgebra: signos,
orden de operaciones, álgebra básica, geometría, divisibilidad, MCM/MCD, fracciones,
razones). Genera ejercicios al azar, verifica la respuesta y siempre explica el porqué
paso a paso. Un solo archivo HTML, sin build, sin npm, publicado como PWA en GitHub Pages
con sincronización opcional entre aparatos vía Firebase.

- **Repo:** https://github.com/yahairaarroyo2-alt/Mate
- **App en vivo:** https://yahairaarroyo2-alt.github.io/Mate/
- **Firebase (solo para la sincronización):** proyecto `mate-practica-matematicas`,
  consola en https://console.firebase.google.com/project/mate-practica-matematicas

## Archivos

```
Mate/
├── index.html      # todo: HTML + CSS + JS (~2000 líneas)
├── manifest.json   # PWA manifest
├── sw.js           # Service Worker — sube el número de versión (mate-vN) en cada deploy
├── icons/          # 4 íconos PWA (generados con un <canvas>, sin herramienta externa)
└── CLAUDE.md        # este archivo
```

## Cómo probar / desplegar

- Abrir `index.html?test` corre `autotest()`: 200 tiradas × 3 niveles × cada uno de los
  25 módulos, más casos borde de `verificar()` y de `analizarTexto()`. Debe decir "Las 107
  comprobaciones PASAN".
- `node --check index.html` no sirve directo (es HTML) — hay que extraer el `<script>` a un
  `.js` primero. El autotest de arriba ya cubre errores de sintaxis igual.
- Deploy: `git push` a `main` — GitHub Pages redespliega solo en 1-2 minutos. **Subir
  siempre el número de `sw.js` (`mate-vN` → `mate-vN+1`)** en cada cambio, si no el
  Service Worker sigue sirviendo la versión vieja desde caché.

## Arquitectura del motor de ejercicios

Cada uno de los 25 módulos en el arreglo `MODULOS` tiene la misma forma:

```js
{ id:'divisibilidad', nombre:'Divisibilidad', secciones:['3.1'],
  gen(nivel) {
    return { enunciado, tipo, respuesta, explicacion: [...] };
  }
}
```

La `explicacion` sale de las MISMAS variables que calculan la `respuesta` — nunca se
pueden desincronizar porque no hay dos fuentes. Al agregar un módulo nuevo, seguir ese
patrón: la explicación debe definir los términos que usa y mostrar el razonamiento, no
solo el paso mecánico (fue el pedido explícito de la usuaria — "como si no supiera nada").

Los `tipo` de entrada (7): `sino`, `cmp`, `opciones`, `num`, `texto`, `frac`, `mixto`,
`orden`. `entradaHTML()` decide qué pintar según el tipo; `verificar()` decide si la
respuesta es correcta, para los 7 sin excepción. Si se agrega un módulo, casi seguro
reutiliza uno de estos — no crear un tipo nuevo sin necesidad real.

## Modos de práctica

Todos pasan por `responder()`, que se ramifica según el modo activo:

- **Normal:** ronda de `SESION_TOTAL` (10) ejercicios que se reinicia sola; guarda en
  `mate_sesion_v1` para retomar exacto donde quedaste al cerrar/reabrir la app.
- **Examen** (`examen` no-null): 10 preguntas, 10 minutos, sin "Saltar" ni "Ver
  explicación", sin feedback por pregunta — todo se revela en la pantalla de resultado al
  final. No cuenta para `stats` ni para el historial (es una prueba, no práctica).
- **Repasar errores** (`modoErrores`): cicla la lista `errores` (últimos 30 fallos
  reales, más reciente primero); si aciertas se quita de la lista.

**Trampa importante:** `mostrarFb()` decide el `onclick` del botón "Siguiente ejercicio"
según `modoErrores` — si se agrega un cuarto modo, hay que tocar ese `sigOnclick` también.

## localStorage — todas las claves (prefijo `mate_`)

| Clave | Contenido |
|---|---|
| `mate_nivel_v1` | `'facil'` / `'medio'` / `'dificil'` |
| `mate_clase_v1` | `{ etiqueta, mods:[] }` — mezcla personalizada / detectada del material de clase |
| `mate_stats_v1` | `{ modId: {ok, fallo} }` |
| `mate_racha_v1` | `{ actual, mejor }` — racha de aciertos seguidos |
| `mate_racha_dias_v1` | `{ actual, mejor, ultimoDia }` — racha de *días* practicados (distinta de la de arriba) |
| `mate_historial_v1` | `{ "YYYY-MM-DD": cantidad }` — para el heatmap de "Últimos 14 días" |
| `mate_errores_v1` | `[{modId, ej}]`, tope 30, más reciente primero |
| `mate_sesion_v1` | snapshot del ejercicio actual, para retomar donde quedaste (no se sincroniza entre aparatos — a propósito) |
| `mate_sync_code_v1` | el código de sincronización de ESTE aparato, si está conectado |

Al agregar una clave nueva: prefijo `mate_`, y si es algo que debe viajar entre aparatos,
agregarla también a `conectarSync()`/`_escucharSync()` (ver abajo) y a
`exportarRespaldo()` (esa ya recorre todo lo que empiece con `mate_` solo, no hace falta
tocarla).

## Sincronización entre aparatos (Firebase)

Sin login: dos aparatos se enlazan con un código de 12 caracteres que uno genera y el
otro escribe. El `id` del documento en Firestore es el hash SHA-256 del código — la
protección es que sin el código no se puede adivinar qué documento pedir (las reglas de
Firestore permiten leer/escribir cualquier `syncs/{id}` sin más). Ver reglas actuales en
la consola de Firebase, pestaña "Reglas" de Firestore.

**Qué sincroniza y cómo:**
- `stats` — con `firebase.firestore.FieldValue.increment()`, nunca con el valor absoluto.
  Así, dos aparatos respondiendo casi a la vez se SUMAN en vez de pisarse. Las escrituras
  se juntan ~4 segundos (`_syncPendiente`/`_flushSync`) para no despertar la radio del
  teléfono en cada respuesta.
- `racha`, `nivel`, `clase` — última escritura gana (tiene sentido para preferencias y
  para una racha, que es inherentemente secuencial).
- `mate_sesion_v1` (el ejercicio en curso) — **nunca se sincroniza**, a propósito: no
  tendría sentido que el teléfono salte al ejercicio exacto donde iba la computadora.

**Trampa ya arreglada una vez, no repetirla:** cuando el listener (`_escucharSync`) recibe
`d.stats` de Firestore, cada módulo puede venir con solo `ok` O solo `fallo` (Firestore
solo guarda el campo que se incrementó) — si se copia tal cual a `stats` local, `pct()`
calcula `NaN` para esos módulos. El listener normaliza (`ok:d.stats[id].ok||0`) antes de
asignar; si se toca ese código, mantener la normalización.

El listener se suelta cuando la pestaña pasa a segundo plano (`visibilitychange`) y se
vuelve a enganchar al regresar — antes se quedaba escuchando para siempre, gastando
batería/radio innecesariamente.

`_pantallaActual` guarda qué pantalla-función repintar si llega un cambio remoto mientras
la estás mirando (solo Inicio y Progreso; la pantalla de práctica nunca se auto-repinta,
para no interrumpir un ejercicio a medias).

## CSS — variables de color

Dos roles que NO deben mezclarse (fue un bug real, ver commit del modo oscuro):
- `--azul` / `--azul2` / `--blanco` = colores de **fondo de marca** (header, `.enunciado`,
  chip seleccionado) y de **texto claro sobre esos fondos** — no cambian entre modo claro/oscuro.
- `--superficie` = fondo de tarjeta/chip/input (blanco en claro, azul muy oscuro en oscuro).
- `--titulo` / `--titulo2` = color de texto de h2/h3/chip-no-seleccionado/etc. sobre esa
  superficie (azul oscuro en claro, azul clarito en oscuro).

Si algo nuevo muestra texto DENTRO de una `.card`, usar `--titulo`/`--titulo2`/`--texto`,
nunca `--azul`/`--azul2` directo — si no, se vuelve ilegible en modo oscuro.

El modo oscuro es automático (`prefers-color-scheme`), sin botón ni preferencia guardada
— sigue el sistema operativo del aparato.

## Convenciones

- Español, tono directo y alentador, sin emoji decorativo salvo 🔥 (racha) — mismo criterio
  que las apps hermanas Fit-F/Fit-M.
- Antes de cualquier cambio grande: confirmar que `git status` está limpio o hacer un
  respaldo del archivo — este proyecto no tiene red de seguridad más que git.
- Después de editar el `<script>`: extraerlo y correr `node --check`, y volver a correr
  `index.html?test` — las 107 comprobaciones tienen que seguir pasando.
