output "budget_name" {
  description = "Nombre del presupuesto."
  value       = aws_budgets_budget.this.name
}
