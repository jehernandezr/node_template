output "integration_id" {
  description = "ID of the service integration."
  value       = aws_apigatewayv2_integration.this.id
}

output "route_keys" {
  description = "Routes created in the API."
  value       = sort(tolist(local.route_keys))
}
