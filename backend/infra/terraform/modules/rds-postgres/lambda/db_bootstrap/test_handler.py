"""Pruebas de la Lambda de bootstrap. No necesitan AWS ni PostgreSQL.

Se ejecutan con el sys.path que tendría Lambda (solo la carpeta del handler):
python3 -I -m unittest discover -s backend/infra/terraform/modules/rds-postgres/lambda/db_bootstrap
"""

import os
import ssl
import unittest
import unittest.mock

import handler


class FakeConnection:
    def __init__(self, dbname, state):
        self.dbname = dbname
        self.state = state

    def run(self, sql, **params):
        self.state["log"].append((self.dbname, sql))
        if sql.startswith("SELECT 1 FROM pg_roles"):
            return [[1]] if params["n"] in self.state["roles"] else []
        if sql.startswith("SELECT 1 FROM pg_database"):
            return [[1]] if params["n"] in self.state["databases"] else []
        return []

    def close(self):
        self.state["closed"] += 1


EVENT = {
    "extensions": ["pg_stat_statements"],
    "users": [
        {"name": "identity", "secret_arn": "arn:identity"},
        {"name": "tasks", "secret_arn": "arn:tasks"},
        {"name": "replication", "secret_arn": "arn:replication", "rds_replication": True},
    ],
    "group_roles": [
        {"name": "catalog_owner", "members": ["identity"]},
        {"name": "catalog_reader", "members": ["tasks"]},
    ],
    "databases": [
        {
            "name": "catalog",
            "owner": "catalog_owner",
            "readers": ["catalog_reader"],
            "extensions": ["vector"],
        },
        {"name": "identity_shard_0", "owner": "identity", "extensions": ["vector"]},
        {"name": "tasks_shard_0", "owner": "tasks", "extensions": ["vector"]},
    ],
}


def run_bootstrap(roles=(), databases=()):
    state = {"roles": set(roles), "databases": set(databases), "log": [], "closed": 0}
    summary = handler.bootstrap(
        EVENT,
        "platform_admin",
        lambda dbname: FakeConnection(dbname, state),
        lambda user: f"pw-{user['name']}",
    )
    return summary, state


def statements(state, dbname=None):
    return [sql for db, sql in state["log"] if dbname is None or db == dbname]


class ImportTest(unittest.TestCase):
    def test_driver_comes_from_vendor(self):
        expected = os.path.join("db_bootstrap", "vendor", "pg8000")
        self.assertIn(expected, handler.pg.__file__)


class BootstrapTest(unittest.TestCase):
    def test_creates_roles_databases_extensions_and_grants(self):
        summary, state = run_bootstrap()

        self.assertEqual(
            summary["created_roles"],
            ["identity", "tasks", "replication", "catalog_owner", "catalog_reader"],
        )
        self.assertEqual(
            summary["created_databases"], ["catalog", "identity_shard_0", "tasks_shard_0"]
        )
        admin = statements(state, "postgres")
        self.assertIn('CREATE DATABASE "catalog" OWNER "catalog_owner"', admin)
        self.assertIn('CREATE DATABASE "identity_shard_0" OWNER "identity"', admin)
        self.assertIn('REVOKE ALL ON DATABASE "tasks_shard_0" FROM PUBLIC', admin)
        self.assertIn('GRANT CONNECT ON DATABASE "catalog" TO "catalog_reader"', admin)
        self.assertIn('GRANT CONNECT ON DATABASE "tasks_shard_0" TO "replication"', admin)
        self.assertIn('GRANT "catalog_owner" TO "identity"', admin)
        self.assertIn("GRANT rds_replication TO \"replication\"", admin)
        self.assertIn('CREATE EXTENSION IF NOT EXISTS "vector"', statements(state, "catalog"))
        self.assertIn(
            'ALTER DEFAULT PRIVILEGES FOR ROLE "catalog_owner" IN SCHEMA public '
            'GRANT SELECT ON TABLES TO "catalog_reader"',
            statements(state, "catalog"),
        )
        self.assertEqual(state["closed"], 4)

    def test_is_idempotent_with_existing_roles_and_databases(self):
        summary, state = run_bootstrap(
            roles={"identity", "tasks", "replication", "catalog_owner", "catalog_reader"},
            databases={"catalog", "identity_shard_0", "tasks_shard_0"},
        )

        self.assertEqual(summary["created_roles"], [])
        self.assertEqual(summary["created_databases"], [])
        all_sql = statements(state)
        self.assertFalse([sql for sql in all_sql if sql.startswith("CREATE ROLE")])
        self.assertFalse([sql for sql in all_sql if sql.startswith("CREATE DATABASE")])
        self.assertIn('ALTER DATABASE "identity_shard_0" OWNER TO "identity"', all_sql)

    def test_never_sends_passwords_of_existing_roles(self):
        _, state = run_bootstrap(roles={"identity", "tasks", "replication"})

        self.assertFalse([sql for sql in statements(state) if "PASSWORD" in sql])


class TlsTest(unittest.TestCase):
    def test_refuses_to_connect_without_the_rds_bundle(self):
        with unittest.mock.patch.object(handler, "CA_BUNDLE", "/no/existe/rds-ca-bundle.pem"):
            with self.assertRaises(RuntimeError):
                handler._ssl_context()

    def test_verifies_chain_and_hostname(self):
        # Cualquier bundle PEM del sistema sirve para comprobar la configuración del contexto.
        candidates = ["/etc/ssl/cert.pem", "/etc/ssl/certs/ca-certificates.crt", "/etc/pki/tls/certs/ca-bundle.crt"]
        bundle = next((p for p in candidates if os.path.isfile(p)), None)
        if bundle is None:
            self.skipTest("no hay un bundle PEM en el sistema")
        with unittest.mock.patch.object(handler, "CA_BUNDLE", bundle):
            ctx = handler._ssl_context()
        self.assertTrue(ctx.check_hostname)
        self.assertEqual(ctx.verify_mode, ssl.CERT_REQUIRED)


if __name__ == "__main__":
    unittest.main()
