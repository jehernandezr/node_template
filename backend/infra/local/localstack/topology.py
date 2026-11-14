"""Crea en LocalStack los tópicos, colas, DLQ y suscripciones de topology.json.

Lee el mismo archivo que el stack messaging de Terraform (Topology.toJSON(), confirmado en
backend/infra/terraform/topology.json) y aplica los mismos nombres y filtros, sin cifrado.
Es idempotente: crear un tópico, una cola o una suscripción que ya existe no cambia nada.

Uso: python topology.py <topology.json> <prefijo> [endpoint]
"""

import json
import sys


def fifo_suffix(fifo):
    return ".fifo" if fifo else ""


def apply(topology, prefix, sns, sqs):
    topic_arns = {}
    for topic in topology.get("topics", []):
        attrs = {}
        if topic["fifo"]:
            attrs = {"FifoTopic": "true", "ContentBasedDeduplication": "true"}
        name = f"{prefix}-{topic['name']}{fifo_suffix(topic['fifo'])}"
        topic_arns[topic["name"]] = sns.create_topic(Name=name, Attributes=attrs)["TopicArn"]
        print(f"[topology] tópico {name}")

    for queue in topology.get("queues", []):
        fifo = queue["fifo"]
        fifo_attrs = {"FifoQueue": "true", "ContentBasedDeduplication": "true"} if fifo else {}
        dlq = queue["dlq"]

        dlq_name = f"{prefix}-{dlq['name']}{fifo_suffix(fifo)}"
        dlq_url = sqs.create_queue(
            QueueName=dlq_name,
            Attributes={**fifo_attrs, "MessageRetentionPeriod": str(dlq["retentionSeconds"])},
        )["QueueUrl"]
        dlq_arn = sqs.get_queue_attributes(QueueUrl=dlq_url, AttributeNames=["QueueArn"])[
            "Attributes"
        ]["QueueArn"]

        name = f"{prefix}-{queue['name']}{fifo_suffix(fifo)}"
        redrive = {"deadLetterTargetArn": dlq_arn, "maxReceiveCount": dlq["maxReceiveCount"]}
        url = sqs.create_queue(
            QueueName=name,
            Attributes={
                **fifo_attrs,
                "VisibilityTimeout": str(queue["visibilityTimeoutSeconds"]),
                "RedrivePolicy": json.dumps(redrive),
            },
        )["QueueUrl"]
        arn = sqs.get_queue_attributes(QueueUrl=url, AttributeNames=["QueueArn"])["Attributes"][
            "QueueArn"
        ]
        print(f"[topology] cola {name} con DLQ {dlq_name}")

        for subscription in queue.get("subscriptions", []):
            attributes = {"RawMessageDelivery": "true"}
            filter_types = subscription.get("filterTypes") or []
            if filter_types:
                # Igual que en AWS: el filtro lee el campo type del cuerpo CloudEvents.
                attributes["FilterPolicyScope"] = "MessageBody"
                attributes["FilterPolicy"] = json.dumps({"type": filter_types})
            sns.subscribe(
                TopicArn=topic_arns[subscription["topic"]],
                Protocol="sqs",
                Endpoint=arn,
                Attributes=attributes,
                ReturnSubscriptionArn=True,
            )
            print(f"[topology] {name} suscrita a {subscription['topic']}")


def main():
    path, prefix = sys.argv[1], sys.argv[2]
    endpoint = sys.argv[3] if len(sys.argv) > 3 else "http://localhost:4566"
    import boto3  # Viene en el intérprete de LocalStack.

    with open(path, encoding="utf-8") as handle:
        topology = json.load(handle)
    session = boto3.session.Session(
        aws_access_key_id="test", aws_secret_access_key="test", region_name="us-east-1"
    )
    apply(
        topology,
        prefix,
        session.client("sns", endpoint_url=endpoint),
        session.client("sqs", endpoint_url=endpoint),
    )


if __name__ == "__main__":
    main()
