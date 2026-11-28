"""Tests of the bootstrap Lambda. They need neither AWS nor PostgreSQL.

They run with the sys.path Lambda would have (only the handler folder):
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
        {"name": "identity_owner", "secret_arn": "arn:identity_owner"},
        {"name": "identity_app", "secret_arn": "arn:identity_app"},
        {"name": "identity_reader", "rds_iam": True},
        {"name": "tasks_owner", "secret_arn": "arn:tasks_owner"},
        {"name": "tasks_app", "secret_arn": "arn:tasks_app"},
        {"name": "tasks_reader", "rds_iam": True},
        {"name": "replication", "secret_arn": "arn:replication", "rds_replication": True},
    ],
    "databases": [
        {
            "name": f"{service}_{suffix}",
            "owner": f"{service}_owner",
            "writers": [f"{service}_app"],
            "readers": [f"{service}_reader"],
            "extensions": ["vector"],
        }
        for service in ["identity", "tasks"]
        for suffix in ["catalog", "shard_0"]
    ],
}

ROLES = {u["name"] for u in EVENT["users"]}
DATABASES = {d["name"] for d in EVENT["databases"]}

GROUP_EVENT = {
    "users": [{"name": "identity", "secret_arn": "arn:identity"}],
    "group_roles": [{"name": "identity_readers", "members": ["identity"]}],
    "databases": [
        {"name": "identity_catalog", "owner": "identity", "readers": ["identity_readers"]},
    ],
}


def run_bootstrap(roles=(), databases=(), event=EVENT):
    state = {"roles": set(roles), "databases": set(databases), "log": [], "closed": 0}
    summary = handler.bootstrap(
        event,
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
    def test_creates_one_catalog_per_service_owned_by_its_owner_role(self):
        summary, state = run_bootstrap()

        self.assertEqual(summary["created_roles"], [u["name"] for u in EVENT["users"]])
        self.assertEqual(
            summary["created_databases"],
            ["identity_catalog", "identity_shard_0", "tasks_catalog", "tasks_shard_0"],
        )
        admin = statements(state, "postgres")
        self.assertIn('CREATE DATABASE "identity_catalog" OWNER "identity_owner"', admin)
        self.assertIn('CREATE DATABASE "tasks_shard_0" OWNER "tasks_owner"', admin)
        self.assertIn('REVOKE ALL ON DATABASE "tasks_catalog" FROM PUBLIC', admin)
        self.assertIn('GRANT CONNECT ON DATABASE "tasks_shard_0" TO "tasks_app"', admin)
        self.assertIn('GRANT CONNECT ON DATABASE "tasks_shard_0" TO "tasks_reader"', admin)
        self.assertIn('GRANT CONNECT ON DATABASE "tasks_shard_0" TO "replication"', admin)
        self.assertIn("GRANT rds_replication TO \"replication\"", admin)
        self.assertFalse([sql for sql in admin if sql.startswith("GRANT CONNECT") and '"tasks_owner"' in sql])
        self.assertIn(
            'CREATE EXTENSION IF NOT EXISTS "vector"', statements(state, "identity_catalog")
        )
        self.assertEqual(state["closed"], 5)

    def test_owner_and_app_log_in_with_their_secret_and_the_reader_with_iam_only(self):
        _, state = run_bootstrap()

        admin = statements(state, "postgres")
        created = {sql.split('"')[1]: sql for sql in admin if sql.startswith("CREATE ROLE")}
        self.assertIn("PASSWORD 'pw-identity_owner'", created["identity_owner"])
        self.assertIn("PASSWORD 'pw-identity_app'", created["identity_app"])
        self.assertNotIn("PASSWORD", created["identity_reader"])
        self.assertTrue(all("NOBYPASSRLS" in sql for sql in created.values()))
        self.assertIn('GRANT rds_iam TO "identity_reader"', admin)
        self.assertFalse([sql for sql in admin if sql.startswith("GRANT rds_iam") and "_app" in sql])

    def test_the_app_role_gets_dml_and_the_reader_select_on_what_the_owner_creates(self):
        _, state = run_bootstrap()

        shard = statements(state, "identity_shard_0")
        self.assertIn("REVOKE CREATE ON SCHEMA public FROM PUBLIC", shard)
        self.assertIn(
            'ALTER DEFAULT PRIVILEGES FOR ROLE "identity_owner" '
            'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "identity_app"',
            shard,
        )
        self.assertIn(
            'ALTER DEFAULT PRIVILEGES FOR ROLE "identity_owner" '
            'GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO "identity_app"',
            shard,
        )
        self.assertIn(
            'ALTER DEFAULT PRIVILEGES FOR ROLE "identity_owner" GRANT USAGE ON SCHEMAS TO "identity_app"',
            shard,
        )
        self.assertIn(
            'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "public" TO "identity_app"',
            shard,
        )
        self.assertIn(
            'ALTER DEFAULT PRIVILEGES FOR ROLE "identity_owner" GRANT SELECT ON TABLES TO "identity_reader"',
            shard,
        )
        self.assertIn(
            'ALTER DEFAULT PRIVILEGES FOR ROLE "identity_owner" GRANT EXECUTE ON FUNCTIONS TO "identity_app"',
            shard,
        )
        self.assertIn('GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA "public" TO "identity_app"', shard)
        self.assertFalse([sql for sql in shard if "_reader" in sql and ("INSERT" in sql or "EXECUTE" in sql)])
        self.assertFalse(
            [sql for sql in statements(state) if "_app" in sql and ("CREATE ON" in sql or "OWNER" in sql)]
        )

    def test_creates_group_roles_and_grants_their_readers(self):
        summary, state = run_bootstrap(event=GROUP_EVENT)

        self.assertEqual(summary["created_roles"], ["identity", "identity_readers"])
        admin = statements(state, "postgres")
        self.assertIn('CREATE ROLE "identity_readers" NOLOGIN', admin)
        self.assertIn('GRANT "identity_readers" TO "identity"', admin)
        self.assertIn(
            'GRANT CONNECT ON DATABASE "identity_catalog" TO "identity_readers"', admin
        )
        self.assertIn(
            'ALTER DEFAULT PRIVILEGES FOR ROLE "identity" GRANT SELECT ON TABLES TO "identity_readers"',
            statements(state, "identity_catalog"),
        )

    def test_is_idempotent_with_existing_roles_and_databases(self):
        summary, state = run_bootstrap(roles=ROLES, databases=DATABASES)

        self.assertEqual(summary["created_roles"], [])
        self.assertEqual(summary["created_databases"], [])
        all_sql = statements(state)
        self.assertFalse([sql for sql in all_sql if sql.startswith("CREATE ROLE")])
        self.assertFalse([sql for sql in all_sql if sql.startswith("CREATE DATABASE")])
        self.assertIn('ALTER DATABASE "identity_shard_0" OWNER TO "identity_owner"', all_sql)

    def test_never_sends_passwords_of_existing_roles(self):
        _, state = run_bootstrap(roles=ROLES)

        self.assertFalse([sql for sql in statements(state) if "PASSWORD" in sql])


class TlsTest(unittest.TestCase):
    def test_refuses_to_connect_without_the_rds_bundle(self):
        with unittest.mock.patch.object(handler, "CA_BUNDLE", "/does/not/exist/rds-ca-bundle.pem"):
            with self.assertRaises(RuntimeError):
                handler._ssl_context()

    def test_verifies_chain_and_hostname(self):
        # Any PEM bundle of the system works to check the context configuration.
        candidates = ["/etc/ssl/cert.pem", "/etc/ssl/certs/ca-certificates.crt", "/etc/pki/tls/certs/ca-bundle.crt"]
        bundle = next((p for p in candidates if os.path.isfile(p)), None)
        if bundle is None:
            self.skipTest("there is no PEM bundle in the system")
        with unittest.mock.patch.object(handler, "CA_BUNDLE", bundle):
            ctx = handler._ssl_context()
        self.assertTrue(ctx.check_hostname)
        self.assertEqual(ctx.verify_mode, ssl.CERT_REQUIRED)


if __name__ == "__main__":
    unittest.main()
