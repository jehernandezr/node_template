# oidc-github module

GitHub Actions access to the AWS account through OIDC, without long-lived keys. It creates the three roles the deployment pipeline uses. The `global` stack wires it and owns the ECR repositories and the artifacts bucket the roles reach.

## What it creates

- OIDC provider for `token.actions.githubusercontent.com`, or reuses an existing one with `existing_provider_arn`.
- Three roles, each trusting only `repo:<github_repository>:environment:<github_environment>`, without wildcards:
  - `<name_prefix>-github-deploy`: Terraform state in `state_bucket` (and its KMS key through S3), read access to the artifacts bucket and the policies in `deploy_policy_arns`.
  - `<name_prefix>-github-publish`: push to the repositories in `ecr_repository_arns`, without permission to create repositories, and write access to the artifacts bucket.
  - `<name_prefix>-github-web`: bucket `<name_prefix>-web-<account>`, KMS permission only through S3, listing of distributions and CloudFront invalidations.

## Main inputs

| Variable                | Description                                                                     |
| ----------------------- | ------------------------------------------------------------------------------- |
| `name_prefix`           | Prefix of the role names, for example `node-template-dev`.                      |
| `github_repository`     | Repository in the form `owner/name`.                                            |
| `github_environment`    | GitHub environment that can assume the roles.                                   |
| `create_provider`       | `true` creates the OIDC provider; `false` requires `existing_provider_arn`.     |
| `existing_provider_arn` | ARN of the provider that already exists in the account.                         |
| `state_bucket`          | Bucket of the environment's states, which the deployment role reads and writes. |
| `deploy_policy_arns`    | Managed policies added to the deployment role.                                  |
| `artifacts_bucket_arn`  | Artifacts bucket: the publish role writes it and the deploy role reads it.      |
| `artifacts_kms_key_arn` | CMK of the artifacts bucket.                                                    |
| `ecr_repository_arns`   | Repositories the publish role pushes to.                                        |

## Outputs

`provider_arn`, `deploy_role_arn`, `publish_role_arn` and `web_role_arn`. The `global` stack exposes them in `github_oidc`.

## Notes

- There is one OIDC provider per account. If the account already has one, pass its ARN with `create_provider = false`.
- Trust is per repository and GitHub environment, without wildcards. The GitHub environment named like the environment is the one the policy accepts; in prod give it required reviewers.
- `deploy_policy_arns` is chosen by whoever deploys. The template assumes no scope: without those policies, the deployment role only reaches the state and the artifacts.
- The module grants no application permissions to any service.
