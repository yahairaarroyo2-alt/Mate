# CLAUDE.md — Mate (práctica de matemáticas)

## Qué es

App de práctica en español con 4 materias (`MATERIAS`): **Álgebra** (MAGS 120I, caps. 1-8 y las
prácticas EXACTAS del Examen Departamental), **World Culture I**, **Circuitos Eléctricos** y **Repaso de
ayudante** (examen de Ayudante de Perito Electricista). 135 temas (Álgebra 93, World Culture 19, Circuitos 7, Ayudante 16). Genera ejercicios (o los saca de bancos
fijos), verifica la respuesta y siempre explica el porqué paso a paso. Dos archivos (`index.html` = HTML + CSS, `app.js` = todo el JavaScript), sin build, sin npm, publicado como PWA en GitHub Pages
con sincronización opcional entre aparatos vía Firebase.

- **Repo:** https://github.com/yahairaarroyo2-alt/Mate
- **App en vivo:** https://yahairaarroyo2-alt.github.io/Mate/
- **Firebase (solo para la sincronización):** proyecto `mate-practica-matematicas`,
  consola en https://console.firebase.google.com/project/mate-practica-matematicas

## Archivos

```
Mate/
├── index.html      # HTML + CSS (~47 KB) y una sola línea <script src="app.js?v=N">
├── app.js          # TODO el JavaScript (~1.5 MB, ~13,400 líneas: casi todo son bancos de preguntas y explicaciones). Antes iba dentro de index.html;
│                   # en un archivo aparte Chrome guarda el código ya compilado y no lo vuelve a analizar en cada apertura (2026-10-21)
├── manifest.json   # PWA manifest
├── sw.js           # Service Worker — sube el número de versión (mate-vN) en cada deploy
├── icons/          # 4 íconos PWA (generados con un <canvas>, sin herramienta externa)
├── ayudante/       # 184 fotos de Repaso de ayudante, en WebP (~1.3 MB; eran PNG/JPG de 6 MB)
├── verificar-respuestas.js  # verificador independiente: recalcula las respuestas con su propia cuenta (se corre en la consola, ver su encabezado; cubre caps. 1-8 y Circuitos, ver "Auditoría 2026-10-29")
└── CLAUDE.md        # este archivo
```

## Cómo probar / desplegar

- Abrir `index.html?test` corre `autotest()`: 200 tiradas × 3 niveles × cada uno de los
  135 módulos (494 comprobaciones en 2026-10-29), más casos borde de `verificar()`/`analizarTexto()`, validez geométrica
  (triángulos/trapecios generados), unicidad (MCM de un número consigo mismo), fechas
  locales (`fechaLocal`/`fechaHaceDias`), caducidad de la racha de días y deduplicado de
  `_registrarError` — el número exacto de comprobaciones lo dice el propio resultado (no
  lo hardcodees en la doc, sumó ~14 en la auditoría de 2026-09-16 respecto a las 107 de antes).
- Sintaxis: `node --check app.js` y `node --check sw.js` (el JavaScript ya no va dentro del HTML). El autotest de arriba ya cubre errores de sintaxis igual.
- Deploy: `git push` a `main` — GitHub Pages redespliega solo en 1-2 minutos. **Subir
  siempre el número de `sw.js` (`mate-vN` → `mate-vN+1`) Y el MISMO número en `<script src="app.js?v=N">` de `index.html`** en cada cambio
  (`sw.js` precachea `./app.js?v=N` a partir de `CACHE`): si no, el Service Worker sigue sirviendo la versión vieja desde caché o la página nueva corre con el JavaScript viejo.
  Si `app.js` o `index.html` no se pueden guardar al instalar, la instalación falla y se queda la versión anterior completa.
- Para probar en local (el navegador del panel no abre `file://`): un servidor estático chico (Node, `http.createServer`) en una carpeta `.claude/` temporal con su `launch.json`;
  **antes de cada recarga** hay que desregistrar el Service Worker y borrar las cachés (si no, sirve la versión vieja, incluso con `?test`), y al terminar borrar `.claude/`.

## Arquitectura del motor de ejercicios

Cada módulo del arreglo `MODULOS` tiene la misma forma:

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

**Línea `TRUCO:` — obligatoria.** Toda explicación termina con una línea que empieza con
`TRUCO: ` y da el atajo para resolver ese ejercicio más rápido la próxima vez (no un
resumen de los pasos: el camino corto, la regla mnemotécnica o la comprobación que evita
rehacer la cuenta). Y **siempre cierra con un ejemplo concreto** ("Ejemplo: ...", "Otro
ejemplo: ..."), con números, no en abstracto — también fue pedido explícito.

`explPasos()` saca esa línea de la lista numerada y YA NO la pinta (el recuadro `.truco` se quitó el
2026-10-25 a pedido de la usuaria: sin recuadros; el atajo va como PASO en la versión Fácil, ver el final de este archivo). La línea sigue siendo obligatoria: el autotest la exige y sale en el repaso. El
autotest verifica que exista: si algún `return` de un `gen()` se queda sin línea `TRUCO:`,
ese módulo FALLA (contador `sinTruco`).

Los `tipo` de entrada (12): `sino`, `cmp`, `opciones`, `num`, `texto`, `frac`, `mixto`,
`orden`, `multi` (varias casillas), `angulo2`, `basexp` (base/exponente/valor) y `coefvar` (coeficiente/variable). `entradaHTML()` decide qué pintar según el tipo; `verificar()` decide si la
respuesta es correcta, para los 12 sin excepción. Si se agrega un módulo, casi seguro
reutiliza uno de estos — no crear un tipo nuevo sin necesidad real.
`inputmode` del tipo `num` es `"decimal"`, no `"numeric"` — varios módulos (promedio,
círculo) dan respuesta con decimales, y `"numeric"` no muestra el punto en iOS.

**Ayudas:** el botón "Pista" ya NO existe. `verExplicacion()` muestra todo "Por qué" y marca `vioExpl`
(esa respuesta no cuenta en las estadísticas); pedir ayuda a la IA antes de contestar cuenta igual (y desde 2026-10-29 también marca la página como vista, `sesionVistos`/`sesionRes`, igual que "Ver explicación": antes, ir a otra página con "Pág." y volver la volvía a contar).
**"↺ Reiniciar"** (`reiniciarEjercicio`) lo deja desde cero (respuesta, explicación y Tu
proceso); si ya lo habías contestado o visto la explicación, el intento nuevo no cuenta otra vez (`_reintento`).
Desde 2026-10-21 va en UNA fila con Saltar y Ver explicación (`#accionesPre`, `.row.tres`: sin salto de línea, así que
en teléfono "Ver explicación" cae en 2 renglones); al contestar la fila se esconde y el feedback trae su propio Reiniciar.
**"Tu proceso"** arranca OCULTO (`procesoHTML`): solo sale abierto si ya hay texto (borrador o proceso de un intento
anterior). **Los avisos `ayuda` ya no se dibujan** bajo la casilla (`entradaHTML`, tipos num/texto/frac, 2026-10-21): la
propiedad `ayuda` sigue en los datos (`uno5`/`uiR`) pero nadie la lee; si hay que volver a mostrarla, es en esos tres `case`.

## Modos de práctica

Todos pasan por `responder()`, que se ramifica según el modo activo:

- **Normal:** el tamaño de la ronda depende de si estás mezclando o en un tema fijo.
  - **Tema fijo** (`esTemaFijo`, ej. practicar solo "Divisibilidad"): ronda de
    `SESION_TEMA` (20) ejercicios de ese único módulo.
  - **Mezcla** (todos los temas, un capítulo, o una selección personalizada): la ronda
    garantiza `VECES_POR_TEMA` (2) apariciones de CADA tema activo — `construirCola()`
    arma un array con cada id de módulo repetido 2 veces y lo mezcla (`shuffle`); el
    tamaño de la ronda (`sesionTotal`) es simplemente `sesionCola.length`. Así, mezclar
    los 25 temas da una ronda de 50, un capítulo de 4 temas da 8, etc. — nunca queda un
    tema activo sin practicar en la ronda, ni tampoco se repite desparejo (nada de "3 de
    divisibilidad, 0 de MCD" como podía pasar con el sorteo puramente al azar de antes).
  - En los dos casos, al llegar al final se PARA de verdad — `pantallaRondaCompleta()`
    muestra el resumen (aciertos/total) y ofrece "Seguir practicando" (misma mezcla o
    tema, ronda nueva) o "Volver a inicio"; ya no se reinicia sola en silencio. El límite
    se aplica dentro de `nuevoEjercicio()`: si `continuar` es true y
    `sesionHechos >= sesionTotal`, corta ahí en vez de generar el siguiente ejercicio.
  - Los botones que arrancan una mezcla ("Empezar a practicar", "Mezcla del capítulo N",
    "Practicar esta mezcla") muestran el total de antemano con `tamanoMezcla(ms)` — así
    no hay que entrar a descubrirlo. En "Elegir temas", ese contador se actualiza en vivo
    al marcar/desmarcar checkboxes (`toggleMod()` escribe directo en `#ctaMezclaCount`,
    sin repintar toda la pantalla).
  - Guarda en `mate_sesion_v1` (incluye `sesionCorrectos`, `sesionCola`, `sesionPendientes`,
    `sesionTotal`) para retomar exacto donde quedaste al cerrar/reabrir la app.
  - Dos ajustes, guardados en `mate_agrupar_v1`/`mate_repetir_v1`, con su propio botón
    (no chip) en la fila de estadísticas de la pantalla de práctica — reemplazan los
    tiles de "mejor racha" y "en este tema" (ese dato sigue disponible en "Mi progreso" y
    en la lista de temas de Inicio, así que no se perdió, solo se movió):
    - **Agrupar por tema** (`agruparTema`): cambia cómo arma la mezcla `construirCola()` —
      agrupado, las `VECES_POR_TEMA` repeticiones de cada tema salen juntas seguidas
      (se mezcla el ORDEN de los temas, no las repeticiones sueltas); sin agrupar
      (por defecto), se mezclan todas las repeticiones sueltas y pueden salir intercaladas.
    - **Repetir si fallo** (`repetirFallo`): si fallás una pregunta (y no la viste con
      "Ver explicación"), `_programarRepeticion()` la agenda en `sesionPendientes` con
      un `esperar` al azar (`R(2,4)`) — vuelve a salir IGUAL (mismo enunciado y números,
      no uno nuevo del mismo tema) más adelante en la ronda, nunca la pregunta
      inmediata siguiente, y `sesionTotal++` para que la ronda le haga espacio.
      `nuevoEjercicio()` primero descuenta `esperar` a los pendientes y sirve el que
      llegue a 0 antes de tocar `sesionCola` — funciona igual en mezcla que en tema fijo
      (que no tiene cola propia). Caso raro sin resolver: si fallás muy cerca del final
      de la ronda y te toca el `esperar` más largo (4), puede no alcanzar a reaparecer
      antes de que la ronda termine — no rompe nada, la repetición pendiente simplemente
      se descarta al empezar la ronda siguiente.
    - **1 ejercicio por tema** (`unoPorTema`, `mate_uno_v1`, `toggleUnoPorTema`; 2026-10-21):
      fila propia debajo de la de arriba (en una fila de 5 no cabe "161/162"). `vecesDe()`
      devuelve 1 en vez de `VECES_POR_TEMA`, así la mezcla pasa de 162 a 81 preguntas y los
      contadores de `tamanoMezcla` lo reflejan. NO cambia los bancos fijos (Repaso de
      ayudante y las prácticas del Examen Departamental: todas sus preguntas pueden salir en
      el examen) y no se dibuja en un tema fijo (no tiene sentido ahí). A DIFERENCIA de los
      otros dos, al tocarlo rehace la ronda EN CURSO (`_replanearRonda()`): lo ya abierto no
      se toca; los puestos sin abrir que sobran se quitan y las páginas abiertas pasan a su
      número nuevo (re-clave de `sesionEjs/Abiertos/Vistos/Res`, `sesionIdx`, y se reescriben
      las claves `mate_sesion_ej_N`); si faltan, se agregan al final. `sesionTotal` =
      `sesionOrden.length + sesionPendientes.length` (cada repetición pendiente ya tiene su
      puesto), y el selector "Pág." se repinta con `_repintarPagina()`. `construirCola` ahora
      usa `_colaDe(ms, veces)`, la misma que usa el replaneo.
    - `agrupar` y `repetir` no reordenan la ronda YA armada — cambian recién en la próxima que
      arranques (`toggleAgrupar()`/`toggleRepetir()` solo repintan la pantalla actual).
- **Modo examen / simulacro con reloj — QUITADO (2026-10-29).** Existió como "Simulacro del Departamental" (2026-10-13: las 30 preguntas de una práctica en 1 h 30 min, con nota al final)
  y como "Examen al azar" (10 preguntas en 10 minutos); sin botón desde que se sacaron de Temas (v191), así que en la auditoría de 2026-10-29 se borró el código (`iniciarExamen`,
  `pintarExamen`, `finalizarExamen`, `restaurarExamen`, `elegirDe`, la variable `examen` y su `mate_examen_v1`; al abrir la app se borra el simulacro que hubiera quedado a medias).
  **El código completo está en el commit `7d54266`** (`git show 7d54266:app.js`) por si algún día se quiere volver: la usuaria pidió quitar los BOTONES, y aquí se limpió lo que ya nadie llamaba.
  `mate_examenes_v1` (las notas de antes) se conserva y Progreso las sigue mostrando, pero ya no se agrega ninguna.
- **Repasar errores** (`modoErrores`): cicla la lista `errores` (tope 30 fallos reales entre las 4 materias, más reciente primero); si aciertas un error se reprograma (+1, +3 y +7 días) y al 4º acierto sale.
  Fallarlo en el repaso NO lo cambia de lugar en la lista: se marca `v = Date.now()` y `_pintarSiguienteError` ordena la cola de hoy por `v` (el último fallado sale al final; antes lo mandaba al final de la
  LISTA y era el primero en borrarse al llegar un error nuevo). `_registrarError` no duplica una pregunta que ya está (busca en toda la lista y la sube al frente reiniciando su repaso).
  **"Otro parecido"** (`otroParecidoError`, solo en temas con `gen` y no en las prácticas fijas del examen): otro ejercicio del mismo tema; lo que contestes cuenta para ESE error (acierto = avanza su
  repaso, fallo = vuelve a hoy). Las preguntas de las prácticas del examen guardadas en una versión vieja se rearman con `_refrescarEjFijo` (explicación Fácil y enunciado de ahora, igual que `restaurarSesion`).
- **"Seguir la ronda" (2026-10-29)**: "← Inicio" a mitad de ronda ya no la borra: `pausarRonda()` guarda la ronda con `pausada:true` en `mate_sesion_v1` y Inicio muestra "Seguir la ronda (N/total)"
  (`_rondaPausadaHTML`, `seguirRonda` → `restaurarSesion(true)`). Una ronda pausada NO se abre sola al arrancar la app (`restaurarSesion()` sin `forzar` la salta; una cerrada sin pausar sí se retoma como antes),
  sobrevive a cambiar de pestaña y a una recarga por versión nueva (`ir` solo borra la ronda si no está pausada), solo sale en la materia de la ronda, se reemplaza al empezar otra y se borra al terminarla.
  El atajo `?practica=<tema>` sigue donde ibas aunque esté pausada. `borrarSesion()` también apaga el guardado diferido de lo escrito (`_borradorT`): antes, a los 700 ms, volvía a guardar la ronda recién dejada.
- **Práctica rápida** (Inicio, `practicaRapida`, `_temasFlojos`): los hasta 5 temas de la materia con ≥ 3 ejercicios hechos y < 85 % de aciertos (`RAPIDA_*`), los más flojos primero, mezclados como cualquier
  mezcla (`clase` = "Práctica rápida: lo que más fallas": 2 preguntas por tema, 10 con 5 temas). Sin los bancos fijos (`banco`/`nuevaRonda`/`extra`) y sin Repaso de ayudante (sus preguntas no cambian).
- **Buscar un tema** (Temas, `buscarTema`): la caja de arriba filtra por nombre sin tildes ni mayúsculas, muestra los resultados (con su capítulo y su casilla, `_filaTemaHTML`) y esconde los capítulos mientras hay texto.

## Grupos de examen

Extensión de "Elegir temas para mezclar": mientras esa pantalla arma UNA mezcla sin nombre
y sin guardar (pisa la anterior), "Grupos de examen" (`pantallaGrupos()`) guarda VARIOS a
la vez, cada uno con nombre editable — pensado para juntar, por ejemplo, "Examen 1" = cap.
1 y 2, "Examen 2" = cap. 3, y tenerlos ahí para practicar cuando quieras sin tener que
volver a marcar los temas.

- `grupos` (`mate_grupos_v1`): `[{id, nombre, mods:[]}]`. CRUD completo desde
  `pantallaGrupos()`: `crearGrupo()`/`editarGrupo(id)` abren el mismo picker de capítulos
  que "Elegir temas" (`_bloquesCapitulos()`, factorizado para que ambas pantallas lo
  compartan — el parámetro es el NOMBRE de la función a la que hay que volver a llamar
  tras marcar/desmarcar, `_pintarElegirTemas` o `_pintarEditorGrupo`). El nombre se edita
  con un `<input class="campo">` normal DENTRO de esa misma pantalla (junto a los temas),
  no aparte — así "editar el nombre" y "editar los temas" son la misma acción, sin un botón
  "Renombrar" separado. `guardarGrupo()` lee ese input al guardar.
  El nombre se pide con un `<input>` en pantalla, nunca con `prompt()` — ver la regla
  general de diálogos nativos, un poco más abajo. El valor sobrevive al repintado que
  dispara "Marcar/quitar todo" gracias a `nombreGrupoTmp` (variable aparte, actualizada por
  `oninput` en cada tecla) — si solo se leyera `$('inNombreGrupo').value` en el momento de
  guardar sin esa variable, funcionaría igual para guardar, pero el campo se vería vacío
  en pantalla después de marcar un capítulo entero (el repintado lo resetea a partir de
  esta variable, no del DOM).

### Nada de `alert`/`confirm`/`prompt` nativos — en ningún lado, nunca

**Bug real, pasó dos veces seguidas (2026-09-13):** primero "Guardar grupo" no hacía nada
(usaba `prompt()` para el nombre), después "Borrar" tampoco (usaba `confirm()`). Se
comprobó con evidencia — no es una sospecha — que en el entorno donde se prueba esta app
los tres diálogos nativos (`alert`, `confirm`, `prompt`) vuelven en 1-2ms sin bloquear ni
mostrar nada: `confirm()` siempre da `false` (como si el usuario hubiera cancelado) y
`prompt()` siempre da vacío, así que cualquier `if(!confirm(...)) return;` o
`const x = prompt(...); if(!x) return;` corta la función en silencio y el botón "no sirve".

Por eso el proyecto tiene sus propios reemplazos (junto a `$`/`main`, cerca del principio de
la sección de interfaz):
- **Confirmar algo** (antes `confirm()`) → `confirmarAccion(mensaje, siConfirma)` — overlay
  con "Sí, continuar" / "Cancelar" (tocar afuera de la tarjeta también cancela); `siConfirma`
  corre solo si se acepta.
- **Avisar algo** (antes `alert()`) → `avisar(mensaje, alCerrar)` — mismo overlay con un
  solo botón "Entendido"; `alCerrar` (opcional) corre recién al cerrar, no antes — útil
  cuando el aviso precede a algo irreversible como `location.reload()`.
- **Pedir texto** (antes `prompt()`) → un `<input class="campo">` normal en la pantalla,
  nunca un diálogo — ver el ejemplo de arriba (`inNombreGrupo`/`nombreGrupoTmp`).
- **Avisos de validación de un formulario ya en pantalla** (ej. "marca al menos un tema"):
  ni `avisar()` ni `alert()` — un `<div class="fb medio">…</div>` inyectado en una zona
  reservada de esa misma pantalla (ver `guardarGrupo()` → `#zonaGrupo`, o el patrón ya
  viejo de `guardarClase()` → `#zonaClase`). Reservar el overlay para cuando de verdad hay
  que interrumpir con algo aparte de la pantalla actual.

Si alguna vez se agrega una función nueva que necesite preguntar, avisar o pedir texto:
**no usar el diálogo nativo aunque parezca más rápido de escribir** — usar uno de los
cuatro de arriba.
- **"Practicar" un grupo** (`practicarGrupo(id)`) simplemente copia `{etiqueta, mods}` del
  grupo hacia la `clase` activa (igual que hoy hace "Practicar esta mezcla") y arranca la
  práctica — reutiliza TODO el motor de mezcla ya existente (`construirCola`,
  `tamanoMezcla`, agrupar/repetir) sin tocarlo. Es una copia, no una referencia: editar o
  borrar el grupo después no afecta la ronda que ya está en curso.
- **Sí sincroniza entre aparatos** (2026-09-13), como `clase`/`nivel`: cada CRUD
  (`guardarGrupo`/`borrarGrupo`) llama a `_guardarGrupos()`, que guarda
  local Y empuja `{grupos}` a Firestore de una — sin debounce, porque editar un grupo es
  una acción puntual, no algo que pase por cada respuesta como `stats`. `_escucharSync` lo
  recibe con último-en-escribir-gana (reemplaza la lista completa, igual que `clase`).
  **Trampa evitada:** un simple "el que llega de últimas pisa al otro" perdería grupos si
  los dos aparatos crearon los suyos ANTES de enlazarse por primera vez — por eso
  `conectarSync()` (que solo corre una vez, al vincular) los une por `id` con
  `_unirGrupos()` en vez de pisar: como los id son al azar (`idGrupo()`), una colisión
  entre dos aparatos distintos es prácticamente imposible, así que la unión no pierde
  ninguno de los dos lados. Después de ese enlace inicial sí es último-en-escribir-gana,
  igual que el resto — si se editan grupos en los dos aparatos casi al mismo tiempo, gana
  el que llegue después a Firestore.

**Trampa importante:** el botón "Siguiente ejercicio" (y Enter) pasa por `_siguienteEjercicio()`, que decide según
`modoErrores`/`modoRepasoRonda` — si se agrega otro modo, hay que tocarlo ahí.

## localStorage — todas las claves (prefijo `mate_`)

**Fecha "de hoy" — usa `fechaLocal()`/`fechaHaceDias(n)`, nunca `toISOString().slice(0,10)`.**
`toISOString()` da la fecha en UTC; en Puerto Rico (UTC-4) cualquier cosa después de las 8 pm
caía en el día siguiente — bug real (2026-09-16): el heatmap de "Últimos 14 días" pintaba la
barra equivocada y la racha de días se rompía a media noche LOCAL en vez de a media noche
real. Los dos helpers viven junto a `guardar`/`leer`, arriba del todo de "ALMACENAMIENTO".

| Clave | Contenido |
|---|---|
| `mate_nivel_v1` | `'facil'` / `'medio'` / `'dificil'` |
| `mate_clase_v1` | `{ etiqueta, mods:[] }` — la mezcla ACTIVA ahora mismo (personalizada, detectada del material de clase, o copiada de un grupo al tocar "Practicar") |
| `mate_grupos_v1` | `[{id, nombre, mods:[]}]` — grupos de examen guardados (ej. "Examen 1" = cap. 1 y 2); **sí sincroniza entre aparatos** (2026-09-13), ver "Grupos de examen" más abajo — la nota vieja aquí decía "no sincroniza, a propósito" y estaba desactualizada/contradecía esa sección; no vuelvas a escribirla sin corregir la otra |
| `mate_examenes_v1` | `[{fecha, titulo, correctas, total}]`, tope 30 — notas de los simulacros de antes (el modo examen se quitó el 2026-10-29: ya no se agrega ninguna), salen en Progreso |
| `mate_agrupar_v1` / `mate_repetir_v1` / `mate_uno_v1` | `true`/`false` — los tres ajustes de la pantalla de práctica (agrupar por tema / repetir si fallo / 1 ejercicio por tema, ver "Modos de práctica") |
| `mate_stats_v1` | `{ modId: {ok, fallo} }` |
| `mate_racha_v1` | `{ actual, mejor }` — racha de aciertos seguidos |
| `mate_racha_dias_v1` | `{ actual, mejor, ultimoDia }` — racha de *días* practicados (distinta de la de arriba). Se limpia al cargar (`_limpiarRachaDias`: solo números y fecha) |
| `mate_historial_v1` | `{ "YYYY-MM-DD": cantidad }` — para el heatmap de "Últimos 14 días" (con el número de ejercicios encima de cada barra). Se limpia al cargar (`_limpiarHistorial`) |
| `mate_errores_v1` | `[{modId, ej, veces?, proxima?, v?}]`, tope 30 (entre las 4 materias), más reciente primero. Repaso espaciado (2026-10-13): acertar uno en "Repasar mis errores" lo reprograma a +1, +3 y +7 días (`_ESPACIOS`); al 4º acierto sale; fallarlo lo vuelve a hoy (y `v` = cuándo, para mandarlo al final de la cola de hoy sin moverlo de la lista). Solo salen los de hoy (`erroresParaHoy`). Se limpia al cargar (`_limpiarErrores`: fechas y números; el HTML de `ej` ya se limpia al importar) |
| `mate_sesion_v1` | la ronda en curso para retomarla (no se sincroniza — a propósito): página actual (`sesionIdx`), páginas abiertas/vistas/resultado (`sesionAbiertos`/`sesionVistos`/`sesionRes`), lo contestado en CADA página para verla igual al volver (`sesionEst`, desde v193: ver "Volver a una página de la ronda"), orden sorteado (`sesionOrden`), y `borrador` = lo escrito sin comprobar (Tu proceso y casillas) de la página actual, que se guarda solo al escribir (700 ms) y al salir de la app. `pausada:true` = salió con "← Inicio" (ver "Seguir la ronda") |
| `mate_sesion_ej_N` | el ejercicio de la página N de la ronda, guardado UNA vez al sacarlo (antes `mate_sesion_ejs_v1` reescribía la ronda entera, hasta 365 KB, en cada respuesta; se migra sola). Las de las prácticas del examen no se guardan (se rearman iguales), salvo las repeticiones (`__rep`). `borrarSesion()` las quita todas |
| `mate_materia_v1` | la materia activa (`mate`/`wc`/`circ`/`ayud`), se valida contra `MATERIAS` |
| `mate_ay_vistas_v1` | Repaso de ayudante: qué preguntas de cada banco ya salieron en la ronda (`_ayRecientes`, índices por tema; `id:mezcla` = la lista sin gemelas). Se borra para los temas de cada ronda nueva |
| `mate_sync_code_v1` | el código de sincronización de ESTE aparato, si está conectado |
| `sync_pend_mate_v1` | (SIN prefijo `mate_`, como `ai_skip_mate_v1`: no va al respaldo) respuestas contestadas que todavía no suben a la nube (`{stats:{id:{ok,fallo}}, racha}`): ver "Sincronización" |
| `mate_tema_v1` | `'auto-system'` (por defecto) / `'auto-hour'` / `'light'` / `'dark'` — preferencia de claro/oscuro (Ajustes → Tema); **no sincroniza entre aparatos**, a propósito: es una preferencia de pantalla, no de progreso |

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
- **Lo contestado sin conexión no se pierde (2026-10-29).** `_empujarSync` acumula en `_syncPendiente` aunque `syncDoc` todavía no exista (Firebase cargando, sin internet o app cerrada antes
  de los 4 s) y lo guarda en `sync_pend_mate_v1`; `_reengancharSync` lo sube (`_flushSync`) ANTES de escuchar y el listener suma lo pendiente encima de lo que llega de la nube (sin eso, la primera
  copia de la nube reemplazaba las estadísticas de aquí y esas respuestas desaparecían). Se borra en el mismo instante en que se entrega a Firestore (que ya tiene su propia cola offline; así no se
  cuenta dos veces), al desconectar y en "Borrar todo mi progreso". `conectarSync(codigo, debeExistir)`: un código ESCRITO A MANO que no existe falla con `CODIGO_NO_EXISTE` (se pide al servidor,
  `source:'server'`: la caché sin internet diría "no existe" aunque exista) y NO crea otro espacio vacío; "Generar código nuevo" sí crea. El código se acepta sin guiones, con espacios y en minúsculas.
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

**Trampa ya arreglada una vez, no repetirla:** `_pantallaActual` solo se ASIGNA dentro de
`pantallaInicio()`/`pantallaStats()`, nunca se limpiaba al salir de ahí — así que se quedaba
"pegado" en `pantallaInicio` para siempre después de la primera vez que abrías la app. Bug
real: entrabas a Inicio, pasabas a practicar, y unos segundos después de responder (cuando
`_flushSync` mandaba tu propia respuesta y el `onSnapshot` la recibía de vuelta) la condición
de arriba se cumplía igual y te repintaba Inicio ENCIMA de la práctica a medio ejercicio, en
cualquier aparato con sync activo. `ir()` ahora lo limpia (`_pantallaActual = null`) cada vez
que la pantalla destino NO es `'inicio'` ni `'stats'` — si se agrega una pantalla nueva fuera
de `ir()` (como `restaurarSesion()` al arrancar, que llama `pintarEjercicio()` directo), no
hace falta tocarlo porque `_pantallaActual` ya nace en `null`.

## CSS — variables de color

Desde el rediseño "vidrio esmerilado" (estilo Fit-F, commit `cfd47a5`) la app ya no tiene
azul de marca — `--azul`/`--azul2`/`--azul3`/`--blanco`/`--acento2`/`--sombra` ya NO existen
(se borraron en la auditoría de 2026-09-16, no tenían ningún `var(--x)` real en todo el
archivo). `manifest.json` (`background_color`/`theme_color`) y el `OFFLINE_HTML` de `sw.js`
también usaban ese azul viejo `#1e2a52` — ya corregidos a `#d2d2da` (mismo color que el
`<meta name="theme-color">` del HTML); si cambias la paleta de la app, revisa esos dos
archivos también, no solo `index.html`.

**Sin `backdrop-filter` en `.card`, `.chip` ni `.ajCard` (2026-10-13) — batería y scroll.** Desenfocar el fondo liso no se
veía (comprobado con capturas) pero se recalculaba en cada cuadro al hacer scroll. Solo lo conservan lo que flota encima del
contenido: `.overlay .card` (diálogos, calculadora), `.card.menuFlot`, la barra de abajo y `.calcBtn`. Lo de abajo es historia:

**`.btn` sin `backdrop-filter` propio (2026-09-16) — batería.** `.btn`/`.chip`/`.card`
viven siempre unos DENTRO de otros (un botón siempre está sobre una `.card` ya esmerilada),
y cada `backdrop-filter` es una capa de composición GPU aparte — en pantallas como "Temas"
llegaban a coexistir 50+ elementos con blur a la vez. Se quitó de `.btn` (sin cambio visual,
ya que el blur de la `.card` de abajo sigue ahí); **`.chip` y `.calcGrid button` se dejaron
con su blur tal cual** — mismo razonamiento, mismo candidato, pero no se tocaron todavía
(pendiente de una segunda pasada, no lo hagas sin confirmar primero, ver la regla de UI de
arriba). Si quitas más `backdrop-filter`, comprueba visualmente que de verdad no cambia nada
antes de asumirlo — depende de la opacidad del elemento y de qué haya debajo.

Los roles que SÍ están vivos y que NO deben mezclarse (fue un bug real, ver el punto de
"doble papel" en el commit del modo oscuro):
- `--superficie` = fondo de tarjeta/chip/input (vidrio translúcido claro/oscuro).
- `--titulo` / `--titulo2` = color de texto de h2/h3/chip-no-seleccionado/etc. sobre esa
  superficie.
- `--contraste` / `--contraste-texto` = fondo SÓLIDO de contraste (`.enunciado`, chip
  elegido, insignias) y su texto — a propósito separado de `--texto`, porque usar `--texto`
  como fondo es blanco-sobre-blanco en modo oscuro (la misma trampa de doble papel).

Si algo nuevo muestra texto DENTRO de una `.card`, usar `--titulo`/`--titulo2`/`--texto`;
si necesita un fondo sólido que resalte (no la superficie de vidrio), usar `--contraste`/
`--contraste-texto` — nunca fabricar un color fijo a mano, se rompe en modo oscuro.

El modo oscuro es elegible a mano (Ajustes → Tema: Automático por celular / Automático por
hora / Siempre claro / Siempre oscuro — `mate_tema_v1`, por defecto "auto-system"). Vive en
la clase `body.night`, **no** en `@media (prefers-color-scheme: dark)` — así "Siempre claro"
puede ganarle al sistema aunque el teléfono esté en oscuro, y viceversa. `aplicarTema()`
decide con `resolverNoche()` y pone/quita la clase; se llama una vez al arrancar y cada vez
que `setTemaModo()` cambia la preferencia. Si agregas CSS nuevo que dependa del tema, usa
`body.night .tu-selector{...}` (nunca `@media`) para que respete la preferencia manual.

## Barra de navegación flotante (abajo)

**Selector "Pág." y mapa de preguntas (2026-10-10/13):** toda ronda tiene arriba a la derecha "Pág. 1, 2, 3…"
(`selectorPregunta`/`irAEj`): cada página es un ejercicio fijo de la ronda (`_ejDelPuesto`: se genera la primera vez y
después es el mismo; en las prácticas del examen la página N es la pregunta N, también dentro de un grupo de solo
prácticas, que trae las 30 de cada una — `vecesDe`). Debajo, en TODA ronda (desde 2026-10-22; antes solo en las prácticas del examen), el **mapa de preguntas**
(`_mapaHTML`: verde bien, rojo mal, amarillo vio la explicación; tocar un número va ahí). En pantalla ancha (≥ 1240 px, computadora) el mapa va FIJO en el espacio vacío de la izquierda (CSS `@media (min-width:1240px)` sobre `.mapaPreg` en index.html; el ancho sale de (100vw − 720px)/2); en el teléfono sigue debajo de las estadísticas. "Otro de este tema" no sale
en las prácticas del examen (cambiaría la pregunta de esa página).

Cuatro pestañas fijas, **copiadas tal cual de Fit-F** (mismas clases CSS `.bottom-nav`/
`.bn-item`/`.bn-lbl`/`.bn-lens`/`body.night`, mismos valores de vidrio y la misma lente
Liquid Glass que se desliza sobre la pestaña activa vía `_posicionarLente()`) — la única
diferencia deliberada es que no tiene los iconos de emoji de Fit-F (pedido explícito, solo
texto). Pestañas: **Practicar** (`inicio`) / **Temas** (`temas`) / **Progreso** (`stats`) /
**Ajustes** (`ajustes`). Vive en el HTML fuera de `#main` (así no se borra cada vez que una
pantalla repinta `main.innerHTML`) y cada pantalla llama a `_barra(nombre)` para mostrarse
marcada como activa, o `_barra(null)` para ocultarse.

Se oculta a propósito durante práctica, examen, repaso de errores y "ronda completa" — ahí
solo queda el botón único "← Inicio"/"← Abandonar examen" de siempre, para que un toque de
más en la barra no saque a media pregunta (por la misma razón que ya motivó lo de
`_pantallaActual` más abajo). Se muestra en las 4 pestañas y también en las pantallas que
cuelgan de ellas (elegir temas, grupos, material de clase, sincronizar, selector de tema),
resaltando la pestaña "padre" (`temas` o `ajustes`) aunque no sea literalmente esa pantalla.

**Estilo iPhone (2026-10-28, portado de Fit):** se encoge al bajar (`_bnMin`, `.bn-min`: queda la pastilla con el NOMBRE de la pestaña activa en la esquina izquierda, porque no hay íconos), se abre al subir, al tocarla (no cambia de pestaña) y cuando `_barra` cambia de pestaña o estás arriba del todo (`_bnPestana`). El `scroll` ignora la barra `.oculta`, recorta el rebote del iPhone y no cuenta si la página cambió de alto. Se mueve SOLO con `transform` (`--nx` mientras se encoge/abre). La lente se mueve con `transform` (`--x`, `--sx/--sy`) por `_bnLenteA` y se estira al viajar; arrastrar el dedo = pointer events en `#bn` (`touch-action:none`, `.drag`, al soltar `b.click()` y `_bnTragarClick`). Todo el estado nuevo es `var` (`_barra` corre al arrancar). `.bn-item` lleva `overflow:hidden` para que el nombre no se salga mientras la pestaña crece.

**Ajustes agrupado (2026-10-28, como Fit):** Nivel + una tarjeta "Ajustes" (Tema, Inteligencia artificial, Datos). Datos es su propia pantalla (`pantallaDatos`, `ir('datos')`: Material de clase, Sincronizar, Exportar, Importar) y la ← de Material de clase y Sincronizar dice "← Datos". Fila nueva en Ajustes → en su grupo.

Si agregas una pantalla nueva: decide si es una "pestaña" (llama a `_barra('esa-pestaña')`)
o es parte del flujo de responder preguntas (llama a `_barra(null)`) — no la dejes sin
llamar a ninguna, o hereda el estado de la pantalla anterior por error.

## Calculadora

Botón flotante (`.calcBtn`, círculo con "=", abajo a la derecha) visible en **toda la
app, incluida la práctica activa y el examen** (pedido explícito; la usuaria puede usar calculadora en el examen) — a propósito no está
atado a `_barra()`, no se oculta nunca. Abre una tarjeta (`abrirCalc()`/`#calcOv`, reutiliza
la clase `.overlay`). Desde 2026-10-13: respeta el **orden de operaciones** (`_calcEvaluar`: paréntesis, × ÷, + −),
tiene **( ) y ⌫**, y si el resultado es una fracción la muestra debajo (0.375 = 3/8, 1.75 = 7/4 (1 3/4)); "Usar" la pone
completa en las casillas de fracción o número mixto. Fuera de un ejercicio no hay `#zonaEntrada` y "Usar" no sale
(antes `abrirCalc` tronaba ahí y la calculadora no abría en Inicio/Temas/Progreso). No toca ninguna variable de la sesión de
práctica (`sesionHechos`, `ejActual`, etc.) — es una herramienta aparte, sin persistencia
(cada vez que se abre arranca en `0`). `ir()` la cierra al cambiar de pantalla
(`cerrarCalc()`), igual que hace con la tarjeta de "Grupos de examen". Tiene teclado físico
(2026-09-16): dígitos, `+-*/`, `.`/`,`, `%`, Enter/`=`, Escape, Backspace — un solo listener
en `document` que solo actúa mientras `#calcOv` está `display:flex`.

**`.app` padding-bottom (140px) tiene que cubrir toda la altura del botón, no solo la
barra.** `.calcBtn` mide 52px y su borde de arriba queda a `76+52=128px` del fondo — con
menos padding que eso, la mitad de arriba del botón tapaba el último elemento visible de
cualquier pantalla (bug real: tapaba "repetir si fallo" en la fila de estadísticas de
práctica), y esto pasaba SIEMPRE, no solo con `.bottom-nav` oculta — el padding no depende
de la barra. Si cambias el tamaño o la posición de `.calcBtn`, revisa que el padding lo
siga cubriendo.

**Ojo con el z-index si tocas overlays:** `.bottom-nav` quedó en `z-index:400` (copiado
tal cual de Fit-F). `.overlay` — la clase que ya usaban `confirmarAccion()`/`avisar()`, y
ahora también la calculadora — estaba en 50, por debajo de la barra; se subió a 450. Si
agregas otro elemento `position:fixed`, revisa que su z-index quede por encima de 400 o se
va a ver tapado por la barra en cualquier pantalla donde esté visible.

## IA con Gemini (2026-10-04) — opcional, solo si hay clave

La clave de la usuaria (Ajustes → Inteligencia artificial, `pantallaIA`) vive en `localStorage` bajo
`ai_gemini_key_v1`, **sin prefijo `mate_` a propósito**: `exportarRespaldo()` solo guarda `mate_*` y la
sync solo manda claves concretas, así que la clave nunca va al .json ni a Firestore. **No la agregues
a ninguno de los dos.** Es una clave PROPIA de Mate (proyecto de Google "Mate Practica Matematicas",
cupo gratis separado del de Fit-F/Fit-M). Sin clave no se dibuja ningún botón de IA.

- Núcleo (junto antes de `pantallaInicio`): `getAiKey`/`saveAiKey`/`clearAiKey`, `_aiJSON(prompt, schema, extraParts)`
  (mismo de Fit: `AI_MODELS` del mejor al peor, salta 10 min el que falla), `_imgParaIA`.
- **Principio:** la IA solo EXPLICA, COMPARA y SUGIERE. NUNCA genera ejercicios, NUNCA decide si una
  respuesta está bien (eso es `verificar()`) y NUNCA toca `stats`/`errores`/racha. El prompt le da la
  respuesta correcta y la explicación oficial del código (`_aiEjTxt`) y le prohíbe recalcular o inventar.
  Todo lo que devuelve se valida (número de paso dentro del rango, ids de tema contra `MODULOS` de la materia).
- **Burbuja AI + chat (2026-10-05, mismo motor que Fit-F/Fit-M):** ninguna función de IA tiene caja de texto ni botón con etiqueta: la pantalla dibuja una burbuja `AI` (`_aiGenBurbuja(f, id, cls)`; `est` en el flujo, `ancho` del tamaño de un botón) y al tocarla se abre una hoja tipo chat (`#aiGenOv`, `.aic-*`, animación desde la burbuja) con escribir, **micrófono interruptor** (`_dictar`: un toque escucha, otro apaga), **cámara con menú "Tomar foto" / "Elegir de la galería"** (`aiGenMenuFoto`, solo en los chats con `foto:true`), sugerencias y "Nueva". Una entrada por función en `_AIG` (`titulo/aria/ph/saludo/chips/seguir/clave/ctx/enviar`, y `abrir` para un abridor propio); `enviar(q, previos, ctx, img)` devuelve `{ texto, acciones? }`. Un chat por función+contexto en memoria (`_aiGenMsgs`); una respuesta tardía de un chat vaciado se descarta. Los botones de acción (`acciones`) son lo único que hace algo (`practicarTema`, con `cierra:true` para cerrar el chat antes).
- Los 4 chats: **`ej`** (ayuda con ESTE ejercicio: revisar proceso con o sin foto del cuaderno, explicar de otra forma, pista; burbuja en `aiBoxHTML`/`#zonaIA` y otra bajo la explicación, `_aiOtraBtn`; clave `ej:N` con `_aiEjN`, que sube en cada `pintarEjercicio`/repaso, y si el ejercicio cambió mientras el chat estaba abierto `enviar` avisa), **`tarea`** (foto de un problema de tarea → qué es, tema y pista, NUNCA la solución; botón "Practicar este tema"; `aiTareaHTML` en Inicio), **`plan`** (plan de repaso con tus datos; botones "Practicar: tema" con ids validados contra `MODULOS`; `_aiPlanHTML` en Progreso con ≥5 ejercicios) y **`ronda`** (comentario de la ronda; `_aiRondaHTML` en `pantallaRondaCompleta`, ≥3 ejercicios; clave `ronda:N` con `_aiRondaId`). Todo corre solo al tocar la burbuja y enviar (Mate se usa mucho: no gastar cupo solo).
- **Ayuda de IA ANTES de contestar = "ver la explicación"** (decisión de la usuaria): `aiEjAbrir` (el `abrir` del chat `ej`) pide confirmación al tocar la burbuja y pone `vioExpl = true` (el ejercicio no suma a stats). Si todavía no contestó ni vio la respuesta (`revelada` falso), el prompt NO revela la respuesta final y el ejercicio sigue abierto. Después de contestar o de "Ver explicación" ya no hay nada que descalificar.
- **Respuesta por partes, foto en alta resolución y "Copiar" (2026-10-29, portado de Fit F):** `aiGenEnviar` pone `_aiStreamCb` justo antes de llamar a `enviar()`; `_aiJSON` lo toma de una (`const stream = _aiStreamCb; _aiStreamCb = null`, así cada pregunta usa el suyo y una `enviar` que tarde en llegar simplemente no se ve por partes) y pide `streamGenerateContent?alt=sse`; `_aiLeerStream` junta el texto y `_aiRespuestaParcial` saca lo que va del campo "respuesta" aunque el JSON esté a medias; el mensaje en curso (`m.cargando` + `m.parcial`, `data-k`) se repinta solo a ese elemento (`_aiGenParcial`, cada 40 ms) con un cursor (`.aic-cursor`). El tiempo límite cuenta hasta que el modelo EMPIEZA a contestar (10 s / 30 s el último; con foto 25 s / 45 s) y luego tiene 90 s (120 s con foto). Las fotos del cuaderno van a 2048 px (`_imgParaIA`, `fotoMax`), con `_aiFotosParts` (`mediaResolution: HIGH` por foto) y `thinkingConfig: HIGH`; si un modelo contesta 400 se repite UNA vez sin esos ajustes (solo a ese modelo, `simple`). Cada respuesta de la IA trae "Copiar" (`aiGenCopiar` → `_aiCopiar`). Probado con un `fetch` simulado (SSE troceado, 400 con foto, 429 por día, JSON incompleto) y en el navegador; falta ver con la clave real. NO está portado de Fit F: el prompt en dos partes (`systemInstruction` + conversación por turnos), "Corregir" y "Nueva con Deshacer".
- `ultimaEntrada` guarda lo que respondió (va en `mate_sesion_v1`) para poder revisarlo. `showToast` es un aviso corto propio del motor (Mate no tenía).
- Estética: la etiqueta `.ai-tagged`/`.aiB` ya no se usa en las funciones (queda el CSS). Si agregas otra función de IA: una entrada en `_AIG` + `_aiGenBurbuja('f')` en su pantalla. Si cambias algo del motor, espeja Fit-F/Fit-M (y Facturas).
- En World Culture/Circuitos el contenido sale de las presentaciones del profesor: el prompt dice "no agregues datos externos".

## Temas de preguntas fijas (`banco`)

Un módulo con `banco: N` es un banco fijo de preguntas: la ronda de ese tema trae las N (no 20) y no
muestra la pantalla de "Ejemplo". Si además tiene `nuevaRonda()`, las saca EN ORDEN y cada ronda empieza
por la 1 (lo usa `educo-dep-exacto`: las 30 preguntas exactas de la práctica del Examen Departamental de
EducoSoft, banco `DEP_EXACTO`; `restaurarSesion` sigue desde `ejActual.__n`). El tipo `mixto` acepta
negativos con `signo:true` (botón ±): −2 2/7 vale −(2 + 2/7).

## Repaso de ayudante (2026-10-05) — materia `ayud`

Pasada desde la app suelta `Proyectos/estudio-ayudante.html` (examen de Ayudante de Perito
Electricista, PR). Es una materia más de `MATERIAS` (caps: 1 Ley de Ohm, 2 Materiales y su uso,
3 Las Leyes, 4 Reglamentos y energía renovable). Todo su código vive en UN bloque de `app.js`, justo antes de
`MODULOS.forEach(... m.clase = 'mate')`: `const AYUD` (datos), 9 módulos `ayud-*` (los de la materia 4 son `ayud-reg-*`)
(`_ayFicha` = tarjetas pregunta/respuesta → opción múltiple, `_ayPregunta` = preguntas con 4
opciones, `_ayFotosTodas` = foto → nombre (materiales y conduletos juntos)) y las pantallas `pantallaAyLeer(k)` /
`pantallaAyGaleria()` (rutas `ir('ayLeer',k)` e `ir('ayGaleria')`; sus botones salen en Inicio
y Temas vía `ayudMaterialHTML()`, solo con `materia==='ayud'`). Las preguntas con "Todas las
anteriores" / "Ninguna" / "Ambas" NO se barajan (`_ayBarajar`). Fotos: `ayudante/` (184
archivos, ~1.3 MB en WebP); el `sw.js` las guarda en su propia caché `mate-fotos-ayudante-v4`, que no se
borra al subir de versión (si cambias una foto, sube ese número). Las fotos NO van en base64
dentro del HTML a propósito.

**Revisión de fotos y repetidas (2026-10-23, pedido: "verifica que los nombres sean el de la foto… se han repetido algunas preguntas")**:
- Cada una de las 139 fotos `mat-*` se ubicó en su hoja (`hoja-01…09`, correlación por escalas) y se leyó el rótulo de al lado: todas son lo que dice la hoja. Nombres puestos IGUAL que la hoja (antes había inventos para distinguirlas): 7 piezas salen 2 veces con otra foto porque la hoja las repite (Conector EMT a Flex, Conector EMT de compresión, Split Bolt, Conduleto tipo TA, Reducing bushing, Conector 90° liquidtight, Ground para tanque de transformadores); el quiz nunca pone dos opciones iguales (`_ayOpciones` usa Set). "Breaker un polo ½ pulgada fino" y "Receptáculo 120V 15A (NEMA 5-15)" como en la hoja 8.
- 52 fotos traían pedazos de los rótulos de la hoja ("BLB", "tipo OET", "Welding Cable" daban la respuesta; "Receptáculo" bajo un interruptor o "rador" bajo el Locknut confundían): tapados con blanco sin tocar la pieza (caché de fotos v4).
- **Tubería ENT** (hoja 8): azul o gris = electricidad, **amarillo = comunicaciones, rojo = señales de seguridad**. Las preguntas y la lectura decían gris/amarillo y contradecían las fotos.
- **Preguntas repetidas**: (1) `_ayRecientes` vivía solo en memoria y la ronda se retoma al reabrir la app (`restaurarSesion`), así que tras cerrar la app o una actualización volvían preguntas ya contestadas → ahora se guarda en `mate_ay_vistas_v1` (probado: ronda del cap. 2 de 311, recargada a la mitad, 0 repetidas). (2) Las tarjetas de "conceptos" repiten datos de "preguntas de práctica" (Materiales: 23 de 27): `_ayFicha(id, nombre, sec, fichas, pareja, gemelas)` no saca las gemelas cuando su tema pareja está en la misma ronda (`sesionOrden.includes(pareja)`; `vecesDe` usa `bancoMezcla`); el tema de conceptos solo trae todas. Todo mezclado: 709 → 648 preguntas, 0 repetidas. Si agregas una tarjeta que repite una pregunta, ponla en `gemelas`.
- **Repetidas, segunda pasada (2026-10-24)**: se comparó cada pregunta con las de su tema y con las de los demás temas de la mezcla (texto y respuesta). Quedaron fuera: la de "tomas soterradas" del examen final del libro (estaba también en Materiales con "RHW o USE"; ahora solo sale la de Materiales, `AYUD.reglam.quiz` quedó en 43) y dos tarjetas gemelas más (Leyes fc 36 = "qué es un Ayudante", Reglamentos fc 25 = el electrodo de tierra de 8 pies). Recorrido real de cada tema (16) y de las mezclas de cada capítulo y la de todo (645 preguntas), con "agrupar" Sí y No: 0 repetidas. Las parejas de FOTOS con el mismo nombre (7, ver arriba) no son repetidas: son fotos distintas de la misma pieza. Dos tarjetas/preguntas parecidas que NO son repetidas: vigencia de la licencia de Ayudante vs Aprendiz, y las de la misma fórmula con otras variables.
- **"Agrupar" en Leyes (2026-10-24)**: con el botón "agrupar" en Sí, `_ayElegir(id, lista, asuntos)` saca las preguntas de Las Leyes por asunto (`AY_ASUNTOS_LEYES`: una letra por pregunta de `AYUD.leyes.fc` y `.quiz`, en el orden de `AY_ORDEN_ASUNTOS` = H historia y enmiendas, J la Junta, C el Colegio y los sellos, L licencias y examen, M multas, S supervisión y alcance; dentro de cada asunto, el orden del banco). Con "agrupar" en No sigue al azar. Si agregas una pregunta a esos bancos, agrega su letra (sin letra va al final). En Repaso de ayudante ya no sale el botón "1 ejercicio por tema" (`_filaProgresoHTML`: ahí no hacía nada porque `vecesDe` trae el banco completo).
- **"O ring"** (hoja 2): el rótulo está sobre un terminal de ojo (anillo azul); la pregunta y la tabla de la lectura ahora dicen eso (antes: anillo de goma para sellar), por pedido de la usuaria.

**Materia 4 y "libro vs. ley actual" (2026-10-16):** la Ley 115 vigente (texto OGP, rev. 17-jul-2024,
art. 8-B) pide 4 materias al ayudante: Ohm, materiales, leyes y **reglamentos (Reglamento de Peritos, NEC,
AEE y otros)** + 500 h de electricidad con energía renovable.
- **Fuente = el libro del maestro**: *Electricidad Moderna* (Prof. Vázquez Chévere), en OneDrive
  `REPASOS REVALIDA/` (cap. A–G = págs. 1–141, edición 2003; y la 9.ª ed. de 2013 completa, con un examen
  final y sus contestaciones en las págs. 431–435). Todo el contenido de ayudante se comparó con eso.
- `AYUD.libro` (fund, basica, ac, disp, paneles) = lo que faltaba de los cap. B–G, módulos `ayud-lib-*`
  (1.3–1.5 y 2.4–2.5); las lecturas de los temas 1 y 2 tienen secciones "Del libro".
- `AYUD.reglam` (tema 4) = NEC y Reglamento Complementario de la AEE (1997) tal como los enseña el libro,
  más el art. 23 de la Ley 115. Los artículos del NEC van en pares: `(Libro, NEC viejo)` (370, 348, 346…)
  y `(NEC actual)` (314, 358, 344…). Donde el libro se contradice (conduleto F 18" vs 30", tubo de tierra
  ½" vs ¾") están las dos con su fuente.
- `AYUD.reglamExtra` = renovables y NEC general que agregué yo y NO están en el material (la usuaria
  pidió dejarlos "como extra"): módulos `ayud-reg-extra-*` con `extra:true`, que `construirCola`,
  `modulosActivos` y el conteo de "Mezcla de…" dejan fuera.
- `AYUD.leyes`: el libro trae las versiones VIEJAS de la Ley 115 y la 131. Etiquetas en el enunciado:
  `(Libro del maestro)` vs `(Ley actual, 2024)`; sin etiqueta = igual en los dos. Cambió: materias 3→4,
  escolaridad, certificado del aprendiz, documentos de la solicitud, multa Ley 131 $100-500 → $300-1,000
  y Ley 115 art. 23 → $1,000-5,000, sello $5 → $10 residencial, ayudantes ahora miembros del Colegio,
  exenciones de educación continua, la Junta elige presidente/vice/secretario, reuniones 20 → 36,
  sin "máx. 2 términos". OJO: las quejas las investigan los DOS (Colegio, de sus miembros, Ley 131 art.
  2-h; Junta, Ley 115 art. 14). Sin comprobar: vigencia de 1 año de la certificación.
- Plata = 9.65 (tabla del libro; antes decía 9.60).
- **Modo "solo ayudante" (2026-10-19)**: el link `https://yahairaarroyo2-alt.github.io/Mate/?solo=ayud` deja la app solo con
  Repaso de ayudante, para pasársela a otra persona. `SOLO` (justo antes de `let materia`) lee el parámetro y lo guarda en
  `mate_solo_v1`; `?solo=todas` lo quita. Con `SOLO`: `materia` queda fija, `cambiarMateria` no hace nada, no salen los
  botones de materia, el título es "Repaso de ayudante" y se arma un manifiesto propio (Blob: nombre, `start_url` y `id` con
  `?solo=ayud`, sin atajos) para instalarla en la pantalla de inicio. El parámetro NO se limpia de la dirección a propósito
  (en iPhone la app instalada tiene almacenamiento aparte y arranca por la URL). No es un candado: es solo esconder las otras
  materias. Las etiquetas (Por confirmar, etc.) se ven igual en este modo. Para PROBAR en el panel del navegador comparte
  localStorage con la app normal: al terminar abrir `?solo=todas`.
- **Casillas en Temas (solo materia `ayud`)**: cada tema de la lista tiene una casilla; lo marcado decide qué entra en
  la "Mezcla" de SU capítulo (el botón dice "X/171 preguntas"; sin nada marcado en el capítulo trae todo). Estado:
  `selTemas` / `mate_seltemas_v1` (entra solo en el respaldo, por el prefijo `mate_`); lo usa `construirCola(cap)`
  (`_modsCap`, `_mezclaTexto`, `toggleSelTema`). Un tema [Extra] marcado SÍ entra. No toca `clase` ("Elegir temas").
- **Etiquetas de tema (2026-10-16)**: cada módulo de ayudante lleva la etiqueta `Ayudante` (lo dice la ley o
  venía de las fotos del examen: Ohm, cap. C, materiales, fotos, leyes, reglamentos), `[Por confirmar]` (libro
  del maestro, falta confirmar con él: cap. B, D y E–F), `[Probable perito]` (cap. G: censo de carga) o
  `[Extra]`. Se ven como burbuja en la esquina del botón (`.ayTag`, `m.tag`, `AY_TAG`); no hay leyenda aparte (la quitó la usuaria). Pendiente: preguntarle al maestro qué
  capítulos entran en el de ayudante y quitar/mover lo que no. Un tema nuevo de ayudante lleva su etiqueta.

## Convenciones

- Español, tono directo y alentador, sin emoji decorativo salvo 🔥 (racha) — mismo criterio
  que las apps hermanas Fit-F/Fit-M.
- Antes de cualquier cambio grande: confirmar que `git status` está limpio o hacer un
  respaldo del archivo — este proyecto no tiene red de seguridad más que git.
- Después de editar `app.js`: correr `node --check app.js`, y volver a correr
  `index.html?test` — todas las comprobaciones tienen que seguir pasando (494 en 2026-10-29). Para correrlo sin navegador (2026-10-29): un `vm` de Node con un DOM de mentira (`document.getElementById` que devuelve objetos sueltos, `localStorage` como `Proxy` para que `Object.keys(localStorage)` liste las claves) carga `app.js`, y `?test` deja el resultado en el `innerHTML` de `#main`; sirve para correr también los verificadores y escenarios (rondas, sincronización con un Firestore simulado, IA con un `fetch` simulado) en segundos.

## Auditoría 2026-10-13 — reglas que dejó

- **Seguridad (las 4 apps comparten dominio y localStorage):** todo lo que llega de Firestore o de un respaldo pasa por
  `_limpiarGrupos`/`_limpiarClase`/`_limpiarStats`/`_limpiarRacha`/`_nivelOk` (ids `_idOk`, números `_num0`, textos cortos) y se
  pinta con `escHtml`. Los errores de un respaldo importado pasan por `_limpiarHTML` (quita scripts/on…/javascript:) y la ronda en
  curso no se importa. **Reglas de Firestore:** antes cualquiera podía LISTAR la colección `syncs` (comprobado con la API REST); las
  reglas nuevas (solo `get` por id de 64 hex, `create/update` con campos conocidos, sin `list` ni `delete`) se pegan a mano en la consola.
- **Librerías de afuera con huella (SRI):** `SRI` + `cargarScript` (una promesa por librería). Si subes una versión, saca la huella nueva
  (el comando está junto a `SRI`). pdf.js 3.11 se abre con `isEvalSupported:false` (CVE-2024-4367).
- **sw.js:** abrir la app sirve la copia guardada AL INSTANTE y baja la nueva en segundo plano (antes esperaba la red hasta 4 s);
  `./` ya no se guarda aparte de `./index.html`. La app busca actualizaciones como mucho cada 30 min.
- **"repetir"/"agrupar"** solo repintan su fila (`_repintarFilaProgreso`): repintar el ejercicio borraba la respuesta y "Siguiente".
- **Enter:** en una casilla de Tu proceso pasa a la siguiente (nunca salta de ejercicio); en una casilla de respuesta sin contestar, comprueba.
- **Números:** "1,250" = 1250 (en PR la coma separa los miles), "2,5" = 2.5; escribir "1/2" o letras en una casilla de número da un aviso
  (`aviso:true`) que no cuenta como error.
- **Atajos del ícono** (`manifest.json → shortcuts`): `?practica=<tema>` y `?ir=errores` (`_atajoInicial`, limpia la URL).
- **"Practicar" un grupo** empieza la ronda directo. **Grupos:** `tamanoMezcla` acepta ids o módulos (`nTemas`: "1 tema").

## Capítulos 6, 7 y 8 de Álgebra (2026-10-20)

- **PDFs del E-Book** en `educosoft/cap6|7|8` (fuera de git). 18 temas del libro (`dec-*`, `suma-resta-dec`, `mult-div-dec`, `ecuaciones-dec`, `geometria-dec`,
  `porciento-*`, `interes`…, secciones 6.1–8.5), 9 temas "— EducoSoft" con las preguntas EXACTAS de la Tarea y los Quizzes (más abajo; los `educo-cap6|7|8` con números al azar ya no existen) y los Repasos y
  Autoevaluaciones EXACTOS del libro (`repaso-cap6|7|8`, `autoeval-cap6|7|8`: secciones 6.6/6.7, 7.6/7.7, 8.7/8.8). Faltan a propósito Repaso 8 n.º 10 y 52 y
  Autoevaluación 8 n.º 2 y 6 (ambiguos). Los números decimales pasan SIEMPRE por `dN()` (quita basura de coma flotante); las respuestas numéricas se comparan
  exactas (`TOL_EXACTA`); el redondeo es `redondeaK(v, k)`; el impuesto de venta sube al centavo de arriba (`alCentavoMayor`).
- **Dinero** (`ej.dinero` en tipo `num`, o `din:true` en un campo de `multi`): se acepta con o sin `$`, y "$−6,072.31" avisa que el signo va ANTES del `$` (EducoSoft lo marca mal).
- **Sí/No y listas de 2 opciones** cambian de lado al azar por ejercicio (`_invPos`); las prácticas exactas (`__n`/`nuevaRonda`) y las rotuladas (a)/(b) no.
- Las figuras de los Repasos son SVG a mano (`svgF`, `txF`, `dashF`): para ver una página del PDF se puede dibujar con pdf.js en una página temporal y guardarla como PNG.
- Los parsers de `verificar-respuestas.js` para los temas al azar de los caps. 6-8 se escribieron el 2026-10-29 (ver "Auditoría 2026-10-29"). Pendiente: tareas de 8.2-8.3 cuando las haga
  (sus preguntas exactas se agregan como bancos nuevos + su cadena de temas, ver abajo).

**Tareas y Quizzes de EducoSoft (2026-10-20, pedido de la usuaria: "que sean los mismos siempre")**: los bancos `educo-hw6|qp6|qz6|hw7|qp7|qz7|hw8|qp8|qz8`
(`_modEducoTQ`, `sinReloj:true`; los 9 YA NO son temas sueltos —repetían los 9 temas "— EducoSoft" y metían 2 preguntas siempre iguales en cada mezcla—: la usuaria pidió quitarlos, primero el cap. 6 y
después el 7 y el 8 (2026-10-20); sus bancos siguen en `EDU_BANCOS` y de ahí salen los temas) son las 102 preguntas EXACTAS de sus 9 evaluaciones, en orden, con las opciones a)–e) como las puso EducoSoft (reemplazaron a los
`educo-cap6|7|8` con números al azar). Cada una se escribe con sus números en una llamada a un constructor `bResta/bEst/bEq/bImp…` (junto a `_modEducoTQ`); la respuesta sale
del código y se comparó con lo que EducoSoft marcó correcto. Sale una etiqueta chiquita "Capítulo N" en la esquina de arriba (`.capEsq`, también en los Repasos y Autoevaluaciones);
`_pideDe` la quita del "Qué te piden". Si EducoSoft cambia algo o ella hace otra evaluación, se agregan sus preguntas igual (resultados: `TestPaperResults.aspx?ID=<attempt>&tid=<test>` y
`ViewStudentResponse.aspx?Qid=<q>&Tid=<attempt>`).

**Ejercicios del libro 6.2 (QUITADOS, 2026-10-20)**: hubo un piloto `libro-6-2` (los 76 ejercicios de "Ejercicio 6.2" del E-Book, publicado en el commit 6ea531b: ahí está el código si se quiere
recuperar). La usuaria pidió limpiar el cap. 6 ("los que estén de más"): los 76 repetían una sola habilidad y metían siempre sus preguntas 1 y 2 en la mezcla. Para que no se perdiera nada de
lo que se estudia, el tema al azar `suma-resta-dec` ahora genera los 10 tipos de esos 76: se le agregaron `estima` (EducoSoft: "al número cardinal más cercano"; el libro: estimación frontal),
`restaRed` ("resta B de A y redondea la diferencia", n.º 28) y las 2 frases nuevas de `frase` ("suma la diferencia | la suma de a y b a la diferencia entre c y d", n.º 75–76); el autotest comprueba
que salen. Las otras secciones (6.1, 6.3, 6.4, 7.x, 8.x) nunca tuvieron lista del libro: siguen SOLO al azar (el libro trae ~1,000 ejercicios: 99, 127, 158, 70, 91, ~90, 60, 134, 78, 37, 41, 10).
Para ver una página de un PDF sin servidor: `Windows.Data.Pdf` desde PowerShell 5.1 (`PdfDocument.LoadFromFileAsync`, `GetPage(i).RenderToStreamAsync` con `AsTask` por reflexión) guarda un PNG que se lee con Read.
Ojo: un grupo/mezcla/ronda guardados con un tema que se quitó se limpian solos (`_modOk` en `_limpiarGrupos`/`_limpiarClase`; `restaurarSesion` descarta la ronda): si quitas otro tema, ya está cubierto.

**Tipos de EducoSoft de los caps. 7 y 8 que los temas al azar no tenían (2026-10-20, al quitar la Tarea/Quizzes 7 y 8: "que no se pierda nada que tenga para estudiar para el examen")**: aunque las 60
preguntas exactas siguen en los temas "— EducoSoft", se agregaron sus tipos al azar para practicarlos con números nuevos: `razones` (cap. 3): razón con UNIDADES DISTINTAS (monedas de 10 centavos/niqueles/pesetas, pulgadas/pies/yardas,
minutos/horas: se pasan a la misma unidad y se simplifica); `formulas-dec`: `hCil` (V = 3.14 r² h, hallar h a la centésima); `aplicaciones-dec`: `figura` (razón altura/base de un paralelogramo con `svgParalelo`; la altura es la línea punteada,
no el lado inclinado); `ecuaciones-dec`: `fraccion` ((n/b)x ± c = d), `fracComb` ((a/b)x − (c/d)x = x − e/f) y `fracConst` (p/q + kx = r, la respuesta es una fracción), estas con `ecL`/`fracDe`. Se comprobaron con cuentas aparte
(1,836 razones, 1,128 cilindros, 560 figuras y 3,049 ecuaciones con fracciones, todas bien) y el autotest exige que salgan. Para revisar qué tipos de EducoSoft faltan al azar: sacar el esqueleto (números → #) de las preguntas de cada
`EDU_BANCOS` y buscar su frase en lo que generan los temas al azar (cuidado: `limpia` mete espacios, p. ej. "8 horas ," y "cm 3").

**Etiquetas, casillas y temas "— EducoSoft" en la lista de Temas de Álgebra (2026-10-20, pedidos: "ponles etiquetas y que se puedan seleccionar cuál quiero, como en Repaso de ayudante" y "que un mismo tema tenga su versión al azar y su versión de EducoSoft", elegida la opción más completa)**:
- **Casillas:** cada fila de la lista de Temas de Álgebra tiene su casilla (`.temaFila`; `_conCasillas()` = materia `ayud` o `mate`; `selTemas` en `mate_seltemas_v1`) y decide qué entra en la "Mezcla de capítulo" (`construirCola`, `_mezclaTexto`); sin casillas, la mezcla trae todo como siempre. Con SOLO temas fijos marcados cada uno entra completo (`vecesDe`); mezclados con temas al azar cada fijo entra 2 veces y siempre son sus preguntas 1 y 2 (`_sig` = nº de vez en la ronda; ya pasaba en la mezcla normal). World Culture y Circuitos no cambian.
- **Temas "— EducoSoft" por tema:** `_EDU_TEMAS` (tras los bancos de arriba) crea 9 temas que reparten las 102 preguntas EXACTAS de la Tarea y los Quizzes por tema (Tarea → Quiz de práctica → Quiz): suma-resta 10, mult-div 17, dec-frac 6, orden-op 6, promedio 3 (cap. 6), ecuaciones 12, fórmulas 3, problemas 15 (cap. 7) y razones-prop 30 (cap. 8: el 8.1 de su curso; sus temas al azar están en los caps. 3 y 5). El tema de cada pregunta es el 6.º argumento de `_modEducoTQ` (`'sr sr md …'`, en el cierre de cada banco; `EDU_BANCOS` los guarda): una Tarea/Quiz nueva lleva el suyo. Son `extra:true` (no entran en la mezcla normal, ni en la general, ni en "Marcar todo" de Elegir temas: ya están en la Tarea y los Quizzes completos; se marcan con su casilla) y van justo debajo de su tema al azar (`_debajoDe`).
- **Etiquetas** (`m.tag`, la burbuja `.ayTag` de Repaso de ayudante; colores `.ayTag.azar/.libro/.educo`, claro y noche): `educo` "EducoSoft" = `educo-*`; `libro` "Del libro" = `repaso-*`, `autoeval-*`; `azar` "Al azar" SOLO si otro tema fijo lo copia (`cubre` = ids de los temas al azar que copia; lo declaran los "— EducoSoft"). Un tema con una sola versión (6.1, 7.3, 7.4, 8.x…) va SIN etiqueta (pedido: "que tenga etiqueta si se repite"). `m.rep` (= `azar` o tiene `cubre`) hace que `ayTagHTML` escriba «Se repite · Al azar / EducoSoft» (pedido: "que la etiqueta diga que sí se repite: lo mismo pero con otros ejercicios"); las versiones del mismo tema comparten COLOR (pedido: "que la etiqueta sea del mismo color"): `_COLORES_GRUPO` + `_raiz` juntan por `cubre` (aunque estén en otro capítulo: razones, proporciones y razon-unitaria-prop con `educo-razones-prop`), `m.gc` es el color del grupo y `ayTagHTML` lo pone como `--gc` en `.ayTag.gr`; las que no se repiten (Tarea/Quizzes completos, Repaso, Autoevaluación) conservan su color de tipo; una nota arriba de la lista (solo Álgebra, en `pantallaTemas`) lo explica; cuando la otra versión está en OTRO capítulo, `_otroLado(m)` pone bajo el nombre dónde está ("También de EducoSoft: capítulo 8 (…)" / "También al azar: capítulo 3 (…); capítulo 5 (…)"; hoy solo Razones y proporciones: caps. 3 y 5 ↔ cap. 8); la Tarea y los Quizzes completos, Repaso, Autoevaluación y los Departamentales llevan solo su tipo (sus preguntas son las MISMAS, no otras). El autotest comprueba la regla, que los 9 temas reparten las 102 preguntas idénticas y las mezclas con casillas.

## Auditoría 2026-10-21 — reglas que dejó

- **El JavaScript vive en `app.js`** (ver "Archivos" y "Cómo probar / desplegar": `?v=` de `index.html` = número de `CACHE` en `sw.js`; el núcleo —`index.html` y `app.js`— se precachea sin `catch`). `sw.js` solo reescribe la copia guardada de `index.html` si el ETag del servidor cambió.
- **"Siguiente"** (`_siguientePuesto`) va a la próxima página que todavía no se abrió (después de la actual y, si no hay, desde la primera); la ronda termina cuando se abrieron TODAS. Las páginas saltadas o solo vistas no vuelven: se cuentan aparte en el resumen. Antes era siempre la página de al lado y desde la última (se llega con "Pág.") acababa la ronda con páginas sin ver.
- **Resumen de la ronda** (`_rondaContadas` = acertadas + falladas que cuentan): el porcentaje es solo de lo que cuenta; "saltaste N" y "viste la explicación de M" salen aparte. Al volver a una página ya contestada (`_notaPreviaHTML`) sale "Ya la contestaste: estaba bien / la fallaste / viste la explicación".
- **Ronda guardada compacta:** un fallo (`sesionFallos`) o una repetición pendiente que es de una página ya guardada en `mate_sesion_ej_N` solo guarda su número de página (`p`, `_compactarEj`/`_desCompactarEj`); los de las prácticas del examen o los que ya no coinciden con su página se guardan completos. Las páginas se escriben ANTES que la ronda.
- **`guardar()` con el espacio lleno:** primero suelta lo único desechable (`mate_sesion*`) y reintenta; si aun así no cabe, avisa UNA vez (`_sinEspacio`). Un `mate_sesion*` que no cabe no avisa. `importarRespaldo` también avisa si no cabe. Las 4 apps comparten el espacio del navegador.
- **Números con coma** (`numLimpio`): "1,250" = 1250 (miles), "0,375" = 0.375 (un número que empieza en 0 no lleva miles), "2,5" = 2.5; si una coma de exactamente 3 dígitos daría la respuesta como decimal ("2,375" cuando era 2.375), sale un aviso (`aviso:true`, no cuenta como error).
- **`escHtml` escapa también `"` y `'`:** se usa dentro de `value="…"` (nombre del grupo) y un nombre con comillas abría un atributo nuevo.
- **Calculadora:** `+`/`−` seguido de `%` calcula el % DEL número anterior (200 + 15 % = 230); después de × o ÷ es solo ÷ 100 (80 × 15 % = 12).
- **Versión nueva de la app:** si hay una pregunta sin contestar, espera (`_swReloadPendiente`); se pone al salir de la app (`visibilitychange` oculto) o al cambiar de pantalla, pero NO al seguir practicando (recargar ahí te devolvía a la pregunta que acababas de contestar). Al cambiar de pantalla `ir()` borra primero la ronda (salvo que esté pausada) y DESPUÉS recarga: antes recargaba antes de borrar y al abrir la app volvía a salir la misma pregunta.
- **IA (mismos arreglos que Fit F):** `AI_MODELS` sin repetidos (3.1-pro → 3.8-flash → 3.6-flash → 3.5-flash-lite); los modelos que fallaron se recuerdan entre aperturas en `ai_skip_mate_v1` (sin `mate_`: no va al respaldo ni a la sincronización): 10 min, y 24 h si el 429 dice "limit: 0" (el Pro con la clave gratis); el último (el básico) nunca queda fuera; el mensaje de un 429 distingue por minuto / por día / ningún modelo gratis pudo (no es tu límite). Guardar o quitar la clave limpia las pausas.
- **Progreso → "Lo que te falta para el Parcial 2"** (solo Álgebra; `_faltaParcial2`, `_parcial2HTML`, `practicarParcial2`): los temas de los caps. 6-8 de la mezcla (sin los "— EducoSoft", que suman a su tema al azar por `cubre`) sin practicar o por debajo de `PARCIAL2_META` (70 %); el botón arma una mezcla con ellos (`clase`, como "Practicar" un grupo).
- `.calcBtn` usa `backdrop-filter: blur(8px)` (era el blur(40px) del vidrio de las tarjetas, recalculado en cada cuadro del scroll en todas las pantallas).
- Pendientes de esa auditoría: el simulacro con reloj de los caps. 6-8 (la usuaria quitó después todos los simulacros) y "Otro parecido" en Repasar mis errores (hecho el 2026-10-29).

## Explicaciones de los caps. 6, 7 y 8 (2026-10-21, pedido: "que sea fácil de entender y tenga todos los pasos de dónde se sacan las cosas")

Todos los temas de los caps. 6-8 (al azar, "— EducoSoft", Repasos y Autoevaluaciones) explican con `receta()`: cada paso con título que dice QUÉ se hace, y cada número sale de su cuenta. Las respuestas NO cambiaron (comprobado contra la versión anterior con la misma semilla: 14,850 ejercicios, 0 diferencias). Ayudantes (junto a `sumaSignos`, `pasosDivDec` y los Repasos):
- `explRed(v, k)` redondeo explicado (qué dígito es el del lugar, cuál decide, qué pasa con el 9, cómo queda); `pctDec(p)` / `decPct(v)` el porciento ↔ decimal con su "÷ 100 / × 100"; `divLarga(n, d)` la división a mano cifra por cifra (se detiene cuando lo que sobra se repite: de ahí la barra); `fracDecL(n, d)` la usa y escribe el decimal (`0.8611…`).
- `pasosMultDec(a, b)` "sin los puntos" + cuenta de lugares (pone el punto con sus ceros: `641.4510 = 641.451`); `pasosDivDec(a, b)` corre el punto del divisor, divide y dice si la división no termina (`lugares(q) ≥ 9` tras `dN`); `_corta(v, k)` muestra k decimales sin redondear con "…".
- `receta({ …, truco })`: el `truco` ya no se pinta en recuadro (2026-10-25); lo que cuenta es `ej.facil` (versión corta). `MCx(enun, ops, ok, R)` (opción múltiple de EducoSoft) y `ecL` (ecuaciones: dice por qué se suma/resta/divide en los DOS lados) ya la usan.
- Repasos y Autoevaluaciones: `uiR(cab, enun, resp, R, ayuda)` y `ejR(cab, enun, campos, R)` con `R = { pasos:[_pa('título', líneas…)], resp, comp, error, truco }` (el "Qué te piden" sale del enunciado; en `ejR` la respuesta sale de las casillas). `ui`/`ejVarios5` (con `aReceta`, títulos adivinados) siguen para los demás capítulos.
- **Dibujos con flechas (2026-10-21, pedido: "ponles flechas y esas cosas si es necesario")**, todos con el naranja `#e8a23a` de `diagFrac` y su nota corta debajo (`_nota`): `diagPunto(v, k, nota)` el punto decimal que salta k lugares (una flecha numerada por lugar, punto viejo gris y nuevo naranja, ceros agregados en naranja, ceros que no cuentan apagados; lo usan `pctDec`/`decPct`, `pasosMultDec` (salta desde el final), `diagCorreDiv` (divisor y dividendo) y potencias de 10); `diagRed` el redondeo (cuadro en el lugar, flecha del dígito que decide: "sube"/"se queda"; es el primer renglón de `explRed`); `tablaLugares(xs, 'ult'|'dif')` tabla de valor posicional con los nombres en vertical (leer, comparar, decimal → fracción); `diagAmbosLados` (ya existía) en `ecL`, `despejarDec`, fórmulas y C = T · B — si no cabe en un teléfono, el renglón del medio pone solo la operación; `diagSustituir(pares)` cada letra con flecha a su número ("?" = la que se busca: fórmulas, C = T · B, I = Prt, compuesto); `diagCadena(inicio, [[qué se hace, queda]…])` cajitas de arriba a abajo (balance, descuentos, impuesto, comisión, propina, préstamos) y `_escalera` = la misma para orden de operaciones; `diagFilas` dos filas con la misma flecha a los dos lados (escala, precio por unidad); `diagEntreRaiz` recta numérica de √n; `svgTriRect` (ya existía) en Pitágoras; `diagCruzados` (ya existía) en cada "Multiplica en cruz". Probado en pantalla de 360 px: nada se sale de la tarjeta y ningún dibujo queda a menos de 75 % de su tamaño. El "Ejemplo con este mismo" que se arma de las líneas (`_ejDe`) salta los dibujos y `_sinDibujo` les quita el texto (si no, los números del dibujo se colaban). Autotest: "dibujo del punto que salta".
- **Figuras de geometría (2026-10-21, tema `geometria-dec`, 7.4; el libro trae 33 figuras en esa sección y los ejercicios al azar no tenían ninguna)**: SOLO en la explicación (el enunciado no cambia ni sus números: comprobado con la misma semilla). Ayudantes justo antes de `const PI` (`_gt/_gp/_gl/_gAng/_gFig`, naranja `_GN`): `figRect(Lt, At, 'per'|'area', cuad, centro)` (con la flecha de la vuelta; `centro:'cerca'` en el terreno), `figTriPer(ls, lt)` (triángulo a escala; si queda muy flaco dibuja uno cualquiera y la nota dice "no está a escala"), `figTri` (altura punteada + ángulo recto), `figTriMitad` (rectángulo partido por la diagonal), `figTrap` y `figTrapPar` (la copia volteada que forma el paralelogramo de base B + b: explica de dónde sale el ½), `figCirc(rt, dt, 'circ'|'area'|'radio', extra)` (rótulos AFUERA del círculo: adentro no caben), `figCaja(…, 'vol'|'sup')` (la de 'sup' lleva una leyenda de colores de las 3 parejas de caras), `figCil`, `figAnillo`. Cada tipo trae pasos con título (figura, base, mitad…) y una `compN` con los números (sale antes de la nota de unidades). **Figura en el ENUNCIADO (pedido: "ponle la figura al primer ejercicio, al 2.º no; solo si lleva figura")**: solo en los tipos que el libro dibuja (rectángulo, cuadrado, triángulo —perímetro y área—, terreno a cercar, caja, cubo, anillo) y en el trapecio (pedido aparte); NO en área del rectángulo, círculo, cilindro ni superficie de la caja. `figEnun(() => figXxx(…))` pone `_figN = true` (la figura sale sin flechas, sin colores de pista y sin nota: solo las medidas) y la envuelve en un div de 300 px. `figToca()` (dentro de `gen`, usa `this._n`) alterna SOLO entre los tipos que llevan figura: el 1.º con figura, el 2.º solo texto; `nuevoEjercicio` pone `_n = 0` en cada ronda nueva y `_pintarEjemploTema` restaura el contador (el ejemplo no gasta turno). La explicación conserva sus figuras. Para comparar con una versión vieja hay que quitar ese div del enunciado (ver `compara.js`). Los valores se pasan ya con su unidad; ojo con `ls.map(fd)` (el índice se cuela como decimales: usa `v => fd(v)`).
- No pongas títulos "Haz la cuenta"/"Resultado"/"Queda": el revisor de la sesión los marcaba como flojos. Para editar código de app.js desde un script usa `split/join`, NUNCA `String.replace` con texto que tenga `$'` (insertó el archivo dentro de sí mismo).

- **Recta numérica de decimales (2026-10-21, 6.1 C del libro: "traza la gráfica de los números en una recta numérica")**: `rectaDec(pts, { lo, hi, dist })` (junto a `diagPunto`; marca cada 0.1 si el tramo mide ≤ 3, enteros rotulados, puntos naranja con su número; devuelve '' si el tramo pasa de 12 unidades) y `rectaNota(pts, nota, o)` (con la nota debajo, '' si no se pudo). `dec-comparar` la dibuja en sus tres explicaciones (valor absoluto = flecha del 0 al número, comparar, ordenar). Módulo nuevo `dec-grafica` (6.1, en SECMAP): el enunciado trae 4 rectas A–D con un punto cada una y se contesta tocando la letra (`tipo:'opciones'`, respuesta 'A'…'D'); el número se redondea a la décima (nunca centésima = 5) y las malas son errores típicos (otra décima, el otro lado del entero, el signo). Caps. 8: el libro solo dibuja las figuras sombreadas del repaso 8.7 y ya estaban en `repaso-cap8`.
- **7.2: razones con figura (2026-10-21)**: el tipo `figura` de `aplicaciones-dec` sortea entre `para` (altura/base del paralelogramo, `svgParalelo`), `cuad` (lado/perímetro del cuadrado, `svgCuadrado`: siempre 1 : 4) y `diag` (base/diagonal de un rectángulo, `svgRectDiag`), los tres del libro. Los tres son `tipo:'frac'` con `pedirSimple`; en `diag` el decimal a la décima que pide el libro sale en la comprobación. Ese sorteo cambia lo que sale del tema con una semilla fija (por eso `compara.js` marca `aplicaciones-dec` como diferente: es esperado).
- **Botones bajo el ejercicio con la explicación abierta (2026-10-22)**: la fila `#accionesPre` (Saltar · Ver explicación · Reiniciar) cambia en `_pintarVistaExplicacion`: el botón del medio (`#btnVerExpl`) pasa a ser **"Otro parecido"** (`otroDelMismoTema()`, el mismo de "Otro de este tema" de la vista ya contestada: otro ejercicio del mismo tema sin gastar un puesto de la ronda). En las prácticas del examen (`nuevaRonda`) se oculta, porque cada página es SU pregunta.
  Ya contestado, la vista de resultado también trae esos dos botones en UNA fila (`row tres`: "↺ Reiniciar" y "Otro parecido"; antes eran dos botones apilados con letra chica, ahora la explicación va en `title`/`aria-label`).
- **Examen Parcial 2 (caps. 6, 7 y 8), práctica de EducoSoft (2026-10-22)**: módulo `educo-parcial2-p1` (sección `8.9`, `extra:true`, al final del cap. 8), las 25 preguntas EXACTAS del intento 1 de la usuaria (attempt 467035583, tid 3172357, 25/25 en 47 min), en orden y con `nuevaRonda` (como `_modExamen`, pero con su constructor `_modParcial`; el texto de cada pregunta quedó en `parcial2-practica.md` del scratchpad de esa sesión y está en el banco `_P2`). Reusa ayudantes de las Tareas/Quizzes cuando el enunciado era idéntico (`bSumaRed`, `bDecFrac`, `bProd`, `bCamisas`, `bMaq`, `bRazU`; `_aMC` pasa el de respuesta numérica a opción múltiple). `ej.pct:true` en una pregunta numérica deja escribir "212%" (la casilla de EducoSoft trae la tecla %). Tres diferencias con EducoSoft: "9 : 5" (razón de niñas a niños) se contesta con la casilla de fracción 9 sobre 5 (igual que en `educo-hw8`), la mejor compra son dos casillas (precio y onzas) y el "Ver explicación" lo da la app. Ojo: es la PRÁCTICA (fila 38 de Assessments); el examen real (fila 39, 0 de 1 intento) no se toca. EducoSoft cambia los números en cada intento: otro intento = otro módulo `educo-parcial2-p2`…
  **Intento 2 (2026-10-23)**: módulo `educo-parcial2-p2` (banco `_P2B`, attempt 467037067, 25/25 en 51 min; otros números y otros tipos que el intento 1: sumas de dinero, mixtos, un censo con respuesta de número mixto + %, "Cierto/Falso" de dos opciones, etc.). Reusa `bDecMix`, `bProm`, `bImp`, `bEq`. Ojo con la 15: EducoSoft escribe "¿Qué porciento de 2.8 es el número 40?" y marca correcto 7% (2.8 ÷ 40); se dejó idéntico y la explicación lo aclara. Para el intento 3: otro módulo `educo-parcial2-p3`, mismo método (ver memoria educosoft-mags120i).

## Sin recuadros, Fácil/Completa y casillas de colores (2026-10-25, pedidos de la usuaria; v181–v189)

- **Cero recuadros en los ejercicios.** `.fb`, `.nota` y `.banner` ("Practicando: … Quitar") son texto suelto, sin fondo ni borde; los avisos son `.fbTxt`. No agregues tarjetas con borde dentro del ejercicio ni de la explicación (se quitaron "Receta para el examen" y "Truco…"; `.truco` ya no existe).
- **Respuesta al lado de lo contestado** (`_ponerRespuesta(ok)`, la llama `mostrarFb` y `_pintarVistaExplicacion`): `num` → `.respSola` DENTRO de la casilla (✓ si acertó, la respuesta si no; su ancho sale de `--rs` según lo largo del texto, ya no 6.5rem fijo); `frac`/`mixto` → `.respLado` a la derecha; opciones/sino/cmp → `.opOk` (verde, la correcta) y `.opMal` (roja, la que escogió) con `.conMarcas`; los demás tipos → una línea `.respLinea`. Si ya está puesta (abriste la explicación y después contestaste), no repite: solo pasa a ✓ si acertó.
- **Casillas que se iluminan** (`_iluminarCasillas(ok)`, `_bienMulti`): cada casilla (`.campo.bien` verde / `.campo.mal` roja) según SU parte: número (`inNum`), fracción, mixto, ángulos, base/exponente/valor, coeficiente/variable y los `multi`. Si iluminó algo, `mostrarFb` deja la zona con `.respondida` (solo se apaga lo demás) en vez de bajarle la opacidad a todo.
- **Fácil / Completa** (`ej.facil` = `receta(_F(pide, pasos, ejemplo, truco))`): `explPorQue(ej)` pinta los botones (`_explModo`, `mate_expl_modo_v1`, por defecto 'facil') y las dos versiones; sin `ej.facil` sale la explicación de siempre. La Fácil es CORTA y el atajo es el camino (ver memoria feedback-explicaciones-mate). Hoy la tienen: Examen Parcial 2 (`_P2F`/`_P2BF`, 25 + 25, vía `_modParcial(…, facil)`) y Examen Departamental (`DEP_F1`/`DEP_F2`, 30 + 30, vía `_modExamen(…, () => DEP_F1)`: es una FUNCIÓN porque `_F` se define más abajo que las prácticas). Al retomar una práctica guardada, `restaurarSesion` vuelve a sacar `explicacion`, `enunciado` Y `facil`. Si cambias una pregunta del banco, cambia también su entrada Fácil (mismo número).
- **Dibujo "pasa al otro lado"** (`diagPasa`): flecha + "pasa sumando/restando/multiplicando/dividiendo/volteado". `diagAmbosLados` es ahora un envoltorio que lo usa (con `_diagAmbosViejo` de respaldo); el dibujo viejo "en los DOS lados" no se entendía. Las notas repetidas se quitan con `_sinNotasRepetidas` (`data-k`).
- **Sin línea "Pregunta N de M"** sobre el enunciado de los exámenes, y sin "Simulacro de … con reloj" en NINGUNA práctica: ni en el Parcial 2 ni en el Departamental (2026-10-29: la usuaria lo pidió). Ese mismo día se borró el código del modo examen/simulacro, `sinReloj` incluido (ver "Modos de práctica").
- **"Saltar" se esconde** al tocar "Ver explicación" (`#btnSaltar`, en `_pintarVistaExplicacion`): queda "Siguiente ejercicio".
- **Lo escrito se conserva ya contestado**: `_borradorActual()` ya no se anula con `respondido`, y `restaurarSesion` lo vuelve a poner siempre; antes, al reabrir la app, la casilla salía verde/roja pero VACÍA.
- **Dinero**: `fmtRespuesta` de un `num` con `dinero:true` da `$124.00` (`din$`) si tiene ≤ 2 decimales. `bYardas` (telas, cap. 7): si el precio de 1 yarda no sale en centavos exactos (24.80 ÷ 4.4 = 5.636…) usa "cuántas veces cabe" (22 ÷ 4.4 = 5; 24.80 × 5); antes guardaba 123.999999992 y la explicación decía $5.64 × 22 = $124.00 (da 124.08).

## Auditoría 2026-10-29 (v192) — reglas que dejó

Pedido: "busca bugs, mejoras, cosas nuevas en toda la app"; se aplicaron los puntos 1–21, 23 y 25–34 del reporte (queda pendiente el 22, el 24 y el 28 — ver abajo). Se probó con el autotest (488), un
`vm` de Node con DOM de mentira, el navegador del panel y los verificadores independientes. Lo que cambió y por qué:

- **Bugs de rondas:** (1) ver "Versión nueva de la app". (4) la ayuda de IA antes de contestar marca la página como vista. (5) `_ejDelPuesto`: una repetición ("repetir si fallo") solo se mete en el puesto `i` si NO hay un
  puesto abierto más adelante (`alFrente`) —lo planeado (`sesionOrden`) se corre un lugar, pero lo abierto no, y con saltos de "Pág." un tema salía 1 vez y otro 3 (111 de 120 rondas de prueba salían desparejas)—; si saltaste,
  la repetición espera al primer puesto nuevo después del último abierto o a su puesto extra del final (`reservado`: `sesionOrden[i] === '*'` o `i >= sesionOrden.length`). En una práctica fija del examen (`nuevaRonda`) las
  falladas vuelven en los puestos extra del final (antes ese puesto repetía la pregunta 1).
- **Las dos prácticas del Examen Departamental son `extra:true`** (como las de Parcial 2 y las "— EducoSoft"): ya no entran en "Empezar a practicar" ni en las mezclas de capítulo (metían siempre sus preguntas 1 y 2, y las
  dos empiezan con "Resta: 83 − (−31)"). Se siguen practicando con su botón en Temas, con su casilla, en un grupo y con el atajo del ícono. "Empezar a practicar" de Álgebra pasó de 164 a 160 preguntas.
- **Seguridad del respaldo:** `mate_historial_v1`, `mate_racha_dias_v1` y `mate_errores_v1` se limpian al cargar (`_limpiarHistorial`, `_limpiarRachaDias`, `_limpiarErrores`) como ya se hacía con stats, racha, grupos y clase:
  se pintan dentro de HTML y un respaldo armado podía meter código (las 4 apps comparten dominio y localStorage).
- **Números:** `verificar` (tipo `num`) acepta "$" en TODOS los temas de dinero (antes solo con `dinero:true`, donde el signo sigue yendo antes del $); la regex del % era `/s*%s*$/` y ahora es `/\s*%\s*$/`.
  `dN` limpia por cifras significativas a partir de ~1 millón (512.844 × 10,000 daba 5128440.000000001: un ulp ya pasa de 1e-9 y el redondeo a 9 decimales no lo quita).
- **Textos:** `deDe(s)` (de + artículo con contracción: "del Sr. Sandoval", "del disco de 40 GB") y las frutas con su artículo ("las manzanas", no "los manzanas"); el cambio de precio muestra el dinero con centavos
  ($231.00 a $249.48) y el galón de leche cuesta pocos dólares. **"Leer y escribir decimales":** un nombre se leía de dos maneras ("sesenta y seis centésimas" = 0.66 y 60.06) —lo encontró el verificador nuevo—; el
  generador ya no da una parte entera que acabe en decena sola (30, 40… 130…) con un numerador de una cifra y centésimas o más (`dec-palabras`) y la explicación aclara que la "y" de "sesenta y seis" es parte del número.
- **Avisos y diálogos (`confirmarAccion`/`avisar`)**: `role="dialog"`, `aria-modal`, `aria-labelledby`, el foco va al botón principal (y vuelve a donde estaba), Escape los cierra (Cancelar / Entendido) y con uno abierto el Enter
  global (siguiente ejercicio) no actúa por detrás. `_dlgN` es `var` a propósito (`avisar()` puede correr durante el arranque, p. ej. por un `guardar` sin espacio). **Código del Enter:** el escucha global de `keydown` ya
  comprueba / avanza; se quitaron los tres bloques de "Enter comprueba" por casilla (`_enfocarPrimero` solo enfoca la primera casilla en pantalla ancha).
- **Otros:** "Saltar" y "Otro parecido" suben al principio; "Borrar mi progreso" dice que borra las 4 materias (el progreso es de todas juntas); el aviso de ordenar dice "Toca todas las opciones"; Progreso → "Últimos 14 días" lleva
  el número de ejercicios sobre cada barra; código muerto fuera (12 funciones sin uso, el estilo `.aic-nota`, las figuras de ángulos).
- **Verificador independiente (`verificar-respuestas.js`)**: ahora cubre los temas al azar de los caps. 6-8 y Circuitos con fracciones exactas (y BigInt en el interés compuesto): `dec-palabras`, `dec-redondear`,
  `dec-comparar`, `suma-resta-dec`, `mult-div-dec`, `dec-fraccion`, `orden-op-dec`, `promedio-dec`, `ecuaciones-dec` (sustituye la respuesta en la ecuación), `porciento-conv`, `porciento-formula`, `interes`, `formulas-dec`,
  `comercial-dec`, `compras-grandes`, `aplicaciones-dec`, `raices-pitagoras` (sin figura), `circ-ley-ohm`, `circ-ley-watt`, `circ-serie`, `circ-paralelo`, `circ-resistividad`: más de 50,000 ejercicios, 0 fallos. Sin
  verificador (no se pueden comprobar con otra cuenta): los bancos de preguntas fijas (World Culture, Repaso de ayudante, Departamental y Parcial 2), `dec-grafica`/`geometria-dec` y las figuras de razones y Pitágoras (dependen
  de un dibujo), la propina "Regla Especial" con figura y "Despeje las fórmulas" de Watt. Se corre en la consola del navegador o en el `vm` de Node (ver el encabezado del archivo); en Windows el Bash de Claude Code se come las
  barras invertidas dobles de un heredoc: los scripts con regex se escriben con la herramienta de archivos, no con `cat <<EOF`.
- **Pendientes que la usuaria no pidió todavía (reporte 2026-10-29):** 22 = explicación Fácil (el truco primero) en los temas al azar de los caps. 6-8 (hoy solo la tienen las preguntas exactas de los exámenes);
  24 = "Lo que te falta" por grupo de examen (como la tarjeta del Parcial 2). **El 28 (Progreso → "Por tema" agrupado por capítulo, más flojos arriba) ya se hizo en v194:** ver abajo. Los cambios visuales de este reporte van de
  uno en uno (su regla de UI): primero salió el 29 (número sobre cada barra de "Últimos 14 días", publicado en v192; ella dijo "si me gusta") y después el 28.

## Volver a una página de la ronda la deja igual (2026-10-29, v193)

Pedido: "si yo le doy para atrás para ver el ejercicio anterior que las respuestas sigan estando ahí, que no se borre". Antes, ir a otra página (mapa de preguntas o "Pág.") y volver mostraba la página VACÍA con el aviso
"Ya la contestaste" (`_notaPreviaHTML`): se perdían la respuesta, el resultado, la explicación y lo escrito sin comprobar.

- **`sesionEst`** = `{ página: { r, v, ri, e, fb, ent, os, bor } }`: contestó, vio la explicación, es un reintento, tiene la explicación abierta, el resultado (`ultimoFeedback`), lo que contestó (`ultimaEntrada`), el orden a
  medias (`ordenSel`) y `borrador` (lo escrito sin comprobar). `_guardarEstadoPagina()` lo llena al DEJAR la página (primera línea de `_mostrarPuesto`) y desde `guardarSesion()`; `_cargarEstadoPagina(i)` pone esas variables al
  llegar (al final de `_mostrarPuesto` y en `restaurarSesion`); `_aplicarEstadoPagina()` corre al final de `pintarEjercicio()` y vuelve a poner lo escrito en las casillas, el orden y el resultado (`mostrarFb(res, false, true)`:
  sin vibrar ni bajar la pantalla) o la explicación abierta (`_pintarVistaExplicacion(true)`, que además quita el aviso "Ya la contestaste/viste la explicación"). Va dentro de `mate_sesion_v1`, así que también sobrevive a
  cerrar y reabrir la app.
- **No se vuelve a contar nada**: volver no llama a `responder`, y `responder` sale de inmediato si `respondido`; `sesionRes`/`sesionVistos`/`sesionFallos`/`stats` no se tocan. Para intentarlo otra vez están "↺ Reiniciar"
  (`reiniciarEjercicio`) y "Otro parecido" (`otroDelMismoTema`): los dos hacen `delete sesionEst[sesionIdx]` antes de repintar, igual que `nuevoEjercicio` (ronda nueva → `sesionEst = {}`) y `_replanearRonda` (que corre los
  números de página: `re(sesionEst)`). Si agregas otra forma de cambiar el ejercicio de una página, borra también su `sesionEst`.
- **Solo guarda si lo que hay en pantalla ES esa página** (`main.dataset.ej === String(sesionIdx)`, existe `#zonaEntrada` y no es `modoErrores`/`modoRepasoRonda`). **`nuevoEjercicio` (ronda nueva) pone `main.dataset.ej = ''`**:
  `guardarSesion()` corre ANTES de pintar el ejemplo del tema y, si la pantalla vieja era la página 1 de otra ronda, su texto escrito y su explicación abierta se guardaban como la página 1 de la ronda nueva (que salía con la
  explicación abierta). Pasa al empezar una ronda sin pasar por otra pantalla; cualquier ruta nueva que lo haga necesita lo mismo.
- **`ultimaEntrada` y JSON:** el arreglo de `multi` lleva sus fórmulas en una propiedad suelta (`ent.f`) que `JSON.stringify` perdería: `_entSer`/`_entDes` lo envuelven como `{ _m:1, a:[…], f:[…] }` (en `sesionEst` y en
  `ultimaEntrada` de `mate_sesion_v1`).
- **Rondas guardadas por v192 (sin `sesionEst`)** se siguen abriendo: `restaurarSesion` arma el estado de la página actual con los campos de antes (`respondido`, `vioExpl`, `ultimoFeedback`, `borrador`…); la explicación
  abierta solo se sabe como `vioExpl && !respondido` (igual que antes).
- **Se probó (2026-10-29):** `vm` de Node (contestar mal/bien, ir y volver con `irAEj`, explicación abierta, reiniciar, otro parecido, guardar → vaciar la memoria → `restaurarSesion`, formato viejo, `_entSer`, y la ronda nueva
  que no hereda la pantalla vieja: falla si se quita la línea de `main.dataset.ej`); y en el navegador del panel, con clics reales (mapa de preguntas y "Pág.") y 133 de los 135 módulos: lo contestado, lo escrito sin
  comprobar y la explicación abierta se ven IDÉNTICOS (mismo `outerHTML` de `#zonaEntrada`/`#zonaFb`/`#accionesPre`, salvo los ids `rcN` de las recetas) al ir a otra página y volver (134 de 134 módulos con la respuesta mala
  puesta) y tras guardar y reabrir (las prácticas del examen vuelven a sacar su explicación al reabrir, así que ahí solo cambian los ids `dgN` de las flechas SVG); los tipos
  `orden` (también a medias), `multi` con fórmulas, `texto`, `coefvar` y `basexp` aparte. Una página con 100–900 bytes de `sesionEst` (promedio 112): una ronda de 160 páginas suma ~18 KB a `mate_sesion_v1`. Autotest: 489. **No se restauran:** el paso en que iba la explicación paso a paso, el chat de IA de la página ni la posición del scroll.

## Ecuaciones: el camino SIN negativos (2026-10-29, v193)

Ella mostró la explicación de Google para `9/8 − 9x = 0.5` (4 pasos cortos) y preguntó por qué la "Completa" del ejercicio 8 de la práctica 1 del Parcial 2 era un "revolú". Causa: restaba el 9/8 en los dos lados, la x
quedaba como −9x y aparecían los negativos (4 − 9 = −5, ÷ (−9), voltear la fracción, multiplicar arriba y abajo, regla de signos): 6 dibujos y ~2000 px. Ahora pasa el 9x SUMANDO (9/8 = 1/2 + 9x), luego el 1/2 restando
(9/8 − 1/2 = 9x), 9/8 − 4/8 = 5/8 y 5/8 ÷ 9 = 5/(8 × 9) = 5/72: 5 dibujos, sin negativos; la "Fácil" quedó en 3 pasos con el truco "si la x tiene un − delante, pásala sumando al otro lado".
**Restar con el mismo de abajo en dibujo (pedido de ella, mismo día: "eso en dibujo es más fácil de entender que en texto"):** `diagMismoAbajo(a, b, op, d)` (junto a `diagConvertir`) dibuja `a/d ± b/d = r/d` con una flecha de arriba
(`9 − 4 = 5`) y otra de abajo ("se queda igual") y una nota corta; el Paso 3 del ejercicio 8 lo usa en vez de las dos líneas de texto. **Hoy solo lo usa ese ejercicio:** `pasosSumaF` (rama del mismo denominador, que usan todas las
sumas y restas de fracciones) sigue con texto; ponerlo ahí sería un cambio visual grande: esperar su OK. Regla general que salió de esto: cuando una operación se puede ver con flechas, dibujo antes que texto.
**Regla para explicaciones nuevas:** en `a − bx = c` se resuelve `bx = a − c` (la x pasa sumando) en vez de restar `a` en los dos lados; y fracción ÷ número = el número se multiplica con el de abajo (sin `pasosDivF`, sin voltear,
sin signos). La aritmética se verificó con fracciones exactas (BigInt). Ninguna otra explicación usa `diagAmbosLados` con `÷ (−…)` o con un coeficiente negativo.

## Progreso → "Por tema" agrupado por capítulo (2026-10-29, v194; punto 28 del reporte)

`_porTemaHTML(conDatos)` (junto a `pantallaStats`) pinta la tarjeta "Por tema": un título pequeño por capítulo (`<h3>`, el mismo look que los títulos de capítulo de Temas: sin CSS nuevo; el nombre sale de
`nombreCapitulo`), los capítulos en el orden del curso (`MATERIAS[materia].caps`) y, dentro de cada uno, los temas del más flojo al más fuerte (porcentaje de menor a mayor; a igual porcentaje, primero el que tiene más
ejercicios hechos). Solo salen los temas con ejercicios hechos y los capítulos que los tienen. Un tema de un capítulo que la materia no lista no desaparece: se agrega un título al final (`caps` se completa con lo que traigan
los datos). Cada fila sigue igual (nombre, `p% · ok/total`, barra roja/ámbar/verde). **Decisiones que se pueden cambiar si no le gusta:** capítulos en orden del curso (y no el más flojo primero), sin capítulos plegables y sin
el promedio del capítulo en el título. Autotest: 490 (comprueba el orden de capítulos, el de los temas y que un capítulo raro no se pierde; se probó que falla si se invierte el orden).
Se vio en el navegador del panel con datos de prueba (8 capítulos, 95 temas: todos los grupos salen ordenados de menor a mayor).

## Parcial 2: menos texto y más dibujo (2026-10-29, v194)

Pedido de ella (marcó con rojo el texto de `5/8 ÷ 9 = 5/(8 × 9)` del ejercicio 8): "verifica todos los pasos y todas las explicaciones de las prácticas 1 y 2 de los exámenes parciales 2 para que sea en dibujos
esas cosas que son mejor en dibujos que en texto; menos texto y más dibujo si es POSIBLE Y SOLO SI ES MEJOR". Se leyeron las 50 explicaciones (Completa y Fácil) y se cambió solo lo que mejoraba:
- **Dibujos nuevos:** `diagDivEntero(n, d, k)` (fracción ÷ número: arriba "se queda", abajo `d × k`; ej. 8 de la práctica 1 y la máquina de los acres, ej. 24) y `diagMixDec(e, p, q)` (mixto → decimal: el entero se queda y
  la fracción es arriba ÷ abajo; ya era el dibujo de `bProm`, ahora también el ej. 18 de la práctica 2). En las divisiones de `ecL` con decimales (ej. 9 de las dos prácticas) el "se mueve el punto" es `diagCorreDiv`.
  En el impuesto (ej. 25 de la práctica 2) el 50000 pasa dividiendo en dibujo, como en las otras proporciones.
- **Texto que repetía un dibujo de al lado, fuera:** los "Lugares decimales…" de `pasosMultDec` (la nota del dibujo del punto ya los cuenta; queda "→ 150"), el "El divisor tiene N decimales…" de `pasosDivDec`, los
  "A la derecha hay… pasa RESTANDO" de `ecL`, las cuentas repetidas de `bProm`/`bMaq`, y en las preguntas escritas a mano (práctica 1: 6; práctica 2: 4, 8, 9, 10, 24).
- **Cuenta corta en vez de "la casita":** `pasosDivDec` dice `13.26 ÷ 3 = 4.42` (se permite calculadora; ella no quiso la casita).
- **Cómo se limita al Parcial 2:** `var _masDibujo` (es `var` porque esos ayudantes también corren al cargar otros temas) se pone en true SOLO mientras `_modParcial.gen` arma una pregunta (con `try/finally`);
  los ayudantes compartidos miran ese interruptor. Se comprobó con la misma semilla de `Math.random` que los otros 133 temas dan EXACTAMENTE la misma explicación que antes (8 ejercicios por tema). Si quiere lo mismo
  en otros temas, basta prender `_masDibujo` en su `gen` (o quitar la condición en el ayudante).
- **Lo que se dejó en texto a propósito:** los "Fácil" (ya son cortos), las reglas de signos, los "→ la ecuación queda…", y las cuentas que no tienen un dibujo más claro que la cuenta misma.
Autotest: 492 (dibujos nuevos, sin "Lugares decimales" dentro del Parcial 2, sí fuera de él, e interruptor apagado al terminar). Visto en el navegador del panel: ej. 8, 9 y 24 de la práctica 1; 9, 18 y 25 de la práctica 2.
- **Sin "Respuesta / Comprueba / Error común" (pedido de ella, mismo día: "quita eso, es innecesario", marcando ese bloque al final de la pregunta 23):** en las prácticas del Parcial 2 (Completa y Fácil) esas tres líneas
  ya no se pintan, ni su página "Resultado" del paso a paso (`explReceta` no la crea y el contador dice "Paso 1 de N" con N = los pasos; `_rVer` solo rotula "Resultado" si existe `.rFinal`). Siguen en los datos
  (`receta()` las guarda y agrega la marca `§sinfin|` cuando `_masDibujo` está prendido): la IA las lee (`_aiExplTxt`) y los demás temas las siguen pintando. `_modParcial.gen` arma también la "Fácil" con el interruptor
  prendido. Para volver a mostrarlas: quitar la línea `if(_masDibujo) L.push('§sinfin|')` de `receta()`. Autotest: 493.

## Dibujo de sumar/restar con el mismo de abajo en TODA la app (2026-10-29, v195; ella lo aprobó: "si está bien, hazlo en todos, en los Parciales, en los dos")

Ella preguntó si quería el mismo dibujo en todas las sumas y restas de fracciones y contestó "hazme uno a ver lo que dices". Se puso en `pasosSumaF` (ambas ramas) y en `recetaSuma` (solo con 2 fracciones) en vez de las líneas "X + Y: el de abajo es el mismo…" y "Queda: …".
`diagMismoAbajo` dibuja `a − b` cuando la segunda va negativa (`a + (−b)`); `_arrSuma(x, y)` deja el texto "Arriba: …" solo si el resultado es negativo, el primero es negativo o la suma va "por partes" (si no, el dibujo ya lo dice).
Cambian 10 temas (suma-resta-frac, resta-mental-frac, orden-op-frac, frac-compleja, ecuaciones-frac, de-multiplicar, repaso/autoeval cap. 4 y 5); los demás dan la misma explicación (se comparó con la misma semilla, salvo los ids `dgN`).
Además la pregunta 17 de la práctica 2 del Parcial 2 (`3/3 − 1/3` al "prestar" 1 entero) usa `diagMismoAbajo(3, 1, '−', 3)`; era la única resta de fracciones en texto de las dos prácticas del Parcial 2 (se buscó en las 50 explicaciones). Autotest: 494. Pendiente de publicar como mate-v195.
