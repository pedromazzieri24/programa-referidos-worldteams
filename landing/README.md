# Landing — Talent Referral Program

Next.js 16 (App Router, Server Components y Server Actions) + Supabase (Auth con magic link, Postgres y Storage). En inglés, con la identidad visual de worldteams.com.

## Rutas

| Ruta | Qué hace |
|---|---|
| `/` | Programa, vista previa del panel, calculadora de recompensa, búsquedas abiertas y FAQ |
| `/signup`, `/login` | Registro e ingreso con magic link |
| `/refer` | Formulario de referido (sube el CV y llama a `crear_referido`) |
| `/my-referrals` | Panel del referente: indicadores y línea de progreso de cada referido |
| `/consent/[token]` | El candidato acepta o rechaza participar |
| `/auth/confirm` | Destino del magic link: convierte el código en sesión |

## Cómo está armada

- **Las reglas viven en la base**, no acá: la landing valida formatos (`lib/validacion.ts`, en el navegador y otra vez en el servidor) y llama a las funciones de Supabase, que aplican las reglas del programa.
- **Solo clave pública.** La protegen RLS y las funciones. La clave secreta vive únicamente en n8n.
- **Textos separados** en `lib/textos.ts`: la base devuelve códigos y acá se traducen.
- `proxy.ts` (el "middleware" de Next 16) renueva la sesión en cada request.

## Cómo correrla

1. `cp .env.example .env.local` y completar la URL del proyecto y la clave publishable de Supabase.
2. En Supabase, *Authentication → URL Configuration*: *Site URL* = la URL de Vercel, y en *Redirect URLs* `https://<la-url-de-vercel>/**` y `http://localhost:3000/**`. Si falta la de Vercel, el link del mail cae en la home con `?code=…` y no inicia la sesión. También el SMTP propio configurado.
3. `npm install` y `npm run dev` → http://localhost:3000

El link del mail tiene que abrirse en el mismo navegador donde se pidió.
