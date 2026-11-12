import 'dart:io';

import 'package:contracts_gen/contracts_gen.dart';

Future<void> main(List<String> args) async {
  exitCode = await run(args);
}
