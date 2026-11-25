# OTG-COMP-01 — proceso manual frente a FiadoCheck

Material para medir, con las mismas personas y la misma información, cuánto tarda un
tendero en gestionar sus deudas con su libreta y cuánto con el sistema. El protocolo
completo (hipótesis, diseño, criterio, formato de sesión) está en
`Protocolo_comparativa_manual_vs_sistema_FiadoCheck.md`.

| Archivo | Para qué |
|---|---|
| `dataset.js` | Los datos: dos variantes equivalentes (A y B) de una tienda de 12 clientes y 16 fiados, y la respuesta correcta de cada tarea |
| `generar_libreta.js` | Imprime la libreta de papel, las tarjetas de tareas y la hoja de respuestas del facilitador |
| `cargar_tienda.js` | Carga esa misma tienda en el sistema por su API y comprueba que quedó idéntica |
| `plantilla_mediciones.csv` | Formato para registrar los tiempos |
| `analizar.js` | Valida las mediciones y calcula medianas, reducción, aciertos y dictamen |
| `comparativa.test.js` | Pruebas del propio material (`node --test scripts/comparativa/`) |

## Antes de cada sesión (mismo día de la sesión)

Las fechas de pago son relativas al día en que se genera, por eso todo se prepara el día
de la sesión. Una tienda por participante: la condición de sistema modifica la tienda.

```powershell
cd backend
node scripts/limpiar_pruebas_gestion_credito.js --prefijo cmp.          # limpia la tienda de la sesión anterior
node scripts/comparativa/generar_libreta.js --variante A                 # y/o B; escribe en scripts/comparativa/salida/
node scripts/comparativa/cargar_tienda.js --variante B --url https://fiadocheck-api.azurewebsites.net/api
```

Imprimir `libreta_<V>.md` y `tarjetas_<V>.md`; la hoja `respuestas_<V>.md` es solo del
facilitador. `cargar_tienda.js` imprime el correo y la contraseña de la tienda desechable
y deja un JSON local con las respuestas (la carpeta `salida/` no se versiona).

## Asignación de variantes y orden

Cada participante hace las dos condiciones con variantes distintas, y se rota para que
ninguna combinación quede siempre en la misma posición:

| Participante | 1.ª condición | 2.ª condición |
|---|---|---|
| P1 | manual · variante A | sistema · variante B |
| P2 | sistema · variante A | manual · variante B |
| P3 | manual · variante B | sistema · variante A |
| P4 | sistema · variante B | manual · variante A |
| P5 | como P1 | |

Para cada participante hay que preparar **las dos variantes** (la libreta de una y la
tienda de la otra, según la tabla).

## Después de las sesiones

Registrar los tiempos en una copia de `plantilla_mediciones.csv` y:

```powershell
node scripts/comparativa/analizar.js mediciones.csv --salida resultados_comparativa.md
```

El script se niega a calcular si falta alguna tarea en alguna condición, si una variante
se repite dentro del mismo participante o si un valor no es válido. Con menos de 6
participantes el informe lo declara solo descriptivo.

Al terminar todas las sesiones:

```powershell
node scripts/limpiar_pruebas_gestion_credito.js --prefijo cmp. --dry-run
node scripts/limpiar_pruebas_gestion_credito.js --prefijo cmp.
```
