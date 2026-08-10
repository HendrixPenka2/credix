from app.db.mongodb import get_db


def col_clients():
    return get_db()["clients"]

def col_demandes():
    return get_db()["demandes"]

def col_decisions():
    return get_db()["decisions"]

def col_utilisateurs():
    return get_db()["utilisateurs"]

def col_audit_logs():
    return get_db()["audit_logs"]

def col_modeles():
    return get_db()["modeles"]

def col_feature_metadata():
    return get_db()["feature_metadata"]

def col_admin_config():
    return get_db()["admin_config"]
