# Nota de decisiones

Construí un MVP funcionando de punta a punta: la landing (Vercel) para registrarse, referir y seguir cada referido; la base (Supabase), donde viven todas las reglas; y la automatización (n8n), que manda los mails, puntúa el CV con IA y aplica las reglas de tiempo. Esta nota cuenta qué supuse, por qué decidí lo que decidí, qué quedó afuera y cómo usé la IA.

## Supuestos

| Supuesto | Por qué / cómo se valida |
|---|---|
| La meta es ~1.000 ingresos por mes y el programa **aporta**, no tiene que cubrirla solo | El número exacto no cambia el diseño. Se mide desde el primer mes |
| Un referido cuenta como ingreso **cuando el candidato confirma** que quiere participar | Es su definición de ingreso ("se registra y entra a la base"): antes de confirmar, no entra |
| Los montos del incentivo (USD 200 a 1.000) | Dentro del rango del mercado (Turing, Tecla, BairesDev). Viven en una tabla y se ajustan sin tocar el sistema. La rentabilidad queda abierta: se calibra con el costo por contratación de los canales actuales |
| Los colocados tienen mail corporativo | Si no lo tienen, hay un plan B: entran sin verificar, cobran como externos y un admin los verifica antes del pago |
| Se paga en USD, por el mismo canal que a los contractors, sin restricciones por país | Confirmaron que se puede pagar a externos; el medio de pago y el país no se mencionaron |
| Se refiere para **búsquedas abiertas** | El monto sale del seniority de la búsqueda. Una base general de talento queda para después |
| Supabase no reemplaza su ATS ni su CRM | Es el **registro del programa** (referentes, atribución, consentimiento, tope y recompensas), lo que esas herramientas no modelan. En el MVP, la contratación y la baja se cargan a mano; la base del ATS se simula con candidatos de ejemplo |
| Cuántos referidos trae cada referente activo por mes | Define cuántos referentes hacen falta (ver el dimensionamiento del esquema). Se mide desde el primer mes |

## Decisiones y su porqué

| Decisión | Por qué |
|---|---|
| **Programa abierto**, con incentivo mayor para la gente de WorldTeams | Duplicar los ingresos exige volumen y la red propia no alcanza (unas 45 colocaciones por mes). La calidad se cuida pagando solo por contratación efectiva |
| **El tipo de referente se deduce del mail**, no se declara | Quien declara su tipo cobra más si miente. Entrar con un link al mail corporativo prueba que es de WorldTeams, sin trabajo manual |
| **Recruiting no participa** | Aunque nadie evalúe a su propio referido, en un equipo chico es natural pedirle una mano a un compañero |
| **Se paga a los 90 días de una contratación que dura** | Es la principal defensa antiabuso: cargar basura no paga. El embudo lo confirma: solo el 9 % de los ingresos se coloca |
| **Una sola ventana de 6 meses** para duplicados, atribución y contratación | Una regla en lugar de tres, fácil de explicar. Es lo que hacen BairesDev y Tecla |
| **El candidato tiene que aceptar** antes de que se procese nada | Son datos de un tercero. Si rechaza o no responde en 14 días, se borra su CV |
| **El tope (10 por mes) cuenta también los rechazos**, y un duplicado recibe un mensaje genérico | No dar información de terceros a terceros: el formulario no tiene que servir para averiguar quién está buscando trabajo |
| **Las reglas viven en la base**; n8n solo ejecuta | No se pueden saltear desde el navegador. Como n8n corre en local y Vercel no puede llamarlo, la base anota el trabajo en una cola que n8n toma cada minuto: si n8n se cae, nada se pierde |
| **La IA puntúa el CV, pero no decide** | Recruiting recibe el puntaje con su justificación y prioriza. Si la IA falla, el aviso sale igual |
| **Landing en inglés**, con la identidad de worldteams.com, como "Talent Referral Program" | Ya tienen un "Referral Program" para referir clientes: el nombre evita confundirlos. Los textos están separados para sumar idiomas |
| **Los números del negocio en una tabla de configuración** | Ventanas, días, tope y montos se cambian editando una fila |

## Para validar con WorldTeams

- **El tope cuenta también los duplicados.** Un referente de buena fe que choca con uno pierde una carga. Prioricé prevenir el mal uso; la alternativa está lista: dos topes separados (10 aceptados + 5 rechazados).
- **Los montos** y cómo convive este programa con el de clientes (por qué este paga más y más tarde).
- **Si el LinkedIn pasa a ser obligatorio:** cierra el caso "la misma persona con otro mail", a cambio de más fricción.
- **Qué ATS y CRM usan**, y si tienen API: define cómo se construye la integración.

## Riesgos conocidos (documentados a propósito)

- **La misma persona con otro mail** pasa como nueva si no se carga el LinkedIn. Lo frenan el LinkedIn y el teléfono (se comparan aunque cambie el mail), que solo se paga por contratación y que recruiting entrevista a la persona.
- **Un candidato que vuelve después de los 6 meses con otro mail** recibe el pedido de consentimiento en su mail viejo.
- **9 de cada 10 referentes no cobran**, porque la mayoría de los referidos no se coloca. Lo mitiga el panel de seguimiento; la segunda etapa propone pagar en dos tramos.
- **Si n8n se corta a mitad de una tarea**, un mail puede salir dos veces. Pasó en la prueba y se comportó como estaba previsto.

## Qué dejé afuera por tiempo

- Panel de administración para recruiting: hoy se opera desde Supabase y con los avisos por mail, que traen el comando a correr.
- Etapas reales del proceso en el panel del referente (entrevistado → validado → presentado).
- Código de 6 dígitos en el mail de login, además del link (hoy se avisa "You can close the other tab").
- Normalizar los `+alias` de Gmail, mostrar en el panel el motivo real de una anulación y guardar el mail nuevo de un candidato que vuelve.
- Rate limiting propio en la landing (hoy se apoya en los límites de Supabase).

## Segunda etapa, en orden

1. **Integración con el ATS** (ATS → Supabase), para que la regla de duplicados vea toda la base de candidatos.
2. **Integración con el CRM**, para que la contratación y la baja entren solas y el pago no dependa de una carga manual.
3. **Pago en dos tramos:** un monto chico cuando el perfil queda disponible para presentar y el resto a los 90 días. Ataca el riesgo de que casi nadie cobre.
4. **Proveedor de mail transaccional** con el dominio de WorldTeams (hoy, Gmail).
5. **Link personal** para que el candidato cargue sus propios datos, y landing en español y portugués.
6. Antifraude avanzado, verificación de identidad de externos, SSO corporativo y un dashboard de métricas del programa.

## Mejoras que surgieron al probar la automatización

- **Una sola alerta por corte (ya implementada).** Durante un corte de conexión, el procesador fallaba cada minuto y llegaba un Telegram por minuto; una alerta repetida se termina ignorando. Ahora la misma falla se avisa una vez cada 30 minutos, y la tabla de errores sigue guardando cada una.
- **n8n en un servidor.** Hoy corre en mi computadora: si se apaga o pierde conexión, la cola espera (no se pierde nada, pero los mails se demoran). En producción, un servidor siempre prendido.
- **Link directo al CV en el aviso a recruiting.** Hoy el mail trae la ruta del archivo y recruiting tiene que buscarlo en Supabase. Un link temporal (que vence en unos días) lo deja a un clic sin hacer público el CV.

## Cómo usé la IA y qué corregí

Usé Claude Code durante todo el desarrollo: para discutir el diseño, escribir el código y la documentación, y probar. Trabajé con una regla: **ninguna decisión de negocio entra sin mi OK**. La IA propone con su porqué y sus alternativas; yo decido. Registré cada iteración en `BITACORA-IA.md`: 42 en total, de las que acepté 27 tal como vinieron, corregí 14 y descarté 1.

**Lo que corregí** (ejemplos):
- **Recruiting:** la IA proponía dejarlos referir con la regla "nadie evalúa a su propio referido". Los excluí: en un equipo chico la regla no alcanza.
- **Tipo de referente:** propuso verificar a mano a quienes cobran más. Lo cambié por deducirlo del mail corporativo, sin trabajo manual.
- **Montos:** los bajé a USD 500 porque se suman al costo de cada contratación. La IA advirtió que con montos bajos se pierde el efecto en volumen, y terminamos en 200 a 1.000, como supuesto a validar.
- **Consentimiento:** no entendí su propuesta de dos estados nuevos, y eso llevó a simplificarla a uno solo, "no confirmó", con nombres que entiende el referente.
- **Landing:** la propuso en español y con estilo genérico. La pasé a inglés y con la identidad de worldteams.com.

**Lo que detectó la IA** (ejemplos):
- Que la landing en Vercel no podía llamar a n8n en local. De ahí salió la arquitectura de la cola.
- Una contradicción en las reglas iniciales: con el duplicado a 12 meses, la exclusividad de 6 nunca llegaba a usarse. Lo unifiqué todo en 6 meses.
- En las pruebas, que los tests de la base tomaban también tareas reales de la cola, y que la alerta de Telegram se rechazaba por un guion bajo.

**Dónde se equivocó:** Ante unos cortes de conexión culpó a una VPN que no existía (el "Warp" instalado era la terminal) y tuvo que corregir el diagnóstico. Por eso cada cosa que propuso la probé: 37 tests de reglas en la base y 17 casos de punta a punta (`PRUEBAS.md`).
