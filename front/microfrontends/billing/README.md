# mf_billing

Microfrontend `billing` for the web shell. Shows the tenant's plan, usage per quota, plan changes and invoices.

- Manifest: `billingManifest` in `lib/mf_billing.dart`. Web only, requires `billing:read`. The manifest imports only `shell_core`, `go_router`, `material_ui` and the deferred screens library.
- Routes are nested under `/billing`: `/billing` (plan and usage), `/billing/invoices` (list), `/billing/invoices/:id` (detail with charges and a download placeholder). Navigation uses `context.go`.
- Screens load as a deferred library (`lib/src/screens/billing_screens.dart`). Its builders read the repository from the scope of the current identity (`billingRepositoryOf`) and wrap the screen in `Localizations.override` with `BillingLocalizations`, so the copy stays in that chunk.
- Data: abstract `BillingRepository` in `lib/src/data/`. `FakeBillingRepository` serves in-memory sample data until the API is wired. Errors are `ApiErrorException`; screens show them with `ErrorView.fromException`. Pass `failure:` to the fake to exercise error views.
- Copy: `lib/src/l10n/app_es.arb` (template) and `app_en.arb`, generated into `lib/src/l10n/generated/` (`billing_localizations.dart`, class `BillingLocalizations`). Shared words (`actionCancel`, and so on) come from `AppLocalizations` in `packages/i18n`. Regenerate with `flutter gen-l10n`.
- Money: integer minor units plus `Currency`. COP uses es_CO separators with no decimals (`$ 189.000`); USD uses en_US with two decimals (`US$1,100.00`). Formatting is in `lib/src/format/money_format.dart` (intl).
- Spacing comes from `AppSpacing` (`package:ui`).
- Usage meters turn warning at 80% and danger at 100% (`usageLevelFor`).

Check with `flutter gen-l10n && flutter analyze && flutter test`.
