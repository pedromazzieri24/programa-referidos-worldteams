// Una sola alerta por problema: durante un corte de conexión, el procesador falla cada minuto con el mismo error.
// Si la misma falla (workflow, nodo y mensaje) ya se avisó dentro de la ventana, no se repite. El registro en la
// tabla `errores` sigue siendo uno por falla. Dos tareas distintas avisan cada una: su mensaje trae el número.
// avisadas = { clave: momento del último aviso (ms) }; en n8n son los datos estáticos del workflow.
// n8n los guarda al terminar cada ejecución: dos fallas idénticas en el mismo instante avisan las dos (probado
// el 22/10). En un corte no pasa, porque el procesador falla una vez por minuto.
const VENTANA_ALERTA_MIN = 30;

function filtrarRepetidas(alertas, avisadas, ahora) {
  const ventana = VENTANA_ALERTA_MIN * 60 * 1000;
  const salen = [];
  for (const a of alertas) {
    const clave = `${a.workflow}|${a.nodo}|${a.mensaje}`;
    if (avisadas[clave] !== undefined && ahora - avisadas[clave] < ventana) continue;
    avisadas[clave] = ahora;
    salen.push({ ...a, texto_alerta: `${a.texto_alerta}\n\n(Si se repite, no vuelvo a avisar por ${VENTANA_ALERTA_MIN} minutos.)` });
  }
  // Se olvidan las claves vencidas para que los datos guardados no crezcan.
  for (const [clave, momento] of Object.entries(avisadas)) {
    if (ahora - momento >= ventana) delete avisadas[clave];
  }
  return salen;
}
