output "provider_arn" {
  description = "ARN of the GitHub OIDC provider used by the roles."
  value       = local.provider_arn
}

output "deploy_role_arn" {
  description = "Role for terraform plan and apply, for role-to-assume in deploy.yml."
  value       = aws_iam_role.deploy.arn
}

output "publish_role_arn" {
  description = "Role that pushes images to ECR and artifacts to the artifacts bucket."
  value       = aws_iam_role.publish.arn
}

output "web_role_arn" {
  description = "Role that publishes the web app to its bucket and invalidates CloudFront."
  value       = aws_iam_role.web.arn
}
