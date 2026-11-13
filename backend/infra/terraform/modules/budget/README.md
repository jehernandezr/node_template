# Módulo budget

Presupuesto mensual de costo con AWS Budgets y avisos a un tópico SNS.

## Qué crea

- Un presupuesto `COST` mensual con avisos al 80 % y al 100 % del gasto real y al 100 % del pronóstico (configurables en `notifications`).
- Filtro opcional por etiquetas de asignación de costos (`cost_filter_tags`), que deben estar activadas en Billing.

## Requisitos

El tópico debe permitir que `budgets.amazonaws.com` publique y, si se cifra con una CMK, que use la clave. El tópico de alarmas del stack platform ya lo permite.
