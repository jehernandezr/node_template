output "arn" {
  description = "ARN de la clave."
  value       = aws_kms_key.this.arn
}

output "key_id" {
  description = "ID de la clave."
  value       = aws_kms_key.this.key_id
}

output "alias_name" {
  description = "Nombre completo del alias (alias/...)."
  value       = aws_kms_alias.this.name
}
