# Pruebas del programa de referidos

El sistema se prueba en dos niveles, que se complementan:

| Nivel | Qué prueba | Cómo se corre | Estado |
|---|---|---|---|
| **1. Tests de reglas** (automáticos) | Cada regla del negocio, directo contra la base, incluidos los casos raros (tope, vencimientos, 90 días) | `supabase/tests.sql` en el SQL Editor de Supabase. Crea sus propios datos, los borra al terminar y devuelve una tabla con `ok = true` por caso | 36 casos en verde (20/10) |
| **2. Prueba de punta a punta** (manual) | Que todo funcione junto, como lo usaría una persona: la landing, el login por mail, el CV, la base y el panel | A mano, en la landing local, con los personajes de la demo. Se verifica en pantalla y con consultas SQL | 10 casos en verde (21/10) |

**Por qué los dos:** los tests de reglas comprueban que la base decide bien, pero no pasan por la pantalla. La prueba de punta a punta encontró cosas que los tests no podían ver: un contador desactualizado, un formulario que se vaciaba y una tarea que quedaba en la cola sin sentido (ver "Hallazgos").

---

## 1. Tests de reglas (`supabase/tests.sql`)

Agrupados por la regla que validan:

| Regla | Qué comprueban |
|---|---|
| **Quién puede referir (P1)** | Con mail corporativo, entra como colocado verificado; si dice ser colocado sin ese mail, queda sin verificar y cobra como externo (USD 400); si un admin lo verifica antes del pago, cobra como WorldTeams (USD 600). Sin confirmar el mail no se crea el referente. Recruiting no puede referir |
| **Autorreferencia** | Rechaza si el candidato tiene el mismo mail, LinkedIn (aunque esté escrito distinto) o teléfono que el referente |
| **Duplicados y ventana de 6 meses** | Rechaza al mismo candidato con el mail escrito distinto (mayúsculas, espacios) o con otro mail pero el mismo LinkedIn. Rechaza a quien se postuló solo hace 2 meses y acepta a quien se postuló hace 8 |
| **No dar información de terceros (P4)** | El mensaje de duplicado no revela nada del candidato. La página de consentimiento muestra solo nombres de pila, la búsqueda y el estado |
| **Tope mensual (P4)** | La carga 11 del mes se rechaza, aunque 5 de las anteriores hayan sido rechazos |
| **Consentimiento (P2)** | Confirmar pasa a "en proceso"; un segundo clic no cambia nada; "No me interesa" cierra el referido y avisa al referente; sin respuesta en 14 días vence y se borra el CV; un referido no confirmado no bloquea a otro referente |
| **CVs** | Nadie puede subir un CV a la carpeta de otro usuario |
| **Recompensa y 90 días (P3, P5)** | El monto sale de la tabla (senior + WorldTeams + prioritaria = USD 1.000); el pago se habilita a los 90 días; antes no se toca; si se fue antes, se anula; si lo contrataron fuera de la ventana de 6 meses, no hay recompensa; registrar el pago cierra el circuito |
| **Panel y n8n** | El panel muestra solo los referidos propios; la cola entrega a n8n los datos del mail y no entrega dos veces la misma tarea; cada cambio de estado queda en el historial |

---

## 2. Prueba de punta a punta (21/10, landing local)

### Personajes y datos

Los mails con `+` son alias de Gmail: llegan a la misma casilla, pero para el sistema son personas distintas.

| Personaje | Rol en la prueba | Datos |
|---|---|---|
| **Lucía Fernández** | Referente. Dice trabajar con un cliente de WorldTeams, pero usa Gmail (no tiene mail corporativo) | `pedro.mazzieri24+lucia@gmail.com` |
| **Martín Sosa** | Candidato nuevo, que nunca estuvo en la base | `pedro.mazzieri24+martin@gmail.com`, CV ficticio `02-medio-martin-sosa.pdf` |
| **Carolina Díaz** | Candidata que **ya se postuló sola hace 2 meses** (viene del seed y simula a alguien que ya está en el ATS de WorldTeams) | `carolina.diaz@example.com`, LinkedIn `linkedin.com/in/carolina-diaz-arq` |

Búsquedas usadas: **Revit Specialist** (semi senior: USD 400 externo / 600 WorldTeams) y **Junior CAD Drafter** (junior: USD 200 / 300).

### Casos

| # | Caso | Regla que valida | Qué se hizo | Resultado esperado | Obtenido |
|---|---|---|---|---|---|
| **E2E-01** | Registro de una referente sin mail corporativo | P1, plan B | Lucía se registra en `/signup` como "I work with a client through WorldTeams" y entra con el link del mail | Queda como colocada **sin verificar**: el panel la muestra con la etiqueta amarilla "not verified yet" y cobra como externa | ✅ |
| **E2E-02** | Referir a un candidato nuevo | Alta de referido, tope, ventana de 6 meses | Lucía refiere a Martín para Revit Specialist, con su CV | Referido "esperando al candidato"; CV guardado en la carpeta de Lucía con un nombre al azar; mail de consentimiento **en la cola** (lo manda n8n); cupo 9 de 10; potencial **USD 400** (tarifa externa); válido hasta el 21/04/2027 | ✅ |
| **E2E-03** | El candidato acepta participar | P2, consentimiento | Martín abre su link de consentimiento (sacado por SQL, en incógnito) y toca "Yes, I'd like to take part" | Pasa a "en proceso", se guarda la fecha del consentimiento, se encola el puntaje del CV y el panel de Lucía lo muestra "In selection process" | ✅ |
| **E2E-04** | El candidato confirma dos veces | Idempotencia | Martín vuelve a abrir el mismo link | "You already confirmed. Thank you!", sin cambios en la base | ✅ |
| **E2E-05** | Referir a alguien que ya se postuló | Duplicados (6 meses) y P4 | Lucía refiere a Carolina con su mail original | Mensaje genérico "already in touch with WorldTeams", sin crear referido; el intento **gasta cupo** | ✅ |
| **E2E-06** | Mismo candidato, otro mail, mismo LinkedIn | Duplicados por LinkedIn | Lucía refiere a Carolina con `carolina.diaz+wt@example.com` **y** su LinkedIn | El LinkedIn la delata: mismo mensaje de duplicado | ✅ |
| **E2E-07** | Mismo candidato, otro mail, sin LinkedIn | Límite conocido (antiabuso, regla 8) | Lucía refiere a Carolina con `carolina.diaz+wt@example.com` y **sin** LinkedIn | El sistema la acepta como nueva. **Es el riesgo conocido "misma persona, otro mail"**, documentado a propósito | ✅ (se comporta como se documentó) |
| **E2E-08** | Volver a referir a quien ya tiene un referido activo | "Primer referente gana" + arreglos del formulario | Lucía repite la carga anterior | Duplicado; **los datos quedan en el formulario** para corregir y **el contador baja en el momento** (de 6 a 5) | ✅ (después del arreglo) |
| **E2E-09** | Contratación | Recompensa y 90 días (P3, P5) | `marcar_contratado` desde el SQL Editor (lo que mañana haría el CRM) | Recompensa **USD 400** `pendiente`, elegible el **19/01/2027**; el panel muestra "Hired" y "Payout in 90 days" | ✅ |
| **E2E-10** | Cuentas del panel | Indicadores | Mirar el panel de Lucía al final | **5/10** cargas (Martín + 4 intentos con Carolina), **2** en carrera, **USD 600** potencial (400 de Martín + 200 de Carolina) | ✅ |

**Por qué el cupo terminó en 5 de 10:** la regla P4 cuenta todos los intentos, también los rechazados, para que nadie use el formulario para averiguar quién está en la base.

---

## 3. Hallazgos de la prueba y qué se decidió

| Hallazgo | Caso | Decisión | Dónde quedó |
|---|---|---|---|
| Al abrir el magic link quedan dos pestañas (lo decide el cliente de correo) | E2E-01 | Aviso "You can close the other tab". El código de 6 dígitos queda para la segunda etapa | `AvisoIngreso.tsx`, contexto §7 |
| El contador de cupo no bajaba con los rechazos | E2E-05/06 | Se refresca la página también ante un rechazo | `refer/acciones.ts` |
| El formulario se vaciaba después de un error (comportamiento de React 19) | E2E-05/06 | Los formularios se envían sin vaciarse (también registro y login) | `enviarSinVaciar.ts` |
| La misma persona con otro mail pasa como nueva si no se carga el LinkedIn | E2E-07 | Riesgo conocido, documentado. Segunda etapa: normalizar alias. A discutir: LinkedIn obligatorio | Contexto §4 (antiabuso, regla 8) |
| El mail de consentimiento queda en la cola aunque el candidato ya haya confirmado | E2E-03 | n8n chequea el estado del referido antes de cada tarea | Contexto §8 (lo que necesita n8n) |
| Si se verifica a la referente después de la contratación, el panel sigue mostrando la tarifa externa hasta el día 90 | E2E-09 | En la demo, verificar a Lucía **antes** de contratar a Martín | Contexto §4 (quién puede referir) |

---

## 4. Lo que falta probar

| Qué | Cuándo |
|---|---|
| Los mismos casos en la URL de Vercel (y el aviso de la pestaña con un login real) | Después del deploy |
| Los mails reales (consentimiento y avisos), el puntaje del CV con Gemini, la revisión diaria y las alertas de error | Fase 3 (n8n) |
| **E2E-11: registro repetido sin confirmar el mail.** Registrarse, no abrir el mail y volver a registrarse con los mismos datos: antes de los 60 s (¿qué mensaje sale?) y después, cambiando el nombre. Verificar que el primer link falla, que el segundo entra, que queda un solo referente y con qué datos, y qué pasa si esa persona intenta entrar por `/login` antes de confirmar. Hoy no lo cubre nadie: `tests.sql` inserta directo en la base y no pasa por Supabase Auth | Antes de la entrega (manual, 2 o 3 mails) |

---

## Anexo: consultas para verificar en Supabase

```sql
-- Referentes: tipo y verificación
select nombre, email, tipo, tipo_verificado from referentes;

-- Referidos con su estado y el CV
select c.nombre, r.estado, c.consentimiento_at, c.cv_path
from referidos r join candidatos c on c.id = r.candidato_id;

-- Cola de tareas para n8n
select tipo, estado from tareas order by created_at desc limit 5;

-- Intentos (cuentan para el tope)
select resultado, created_at from intentos_referido order by created_at desc limit 10;

-- Link de consentimiento del último referido
select 'http://localhost:3000/consent/' || token_consentimiento from referidos order by created_at desc limit 1;

-- Recompensas
select monto_usd, estado, elegible_desde from recompensas;
```
