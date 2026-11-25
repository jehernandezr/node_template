# 0013. AI module with ports and Claude by default

- Status: Accepted, not built
- Updated: 2026-11-24 (status of what is built)
- Date: 2026-11-11

## Context

The platform's services need AI capabilities under the same rules as everything else: tenant, permissions, auditing, costs and traces. The provider and the model must be replaceable without rewriting the use cases.

## Decision

`libs/platform/ai` defines the ports `LlmProvider` (messages, streaming, tools and structured output) and `EmbeddingProvider`. The default LLM adapter is the Claude API with `@anthropic-ai/sdk`, and the default embeddings adapter is Voyage AI.

- Models are chosen by enum: `AiModel.Default` points to `claude-opus-5-5` and `AiModel.Fast` to `claude-haiku-5-5`, for classification and bulk extraction.
- Prompts are versioned classes with their output schema in zod, validated before reaching the use case.
- `@AiTool` exposes a use case as a tool, with the `Actor`, the tenant and the permissions of the user in the conversation. Tools that modify data ask for confirmation.
- Each call publishes `BillingEvent.UsageRecorded` per tenant, user and model.
- A set of evaluation cases per prompt runs in CI when the prompt changes.

### Status

`libs/platform/ai` does not exist yet. The only thing built is the `assistant` microfrontend, which only serves demo mode with in-memory data; its live mode waits for this library and for the service that uses it. When it is built, usage is metered like any other `@platform/metering` metric toward billing, instead of a dedicated `BillingEvent.UsageRecorded` event.

## Consequences

Positive:

- Changing models is configuration. Changing providers is writing an adapter.
- AI cost is charged and limited per tenant and plan.

Costs:

- Claude is the default provider, so the dependency exists as long as the adapter is not changed.
- Each prompt needs evaluation cases to maintain.

## Alternatives considered

- LLM: Claude on Amazon Bedrock (`AnthropicBedrockMantle`), or Ollama for development.
- Embeddings: Amazon Bedrock or a local model.
