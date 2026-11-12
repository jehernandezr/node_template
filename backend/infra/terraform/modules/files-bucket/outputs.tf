output "bucket_id" {
  description = "Nombre del bucket de archivos."
  value       = aws_s3_bucket.this.id
}

output "bucket_arn" {
  description = "ARN del bucket de archivos."
  value       = aws_s3_bucket.this.arn
}

output "bucket_regional_domain_name" {
  description = "Dominio regional del bucket."
  value       = aws_s3_bucket.this.bucket_regional_domain_name
}

output "kms_key_arn" {
  description = "ARN de la clave KMS que cifra el bucket."
  value       = local.kms_key_arn
}

output "read_write_policy_json" {
  description = "Documento de política IAM con acceso de lectura y escritura al bucket y su clave, para adjuntar a los roles de los servicios que manejan archivos."
  value       = data.aws_iam_policy_document.read_write.json
}
