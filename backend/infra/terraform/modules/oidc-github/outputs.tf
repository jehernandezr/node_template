output "provider_arn" {
  description = "ARN del proveedor OIDC de GitHub que usan los roles."
  value       = local.provider_arn
}

output "deploy_role_arn" {
  description = "Rol de terraform plan y apply, para role-to-assume en deploy.yml."
  value       = aws_iam_role.deploy.arn
}

output "publish_role_arn" {
  description = "Rol que sube imágenes a ECR y artefactos al bucket de artefactos."
  value       = aws_iam_role.publish.arn
}

output "web_role_arn" {
  description = "Rol que publica la web en su bucket e invalida CloudFront."
  value       = aws_iam_role.web.arn
}

output "artifacts_bucket" {
  description = "Bucket de los bundles de Lambda y los compilados móviles."
  value       = aws_s3_bucket.artifacts.bucket
}

output "ecr_repository_prefix" {
  description = "Prefijo de los repositorios ECR de los servicios: <prefijo>/<servicio>."
  value       = var.name_prefix
}
