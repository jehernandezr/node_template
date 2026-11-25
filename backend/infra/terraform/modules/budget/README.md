# budget module

Monthly cost budget with AWS Budgets and notifications to an SNS topic.

## What it creates

- A monthly `COST` budget with notifications at 80 % and 100 % of actual spend and at 100 % of the forecast (configurable in `notifications`).
- Optional filter by cost allocation tags (`cost_filter_tags`), which must be activated in Billing.

## Requirements

The topic must allow `budgets.amazonaws.com` to publish and, if it is encrypted with a CMK, to use the key. The alarms topic of the platform stack already allows it.
