// Decide qué hacer con cada tarea de la cola y arma sus mails.
// Antes de actuar, chequea que el referido siga en el estado que la tarea supone. Si cambió (por ejemplo, el
// candidato ya confirmó y el mail de consentimiento seguía en la cola), la tarea se completa sin hacer nada.
const ESTADO_ESPERADO = {
  mail_consentimiento: ['pendiente_consentimiento'],
  puntuar_cv: ['en_proceso'],
  aviso_contratacion: ['contratado'],
  aviso_recompensa_aprobada: ['elegible_pago', 'pagado'],
  aviso_recompensa_anulada: ['anulado'],
  aviso_no_confirmado: ['no_confirmado'],
  borrar_cv: null, // siempre: el CV se borra aunque el referido haya cambiado de estado
};

// tarea = fila de tomar_tareas(): { id, tipo, referido_id, intento, payload, datos }
function preparar(tarea, cfg) {
  if (!tarea || tarea.id == null) return { accion: 'nada' }; // la cola vino vacía
  const d = tarea.datos ?? {};
  const base = { tarea_id: tarea.id, tipo: tarea.tipo, intento: tarea.intento, referido_id: tarea.referido_id, ...d };

  const esperado = ESTADO_ESPERADO[tarea.tipo];
  if (esperado === undefined) return { ...base, accion: 'saltear', motivo: `tipo desconocido: ${tarea.tipo}` };
  if (esperado && !esperado.includes(d.estado)) {
    return { ...base, accion: 'saltear', motivo: `el referido está en ${d.estado}, la tarea supone ${esperado.join('/')}` };
  }

  if (tarea.tipo === 'borrar_cv') return { ...base, accion: 'borrar_cv', cv_path: tarea.payload?.cv_path };
  if (tarea.tipo === 'puntuar_cv') return { ...base, accion: 'puntuar' };
  if (tarea.tipo === 'aviso_recompensa_aprobada') {
    const admin = MAILS.aviso_pago_admin(d, cfg);
    return { ...base, accion: 'mail_y_admin', ...MAILS[tarea.tipo](d, cfg),
             admin_to: admin.to, admin_subject: admin.subject, admin_html: admin.html };
  }
  return { ...base, accion: 'mail', ...MAILS[tarea.tipo](d, cfg) };
}
