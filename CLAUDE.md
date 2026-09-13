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

**Línea `TRUCO:` — obligatoria.** Toda explicación termina con una línea que empieza con
`TRUCO: ` y da el atajo para resolver ese ejercicio más rápido la próxima vez (no un
resumen de los pasos: el camino corto, la regla mnemotécnica o la comprobación que evita
rehacer la cuenta). Y **siempre cierra con un ejemplo concreto** ("Ejemplo: ...", "Otro
ejemplo: ..."), con números, no en abstracto — también fue pedido explícito.

`explPasos()` saca esa línea de la lista numerada y la pinta como recuadro aparte
(`.truco`): le pone mayúscula inicial y mete un `<br>` antes de cada "Ejemplo:". El
autotest verifica que exista: si algún `return` de un `gen()` se queda sin línea `TRUCO:`,
ese módulo FALLA (contador `sinTruco`).

Los `tipo` de entrada (7): `sino`, `cmp`, `opciones`, `num`, `texto`, `frac`, `mixto`,
`orden`. `entradaHTML()` decide qué pintar según el tipo; `verificar()` decide si la
respuesta es correcta, para los 7 sin excepción. Si se agrega un módulo, casi seguro
reutiliza uno de estos — no crear un tipo nuevo sin necesidad real.

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
    - Ninguno de los dos reordena la ronda YA armada — cambian recién en la próxima que
      arranques (`toggleAgrupar()`/`toggleRepetir()` solo repintan la pantalla actual).
- **Examen** (`examen` no-null): 10 preguntas, 10 minutos, sin "Saltar" ni "Ver
  explicación", sin feedback por pregunta — todo se revela en la pantalla de resultado al
  final. No cuenta para `stats` ni para el historial (es una prueba, no práctica). Sortea
  siempre de `MODULOS` completo (`elegirDe(MODULOS)`, no `elegirModulo()`) — a propósito NO
  respeta ninguna mezcla/grupo activo, ni la vieja `clase` ni los grupos de examen nuevos.
- **Repasar errores** (`modoErrores`): cicla la lista `errores` (últimos 30 fallos
  reales, más reciente primero); si aciertas se quita de la lista.

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

**Trampa importante:** `mostrarFb()` decide el `onclick` del botón "Siguiente ejercicio"
según `modoErrores` — si se agrega un cuarto modo, hay que tocar ese `sigOnclick` también.

## localStorage — todas las claves (prefijo `mate_`)

| Clave | Contenido |
|---|---|
| `mate_nivel_v1` | `'facil'` / `'medio'` / `'dificil'` |
| `mate_clase_v1` | `{ etiqueta, mods:[] }` — la mezcla ACTIVA ahora mismo (personalizada, detectada del material de clase, o copiada de un grupo al tocar "Practicar") |
| `mate_grupos_v1` | `[{id, nombre, mods:[]}]` — grupos de examen guardados (ej. "Examen 1" = cap. 1 y 2); **no sincroniza entre aparatos**, a propósito (ver más abajo) |
| `mate_agrupar_v1` / `mate_repetir_v1` | `true`/`false` — los dos ajustes de la fila de estadísticas en práctica (agrupar por tema / repetir si fallo, ver "Modos de práctica") |
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
