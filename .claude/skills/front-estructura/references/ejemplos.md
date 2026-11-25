# Ejemplos de front-estructura

Ejemplos largos que la skill cita. Léelos solo cuando el tema te toque.

## Capas dentro de un microfrontend

```
lib/src/
├── screens/     pantallas (widgets), controladores y flujos de esas pantallas
├── data/        puerto del repositorio, adaptador de API y adaptador de demostración
├── lifecycle/   ciclo de vida del microfrontend
├── l10n/        ARB y localizaciones generadas
└── shared/
    ├── enums/       sin imports internos
    ├── constants/   importa enums
    ├── types/       importa enums y constants
    └── utils/       importa las tres
```
