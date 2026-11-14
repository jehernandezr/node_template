"""Pruebas del autorizador de origen. No necesitan AWS ni boto3.

python3 -B -I -m unittest discover -s backend/infra/terraform/modules/http-api/authorizer
"""

import os
import unittest

import index


class NotFound(Exception):
    pass


class FakeSecrets:
    class exceptions:
        ResourceNotFoundException = NotFound

    def __init__(self, stages):
        self.stages = stages
        self.calls = 0
        self.fail = False

    def get_secret_value(self, SecretId, VersionStage):
        self.calls += 1
        if self.fail:
            raise RuntimeError("Secrets Manager no responde")
        if VersionStage not in self.stages:
            raise NotFound(VersionStage)
        return {"SecretString": self.stages[VersionStage]}


def event(value):
    return {"headers": {"x-origin-verify": value}}


class HandlerTest(unittest.TestCase):
    def setUp(self):
        os.environ["ORIGIN_VERIFY_SECRET_ARN"] = "arn:origin-verify"
        index._cache.update(values=(), loaded_at=None)
        self.secrets = FakeSecrets({"AWSCURRENT": "nuevo", "AWSPREVIOUS": "viejo"})
        index._client = self.secrets

    def test_accepts_current_and_previous_while_edge_catches_up(self):
        self.assertTrue(index.handler(event("nuevo"), None, now=0)["isAuthorized"])
        self.assertTrue(index.handler(event("viejo"), None, now=1)["isAuthorized"])
        self.assertFalse(index.handler(event("otro"), None, now=2)["isAuthorized"])
        self.assertFalse(index.handler({"headers": None}, None, now=3)["isAuthorized"])

    def test_works_before_the_first_rotation(self):
        self.secrets.stages = {"AWSCURRENT": "unico"}
        self.assertTrue(index.handler(event("unico"), None, now=0)["isAuthorized"])

    def test_reloads_after_the_ttl_so_a_rotation_reaches_warm_containers(self):
        index.handler(event("nuevo"), None, now=0)
        self.secrets.stages = {"AWSCURRENT": "otro", "AWSPREVIOUS": "nuevo"}
        self.assertFalse(index.handler(event("otro"), None, now=index.RELOAD_SECONDS - 1)["isAuthorized"])
        self.assertTrue(index.handler(event("otro"), None, now=index.RELOAD_SECONDS)["isAuthorized"])

    def test_keeps_known_values_when_a_reload_fails(self):
        index.handler(event("nuevo"), None, now=0)
        self.secrets.fail = True
        self.assertTrue(index.handler(event("nuevo"), None, now=index.RELOAD_SECONDS)["isAuthorized"])

    def test_fails_without_any_known_value(self):
        self.secrets.fail = True
        with self.assertRaises(RuntimeError):
            index.handler(event("nuevo"), None, now=0)


if __name__ == "__main__":
    unittest.main()
