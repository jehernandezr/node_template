# api-routes module

Routes of a service in the shared HTTP API (`http-api` module). The API runtime only changes the integration target.

## What it creates

- One integration: `AWS_PROXY` (payload 2.0) to the service's Lambda, or `HTTP_PROXY` through the VPC link to the internal ALB listener.
- For each prefix, the routes `ANY <prefix>` and `ANY <prefix>/{proxy+}`, with the origin authorizer if given.
- The permission for API Gateway to invoke the Lambda.

## Main inputs

| Variable                                               | Description                                                                                    |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `name`, `api_id`, `api_execution_arn`, `authorizer_id` | Service and shared API.                                                                        |
| `route_prefixes`                                       | Service prefixes, for example `["/tasks"]`.                                                    |
| `target`                                               | `type = "lambda"` with name and invoke ARN, or `type = "vpc_link"` with VPC link and listener. |
| `timeout_milliseconds`                                 | Up to 30000.                                                                                   |

## Outputs

`integration_id`, `route_keys`.
