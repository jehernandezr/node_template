"""Creates the PostgreSQL roles and databases of the platform.

Idempotent: a role that already exists keeps its password (rotation owns it) and a
database that already exists is not touched except for its owner, its grants and its
extensions. It never drops roles or databases. It connects with the master user managed
by RDS, only from inside the VPC.
"""

import json
import os
import ssl
import sys

# Lambda only adds /var/task to sys.path: the packaged dependencies live in vendor/.
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "vendor"))

import pg8000.native as pg  # noqa: E402

MAINTENANCE_DB = "postgres"

# Public bundle of the RDS CAs. The Lambda runtime does not ship it;
# backend/infra/scripts/fetch-rds-ca-bundle.sh leaves it next to the handler.
CA_BUNDLE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "rds-ca-bundle.pem")

_secrets_client = None


def _secret(arn):
    global _secrets_client
    if _secrets_client is None:
        import boto3  # Ships with the Lambda runtime.

        _secrets_client = boto3.client("secretsmanager")
    return json.loads(_secrets_client.get_secret_value(SecretId=arn)["SecretString"])


def _ssl_context():
    # The master user password and those of the new roles travel over this connection:
    # the chain and the server name are verified even though the network is internal.
    if not os.path.isfile(CA_BUNDLE):
        raise RuntimeError(
            "rds-ca-bundle.pem is missing next to the handler: run "
            "backend/infra/scripts/fetch-rds-ca-bundle.sh before packaging."
        )
    return ssl.create_default_context(cafile=CA_BUNDLE)


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
    """Applies roles, memberships, databases, extensions and grants. Returns a summary."""
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
            # The master must be able to assume the role to create databases on its behalf (PG16+).
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
                # CREATE DATABASE does not allow a transaction: the native pg8000 API is autocommit.
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
