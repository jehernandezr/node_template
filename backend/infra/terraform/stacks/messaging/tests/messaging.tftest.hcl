# Pruebas del stack de mensajería con proveedores simulados: no tocan AWS ni el backend.
# Ejecuta: terraform init -backend=false && terraform test

mock_provider "aws" {
  mock_data "aws_caller_identity" {
    defaults = { account_id = "123456789012" }
  }
  mock_data "aws_partition" {
    defaults = { partition = "aws" }
  }
}

variables {
  region        = "us-east-1"
  environment   = "dev"
  name_prefix   = "nt-dev"
  state_bucket  = "nt-dev-tfstate"
  topology_file = "tests/fixtures/topology.json"
}

override_data {
  target = data.terraform_remote_state.platform
  values = {
    outputs = {
      alarm_topic_arn = null
      ses             = null
    }
  }
}

run "permissions_come_from_the_topology" {
  command = plan

  assert {
    condition     = tolist(module.messaging.service_access["identity"].publish_topics) == tolist(["identity-events"])
    error_message = "identity publica en los tópicos donde es producer."
  }

  assert {
    condition     = tolist(module.messaging.service_access["tasks"].send_queues) == tolist(["reports-commands"])
    error_message = "tasks envía a las colas donde es producer."
  }

  assert {
    condition     = tolist(module.messaging.service_access["notifications"].consume_queues) == tolist(["notifications-identity-events"])
    error_message = "notifications consume la cola donde es consumer."
  }

  assert {
    condition     = length(aws_sqs_queue.ses_events) == 0
    error_message = "Sin SES no hay cola de eventos de correo."
  }
}

run "generated_topology_grants_its_producers" {
  command = plan

  variables {
    topology_file = "../../topology.json"
  }

  # topology.json lo genera contracts-export desde los contratos: identity publica
  # en su tópico de eventos.
  assert {
    condition     = contains(keys(module.messaging.service_access), "identity")
    error_message = "El productor del tópico de identity debe recibir permiso de publicar."
  }
}
