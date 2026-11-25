variable "topology_file" {
  description = "Exported messaging topology (Topology.toJSON()), absolute path or relative to this stack. Defaults to the one committed to git."
  type        = string
  default     = "../../topology.json"
}

variable "max_receive_count" {
  description = "Receives before moving a message to the DLQ. Null uses the value of each queue in the topology."
  type        = number
  default     = null
}
