// Mails del programa (en inglés, como la landing). Los usan los nodos Code "Preparar" y "Validar puntaje".
// Los nombres los escribe un tercero (el referente): todo lo que entra al HTML pasa por esc().

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pila = (nombre) => String(nombre ?? '').trim().split(/\s+/)[0] || 'there';
// '2027-01-19' (date) o '2026-11-05T12:00:00+00:00' (timestamptz) → 'January 19, 2027'
const fecha = (iso) => {
  if (!iso) return '';
  const d = new Date(String(iso).length === 10 ? iso + 'T12:00:00Z' : iso);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric',
                                         timeZone: 'America/Argentina/Buenos_Aires' });
};
const usd = (n) => 'USD ' + Number(n).toLocaleString('en-US');

const boton = (url, texto) =>
  `<p style="margin:24px 0"><a href="${esc(url)}" style="display:inline-block;padding:12px 24px;` +
  `border-radius:999px;background:#D0EF76;color:#142D2B;font-weight:600;text-decoration:none">${esc(texto)}</a></p>`;

const plantilla = (titulo, cuerpo) =>
  `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#142D2B;line-height:1.5">` +
  `<p style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#5b6b69">Talent Referral Program</p>` +
  `<h2 style="margin:0 0 16px">${titulo}</h2>${cuerpo}` +
  `<p style="margin-top:32px;font-size:12px;color:#5b6b69">WorldTeams connects professionals in Latin America ` +
  `with architecture and engineering firms in the United States.</p></div>`;

const fila = (k, v) => `<tr><td style="padding:4px 12px 4px 0;color:#5b6b69">${esc(k)}</td><td>${v}</td></tr>`;

// d = `datos` de tomar_tareas(); cfg = nodo "Config".
const MAILS = {
  // Al candidato: pedido de consentimiento.
  mail_consentimiento: (d, cfg) => ({
    to: d.candidato_email,
    subject: `${d.referente_nombre} referred you for the ${d.busqueda_titulo} role at WorldTeams`,
    html: plantilla(`Hi ${esc(pila(d.candidato_nombre))},`,
      `<p>${esc(d.referente_nombre)} thinks you'd be a great fit for the <b>${esc(d.busqueda_titulo)}</b> role ` +
      `and shared your contact details and CV with us.</p>` +
      `<p>Before our team looks at your profile, we need your OK. If you confirm, a recruiter will review it and ` +
      `get in touch. If you decline, or don't answer by <b>${fecha(d.vence_at)}</b>, we'll delete your CV and ` +
      `won't use your data.</p>` +
      boton(`${cfg.landing_url}/consent/${d.token}`, 'Review and answer') +
      `<p style="font-size:13px;color:#5b6b69">The link opens a page where you can confirm or decline.</p>`),
  }),

  // Al referente: su referido fue contratado.
  aviso_contratacion: (d, cfg) => ({
    to: d.referente_email,
    subject: `Great news: ${d.candidato_nombre} was hired`,
    html: plantilla(`Hi ${esc(pila(d.referente_nombre))},`,
      `<p>${esc(d.candidato_nombre)}, whom you referred for the <b>${esc(d.busqueda_titulo)}</b> role, was hired.</p>` +
      `<p>Your reward of <b>${usd(d.recompensa_usd)}</b> becomes payable on <b>${fecha(d.recompensa_elegible_desde)}</b>, ` +
      `as long as ${esc(pila(d.candidato_nombre))} is still working with the client by then.</p>` +
      boton(`${cfg.landing_url}/my-referrals`, 'See your referrals')),
  }),

  // Al referente: recompensa aprobada. Administración recibe su propio aviso (aviso_pago_admin).
  aviso_recompensa_aprobada: (d, cfg) => ({
    to: d.referente_email,
    subject: `Your ${usd(d.recompensa_usd)} reward was approved`,
    html: plantilla(`Hi ${esc(pila(d.referente_nombre))},`,
      `<p>${esc(d.candidato_nombre)} completed the required period with the client, so your reward of ` +
      `<b>${usd(d.recompensa_usd)}</b> was approved. Our team will contact you to arrange the payment.</p>` +
      `<p>Thanks for helping us find great talent.</p>` +
      boton(`${cfg.landing_url}/refer`, 'Refer someone else')),
  }),

  // A administración: qué pagar y cómo registrarlo.
  aviso_pago_admin: (d, cfg) => ({
    to: cfg.mail_admin,
    subject: `Reward to pay: ${usd(d.recompensa_usd)} to ${d.referente_nombre}`,
    html: plantilla('A referral reward is ready to pay',
      `<table style="border-collapse:collapse">` +
      fila('Referrer', `${esc(d.referente_nombre)} (${esc(d.referente_email)})`) +
      fila('Hire', esc(d.candidato_nombre)) +
      fila('Role', esc(d.busqueda_titulo)) +
      fila('Amount', `<b>${usd(d.recompensa_usd)}</b>`) +
      fila('Reward ID', `<code>${esc(d.recompensa_id)}</code>`) + `</table>` +
      `<p>Once paid, record it in Supabase:<br><code>select marcar_pagada('${esc(d.recompensa_id)}', ` +
      `'&lt;payment reference&gt;');</code></p>`),
  }),

  // Al referente: recompensa anulada (el motivo lo escribe revision_diaria(), en inglés).
  aviso_recompensa_anulada: (d, cfg) => ({
    to: d.referente_email,
    subject: `Update on your referral of ${d.candidato_nombre}`,
    html: plantilla(`Hi ${esc(pila(d.referente_nombre))},`,
      `<p>We're sorry: the reward for ${esc(d.candidato_nombre)} (<b>${esc(d.busqueda_titulo)}</b>) was voided. ` +
      `Reason: ${esc(d.recompensa_motivo)}.</p>` +
      `<p>Thanks for referring. Every referral helps us reach more great professionals.</p>` +
      boton(`${cfg.landing_url}/refer`, 'Refer someone else')),
  }),

  // Al referente: el candidato no confirmó (rechazó o venció el plazo).
  aviso_no_confirmado: (d, cfg) => ({
    to: d.referente_email,
    subject: `${d.candidato_nombre} didn't confirm the referral`,
    html: plantilla(`Hi ${esc(pila(d.referente_nombre))},`,
      `<p>${esc(d.candidato_nombre)} ` +
      (d.motivo === 'rechazó' ? 'chose not to take part' : "didn't reply in time") +
      ` for the <b>${esc(d.busqueda_titulo)}</b> role, so this referral is closed. ` +
      `We deleted their CV and won't use their data.</p>` +
      boton(`${cfg.landing_url}/refer`, 'Refer someone else')),
  }),
};

// A recruiting: referido confirmado, con el puntaje de la IA (o sin él, si la IA falló).
// t = ítem de "Preparar"; r = resultado de validarPuntaje().
const avisoRecruiting = (t, r, cfg) => ({
  to: cfg.mail_recruiting,
  subject: `New referral: ${t.candidato_nombre} for ${t.busqueda_titulo}` +
           (r.valido ? ` (AI score ${r.puntaje}/10)` : ' (review manually)'),
  html: plantilla('New confirmed referral',
    `<table style="border-collapse:collapse">` +
    fila('Candidate', `${esc(t.candidato_nombre)} (${esc(t.candidato_email)})`) +
    fila('Role', esc(t.busqueda_titulo)) +
    fila('Referred by', `${esc(t.referente_nombre)} (${esc(t.referente_email)})`) +
    fila('AI score', r.valido ? `<b>${r.puntaje}/10</b>: ${esc(r.justificacion)}`
                              : `Not available (${esc(r.error)}). Please review the CV manually.`) +
    fila('CV', `Supabase Storage: <code>cvs/${esc(t.cv_path)}</code>`) + `</table>` +
    `<p style="font-size:13px;color:#5b6b69">The score helps you prioritize; the decision is yours. ` +
    `If this person is hired, run <code>select marcar_contratado('${esc(t.referido_id)}');</code></p>`),
});
