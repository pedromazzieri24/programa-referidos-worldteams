# Programa de referidos WorldTeams

Sistema para que WorldTeams reciba talento recomendado: cualquier persona se registra, refiere candidatos para las búsquedas abiertas y sigue cada referido hasta el pago, que se libera cuando el contratado cumple 90 días. El candidato confirma que quiere participar, la IA puntúa su CV contra la búsqueda y recruiting lo recibe con ese puntaje.

**Landing:** https://programa-referidos-worldteams.vercel.app (MVP con datos de ejemplo).

## Entregables

| # | Lo que pide el enunciado | Dónde |
|---|---|---|
| 1 | Esquema del programa | [`entregables/01-esquema-programa.md`](entregables/01-esquema-programa.md) |
| 2 | Modelo de datos | [`entregables/02-modelo-datos.md`](entregables/02-modelo-datos.md) y [`supabase/schema.sql`](supabase/schema.sql) |
| 3 | Landing para referir | La URL de arriba y [`landing/`](landing/) |
| 4 | Flujo de automatización | [`entregables/04-flujos.md`](entregables/04-flujos.md) y los workflows en [`n8n/`](n8n/) |
| 5 | Nota de decisiones (incluye cómo usé la IA) | [`entregables/05-nota-decisiones.md`](entregables/05-nota-decisiones.md) |

Material de apoyo: [`BITACORA-IA.md`](BITACORA-IA.md) (cada iteración con la IA: qué propuso, qué acepté y qué corregí), [`PRUEBAS.md`](PRUEBAS.md) (las pruebas caso por caso), [`ENCAJE-CON-WORLDTEAMS.md`](ENCAJE-CON-WORLDTEAMS.md) (cómo convive con su ATS, su CRM y sus planillas) y [`REFERENCIAS-PROGRAMAS-REFERIDOS.md`](REFERENCIAS-PROGRAMAS-REFERIDOS.md) (programas reales que se usaron de referencia).

## Cómo está armado

```
Landing (Vercel) ──► Postgres en Supabase (las reglas) ──► cola de tareas ◄── n8n, cada minuto
                                                                              ├─ mails (SMTP)
                                                                              ├─ CV → Gemini → puntaje → aviso a recruiting
                                                                              └─ revisión diaria (90 días, consentimientos vencidos)
```

- **Las reglas viven en la base.** La landing llama a funciones de Postgres que validan e insertan en una sola transacción: no se pueden saltear desde el navegador. Los números del negocio (montos, ventanas, tope) están en tablas, no en el código.
- **n8n ejecuta, no decide.** Corre en local y toma el trabajo de una cola, así que la landing nunca necesita llamarlo y, si n8n se cae, nada se pierde.

## Estructura

```
├── entregables/   los documentos del enunciado
├── landing/       Next.js 16 (en inglés)
├── supabase/      schema.sql, storage.sql, seed.sql, tests.sql, chequeo.sql y migraciones/
├── n8n/           scripts que generan los workflows, el código de los nodos y sus tests
├── BITACORA-IA.md
└── PRUEBAS.md
```

## Cómo correrlo

| Qué | Cómo |
|---|---|
| Base nueva | En el SQL Editor de Supabase: `schema.sql` → `storage.sql` → `seed.sql` |
| Landing | Ver [`landing/README.md`](landing/README.md): `.env.local` con la URL y la clave pública de Supabase, `npm install`, `npm run dev` |
| Workflows | Ver [`n8n/README.md`](n8n/README.md): credenciales en n8n, `python3 build_*.py` y pegar cada JSON |

Las claves secretas (Supabase, Gemini, SMTP, Telegram) viven solo en n8n y en Supabase; el repo no tiene ninguna. Todos los datos de prueba son ficticios.

## Pruebas

| Qué | Cómo | Casos |
|---|---|---|
| Reglas del negocio | `supabase/tests.sql` en el SQL Editor (crea sus datos y los borra) | 37 |
| Código de los nodos de n8n | `node n8n/test_js.js` | 25 |
| De punta a punta (landing + base + n8n) | Manual, caso por caso en `PRUEBAS.md` | 19 |
