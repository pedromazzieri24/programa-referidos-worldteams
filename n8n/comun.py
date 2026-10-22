"""Piezas comunes de los build_*.py: el helper node(), la configuración y las credenciales.

Las credenciales (claves) viven solo en n8n. Acá se referencian por nombre; si n8n ya las tiene,
se busca su id en la base local de n8n (~/.n8n/database.sqlite, solo id/nombre/tipo, nunca el secreto)
para que el workflow quede enlazado al pegarlo. Si no las encuentra, se eligen a mano en cada nodo.
"""
import json, os, sqlite3, uuid
from pathlib import Path

AQUI = Path(__file__).parent
N8N_DB = Path.home() / ".n8n" / "database.sqlite"
REPORTAR_URL = "http://localhost:5678/webhook/registrar-error-referidos"  # webhook del workflow de errores
NOMBRE_ERRORES = "Referidos – Errores"


def _supabase_url():
    """La URL del proyecto sale de landing/.env.local (no es secreta, pero no se escribe a mano en dos lugares)."""
    env = AQUI.parent / "landing" / ".env.local"
    if env.exists():
        for linea in env.read_text().splitlines():
            if linea.startswith("NEXT_PUBLIC_SUPABASE_URL="):
                return linea.split("=", 1)[1].strip()
    return "https://REEMPLAZAR.supabase.co"


# Lo que cambia entre entornos, en un solo lugar (nodo "Config" de cada workflow).
CONFIG = {
    "supabase_url": _supabase_url(),
    "landing_url": "https://programa-referidos-worldteams.vercel.app",
    "mail_remitente": "Talent Referral Program <pedro.mazzieri24@gmail.com>",
    # Demo: alias de Gmail que llegan a la casilla de Pedro. En producción, las casillas de cada equipo.
    "mail_recruiting": "pedro.mazzieri24+recruiting@gmail.com",
    "mail_admin": "pedro.mazzieri24+admin@gmail.com",
}


def _buscar(sql, *args):
    if not N8N_DB.exists():
        return None
    con = sqlite3.connect(f"file:{N8N_DB}?mode=ro", uri=True)
    try:
        fila = con.execute(sql, args).fetchone()
        return fila[0] if fila else None
    finally:
        con.close()


def credencial(tipo, nombre):
    cid = _buscar("select id from credentials_entity where type = ? and name = ?", tipo, nombre)
    if not cid:
        print(f"  aviso: no encontré la credencial '{nombre}' ({tipo}) en n8n; elegila a mano al importar")
    return {tipo: {"id": cid or "", "name": nombre}}


def id_workflow_errores():
    return _buscar("select id from workflow_entity where name = ?", NOMBRE_ERRORES)


def node(name, type_, ver, pos, params, **extra):
    n = {"parameters": params, "id": str(uuid.uuid4()), "name": name, "type": type_,
         "typeVersion": ver, "position": pos}
    n.update(extra)
    return n


def config_node(pos, claves):
    return node("Config", "n8n-nodes-base.set", 3.4, pos, {
        "assignments": {"assignments": [
            {"id": str(uuid.uuid4()), "name": k, "value": CONFIG[k], "type": "string"} for k in claves]},
        "options": {}})


def si(name, pos, expr):
    """Nodo IF con una condición booleana (salida 0 = verdadero, 1 = falso)."""
    return node(name, "n8n-nodes-base.if", 2.2, pos, {
        "conditions": {
            "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "strict", "version": 2},
            "conditions": [{"id": str(uuid.uuid4()), "leftValue": expr, "rightValue": "",
                            "operator": {"type": "boolean", "operation": "true", "singleValue": True}}],
            "combinator": "and"},
        "options": {}})


def rpc(name, pos, funcion, cuerpo, cred, **extra):
    """Llama a una función de la base (RPC de Supabase) con la clave secreta de la credencial."""
    return node(name, "n8n-nodes-base.httpRequest", 4.2, pos, {
        "method": "POST",
        "url": f"={{{{ $('Config').first().json.supabase_url }}}}/rest/v1/rpc/{funcion}",
        "authentication": "predefinedCredentialType", "nodeCredentialType": "supabaseApi",
        "sendBody": True, "specifyBody": "json", "jsonBody": cuerpo, "options": {}},
        credentials=cred, **extra)


def js(*archivos):
    """Concatena el código de n8n/js/ para un nodo Code (así se prueba fuera de n8n con test_js.js)."""
    return "\n".join((AQUI / "js" / a).read_text() for a in archivos)


def conectar(*pares):
    """conectar(("A", "B"), ("A", "C", 1)) → A salida 0 → B; A salida 1 → C."""
    conns = {}
    for par in pares:
        origen, destino, salida = (par + (0,))[:3]
        tipo = "main"
        if isinstance(salida, str):  # conexiones de IA: ("Modelo", "Agente", "ai_languageModel")
            tipo, salida = salida, 0
        salidas = conns.setdefault(origen, {}).setdefault(tipo, [])
        while len(salidas) <= salida:
            salidas.append([])
        salidas[salida].append({"node": destino, "type": tipo, "index": 0})
    return conns


def guardar(nombre_archivo, nombre, nodes, connections, **settings):
    wf = {"name": nombre, "nodes": nodes, "connections": connections,
          "settings": {"executionOrder": "v1", "timezone": "America/Argentina/Buenos_Aires", **settings}}
    errores = id_workflow_errores()
    if errores and nombre != NOMBRE_ERRORES:
        wf["settings"]["errorWorkflow"] = errores
    (AQUI / nombre_archivo).write_text(json.dumps(wf, ensure_ascii=False, indent=2))
    print(f"ok {nombre_archivo}: {len(nodes)} nodos" + ("" if errores or nombre == NOMBRE_ERRORES else
          " (sin workflow de errores enlazado: importá primero el de errores y volvé a generar)"))
