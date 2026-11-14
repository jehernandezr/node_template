variable "topology_file" {
  description = "Topología de mensajería exportada (Topology.toJSON()), ruta absoluta o relativa a este stack. Por defecto la confirmada en git."
  type        = string
  default     = "../../topology.json"
}

variable "max_receive_count" {
  description = "Recepciones antes de mover un mensaje a la DLQ. Null usa el valor de cada cola en la topología."
  type        = number
  default     = null
}
