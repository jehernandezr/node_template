# front-analysis examples

Long examples the skill cites. Read them only when the topic applies.

## Current state and goal

```yaml
include: package:flutter_lints/flutter.yaml

analyzer:
  language:
    strict-casts: true
    strict-inference: true
    strict-raw-types: true
  exclude:
    - build/**
    - '**/generated/**'
    - android/**
    - ios/**
    - web/**
    - windows/**
    - macos/**
    - linux/**

linter:
  rules:
    - always_declare_return_types
    - avoid_dynamic_calls
    - cancel_subscriptions
    - close_sinks
    - prefer_final_locals
    - prefer_final_fields
    - prefer_const_literals_to_create_immutables
    - unawaited_futures
    - public_member_api_docs
    - directives_ordering
    - sort_pub_dependencies
```
