output "arn" {
  description = "ARN of the key."
  value       = aws_kms_key.this.arn
}

output "key_id" {
  description = "ID of the key."
  value       = aws_kms_key.this.key_id
}

output "alias_name" {
  description = "Full alias name (alias/...)."
  value       = aws_kms_alias.this.name
}

output "policy" {
  description = "Key policy JSON: the account statement plus the CloudWatch Logs, service and account principal grants."
  value       = aws_kms_key.this.policy
}
