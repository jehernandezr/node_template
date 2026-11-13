"""Pruebas de topology.py con clientes falsos. No necesitan LocalStack ni boto3.

python3 -I -m unittest discover -s backend/infra/local/localstack
"""

import json
import os
import unittest

import topology

FIXTURE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "..",
    "..",
    "terraform",
    "stacks",
    "messaging",
    "tests",
    "fixtures",
    "topology.json",
)


class FakeSns:
    def __init__(self):
        self.topics = {}
        self.subscriptions = []

    def create_topic(self, Name, Attributes):
        self.topics[Name] = Attributes
        return {"TopicArn": f"arn:aws:sns:us-east-1:000000000000:{Name}"}

    def subscribe(self, **kwargs):
        self.subscriptions.append(kwargs)


class FakeSqs:
    def __init__(self):
        self.queues = {}

    def create_queue(self, QueueName, Attributes):
        self.queues[QueueName] = Attributes
        return {"QueueUrl": f"http://localhost:4566/000000000000/{QueueName}"}

    def get_queue_attributes(self, QueueUrl, AttributeNames):
        name = QueueUrl.rsplit("/", 1)[1]
        return {"Attributes": {"QueueArn": f"arn:aws:sqs:us-east-1:000000000000:{name}"}}


class TopologyTest(unittest.TestCase):
    def setUp(self):
        with open(FIXTURE, encoding="utf-8") as handle:
            self.topology = json.load(handle)
        self.sns, self.sqs = FakeSns(), FakeSqs()
        topology.apply(self.topology, "local", self.sns, self.sqs)

    def test_names_match_terraform(self):
        self.assertIn("local-identity-events", self.sns.topics)
        self.assertIn("local-reports-commands", self.sqs.queues)
        self.assertIn("local-reports-commands-dlq", self.sqs.queues)

    def test_queue_has_redrive_to_its_dlq(self):
        attrs = self.sqs.queues["local-notifications-identity-events"]
        redrive = json.loads(attrs["RedrivePolicy"])
        self.assertTrue(redrive["deadLetterTargetArn"].endswith("notifications-identity-events-dlq"))
        self.assertEqual(redrive["maxReceiveCount"], 6)
        self.assertEqual(attrs["VisibilityTimeout"], "60")

    def test_subscription_filters_on_message_body_type(self):
        (subscription,) = self.sns.subscriptions
        self.assertEqual(subscription["Attributes"]["RawMessageDelivery"], "true")
        self.assertEqual(subscription["Attributes"]["FilterPolicyScope"], "MessageBody")
        self.assertEqual(
            json.loads(subscription["Attributes"]["FilterPolicy"]),
            {"type": ["identity.user.registered.v1"]},
        )


if __name__ == "__main__":
    unittest.main()
