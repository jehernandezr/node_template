variable "name_prefix" {
  description = "Prefix for the role names, for example node-template-dev."
  type        = string
}

variable "github_repository" {
  description = "GitHub repository that can assume the roles, in the form owner/name."
  type        = string

  validation {
    condition     = can(regex("^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$", var.github_repository))
    error_message = "github_repository must have the form owner/name, without wildcards."
  }
}

variable "github_environment" {
  description = "GitHub environment whose jobs can assume the roles. It is the only identity the trust policy accepts."
  type        = string

  validation {
    condition     = can(regex("^[A-Za-z0-9_.-]+$", var.github_environment))
    error_message = "github_environment does not allow wildcards or spaces."
  }
}

variable "create_provider" {
  description = "Creates the GitHub OIDC provider. There can only be one per account: in the second region or environment of the same account, set false and pass existing_provider_arn."
  type        = bool
  default     = true
}

variable "existing_provider_arn" {
  description = "ARN of the GitHub OIDC provider that already exists in the account. Required with create_provider = false."
  type        = string
  default     = null

  validation {
    condition     = var.create_provider || var.existing_provider_arn != null
    error_message = "With create_provider = false, existing_provider_arn must be set."
  }
}

variable "state_bucket" {
  description = "Bucket for the environment's Terraform state. The deploy role reads and writes it."
  type        = string
}

variable "deploy_policy_arns" {
  description = "Managed policies added to the deploy role: what Terraform needs to create in the account. The template does not choose a scope for you."
  type        = list(string)
  default     = []
}

variable "artifacts_bucket_arn" {
  description = "ARN of the artifacts bucket (Lambda bundles and mobile builds): the publish role writes it and the deploy role reads it."
  type        = string
}

variable "artifacts_kms_key_arn" {
  description = "ARN of the CMK that encrypts the artifacts bucket."
  type        = string
}

variable "ecr_repository_arns" {
  description = "ARNs of the ECR repositories the publish role pushes to. The role cannot create repositories."
  type        = list(string)
}

variable "tags" {
  description = "Tags for the module resources."
  type        = map(string)
  default     = {}
}
