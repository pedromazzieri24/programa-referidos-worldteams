# Referencias: programas de referidos reales

> Benchmarks para fundamentar el diseño del programa de WorldTeams.
> Fuentes consultadas el 20/10/2026. Los montos y condiciones pueden cambiar; citarlos como "a la fecha de consulta".

---

## 1. Comparativa rápida

Solo programas para **referir talento** (candidatos), que es el caso de WorldTeams.

| Empresa | Qué hace | Quién puede referir | Premio | Cuándo se paga | Reglas destacadas |
|---|---|---|---|---|---|
| **BairesDev** | Desarrollo de software con talento de LATAM | **Cualquiera**, empleado o no | USD 1.000 (USD 1.300 si la referida es mujer) | 20–40 días después de que el referido cumple **90 días continuos** trabajando | Contratación dentro de los 6 meses del referido; no cuenta si el candidato se postuló o fue referido en los últimos 6 meses, ni si ya está en proceso; se notifica al candidato; sin tope |
| **Devlane** | Staff augmentation, LATAM | **Cualquiera** | USD 900 | Cuando el referido completa **3 meses** en el puesto | Candidato en uno de 12 países de LATAM, inglés avanzado, skills acordes a la búsqueda; se refiere para búsquedas abiertas |
| **Tecla** | Reclutamiento de talento tech de LATAM para trabajo remoto | Miembros de la plataforma (registro) | USD 500 | **El primer día** de trabajo del referido | Contratación dentro de los 6 meses; candidato de LATAM con inglés sólido; sin tope; pago por PayPal u otros |
| **Turing** | Coloca desarrolladores remotos en empresas de EE. UU. | Desarrolladores de su red (con onboarding de referente) | Desde USD 250 (varía por búsqueda) | Tras la contratación y un mínimo trabajado (la ayuda dice 10 horas; la página del programa dice 1 mes) | El referente debe aceptar términos, activar 2FA, **verificar identidad**, cargar datos fiscales y medio de pago; se refiere desde búsquedas marcadas como elegibles; tablero de seguimiento; pago quincenal por transferencia; el referente es contractor y paga sus impuestos |
| **Draftboard** | Marketplace donde empresas publican premios por referidos | **Cualquiera** ("scouts") | Lo fija cada empresa (Draftboard se queda con el 20%) | No informado | **Puntaje de reputación** del scout según la calidad de sus referidos; cada empresa fija un puntaje mínimo y quien baja de ese mínimo deja de poder referir |

**Variantes que refieren clientes, no talento** (útiles como contraste):
- **ThirstySprout:** USD 2.000 por referir una empresa que se convierta en cliente pago.
- **X-Team:** premios no monetarios por niveles (moneda por cada referido enviado, estrella si hay reunión, trofeo si contratan).

---

## 2. Patrones que se repiten

1. **Abierto a cualquiera es lo normal en marketplaces de talento de LATAM** (BairesDev, Devlane, Tecla, Draftboard). Respalda la decisión de abrir el programa.
2. **Pagar recién después de que el referido trabaja un tiempo**: 90 días en BairesDev y Devlane. Es el estándar para alinear el premio con contrataciones que duran. Tecla es la excepción (paga el primer día): más atractivo para el referente, más riesgo para la empresa.
3. **Ventana de validez**: el referido tiene que ser contratado dentro de los 6 meses (BairesDev, Tecla).
4. **Deduplicación por historial**: no cuenta si el candidato ya se postuló, ya fue referido o ya está en proceso (BairesDev, 6 meses).
5. **Referir para búsquedas abiertas** (Devlane, Turing).
6. **Monto fijo es lo más común**; Turing lo varía por búsqueda y BairesDev paga más por perfiles que quiere priorizar.
7. **Sin tope de referidos** en casi todos. El control está en pagar solo por contratación, no en limitar la carga.
8. **Verificación del referente antes de pagar** (Turing: identidad, datos fiscales, medio de pago).
9. **Tablero para que el referente siga a sus referidos** (Turing, BairesDev, Draftboard).

---

## 3. Qué tan efectivos son los referidos

- Estudio de EmployeeReferrals.com con datos de clientes de iCIMS (50+ empresas, 91.000 empleados): permanencia mediana de **38 meses para contratados por referido vs. 22 meses** para el resto (≈70% más). En empresas chicas y en industrias de alta rotación, la diferencia llega a ≈122%.
- Draftboard sostiene que los referidos dan un embudo "más chico pero de mucha mayor calidad". Es una afirmación de la empresa, sin datos publicados.

> Usar el dato de permanencia como argumento, no como garantía: es un estudio sobre **referidos de empleados** en empresas que contratan para sí mismas, no sobre marketplaces.

---

## 4. Cómo se conecta con el diseño de WorldTeams

| Decisión actual (sección 4 del contexto) | Respaldo en los benchmarks | Ideas para discutir (no aprobadas) |
|---|---|---|
| Programa abierto con registro | BairesDev, Devlane, Tecla, Draftboard | — |
| Pago a los 90 días de contratación efectiva | BairesDev y Devlane (3 meses) | Tecla paga el día 1: ¿pago en dos tramos para motivar? |
| Monto según seniority/escasez y tipo de referente | Turing varía por búsqueda; BairesDev paga más por perfiles prioritarios | Bono extra para perfiles que WorldTeams quiera priorizar (BairesDev lo hace por género) |
| Duplicado si estuvo en la base en los últimos 12 meses | BairesDev usa 6 meses | ¿6 o 12 meses? |
| Exclusividad del primer referente por 6 meses | BairesDev y Tecla: ventana de contratación de 6 meses | — |
| Tope mensual de referidos | Casi nadie pone tope; controlan pagando por contratación | ¿Sacar el tope y usar reputación? |
| Referir para búsquedas abiertas | Devlane, Turing | — |
| Externos verificados antes de cobrar | Turing (identidad, impuestos, medio de pago) | Verificar recién al momento de cobrar, no al registrarse (menos fricción) |
| Recruiting excluido | — | X-Team: premios no monetarios → posible variante para recruiting |
| (Segunda etapa) antifraude | Draftboard: puntaje de reputación por calidad | Puntaje del referente según cuántos de sus referidos pasan el screening |
| Tablero "mis referidos" | Turing, BairesDev, Draftboard | — |

---

## 5. El programa que WorldTeams ya tiene (inspiración para el front)

Consultado el 20/10/2026 en worldteams.com/referral-program. **Es otro programa:** sirve para referir **clientes** (empresas), no talento.

| Aspecto | Programa actual de WorldTeams (clientes) | Programa propuesto (talento) |
|---|---|---|
| Qué se refiere | Una empresa que contrata servicios | Un profesional para una búsqueda abierta |
| Quién puede referir | Solo clientes actuales | Cualquiera registrado; más premio para gente de WorldTeams |
| Premio | USD 500 de crédito en la factura | USD 200 a 1.000 en dinero según seniority (supuesto) |
| Cuándo se paga | Cuando el referido usa 40 horas, en la factura del mes siguiente | A los 90 días de una contratación efectiva |
| Tope | Sin límite | 10 cargas por mes |
| Cómo se refiere | Formulario de HubSpot | Landing con registro, formulario y panel de seguimiento |

**Qué se tomó como inspiración para el front:** paleta (verde `#142D2B` y lima `#D0EF76`), tipografías (Space Grotesk y Manrope), botones píldora, el número destacado en lima ("1-2-500USD"), los pasos numerados y la tabla de lo que se puede ganar ("Average Loyalty Rewards").

**Qué se agregó que su programa no tiene:** calculadora interactiva, atajo "refer for this role" en cada búsqueda y un panel donde el referente sigue cada referido hasta el pago. Hoy, después de mandar el formulario de HubSpot, el referente no ve nada más.

> Los cambios respecto de su programa actual quedan para discutir con WorldTeams (ver "Para validar con WorldTeams" en `entregables/05-nota-decisiones.md`).

## 6. Fuentes

- BairesDev, Talent Referral Program: https://www.bairesdev.com/referrals-program/
- Devlane, Candidate Referral Program: https://devlane.com/candidate-referral-program
- Tecla, Referral: https://www.tecla.io/referral
- Turing, cómo funciona el programa: https://help.turing.com/hc/en-us/articles/360004373635-how-does-turing-s-referral-program-work-
- Turing, cómo referir: https://help.turing.com/articles/4517961572-how-do-i-refer-someone
- Turing, estado de referidos: https://help.turing.com/articles/3476602211-status-of-my-referrals
- Turing, cómo cobrar: https://help.turing.com/articles/9695053382-how-to-get-paid
- TechCrunch, Draftboard: https://techcrunch.com/2024/04/15/draftboard-lets-companies-list-referral-bonuses-for-anyone
- ThirstySprout, Referral Program: https://www.thirstysprout.com/referral-program
- X-Team, Referral Program: https://x-team.com/blog/referral-program/
- WorldTeams, Referral Program (clientes): https://worldteams.com/referral-program/
- iCIMS, retención de referidos: https://www.icims.com/blog/how-employee-referrals-impact-retention/
