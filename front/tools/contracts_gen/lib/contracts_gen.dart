/// Generador del Dart de `packages/contracts` desde los `contract.json` del backend.
library;

export 'src/cli.dart' show findFrontRoot, readContracts, run;
export 'src/generator.dart'
    show Folder, generate, generatedHeader, generatedPath;
export 'src/model.dart' show ContractModel, GeneratorException, Json;
