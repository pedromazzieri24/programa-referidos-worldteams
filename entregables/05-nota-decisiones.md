# Nota de decisiones

Construí un MVP que funciona de punta a punta: la landing para referir y seguir cada referido, la base donde viven las reglas y la automatización que manda los mails, puntúa el CV con IA y aplica los plazos.

## Supuestos

- La meta es ~1.000 ingresos por mes, y el programa **aporta** a ella, no la cubre solo. Un referido cuenta como ingreso cuando el candidato confirma que quiere participar: recién ahí entra a la base.
- Los montos (USD 200 a 1.000) son un punto de partida dentro del rango del mercado. Viven en una tabla y se ajustan sin tocar el sistema.
- Los colocados tienen mail corporativo. Si no, entran sin verificar y cobran como externos hasta que un admin los verifica.
- Se paga en USD, por el mismo canal que a los contractors.
- Se refiere para búsquedas abiertas.
- Supabase no reemplaza su ATS ni su CRM: es el registro del programa. En el MVP, la contratación y la baja se cargan a mano.

## Decisiones principales

| Decisión | Por qué |
|---|---|
| Programa abierto, con más incentivo para la gente de WorldTeams | Duplicar los ingresos exige volumen y la red propia no alcanza. La calidad se cuida pagando solo por contratación |
| Se paga a los 90 días de una contratación que dura | Es la principal defensa antiabuso: cargar basura no paga |
| El tipo de referente sale del mail corporativo, no de lo que declara la persona | Quien declara su tipo cobra más si miente. El link al mail corporativo lo prueba sin trabajo manual |
| Recruiting no participa | En un equipo chico, la regla "nadie evalúa a su propio referido" no alcanza |
| El candidato tiene que aceptar antes de que se procese nada | Son datos de un tercero. Si no acepta en 14 días, se borra su CV |
| El tope de 10 por mes cuenta también los rechazos, y un duplicado recibe un mensaje genérico | El formulario no tiene que servir para averiguar quién está buscando trabajo |
| Las reglas viven en la base; n8n solo ejecuta | No se pueden saltear desde el navegador, y si n8n se cae no se pierde nada |
| La IA puntúa el CV, pero no decide | Recruiting prioriza con el puntaje y su justificación; si la IA falla, el aviso sale igual |

## Para validar con WorldTeams

- **Que el tope cuente los duplicados.** Un referente de buena fe pierde una carga. Alternativa lista: dos topes separados.
- **Los montos** y cómo convive este programa con el que ya tienen para referir clientes.
- **Si el LinkedIn pasa a ser obligatorio**, a cambio de más fricción para el referente.
- **Qué ATS y CRM usan**, y si tienen API.

## Riesgos conocidos

- **La misma persona con otro mail** pasa como nueva si no se carga el LinkedIn. Lo frenan el LinkedIn y el teléfono, que solo se paga por contratación y que recruiting entrevista a la persona.
- **9 de cada 10 referentes no van a cobrar**, porque la mayoría de los referidos no se coloca. Lo mitiga el panel de seguimiento.
- **Si n8n se corta a mitad de una tarea**, un mail puede salir dos veces.

## Qué dejé afuera por tiempo

- Panel de administración para recruiting: hoy se opera desde Supabase, con avisos por mail que traen el comando a correr.
- Etapas reales del proceso en el panel del referente.
- Código de 6 dígitos en el mail de login, además del link.
- Normalizar los `+alias` de Gmail y mostrar en el panel el motivo real de una anulación.

## Segunda etapa, en orden

1. **Integración con el ATS**, para que la regla de duplicados vea toda la base de candidatos.
2. **Integración con el CRM**, para que la contratación y la baja entren solas.
3. **Pago en dos tramos:** una parte cuando el perfil queda disponible para presentar y el resto a los 90 días.
4. **n8n en un servidor** (hoy corre en mi computadora) y **mail transaccional** con el dominio de WorldTeams.
5. **Link directo al CV** en el aviso a recruiting (hoy trae la ruta del archivo).
6. Link personal para que el candidato cargue sus datos, landing en español y portugués, y antifraude avanzado.

## Cómo usé la IA

Trabajé con Claude Code en todo el proceso, con una regla fija: la IA propone cada cambio con su porqué y sus alternativas, y ninguna decisión de negocio entra sin mi OK. Todo lo que propuso lo probé: 37 tests de reglas, 25 del código de la automatización y 17 casos de punta a punta (`PRUEBAS.md`). Cada iteración, con lo que acepté y lo que corregí, está en [`BITACORA-IA.md`](../BITACORA-IA.md).
