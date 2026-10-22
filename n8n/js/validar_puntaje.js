// Parsea y valida la respuesta del modelo (adaptado del validador del CV Screener).
// Nunca tira excepción: devuelve valido=false con el motivo, y el aviso a recruiting sale igual, sin puntaje.
// gravedad: 'critico' = el modelo no respondió (alerta por Telegram); 'aviso' = respuesta inválida (solo registro).
function validarPuntaje(raw) {
  const fail = (error, gravedad = 'aviso') => ({ valido: false, error, gravedad });
  if (typeof raw !== 'string' || !raw.trim()) return fail('the model returned no text', 'critico');

  // Tolera ```json ... ``` o texto alrededor: toma desde la primera { hasta la última }
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end <= start) return fail('no JSON object in the answer');

  let data;
  try {
    data = JSON.parse(raw.slice(start, end + 1));
  } catch (e) {
    return fail('invalid JSON');
  }

  // El puntaje puede venir como "8": se acepta si es un entero en texto
  if (typeof data.puntaje === 'string' && /^\d+$/.test(data.puntaje.trim())) data.puntaje = Number(data.puntaje);
  if (!Number.isInteger(data.puntaje) || data.puntaje < 1 || data.puntaje > 10) {
    return fail('score out of range (1-10)');
  }
  if (typeof data.justificacion !== 'string' || !data.justificacion.trim()) return fail('empty justification');

  return { valido: true, puntaje: data.puntaje, justificacion: data.justificacion.trim().slice(0, 1000) };
}
