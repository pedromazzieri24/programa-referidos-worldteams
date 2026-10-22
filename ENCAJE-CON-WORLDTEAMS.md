# Cómo encaja el programa con las herramientas de WorldTeams

> Sale de la respuesta 2 del mail (21/10): "un ATS como base de candidatos, un CRM como base de procesos, clientes y contratados, y algunas planillas de Sheets para seguimiento de procesos de contratación".
> No sabemos qué ATS ni qué CRM usan. Lo que sigue supone herramientas estándar de cada tipo; lo que es interpretación está marcado como tal.

---

## 1. Lo que usan hoy

| Herramienta | Qué es | Qué guarda | En el caso de Martín |
|---|---|---|---|
| **ATS** (*Applicant Tracking System*) | El fichero de candidatos de recruiting, con un tablero por búsqueda | Candidatos, CVs y la etapa de cada uno | Entra a la base (uno de los 500 ingresos) y pasa por screening y validación |
| **CRM** (*Customer Relationship Management*) | La agenda comercial | Firmas de EE. UU., procesos que abren y contratados | La firma de Texas abre un proceso, lo contrata y queda como contratado |
| **Sheets** | Planillas | Seguimiento de procesos de contratación | *Interpretación:* tapan el hueco entre el ATS y el CRM (a quién se presentó, cómo va el contrato) |

WorldTeams es un marketplace: el **ATS cuida la oferta** (talento) y el **CRM cuida la demanda** (clientes). Se cruzan en la colocación, y en ese cruce aparecen las planillas.

## 2. Lo que usa el programa

| Pieza | Para qué |
|---|---|
| **Supabase** (Postgres + Auth + Storage) | Registro del programa y sus reglas; login con magic link; CVs |
| **Landing Next.js en Vercel** | Lo que ve el referente: registro, carga del referido, panel de seguimiento; y el consentimiento del candidato |
| **n8n** | Mails, puntaje del CV con Gemini, revisión diaria y, en la segunda etapa, el puente con el ATS y el CRM |
| **Gemini** | Puntaje del CV contra la búsqueda (CV Screener) |

Es el mismo stack que ya usa el equipo (Supabase + n8n): no suma tecnologías nuevas para mantener.

## 3. Quién guarda qué

**Supabase no reemplaza al ATS ni al CRM. Es el registro del programa:** guarda lo que esas herramientas no modelan y lo mínimo indispensable de lo que sí.

| Dato | Dónde vive hoy | En el programa | Por qué hace falta |
|---|---|---|---|
| Candidato y CV | ATS | Copia mínima en `candidatos` (mail, LinkedIn, teléfono y CV, que se borra si no da su consentimiento) | Para detectar duplicados y pedir el consentimiento |
| Etapa del candidato | ATS | Estado resumido en `referidos` | Para el panel del referente |
| Contratación y baja | CRM | `fecha_contratacion`, `fecha_baja` | Disparan o anulan el premio |
| Quién refiere (identidad, tipo, verificación) | — | `referentes` | Define el monto y quién puede cobrar |
| Atribución y exclusividad de 6 meses | — *(un ATS suele tener, a lo sumo, un campo "fuente")* | `referidos.exclusividad_hasta` | Resuelve "dos refirieron a la misma persona" |
| Consentimiento del candidato | — | Token con vencimiento de 14 días | No procesar datos de alguien que no aceptó |
| Intentos y tope mensual | — | `intentos_referido` | Antiabuso y auditoría, sin guardar datos de terceros |
| Recompensas y su estado | — *(interpretación: hoy sería una planilla)* | `recompensas` | Qué se debe, a quién, desde cuándo y por qué se anuló |
| Historial de cambios | — | `eventos_referido` | Auditar cualquier pago |
| Reglas y montos | — | `config`, `montos_incentivo` | Cambiar un número sin tocar código |

## 4. Lo que perdemos (y cómo se mitiga)

| Lo que perdemos | Por qué pasa | Mitigación |
|---|---|---|
| **Usabilidad para recruiting y administración.** Marcar una contratación o una baja se hace en una tabla de Supabase, una herramienta técnica. Un error al tipear afecta un pago | Supabase es una base de datos, no una aplicación de recruiting | MVP con pocas personas y el historial en `eventos_referido`. Segunda etapa: que lo dispare el CRM vía n8n, o un panel de administración |
| **Recruiting no ve "quién lo refirió" en su ATS** | Hasta integrar, el referido vive en Supabase | En el MVP les llega un aviso con el puntaje. Segunda etapa: crear el referido en el ATS con su fuente |
| **Dos lugares con datos del candidato** | El candidato existe en el ATS y en Supabase | Supabase guarda lo mínimo y el ATS sigue siendo la fuente del candidato. El CV se borra si no hay consentimiento |
| **La regla de duplicados no ve el ATS** | En el MVP solo compara contra `candidatos` de Supabase | El seed lo simula con candidatos `directo`. Es la **primera integración** a construir: sin ella se podría pagar por alguien que igual iba a llegar |
| **Un sistema más** | Supabase, Vercel y n8n se suman al ATS y al CRM | Es el stack que el equipo ya usa |

## 5. Lo que ganamos

1. **Datos que hoy no gestiona ninguna de sus herramientas**: atribución, exclusividad, consentimiento, tope, recompensas e historial (sección 3). Son el corazón del programa.
2. **Reglas que no se saltean**: viven en Postgres y se aplican en una sola transacción, vengan de la landing o de n8n.
3. **Independencia del proveedor**: si cambian de ATS o de CRM, el programa sigue igual; solo cambia el conector de n8n.
4. **Una experiencia para el referente**: login, carga y panel de seguimiento. Un ATS no le da acceso a una persona externa.
5. **Métricas del programa contra su embudo**: % que pasa screening y % que se coloca, frente al 60 % y 9 % actuales.

## 6. Alternativas que descartamos

| Alternativa | Por qué no en el MVP |
|---|---|
| **Todo en el ATS** | Sirve para marcar la fuente, pero no maneja premios, externos con login, la exclusividad ni la regla de 90 días |
| **Formulario + planilla** | Rápido, pero sin duplicados confiables, sin login, con datos personales en una planilla compartida y las reglas aplicadas a mano |
| **Una herramienta de referidos comprada** | Existen. Conviene evaluarla en una segunda etapa (costo, control y si se integra con su ATS); para un MVP agrega dependencia sin resolver la integración |

## 7. Orden de integración (segunda etapa, todo con n8n)

1. **ATS → Supabase:** sincronizar los candidatos (mail, LinkedIn, fecha de ingreso) para que la regla de duplicados vea toda la base. Va primero porque sin esto el antiabuso principal está ciego.
2. **Programa → ATS:** cada referido confirmado se crea en el ATS con la fuente "Referral – nombre del referente" y su puntaje. Recruiting trabaja donde ya trabaja.
3. **CRM → Supabase:** la contratación llama a `marcar_contratado`, y la baja carga `fecha_baja`. El pago deja de depender de una carga manual.
4. **ATS → Supabase:** las etapas reales (entrevistado, disponible, presentado) llegan al panel del referente.
5. **Supabase → administración:** las recompensas aprobadas van a donde paguen hoy (otro sistema o la planilla que usen).

Antes de construirlas hay que saber qué ATS y CRM usan y si tienen API o webhooks.
