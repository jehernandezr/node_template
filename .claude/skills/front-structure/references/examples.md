# front-structure examples

Long examples the skill cites. Read them only when the topic applies.

## Layers inside a microfrontend

```
lib/src/
├── screens/     screens (widgets), controllers and flows of those screens
├── data/        repository port, API adapter and demo adapter
├── lifecycle/   microfrontend lifecycle
├── l10n/        ARB and generated localizations
└── shared/
    ├── enums/       no internal imports
    ├── constants/   imports enums
    ├── types/       imports enums and constants
    └── utils/       imports all three
```
