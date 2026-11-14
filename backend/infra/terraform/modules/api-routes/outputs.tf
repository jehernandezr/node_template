output "integration_id" {
  description = "ID de la integración del servicio."
  value       = aws_apigatewayv2_integration.this.id
}

output "route_keys" {
  description = "Rutas creadas en la API."
  value       = sort(tolist(local.route_keys))
}
