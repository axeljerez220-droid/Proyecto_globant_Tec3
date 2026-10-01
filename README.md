# Lumenfall // Neon Arena

## Integrantes

- Axel Jerez
- Bruno Murgana
- Lucila Lavin
- Valentina Avila
- Victor Caceres
- Angelina Garcia

Lumenfall es un juego arcade de supervivencia para navegador. Controla una nave en una arena neon, elimina enemigos, recoge mejoras y supera oleadas cada vez mas exigentes. El proyecto usa HTML, CSS y JavaScript sin framework ni proceso de compilacion.

## Requisitos

- Windows, macOS o Linux.
- Un navegador actualizado: Chrome, Edge, Firefox o Safari.
- Teclado y mouse para jugar con todos los controles. En escritorio, WebGL mejora el fondo 3D, pero no es necesario para el combate.
- Conexion a internet para cargar Three.js desde jsDelivr y las fuentes desde Google Fonts. Sin conexion, el juego conserva el combate 2D y usa fuentes de respaldo.
- Python 3 solo si se elige el metodo de servidor local indicado abajo. No se necesita para Live Server.

No se necesita instalar Node.js, npm, paquetes, ni compilar el proyecto.

## Instalacion y ejecucion

1. Descarga o clona el proyecto y descomprime la carpeta si hace falta.
2. Abre la carpeta del proyecto en VS Code o en una terminal.
3. Inicia un servidor local con una de estas opciones:

	**Python en Windows (PowerShell):**

	```powershell
	py -m http.server 8000
	```

	Si `py` no esta disponible, prueba `python -m http.server 8000`.

	**VS Code:** instala y ejecuta la extension Live Server; abre `index.html` y selecciona **Open with Live Server**.

4. Abre `http://localhost:8000` en el navegador si usaste Python. Con Live Server, utiliza la URL que muestra VS Code.
5. Pulsa **INICIAR DESCENSO**. Para detener el servidor de Python, vuelve a la terminal y pulsa `Ctrl+C`.

Tambien se puede abrir `index.html` directamente, pero un servidor local ofrece un origen estable para el navegador y `localStorage`.

## Controles

### Escritorio

| Accion | Control |
| --- | --- |
| Mover la nave | `W`, `A`, `S`, `D` o flechas |
| Apuntar | Mover el mouse |
| Disparar | Mantener el click izquierdo |
| Emitir pulso | `SPACE` (consume 35 de energia) |
| Dash | `SHIFT` (consume 20 de energia) |
| Elegir una mejora | Click en una tarjeta o teclas `1`, `2`, `3` |
| Pausar o reanudar | `P`, `ESC` o boton de pausa |

El pulso tiene 7 segundos de enfriamiento. La energia se regenera a 1,5 puntos por segundo y se restaura al cambiar de oleada. Pulso y dash comparten la misma reserva.

### Movil

La interfaz tactil permite mover la nave con el joystick y usar dash y pulso. El disparo continuo requiere mouse, por lo que la partida completa esta pensada para teclado y mouse.

## Como funciona el juego

- La partida empieza en la oleada 1, con 8 bajas necesarias. El objetivo aumenta en 5 por oleada: 13 en la oleada 2, 18 en la 3, etc.
- Al completar una oleada se muestran tres mejoras aleatorias. Las opciones se mezclan con Fisher-Yates y se crean como elementos DOM, no como HTML interpolado.
- Aparecen `drone`, `hunter` y `charger`; sus vidas, velocidades, colores y puntuaciones son diferentes.
- Aparece un boss cada cinco oleadas. El de la oleada 5 conserva su aspecto y embiste; el de la 10 tiene una apariencia propia y un pulso de area. Los bosses de oleadas posteriores usan el comportamiento estandar.
- Entre oleadas se recuperan 12 puntos de casco hasta el maximo y se llena la energia.
- Algunas bajas dejan un pickup de casco o energia. El pulso tambien cuenta las bajas, suma puntuacion y avanza el objetivo de la oleada.
- El combo multiplica la puntuacion de las bajas consecutivas. La mejor puntuacion se guarda en `localStorage` en el navegador actual.

## Oleadas, bosses y mapas

- Durante las oleadas 1 a 5, los enemigos reciben un refuerzo inicial de vida y dano; la velocidad tambien aumenta. Todos los enemigos reciben ademas el ajuste global del 5%.
- Desde la oleada 5, la vida y el dano de los minions siguen aumentando por oleada, hasta el limite definido en el juego.
- Los bosses tienen una reserva de vida y dano superiores a los minions. Sus ataques especiales de las oleadas 5 y 10 tienen avisos visuales.
- Al comenzar las oleadas 11, 21, 31 y siguientes, aparece una transicion de mapa animada de 3,2 segundos.
- Los mapas alternan entre `SECTOR PRISMA`, `YERMO FERRICO`, `ABISMO GLACIAL` y `JARDIN UMBRIO`. Cambian el fondo, la rejilla, los bordes, los colores y las siluetas de los minions.
- Cada nuevo mapa multiplica las estadisticas enemigas por 1,15 respecto al mapa anterior. El factor acumulado es `1.15` elevado al indice del mapa.
- Al entrar en un mapa nuevo, los bonos adquiridos por mejoras del jugador se reducen un 5% hacia sus valores base; las estadisticas base no se reducen.

## Mejoras disponibles

Se ofrecen tres opciones aleatorias entre estas mejoras:

| Mejora | Efecto |
| --- | --- |
| `OVERCLOCK` | Reduce un 12% el intervalo entre disparos, con un limite de cadencia. |
| `PRISM CORE` | +1 de dano por proyectil. |
| `AFTERBURN` | +8% de velocidad de movimiento. |
| `REACTOR` | +25 de energia maxima y recarga completa. |
| `HULL PLATING` | +25 de casco maximo y reparacion. |
| `PULSE ARRAY` | +2,955 de dano y +29,55 de alcance del pulso. |
| `VELOCITY` | +20% de velocidad de proyectil. |
| `VECTOR DRIVE` | +25% de distancia del dash. |

## Puntuacion y rangos

Las bajas dan puntos y aumentan el combo. El rango mostrado cambia con la puntuacion:

- `ROOKIE`: menos de 2.000 puntos.
- `PILOT`: desde 2.000 puntos.
- `ACE`: desde 6.000 puntos.
- `SPECTRE`: desde 15.000 puntos.

## Estructura del proyecto

```text
JuegoRandom/
|-- index.html   # Estructura de interfaz y HUD
|-- styles.css   # Estilos, tema visual y diseno responsive
|-- game.js      # Estado, reglas, controles y renderizado
`-- README.md    # Documentacion, instalacion y requisitos
```

## Tecnologias y arquitectura

- HTML5 y CSS3 para la interfaz y el layout adaptable.
- JavaScript moderno sin framework ni dependencias de build.
- Canvas 2D para la arena, enemigos, nave, particulas y transiciones.
- Three.js/WebGL opcional para el escenario holografico.
- Web Audio API para efectos de sonido sintetizados.
- `localStorage` para persistir la mejor puntuacion.

Las reglas y el renderizado viven en `game.js`; la estructura accesible de la interfaz esta en `index.html`; los estilos responsive, en `styles.css`. Los textos de la interfaz se insertan como texto y los botones de mejora se crean con APIs del DOM. La seleccion aleatoria usa Fisher-Yates.

## Comprobaciones para contribuir

- Valida la sintaxis de JavaScript con `node --check game.js` (Node solo hace falta para esta comprobacion, no para jugar).
- Prueba inicio, pausa, disparo, pulso, dash, mejoras, derrota y reinicio en el navegador.
- Comprueba los cambios de mapa al comenzar las oleadas 11 y 21.
- Mantiene las mejoras y reglas del juego en `game.js`, los textos y estructura en HTML y los estilos en CSS; evita duplicar reglas entre archivos.
- Usa `textContent` o nodos DOM para texto dinamico y no concatena datos en `innerHTML`.

## Prompts de desarrollo utilizados

Resumen cronologico de las solicitudes que definieron las funciones actuales:

1. Crea un juego similar al Vampire Survivors.
2. Anadir poderes distintos a los bosses de las oleadas 5 y 10, conservar el aspecto del primero y diferenciar el segundo; aumentar progresivamente la vida y el dano de los minions desde la oleada 5.
3. Reforzar vida y dano de los bosses, aumentar ligeramente su velocidad y crear un cambio de mapa cada 10 oleadas, con nuevos aspectos de enemigos, +15% de estadisticas enemigas por mapa y una reduccion del 5% de los bonos del jugador en cada mapa nuevo.
4. Aumentar vida, dano y velocidad de los enemigos durante las primeras cinco oleadas (el juego empieza en la oleada 1; no existe la oleada 0).
5. Aplicar otro 5% de aumento a las estadisticas de minions y bosses.
6. Reducir los bonos de velocidad de disparo y movimiento; ajustar el bono del pulso un 1,5%, fijar su enfriamiento en 7 segundos, contar sus bajas para la oleada y aumentar en cinco el objetivo de bajas por oleada.
7. Hacer mas lenta la regeneracion de energia.
8. Aplicar buenas practicas de programacion y documentar en este README los prompts, la instalacion, los requisitos y la informacion importante del juego.

## Limitaciones conocidas

- Three.js y Google Fonts se solicitan a servicios externos. La escena 3D y las fuentes pueden no estar disponibles sin conexion; el juego 2D no depende de WebGL.
- La interfaz tactil actual no ofrece un boton de disparo continuo.
- El progreso de mejor puntuacion se almacena en el navegador y no se sincroniza entre dispositivos.

## Licencia

Proyecto de demostracion personal y educativa. No se ha incluido un archivo de licencia; consulta al autor antes de redistribuirlo.
