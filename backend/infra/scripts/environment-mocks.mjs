import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { TfvarsBlockReader } from './tfvars-block-reader.mjs';

const ACCOUNT = '123456789012';
const REGION = 'us-east-1';
const PREFIX = 'nt-env';
const SES_QUEUE = 'ses-events';

const STACK = Object.freeze({
  network: 'network',
  platform: 'platform',
  data: 'data',
  messaging: 'messaging',
});

/**
 * Outputs of the network, platform, data and messaging stacks as the real values of one environment would produce them, for the environment tests of the stacks that read them through remote state. What exists follows the environment's tfvars and topology.json; identifiers are fixed fakes. Mirrors the null and presence rules of each stack's outputs.tf.
 */
export class EnvironmentMocks {
  #terraformRoot;
  #environment;

  constructor(terraformRoot, environment) {
    this.#terraformRoot = terraformRoot;
    this.#environment = environment;
  }

  /**
   * Outputs of the network stack.
   * @returns {object} vpc_id and private_subnet_ids.
   */
  network() {
    return {
      vpc_id: 'vpc-0123456789abcdef0',
      private_subnet_ids: [
        'subnet-0123456789abcdef0',
        'subnet-0123456789abcdef1',
      ],
    };
  }

  /**
   * Outputs of the platform stack: compute, the realtime ALB, the files bucket, SES and OpenObserve exist only when the environment's platform tfvars enable them.
   * @returns {object} The outputs, with null for what the tfvars do not create.
   */
  platform() {
    const values = this.#reader(STACK.platform);
    const compute = values.topLevelExpression('compute_enabled') !== 'false';
    const arn = (service, resource) =>
      `arn:aws:${service}:${REGION}:${ACCOUNT}:${resource}`;
    return {
      alarm_topic_arn: arn('sns', `${PREFIX}-alarms`),
      ecs_cluster: compute
        ? {
            arn: arn('ecs', `cluster/${PREFIX}`),
            name: PREFIX,
            kms_key_arn: arn('kms', 'key/ecs'),
          }
        : null,
      compute_logs_kms_key_arn: compute ? arn('kms', 'key/compute-logs') : null,
      observability:
        compute && values.assigns('observability_root_user_email')
          ? {
              otlp_endpoint: `http://openobserve.${PREFIX}.internal:5080/api/default`,
              otlp_authorization_value_from: arn(
                'secretsmanager',
                `secret:${PREFIX}/openobserve-AbCdEf:authorization::`,
              ),
              kms_key_arn: arn('kms', 'key/observability'),
              alb_security_group_id: 'sg-0observability',
              alb_port: 5080,
              console_url: `http://openobserve.${PREFIX}.internal:5080`,
            }
          : null,
      http_api: compute
        ? {
            id: 'abc123',
            execution_arn: arn('execute-api', 'abc123'),
            endpoint_host: `abc123.execute-api.${REGION}.amazonaws.com`,
            authorizer_id: 'auth01',
            origin_verify_secret_arn: arn(
              'secretsmanager',
              `secret:${PREFIX}-api/origin-verify-AbCdEf`,
            ),
            origin_verify_kms_arn: arn('kms', 'key/api'),
            vpc_link_id: 'vl-0123',
          }
        : null,
      api_alb: compute
        ? {
            listener_arn: arn(
              'elasticloadbalancing',
              `listener/app/${PREFIX}-api/1/2`,
            ),
            security_group_id: 'sg-0api',
          }
        : null,
      realtime_alb:
        compute && values.assigns('realtime_alb_certificate_arn')
          ? {
              listener_arn: arn(
                'elasticloadbalancing',
                `listener/app/${PREFIX}-rt/1/3`,
              ),
              security_group_id: 'sg-0rt',
              dns_name: 'rt.example.test',
              zone_id: 'Z1',
            }
          : null,
      files_bucket:
        values.topLevelStrings('files_cors_allowed_origins').length > 0
          ? {
              name: `${PREFIX}-files-${ACCOUNT}`,
              arn: `arn:aws:s3:::${PREFIX}-files-${ACCOUNT}`,
              kms_key_arn: arn('kms', 'key/files'),
              read_write_policy_json: EnvironmentMocks.#emptyPolicy(),
            }
          : null,
      ses: this.#sesEnabled()
        ? {
            events_topic_arn: arn('sns', `${PREFIX}-ses-events`),
            events_kms_key_arn: arn('kms', 'key/ses'),
            send_policy_json: EnvironmentMocks.#emptyPolicy(),
            configuration_set_names: [`${PREFIX}-default`],
          }
        : null,
    };
  }

  /**
   * Outputs of the data stack for the services of the environment's data tfvars (db_services and valkey_services).
   * @returns {object} The database endpoints, each service's databases and secret, and Valkey.
   */
  data() {
    const values = this.#reader(STACK.data);
    const databases = values.entryNames('db_services');
    const valkey = values.topLevelStrings('valkey_services');
    const perService = (services, value) =>
      Object.fromEntries(services.map((service) => [service, value(service)]));
    return {
      clients_security_group_id: 'sg-0clients',
      db: {
        proxy_endpoint: `${PREFIX}-proxy.proxy-x.${REGION}.rds.amazonaws.com`,
        reader_endpoints: [
          `${PREFIX}-postgres-replica-1.x.${REGION}.rds.amazonaws.com`,
        ],
        port: 5432,
        kms_key_arn: `arn:aws:kms:${REGION}:${ACCOUNT}:key/rds`,
      },
      db_service_secret_arns: perService(
        databases,
        (service) =>
          `arn:aws:secretsmanager:${REGION}:${ACCOUNT}:secret:${PREFIX}/db/${service}-AbCdEf`,
      ),
      service_databases: perService(databases, (service) => ({
        shards: [`${service}_shard_0`],
        catalog: 'catalog',
      })),
      valkey: {
        endpoint: `${PREFIX}-valkey.serverless.use1.cache.amazonaws.com`,
        cache_name: `${PREFIX}-valkey`,
        port: 6379,
        user_names: perService(valkey, (service) => `${PREFIX}-${service}`),
        connect_resource_arns: perService(valkey, () => [
          `arn:aws:elasticache:${REGION}:${ACCOUNT}:serverlesscache:${PREFIX}-valkey`,
        ]),
      },
    };
  }

  /**
   * Outputs of the messaging stack: every topic and queue of topology.json, the ses-events queue when the platform has SES, and each service's access from the producers and consumer of the topology.
   * @returns {object} Topic and queue identifiers and service_access.
   */
  messaging() {
    const topology = JSON.parse(
      readFileSync(join(this.#terraformRoot, 'topology.json'), 'utf8'),
    );
    const queues = [
      ...topology.queues.map((queue) => ({
        name: queue.name,
        fifo: queue.fifo,
      })),
      ...(this.#sesEnabled() ? [{ name: SES_QUEUE, fifo: false }] : []),
    ];
    const queueName = (queue) =>
      `${PREFIX}-${queue.name}${queue.fifo ? '.fifo' : ''}`;
    const byQueue = (value) =>
      Object.fromEntries(queues.map((queue) => [queue.name, value(queue)]));
    const producersOf = (entry) => entry.producers ?? [];
    const services = [
      ...new Set([
        ...topology.topics.flatMap(producersOf),
        ...topology.queues.flatMap(producersOf),
        ...topology.queues.map((queue) => queue.consumer).filter(Boolean),
      ]),
    ].sort();
    const namesWhere = (entries, test) =>
      entries
        .filter(test)
        .map((entry) => entry.name)
        .sort();
    return {
      name_prefix: PREFIX,
      kms_key_arn: `arn:aws:kms:${REGION}:${ACCOUNT}:key/messaging`,
      topic_arns: Object.fromEntries(
        topology.topics.map((topic) => [
          topic.name,
          `arn:aws:sns:${REGION}:${ACCOUNT}:${PREFIX}-${topic.name}${topic.fifo ? '.fifo' : ''}`,
        ]),
      ),
      queue_arns: byQueue(
        (queue) => `arn:aws:sqs:${REGION}:${ACCOUNT}:${queueName(queue)}`,
      ),
      queue_urls: byQueue(
        (queue) =>
          `https://sqs.${REGION}.amazonaws.com/${ACCOUNT}/${queueName(queue)}`,
      ),
      queue_names: byQueue(queueName),
      service_access: Object.fromEntries(
        services.map((service) => [
          service,
          {
            publish_topics: namesWhere(topology.topics, (topic) =>
              producersOf(topic).includes(service),
            ),
            send_queues: namesWhere(topology.queues, (queue) =>
              producersOf(queue).includes(service),
            ),
            consume_queues: namesWhere(
              topology.queues,
              (queue) => queue.consumer === service,
            ),
          },
        ]),
      ),
    };
  }

  /**
   * override_data blocks that give each named stack's remote state these outputs.
   * @param {string[]} stacks Names of the data.terraform_remote_state blocks to override, each a method of this class.
   * @returns {string} HCL for a .tftest.hcl file.
   */
  overrides(stacks) {
    return stacks
      .map((stack) =>
        [
          'override_data {',
          `  target = data.terraform_remote_state.${stack}`,
          `  values = { outputs = ${JSON.stringify(this[stack]())} }`,
          '}',
          '',
        ].join('\n'),
      )
      .join('\n');
  }

  #sesEnabled() {
    return this.#reader(STACK.platform).assigns('ses_domain');
  }

  #reader(stack) {
    const file = join(
      this.#terraformRoot,
      'environments',
      this.#environment,
      stack,
      'terraform.tfvars',
    );
    return new TfvarsBlockReader(
      existsSync(file) && statSync(file).isFile()
        ? readFileSync(file, 'utf8')
        : '',
    );
  }

  static #emptyPolicy() {
    return JSON.stringify({ Version: '2012-10-17', Statement: [] });
  }
}
