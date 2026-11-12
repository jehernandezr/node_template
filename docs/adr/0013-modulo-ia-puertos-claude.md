# 0013. Módulo de IA con puertos y Claude por defecto

- Estado: Aceptada
- Fecha: 2026-11-11

## Contexto

Los servicios de la plataforma necesitan capacidades de IA con las mismas reglas que el resto: tenant, permisos, auditoría, costos y trazas. El proveedor y el modelo deben poder cambiar sin reescribir los casos de uso.

## Decisión

`libs/platform/ai` define los puertos `LlmProvider` (mensajes, streaming, herramientas y salida estructurada) y `EmbeddingProvider`. El adaptador por defecto de LLM es la Claude API con `@anthropic-ai/sdk`, y el de embeddings es Voyage AI.

- Los modelos se eligen por enum: `AiModel.Default` apunta a `claude-opus-5-5` y `AiModel.Fast` a `claude-haiku-5-5`, para clasificación y extracción masiva.
- Los prompts son clases versionadas con su esquema de salida en zod, validado antes de llegar al caso de uso.
- `@AiTool` expone un caso de uso como herramienta, con el `Actor`, el tenant y los permisos del usuario que conversa. Las herramientas que modifican datos piden confirmación.
- Cada llamada publica `BillingEvent.UsageRecorded` por tenant, usuario y modelo.
- Un conjunto de casos de evaluación por prompt corre en CI cuando el prompt cambia.

## Consecuencias

Positivas:

- Cambiar de modelo es configuración. Cambiar de proveedor es escribir un adaptador.
- El costo de IA se cobra y se limita por tenant y plan.

Costos:

- Claude es el proveedor por defecto, así que la dependencia existe mientras no se cambie el adaptador.
- Cada prompt necesita casos de evaluación que mantener.

## Alternativas consideradas

- LLM: Claude en Amazon Bedrock (`AnthropicBedrockMantle`), o Ollama para desarrollo.
- Embeddings: Amazon Bedrock o un modelo local.
