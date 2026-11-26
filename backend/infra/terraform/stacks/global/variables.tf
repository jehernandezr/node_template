variable "state_bucket" {
  description = "S3 bucket with the account's Terraform states, created by bootstrap-account.sh. The deploy role reads and writes it."
  type        = string
}

variable "services" {
  description = "Services that get an ECR repository <name_prefix>/<service>: the directory names under environments/<environment>/services."
  type        = list(string)

  validation {
    condition     = length(var.services) > 0 && alltrue([for s in var.services : can(regex("^[a-z][a-z0-9-]*$", s))])
    error_message = "services must list at least one service, each in lowercase letters, digits and hyphens."
  }
}

variable "github_repository" {
  description = "GitHub repository whose workflows assume the roles, in the form owner/name."
  type        = string
}

variable "oidc_existing_provider_arn" {
  description = "ARN of a GitHub OIDC provider that already exists in the account. Null creates it; an account holds only one."
  type        = string
  default     = null
}

variable "deploy_policy_arns" {
  description = "Managed policies added to the deploy role: what Terraform needs to create in the account."
  type        = list(string)
  default     = []
}

variable "promotion_account_ids" {
  description = "dev only: account id of each environment that promotes artifacts from dev (staging, prod). Their deploy roles <project>-<environment>-github-deploy may pull the images and read the Lambda packages. Add an entry after that environment's global stack exists."
  type        = map(string)
  default     = {}

  validation {
    condition     = alltrue([for env, id in var.promotion_account_ids : contains(["staging", "prod"], env) && can(regex("^[0-9]{12}$", id))])
    error_message = "promotion_account_ids maps staging or prod to a 12-digit account id."
  }

  validation {
    condition     = length(var.promotion_account_ids) == 0 || (var.environment == "dev" && endswith(var.name_prefix, "-dev"))
    error_message = "Only dev, with a name_prefix ending in -dev, shares its artifacts through promotion_account_ids."
  }
}

variable "image_retention_count" {
  description = "Images tagged sha-* kept per ECR repository; older ones expire."
  type        = number
  default     = 50
}

variable "untagged_image_expiry_days" {
  description = "Days after which an untagged image expires."
  type        = number
  default     = 7
}

variable "force_destroy_artifacts" {
  description = "Allows deleting the artifacts bucket and the ECR repositories with content. Only for disposable environments."
  type        = bool
  default     = false
}
