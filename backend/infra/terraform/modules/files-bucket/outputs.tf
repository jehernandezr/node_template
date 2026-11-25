output "bucket_id" {
  description = "Name of the files bucket."
  value       = aws_s3_bucket.this.id
}

output "bucket_arn" {
  description = "ARN of the files bucket."
  value       = aws_s3_bucket.this.arn
}

output "bucket_regional_domain_name" {
  description = "Regional domain name of the bucket."
  value       = aws_s3_bucket.this.bucket_regional_domain_name
}

output "kms_key_arn" {
  description = "ARN of the KMS key that encrypts the bucket."
  value       = local.kms_key_arn
}

output "read_write_policy_json" {
  description = "IAM policy document with read and write access to the bucket and its key, to attach to the roles of services that handle files."
  value       = data.aws_iam_policy_document.read_write.json
}
