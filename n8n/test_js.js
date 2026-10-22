// Prueba el código de los nodos Code fuera de n8n: qué hace cada tarea, los mails y el validador del puntaje.
// Correr desde n8n/:  node test_js.js
const fs = require('fs');
const cargar = (...archivos) => archivos.map((a) => fs.readFileSync(`${__dirname}/js/${a}`, 'utf8')).join('\n');
const { preparar, validarPuntaje, avisoRecruiting } = new Function(
  cargar('mails.js', 'preparar.js', 'validar_puntaje.js') + '\nreturn { preparar, validarPuntaje, avisoRecruiting };')();

const cfg = { landing_url: 'https://landing.test', mail_recruiting: 'recruiting@test.invalid', mail_admin: 'admin@test.invalid' };
const datos = {
  token: 'tok123', estado: 'pendiente_consentimiento', motivo: null, vence_at: '2026-11-05T14:00:00+00:00',
  candidato_nombre: 'Martín Sosa', candidato_email: 'martin@test.invalid', cv_path: 'uid/abc.pdf',
  referente_nombre: 'Lucía <b>Fernández</b>', referente_email: 'lucia@test.invalid',
  busqueda_titulo: 'Revit Specialist', recompensa_id: 'rc-1', recompensa_usd: 400,
  recompensa_elegible_desde: '2027-01-19', recompensa_motivo: 'The hire left before 90 days',
};
const tarea = (tipo, cambios = {}, extra = {}) =>
  ({ id: 7, tipo, referido_id: 'ref-1', intento: 1, payload: {}, datos: { ...datos, ...cambios }, ...extra });

let fallas = 0;
const caso = (nombre, ok) => { console.log(`${ok ? '✅' : '❌'} ${nombre}`); if (!ok) fallas++; };

// Qué hace con cada tarea
let r = preparar(tarea('mail_consentimiento'), cfg);
caso('mail_consentimiento pendiente → mail al candidato con el link', r.accion === 'mail' && r.to === datos.candidato_email
  && r.html.includes('https://landing.test/consent/tok123') && r.html.includes('November 5, 2026'));
caso('el nombre del referente se escapa en el HTML', r.html.includes('Lucía &lt;b&gt;Fernández&lt;/b&gt;') && !r.html.includes('<b>Fernández'));
r = preparar(tarea('mail_consentimiento', { estado: 'en_proceso' }), cfg);
caso('mail_consentimiento con el candidato ya confirmado → saltear (hallazgo E2E-03)', r.accion === 'saltear');
r = preparar(tarea('puntuar_cv', { estado: 'en_proceso' }), cfg);
caso('puntuar_cv en proceso → puntuar', r.accion === 'puntuar' && r.cv_path === 'uid/abc.pdf' && r.tarea_id === 7);
r = preparar(tarea('puntuar_cv', { estado: 'no_confirmado' }), cfg);
caso('puntuar_cv de un referido cerrado → saltear', r.accion === 'saltear');
r = preparar(tarea('aviso_contratacion', { estado: 'contratado' }), cfg);
caso('aviso_contratacion → mail al referente con monto y fecha de pago', r.accion === 'mail' && r.to === datos.referente_email
  && r.html.includes('USD 400') && r.html.includes('January 19, 2027'));
r = preparar(tarea('aviso_recompensa_aprobada', { estado: 'elegible_pago' }), cfg);
caso('recompensa aprobada → mail al referente y a administración', r.accion === 'mail_y_admin'
  && r.to === datos.referente_email && r.admin_to === cfg.mail_admin && r.admin_html.includes("marcar_pagada('rc-1'"));
r = preparar(tarea('aviso_recompensa_anulada', { estado: 'anulado' }), cfg);
caso('recompensa anulada → mail con el motivo', r.accion === 'mail' && r.html.includes('The hire left before 90 days'));
r = preparar(tarea('aviso_no_confirmado', { estado: 'no_confirmado', motivo: 'rechazó', cv_path: null }), cfg);
caso('no confirmado (rechazó) → mail al referente', r.accion === 'mail' && r.html.includes('chose not to take part'));
r = preparar(tarea('aviso_no_confirmado', { estado: 'no_confirmado', motivo: 'venció', cv_path: null }), cfg);
caso('no confirmado (venció) → otro texto', r.html.includes("didn't reply in time"));
r = preparar(tarea('borrar_cv', { estado: 'en_proceso', cv_path: null }, { payload: { cv_path: 'uid/viejo.pdf' } }), cfg);
caso('borrar_cv → borra el path del payload, sin importar el estado', r.accion === 'borrar_cv' && r.cv_path === 'uid/viejo.pdf');
caso('cola vacía → nada', preparar({}, cfg).accion === 'nada');
caso('tipo desconocido → saltear', preparar(tarea('otro'), cfg).accion === 'saltear');

// Validador del puntaje
caso('JSON limpio', validarPuntaje('{"puntaje": 8, "justificacion": "Strong Revit."}').puntaje === 8);
caso('con ```json y texto alrededor', validarPuntaje('Here:\n```json\n{"puntaje": "7", "justificacion": "ok"}\n```').puntaje === 7);
caso('puntaje fuera de rango → inválido (aviso)', validarPuntaje('{"puntaje": 11, "justificacion": "x"}').gravedad === 'aviso');
caso('sin justificación → inválido', !validarPuntaje('{"puntaje": 5, "justificacion": " "}').valido);
caso('JSON roto → inválido', !validarPuntaje('{"puntaje": 5,').valido);
caso('el modelo no respondió → crítico', validarPuntaje(undefined).gravedad === 'critico');

// Aviso a recruiting
const t = preparar(tarea('puntuar_cv', { estado: 'en_proceso' }), cfg);
r = avisoRecruiting(t, validarPuntaje('{"puntaje": 8, "justificacion": "Strong Revit."}'), cfg);
caso('aviso a recruiting con puntaje', r.to === cfg.mail_recruiting && r.subject.includes('8/10')
  && r.html.includes("marcar_contratado('ref-1')"));
r = avisoRecruiting(t, validarPuntaje('nada'), cfg);
caso('aviso a recruiting sin puntaje si la IA falló', r.subject.includes('review manually') && r.html.includes('review the CV manually'));

console.log(fallas ? `\n${fallas} casos fallaron` : '\nTodos los casos ok');
process.exit(fallas ? 1 : 0);
