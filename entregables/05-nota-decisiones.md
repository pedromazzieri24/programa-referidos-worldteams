# Nota de decisiones

Construí un MVP que funciona de punta a punta: la landing para referir y seguir cada referido, la base donde viven las reglas y la automatización que manda los mails, puntúa el CV con IA y aplica los plazos.

## Supuestos

- La meta es ~1.000 ingresos por mes, y el programa **aporta** a ella, no la cubre solo. Un referido cuenta como ingreso cuando el candidato confirma que quiere participar: recién ahí entra a la base.
- Los montos (USD 200 a 1.000) son un punto de partida dentro del rango del mercado. Viven en una tabla y se ajustan sin tocar el sistema.
- Los colocados tienen mail corporativo. Si no, entran sin verificar y cobran como externos hasta que un admin los verifica.
- Se paga en USD, por el mismo canal que a los contractors.
- Se refiere para búsquedas abiertas.
- Supabase no reemplaza su ATS ni su CRM: es el registro del programa. En el MVP, la contratación y la baja se cargan a mano.
- WorldTeams opera desde Florida: el "hoy" y el "mes" de las reglas (tope, fecha de contratación y de pago) son los de Florida, configurables.

## Los números del canal

- **Costo.** Solo se paga por colocación: USD 200 a 1.000 cada una, o USD 18 a 90 por ingreso si convierten como hoy (9 %). **La cuenta que falta** es compararlo con lo que deja una colocación (margen mensual × meses que dura) y con su costo por otros canales: es la primera pregunta para WorldTeams.
- **Calidad y carga.** La meta del canal es igualar o superar el embudo actual (60 % pasa el screening, 9 % se coloca), por tipo de referente. 500 ingresos más son unas 300 entrevistas más por mes: por eso el candidato confirma antes de entrar y la IA lo puntúa, para que recruiting priorice en lugar de entrevistar a todos por igual.

## Cómo lo lanzaría: un piloto

Antes de escalar, un piloto de 3 meses con el programa abierto y el tope de 10 por mes. El MVP ya registra quién confirma; el resultado del screening sale del ATS (a mano hasta integrarlo). Como el pago llega a los 90 días, se decide con indicadores tempranos:

- **Se escala** si al tercer mes el canal confirma 70 % o más y pasa el screening 60 % o más (lo mismo que hoy).
- **Se revisa** (montos o quién refiere) si el screening queda por debajo del 40 %.
- **Se confirma al sexto mes** con las colocaciones y la permanencia a los 90 días.

Los umbrales son una propuesta para validar con WorldTeams.

## Decisiones principales

| Decisión | Por qué |
|---|---|
| Programa abierto, con más incentivo para la gente de WorldTeams | Duplicar los ingresos exige volumen y la red propia no alcanza. La calidad se cuida pagando solo por contratación |
| Se paga a los 90 días de una contratación que dura | Es la principal defensa antiabuso: cargar basura no paga |
| El tipo de referente sale del mail corporativo, no de lo que declara la persona | Quien declara su tipo cobra más si miente. El link al mail corporativo lo prueba sin trabajo manual |
| El registro pide solo nombre, mail y relación con WorldTeams | Cada campo de más frena a quien quiere referir. País y datos de pago se piden al cobrar; mientras tanto, la autorreferencia se controla por mail |
| El panel muestra una barra hacia el pago recién desde la contratación | Desde ahí la cercanía al pago es real. Antes, 9 de cada 10 no se colocan y una cuenta regresiva prometería de más |
| Recruiting no participa | En un equipo chico, la regla "nadie evalúa a su propio referido" no alcanza |
| El candidato tiene que aceptar antes de que se procese nada | Son datos de un tercero. Si no acepta en 14 días, se borra su CV |
| El tope de 10 por mes cuenta también los rechazos, y un duplicado recibe un mensaje genérico | El formulario no tiene que servir para averiguar quién está buscando trabajo |
| Las reglas viven en la base; n8n solo ejecuta | No se pueden saltear desde el navegador, y si n8n se cae no se pierde nada |
| La IA puntúa el CV, pero no decide | Recruiting prioriza con el puntaje y su justificación; si la IA falla, el aviso sale igual |

## Para validar con WorldTeams

- **Cuánto deja una colocación** y cuánto cuesta hoy por otros canales: con eso se calibran los montos.
- **Que el tope cuente los duplicados.** Un referente de buena fe pierde una carga. Alternativa lista: dos topes separados.
- **Los montos** y cómo convive este programa con el que ya tienen para referir clientes.
- **Si el LinkedIn pasa a ser obligatorio**, a cambio de más fricción para el referente.
- **Qué ATS y CRM usan**, y si tienen API.

## Riesgos conocidos

- **La misma persona con otro mail** pasa como nueva si no se carga el LinkedIn. Lo frenan el LinkedIn y el teléfono, que solo se paga por contratación y que recruiting entrevista a la persona.
- **9 de cada 10 referentes no van a cobrar**, porque la mayoría de los referidos no se coloca. Lo mitiga el panel de seguimiento.
- **Si n8n se corta a mitad de una tarea**, un mail puede salir dos veces.
- **Texto escondido en un CV** puede intentar inflar el puntaje de la IA. Lo limitan el prompt (el CV se trata como dato), un validador de la respuesta y que el puntaje solo prioriza: la decisión es de recruiting.

## Qué dejé afuera por tiempo

- Panel de administración para recruiting: hoy se opera desde Supabase, con avisos por mail que traen el comando a correr.
- Etapas reales del proceso en el panel del referente.
- Código de 6 dígitos en el mail de login, además del link.
- Normalizar los `+alias` de Gmail y mostrar en el panel el motivo real de una anulación.
- Pedirle al referente el país y los datos de pago cuando tiene una recompensa aprobada (hoy, administración los coordina a mano).

## Segunda etapa, en orden

1. **Integración con el ATS**, para que la regla de duplicados vea toda la base de candidatos.
2. **Integración con el CRM**, para que la contratación y la baja entren solas.
3. **Pago en dos tramos**, contra el riesgo de que casi nadie cobre: por ejemplo, USD 50 cuando el perfil queda disponible para presentar (hoy, el 40 % de los ingresos) y el resto a los 90 días. Cuesta unos USD 20 más por ingreso y hace que 4 de cada 10 referidos le dejen algo al referente, no 1. Necesita que el ATS avise cuándo el perfil queda disponible; en el panel, sería un segundo hito de la barra.
4. **Menos fricción al referir:** autocompletar el formulario desde el CV (leyendo el PDF en nuestro servidor y sacando el mail, el teléfono y el LinkedIn con patrones; sin IA, porque el CV de un tercero no sale a otro servicio antes de que el candidato acepte) y evaluar que el CV sea opcional, a cambio de recibir a ese candidato sin puntaje.
5. **n8n en un servidor** (hoy corre en mi computadora) y **mail transaccional** con el dominio de WorldTeams.
6. **Link directo al CV** en el aviso a recruiting (hoy trae la ruta del archivo).
7. Link personal para que el candidato cargue sus datos, landing en español y portugués, y antifraude avanzado.

## Cómo usé la IA

Trabajé con Claude Code en todo el proceso, con una regla fija: la IA propone cada cambio con su porqué y sus alternativas, y ninguna decisión de negocio entra sin mi OK. Todo lo que propuso lo probé: 41 tests de reglas, 25 del código de la automatización y 19 casos de punta a punta (`PRUEBAS.md`). Al final, una review externa del repo marcó arreglos técnicos y de producto, que están hechos (bitácora del 22/10). Cada iteración, con lo que acepté y lo que corregí, está en [`BITACORA-IA.md`](../BITACORA-IA.md).
