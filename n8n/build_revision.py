"""Genera workflow-revision.json: la revisión diaria (9:00, hora de Buenos Aires).

Llama a revision_diaria(), que en una sola transacción:
  - aprueba las recompensas que cumplieron los 90 días (sin fecha de baja y con el referente activo) o las anula;
  - cierra los consentimientos vencidos (14 días) y encola el borrado del CV.
Los avisos no los manda este workflow: quedan en la cola y los envía el procesador de tareas.
Para la demo se puede correr a mano con "Execute workflow".
Correr desde n8n/:  python3 build_revision.py
"""
from comun import conectar, config_node, credencial, guardar, node, rpc

SUPA = credencial("supabaseApi", "Supabase account MVP")

nodes = [
    node("Todos los días 9:00", "n8n-nodes-base.scheduleTrigger", 1.2, [0, 0],
         {"rule": {"interval": [{"field": "days", "triggerAtHour": 9}]}}),
    config_node([220, 0], ["supabase_url"]),
    # Devuelve { aprobadas, anuladas, consentimientos_vencidos }: queda en la ejecución como registro del día.
    rpc("Revisión diaria", [440, 0], "revision_diaria", "{}", SUPA),
]

connections = conectar(("Todos los días 9:00", "Config"), ("Config", "Revisión diaria"))

guardar("workflow-revision.json", "Referidos – Revisión diaria", nodes, connections)
