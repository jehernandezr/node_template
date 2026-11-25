/// Generator of the `packages/contracts` Dart code from the backend `contract.json` files.
library;

export 'src/cli.dart' show findFrontRoot, readContracts, run;
export 'src/generator.dart'
    show
        Folder,
        errorMessagesPath,
        generate,
        generateErrorMessages,
        generatedHeader,
        generatedPath;
export 'src/model.dart' show ContractModel, GeneratorException, Json;
