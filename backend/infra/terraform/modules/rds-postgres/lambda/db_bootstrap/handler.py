"""Crea los roles y las bases de PostgreSQL de la plataforma.

Idempotente: un rol que ya existe conserva su contraseña (la rotación es dueña de ella) y
una base que ya existe no se toca salvo su dueño, sus permisos y sus extensiones. Nunca
borra roles ni bases. Se conecta con el usuario maestro administrado por RDS, solo desde
dentro de la VPC.
"""

import json
import os
import ssl
import sys

# Lambda solo agrega /var/task a sys.path: las dependencias empaquetadas viven en vendor/.
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "vendor"))

import pg8000.native as pg  # noqa: E402

MAINTENANCE_DB = "postgres"

_secrets_client = None


def _secret(arn):
    global _secrets_client
    if _secrets_client is None:
        import boto3  # Viene en el runtime de Lambda.

        _secrets_client = boto3.client("secretsmanager")
    return json.loads(_secrets_client.get_secret_value(SecretId=arn)["SecretString"])


def _ssl_context():
    # rds.force_ssl=1 obliga a TLS. La conexión es interna a la VPC, así que se cifra sin
    # verificar la cadena (el bundle de RDS no viene en el runtime de Lambda).
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


def _connector(host, port, master):
    def connect(dbname):
        return pg.Connection(
            user=master["username"],
            password=master["password"],
            host=host,
            port=int(port),
            database=dbname,
            ssl_context=_ssl_context(),
            timeout=30,
        )

    return connect


def _role_exists(conn, name):
    return bool(conn.run("SELECT 1 FROM pg_roles WHERE rolname = :n", n=name))


def _database_exists(conn, name):
    return bool(conn.run("SELECT 1 FROM pg_database WHERE datname = :n", n=name))


def bootstrap(event, master_username, connect, password_of):
    """Aplica roles, membresías, bases, extensiones y permisos. Devuelve un resumen."""
    admin = pg.identifier(master_username)
    users = event.get("users", [])
    groups = event.get("group_roles", [])
    databases = event.get("databases", [])
    replication = [u["name"] for u in users if u.get("rds_replication")]
    summary = {"created_roles": [], "existing_roles": [], "created_databases": []}

    conn = connect(MAINTENANCE_DB)
    try:
        for ext in event.get("extensions", []):
            conn.run(f"CREATE EXTENSION IF NOT EXISTS {pg.identifier(ext)}")

        for user in users:
            name = user["name"]
            ident = pg.identifier(name)
            if _role_exists(conn, name):
                summary["existing_roles"].append(name)
            else:
                conn.run(
                    f"CREATE ROLE {ident} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE "
                    f"NOBYPASSRLS PASSWORD {pg.literal(password_of(user))}"
                )
                summary["created_roles"].append(name)
            # El maestro debe poder asumir el rol para crear bases a su nombre (PG16+).
            conn.run(f"GRANT {ident} TO {admin}")
            if user.get("rds_replication"):
                conn.run(f"GRANT rds_replication TO {ident}")

        for group in groups:
            name = group["name"]
            ident = pg.identifier(name)
            if _role_exists(conn, name):
                summary["existing_roles"].append(name)
            else:
                conn.run(f"CREATE ROLE {ident} NOLOGIN")
                summary["created_roles"].append(name)
            conn.run(f"GRANT {ident} TO {admin}")
            for member in group.get("members", []):
                conn.run(f"GRANT {ident} TO {pg.identifier(member)}")

        for db in databases:
            name = db["name"]
            ident = pg.identifier(name)
            owner = pg.identifier(db["owner"])
            if _database_exists(conn, name):
                conn.run(f"ALTER DATABASE {ident} OWNER TO {owner}")
            else:
                # CREATE DATABASE no admite transacción: la API nativa de pg8000 es autocommit.
                conn.run(f"CREATE DATABASE {ident} OWNER {owner}")
                summary["created_databases"].append(name)
            conn.run(f"REVOKE ALL ON DATABASE {ident} FROM PUBLIC")
            for role in [*db.get("readers", []), *replication]:
                conn.run(f"GRANT CONNECT ON DATABASE {ident} TO {pg.identifier(role)}")
    finally:
        conn.close()

    for db in databases:
        owner = pg.identifier(db["owner"])
        conn = connect(db["name"])
        try:
            for ext in db.get("extensions", []):
                conn.run(f"CREATE EXTENSION IF NOT EXISTS {pg.identifier(ext)}")
            for reader in db.get("readers", []):
                role = pg.identifier(reader)
                conn.run(f"GRANT USAGE ON SCHEMA public TO {role}")
                conn.run(f"GRANT SELECT ON ALL TABLES IN SCHEMA public TO {role}")
                conn.run(
                    f"ALTER DEFAULT PRIVILEGES FOR ROLE {owner} IN SCHEMA public "
                    f"GRANT SELECT ON TABLES TO {role}"
                )
        finally:
            conn.close()

    return summary


def handler(event, _context):
    master = _secret(event["master_secret_arn"])
    summary = bootstrap(
        event,
        master["username"],
        _connector(event["host"], event["port"], master),
        lambda user: _secret(user["secret_arn"])["password"],
    )
    print(json.dumps(summary))
    return summary
