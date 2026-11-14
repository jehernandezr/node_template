import 'package:auth/auth.dart';

/// Device key of demo mode. It signs by flipping the bits of the data, so the
/// code a challenge shows is stable between runs.
///
/// It only exists next to the demo repository: no real server ever receives
/// a signature from it.
final class DemoDeviceKey implements DeviceKeyPort {
  const DemoDeviceKey();

  @override
  Future<List<int>> publicKey() async => const [1, 2, 3, 4];

  @override
  Future<List<int>> sign(List<int> data) async => [
    for (final byte in data) byte ^ 0xFF,
  ];
}
