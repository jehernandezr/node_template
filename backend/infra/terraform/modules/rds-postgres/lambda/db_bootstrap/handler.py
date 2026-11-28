"""Creates the PostgreSQL roles and databases of the platform (ADR 0041).

Each service has an owner role that owns its databases and runs the migrations, an app role with DML only and a
reader role that logs in with IAM tokens on the replicas.

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


def _schemas(conn, owner):
    """Schemas the grants cover: public and every schema the owner created (saga, for example)."""
    rows = conn.run(
        "SELECT nspname FROM pg_namespace n JOIN pg_roles r ON r.oid = n.nspowner "
        "WHERE n.nspname = 'public' OR r.rolname = :o ORDER BY nspname",
        o=owner,
    )
    return sorted({"public", *[row[0] for row in rows]})


def _grant(conn, owner, role, table_privileges, sequence_privileges, run_functions=False):
    """Grants a role its privileges on what the owner created and will create, in every schema.

    With run_functions the role may also execute the owner's functions, including the partition functions that
    migrations keep from PUBLIC.
    """
    owner_ident = pg.identifier(owner)
    role_ident = pg.identifier(role)
    for schema in _schemas(conn, owner):
        schema_ident = pg.identifier(schema)
        conn.run(f"GRANT USAGE ON SCHEMA {schema_ident} TO {role_ident}")
        conn.run(f"GRANT {table_privileges} ON ALL TABLES IN SCHEMA {schema_ident} TO {role_ident}")
        if sequence_privileges:
            conn.run(
                f"GRANT {sequence_privileges} ON ALL SEQUENCES IN SCHEMA {schema_ident} TO {role_ident}"
            )
        if run_functions:
            conn.run(f"GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA {schema_ident} TO {role_ident}")
    conn.run(f"ALTER DEFAULT PRIVILEGES FOR ROLE {owner_ident} GRANT USAGE ON SCHEMAS TO {role_ident}")
    conn.run(
        f"ALTER DEFAULT PRIVILEGES FOR ROLE {owner_ident} GRANT {table_privileges} ON TABLES TO {role_ident}"
    )
    if sequence_privileges:
        conn.run(
            f"ALTER DEFAULT PRIVILEGES FOR ROLE {owner_ident} "
            f"GRANT {sequence_privileges} ON SEQUENCES TO {role_ident}"
        )
    if run_functions:
        conn.run(f"ALTER DEFAULT PRIVILEGES FOR ROLE {owner_ident} GRANT EXECUTE ON FUNCTIONS TO {role_ident}")


WRITER_TABLE_PRIVILEGES = "SELECT, INSERT, UPDATE, DELETE"
WRITER_SEQUENCE_PRIVILEGES = "USAGE, SELECT, UPDATE"
READER_TABLE_PRIVILEGES = "SELECT"


def bootstrap(event, master_username, connect, password_of):
    """Applies roles, memberships, databases, extensions and grants. Returns a summary.

    A user with rds_iam logs in only with IAM tokens: it has no password and gets rds_iam. The others get the
    password of their secret. Writers get DML and EXECUTE and readers SELECT on what the database owner creates, so
    neither can change the schema and RLS applies to both.
    """
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
                password = "" if user.get("rds_iam") else f" PASSWORD {pg.literal(password_of(user))}"
                conn.run(
                    f"CREATE ROLE {ident} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS{password}"
                )
                summary["created_roles"].append(name)
            # The master must be able to assume the role to create databases on its behalf (PG16+).
            conn.run(f"GRANT {ident} TO {admin}")
            if user.get("rds_iam"):
                conn.run(f"GRANT rds_iam TO {ident}")
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
            for role in [*db.get("writers", []), *db.get("readers", []), *replication]:
                conn.run(f"GRANT CONNECT ON DATABASE {ident} TO {pg.identifier(role)}")
    finally:
        conn.close()

    for db in databases:
        conn = connect(db["name"])
        try:
            for ext in db.get("extensions", []):
                conn.run(f"CREATE EXTENSION IF NOT EXISTS {pg.identifier(ext)}")
            conn.run("REVOKE CREATE ON SCHEMA public FROM PUBLIC")
            for writer in db.get("writers", []):
                _grant(
                    conn,
                    db["owner"],
                    writer,
                    WRITER_TABLE_PRIVILEGES,
                    WRITER_SEQUENCE_PRIVILEGES,
                    run_functions=True,
                )
            for reader in db.get("readers", []):
                _grant(conn, db["owner"], reader, READER_TABLE_PRIVILEGES, None)
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
