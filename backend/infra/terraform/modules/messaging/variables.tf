variable "name_prefix" {
  description = "Prefix for topic, queue and DLQ names."
  type        = string
}

variable "topology_file" {
  description = "Absolute path to the topology JSON exported by backend/libs/platform/messaging."
  type        = string
}

variable "kms_data_key_reuse_period_seconds" {
  description = "Seconds that SQS reuses a KMS data key. Between 60 and 86400."
  type        = number
  default     = 300

  validation {
    condition     = var.kms_data_key_reuse_period_seconds >= 60 && var.kms_data_key_reuse_period_seconds <= 86400
    error_message = "kms_data_key_reuse_period_seconds must be between 60 and 86400."
  }
}

variable "alarm_topic_arn" {
  description = "ARN of an SNS topic for the DLQ alarms. If null, the alarms do not notify."
  type        = string
  default     = null
}

variable "max_receive_count" {
  description = "Receives before a message moves to the DLQ. If null, each queue's maxReceiveCount from the topology is used."
  type        = number
  default     = null

  validation {
    condition     = var.max_receive_count == null || (var.max_receive_count >= 1 && var.max_receive_count <= 1000)
    error_message = "max_receive_count must be between 1 and 1000."
  }
}

variable "redrive_allow_policy_enabled" {
  description = "Restricts each DLQ to receive only from its queue. false in LocalStack, which does not delete the policy on destroy."
  type        = bool
  default     = true
}

variable "alarms_enabled" {
  description = "Creates the CloudWatch alarms for queues and DLQs. false in LocalStack, which does not emulate them reliably."
  type        = bool
  default     = true
}

variable "dlq_oldest_message_age_seconds" {
  description = "Age in seconds of the oldest message in a DLQ that triggers the alarm."
  type        = number
  default     = 3600
}

variable "queue_oldest_message_age_seconds" {
  description = "Age in seconds of the oldest message in a main queue that triggers the alarm (stopped consumer)."
  type        = number
  default     = 900
}

variable "tags" {
  description = "Additional tags for the module resources."
  type        = map(string)
  default     = {}
}
