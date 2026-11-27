# First deploy of an account

Use this once per AWS account (`dev`, `staging`, `prod`), before the pipeline can deploy to it. It creates the Terraform state bucket and applies the account's `global` stack: the GitHub OIDC provider and roles, one ECR repository per service, the artifacts bucket, the environment's hosted zone and the CloudFront certificate ([ADR 0042](../adr/0042-region-and-catalog-model.md), [ADR 0043](../adr/0043-deploy-migrations-and-rollback.md)). The steps create IAM roles, so a person with the account's admin session runs them.

Do `dev` first, then `staging` and `prod`. `staging` and `prod` can only promote artifacts from `dev` after their own `global` stack exists and `dev` lists them (step 6).

## Before you start

- The account exists and you have an IAM Identity Center admin profile for it on this machine (`<env>-admin`). No access key is stored.
- Terraform from `backend/infra/terraform/.terraform-version`, the AWS CLI v2 and Node from `.nvmrc`.
- The apex domain is registered and its public hosted zone exists in the `prod` account.
- In `backend/infra/terraform/environments/<env>/common.tfvars`, which every stack reads, `domain` is the apex domain, not `example.com`.
- In `backend/infra/terraform/environments/<env>/global/terraform.tfvars`:
  - `github_repository` is the repository that deploys, `owner/name`.
  - `services` lists the directories under `environments/<env>/services` (a test checks this).
  - `deploy_policy_arns` lists what Terraform may create in the account. Without it the deploy role only reaches the state and the artifacts.
  - If the account already has a GitHub OIDC provider, `oidc_existing_provider_arn` holds its ARN; otherwise the stack creates it.
- The state bucket name in `environments/<env>/global/backend.tfvars` is free in S3. Bucket names are global, so change `name_prefix` in `common.tfvars` and the bucket names of every stack of the environment if it is taken.

## Steps

1. Open the admin session and check the account:

   ```bash
   aws sso login --profile <env>-admin
   export AWS_PROFILE=<env>-admin
   aws sts get-caller-identity
   ```

2. Preview the bootstrap, then run it. It creates the state bucket of `environments/<env>/global/backend.tfvars`, versioned, encrypted with KMS, private and TLS-only; Terraform locks the state with S3 native locking. Running it again changes nothing:

   ```bash
   DRY_RUN=1 backend/infra/scripts/bootstrap-account.sh <env>
   backend/infra/scripts/bootstrap-account.sh <env>
   ```

3. Plan the `global` stack, read the plan and apply exactly that plan:

   ```bash
   ENV=<env> backend/infra/scripts/deploy-aws.sh plan global
   ENV=<env> backend/infra/scripts/deploy-aws.sh apply global
   ```

   In `dev` and `staging`, the apply creates the zone early and then waits, up to 75 minutes, for the certificate validation, which needs step 4. Do step 4 from another terminal while it waits. If it times out, finish step 4 and run plan and apply again.

4. Delegate the zone (`dev` and `staging` only). Read the name servers of `<env>.<domain>` and add an `NS` record for that name, with those four name servers, to the apex zone in the `prod` account:

   ```bash
   zone_id="$(aws route53 list-hosted-zones-by-name --dns-name <env>.<domain> \
     --query 'HostedZones[0].Id' --output text)"
   aws route53 get-hosted-zone --id "$zone_id" --query 'DelegationSet.NameServers'
   ```

   After the apply, `terraform -chdir=backend/infra/terraform/stacks/global output -json hosted_zone` prints the same name servers. `prod` uses the apex zone itself and has nothing to delegate.

5. Set the GitHub variables of the environment named like the account (`dev`, `staging` or `prod`) from the stack outputs:

   ```bash
   terraform -chdir=backend/infra/terraform/stacks/global output -json github_oidc
   terraform -chdir=backend/infra/terraform/stacks/global output -raw artifacts_bucket
   ```

   | Variable               | Value                            |
   | ---------------------- | -------------------------------- |
   | `AWS_DEPLOY_ROLE_ARN`  | `github_oidc.deploy_role_arn`    |
   | `AWS_PUBLISH_ROLE_ARN` | `github_oidc.publish_role_arn`   |
   | `AWS_WEB_ROLE_ARN`     | `github_oidc.web_role_arn`       |
   | `AWS_REGION`           | `region` of the global tfvars    |
   | `NAME_PREFIX`          | `name_prefix` of `common.tfvars` |
   | `ARTIFACTS_BUCKET`     | `artifacts_bucket`               |

   The roles trust only `repo:<github_repository>:environment:<env>`. Give `staging` and `prod` required reviewers.

6. After the `global` stack of `staging` or `prod` exists, let it promote from `dev`: add its account id to `promotion_account_ids` in `environments/dev/global/terraform.tfvars`, then plan and apply `dev`'s `global` stack from a `dev` admin session as in step 3. The `dev` repositories and the artifacts bucket then let that environment's deploy role pull images and read the Lambda packages under `lambda/`. An entry added before its role exists makes the apply fail, because AWS rejects a policy whose principal does not exist.

## Done when

- `aws s3api get-bucket-versioning --bucket <state bucket>` answers `Enabled`, and `deploy-aws.sh plan global` shows no changes.
- In `dev` and `staging`, `dig NS <env>.<domain>` returns the zone's name servers.
- `aws acm describe-certificate --region us-east-1 --certificate-arn "$(terraform -chdir=backend/infra/terraform/stacks/global output -raw cloudfront_certificate_arn)"` shows `ISSUED`.
- The GitHub environment has the variables of step 5.
