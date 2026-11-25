# 0016. Internet egress with NAT only for the application subnets

- Status: Accepted
- Date: 2026-11-12

## Context

The first version of the network had no NAT: the services reached AWS through VPC endpoints and nothing else. That blocks calls the platform needs: the Claude API (ADR 0013), APNs, FCM and the payment providers. At the same time, the database and the cache must never have a route to the Internet.

## Decision

The VPC has three subnet tiers in two availability zones: public, private (application) and data. The `egress` variable of the `network` module sets the egress of the private ones:

| Value        | NAT gateways         | Use                                 |
| ------------ | -------------------- | ----------------------------------- |
| `none`       | None                 | Environments without external calls |
| `single_nat` | One, in the first AZ | dev                                 |
| `per_az_nat` | One per AZ           | prod                                |

- The private subnets have one route table per AZ with a `0.0.0.0/0` route to the NAT. With `single_nat` both use the same one.
- The data subnets (RDS, RDS Proxy, Valkey and the database administration lambdas) have no default route. They reach AWS only through endpoints.
- The VPC endpoints are kept: gateway for S3 and DynamoDB; interface for SQS, SNS, Secrets Manager, KMS, ECR (api and dkr), Logs, STS and CloudWatch. Traffic to AWS does not go through the NAT.
- The `clients` security group opens only HTTPS (443) to the Internet when `egress` is not `none`. The services get no other outbound ports.
- Egress uses fixed Elastic IPs, published in the `nat_public_ips` output for the providers' allowlists.
- The VPC flow logs go to CloudWatch Logs with a dedicated KMS key and configurable retention, to audit what crosses the NAT and what is rejected.

## Consequences

Positive:

- The services call Claude, APNs, FCM and payments without changing networks.
- A compromise of the database or the cache does not open a direct exfiltration path to the Internet.
- With `per_az_nat`, the failure of one AZ does not cut the egress of the other.

Costs (reference prices in us-east-1, check them before deciding):

- Each NAT gateway costs about 33 USD per month plus 0.045 USD per GB processed. Prod with two pays about 65 USD fixed; dev with one, about 33 USD.
- Interface endpoints cost about 7 USD per month per AZ and endpoint, and offset the NAT for traffic to AWS.
- Flow logs with `ALL` traffic add ingestion cost; dev uses `REJECT`.
- `per_az_nat` also avoids cross-zone traffic to a single NAT.

## Alternatives considered

- No NAT and an in-house egress proxy: more pieces to operate and no clear advantage.
- Direct egress with a public IP in the application subnets: it exposes the services and does not give a fixed egress IP.
- NAT instance: cheaper, but without managed high availability and with its own maintenance.
- A single NAT in prod: saves 33 USD per month but leaves egress tied to one AZ.
