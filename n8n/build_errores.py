"""Genera workflow-errores.json: registro + alerta de errores de los workflows del programa.

Reutilizado del CV Screener (demo anterior), apuntando a la base del programa de referidos.
Dos entradas, un solo lugar donde se registra y se alerta:
  - Error Trigger: cuando OTRO workflow falla por completo (los build_*.py lo enlazan como "Error workflow"
    si este ya está importado en n8n).
  - Webhook POST /webhook/registrar-error-referidos: fallas que el procesador de tareas atrapa y sigue
    (una tarea que falló, un puntaje inválido).
Registro: tabla `errores` en Supabase (sin datos personales). Alerta: Telegram, solo si la gravedad es 'critico'
(por ejemplo, una tarea que agotó sus 3 intentos).
Correr desde n8n/:  python3 build_errores.py
"""
import uuid
from comun import NOMBRE_ERRORES, conectar, credencial, guardar, node, si

SUPA = credencial("supabaseApi", "Supabase account MVP")
TELEGRAM = credencial("telegramApi", "Telegram account")

CODE_NORMALIZAR = r"""// Unifica las dos entradas en una misma forma. No guarda datos personales: solo qué falló y dónde
// (si un mensaje de error trae un mail, se tapa).
const corto = (v, n = 300) => String(v ?? '').replace(/[^\s@<>"'()]+@[^\s@<>"'()]+/g, '[email]').slice(0, n);

// Texto de la alerta para Telegram (modo HTML: se escapan <, > y &; con Markdown, un "_" como el de
// "aviso_contratacion" hacía que Telegram rechazara el mensaje).
const html = v => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const alerta = r => ({ ...r, texto_alerta: `ALERTA (referidos): ${html(r.workflow)} falló en "${html(r.nodo)}"\n`
  + `${html(r.mensaje)}\n\nEjecución: ${html(r.execution_url ?? 'sin link')}` });

// Entrada 1: Error Trigger -> { execution: { id, url, error, lastNodeExecuted }, workflow: { id, name } }
if ($json.execution) {
  const e = $json.execution;
  return { json: alerta({
    gravedad: 'critico',
    workflow: corto($json.workflow?.name, 100),
    nodo: corto(e.lastNodeExecuted, 100),
    mensaje: corto(e.error?.message ?? 'Error sin mensaje'),
    execution_id: corto(e.id, 50),
    execution_url: e.url ?? null,
  }) };
}

// Entrada 2: webhook de reportes -> el cuerpo viene en $json.body
const b = $json.body ?? {};
const url = b.workflow_id && b.execution_id
  ? `""" + "http://localhost:5678" + r"""/workflow/${b.workflow_id}/executions/${b.execution_id}`
  : null;
return { json: alerta({
  gravedad: b.gravedad === 'aviso' ? 'aviso' : 'critico',
  workflow: corto(b.workflow, 100),
  nodo: corto(b.nodo, 100),
  mensaje: corto(b.mensaje || 'Sin mensaje'),
  execution_id: corto(b.execution_id, 50),
  execution_url: url,
}) };
"""



nodes = [
    node("Error Trigger", "n8n-nodes-base.errorTrigger", 1, [0, -120], {}),
    node("Webhook de reportes", "n8n-nodes-base.webhook", 2.1, [0, 120],
         {"httpMethod": "POST", "path": "registrar-error-referidos", "responseMode": "onReceived", "options": {}},
         webhookId=str(uuid.uuid4())),
    node("Normalizar", "n8n-nodes-base.code", 2, [260, 0],
         {"mode": "runOnceForEachItem", "jsCode": CODE_NORMALIZAR}),
    # Si Supabase falla, no se pierde la alerta: el registro y la alerta van en ramas paralelas
    node("Registrar error", "n8n-nodes-base.supabase", 1, [540, -120], {
        "tableId": "errores",
        "fieldsUi": {"fieldValues": [
            {"fieldId": "gravedad", "fieldValue": "={{ $json.gravedad }}"},
            {"fieldId": "workflow", "fieldValue": "={{ $json.workflow }}"},
            {"fieldId": "nodo", "fieldValue": "={{ $json.nodo }}"},
            {"fieldId": "mensaje", "fieldValue": "={{ $json.mensaje }}"},
            {"fieldId": "execution_id", "fieldValue": "={{ $json.execution_id }}"},
            {"fieldId": "execution_url", "fieldValue": "={{ $json.execution_url }}"}]}},
         credentials=SUPA, onError="continueRegularOutput"),
    si("¿Es crítico?", [540, 120], "={{ $json.gravedad === 'critico' }}"),
    # chatId: completarlo en n8n (no va al repo). La credencial de Telegram también vive solo en n8n.
    node("Alertar (Telegram)", "n8n-nodes-base.telegram", 1.2, [800, 100], {
        "resource": "message", "operation": "sendMessage",
        "chatId": "REEMPLAZAR_CHAT_ID",
        "text": "={{ $json.texto_alerta }}",
        "additionalFields": {"appendAttribution": False, "parse_mode": "HTML"}},
         credentials=TELEGRAM),
]

connections = conectar(
    ("Error Trigger", "Normalizar"), ("Webhook de reportes", "Normalizar"),
    ("Normalizar", "Registrar error"), ("Normalizar", "¿Es crítico?"),
    ("¿Es crítico?", "Alertar (Telegram)", 0),
)

guardar("workflow-errores.json", NOMBRE_ERRORES, nodes, connections)
