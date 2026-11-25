import 'package:auth/auth.dart';

/// Fake device key. [sign] reverses the bytes so it is deterministic.
class FakeDeviceKeyPort implements DeviceKeyPort {
  FakeDeviceKeyPort({this._publicKey = const [1, 2, 3, 4]});

  final List<int> _publicKey;
  int signCount = 0;

  @override
  Future<List<int>> publicKey() async => _publicKey;

  @override
  Future<List<int>> sign(List<int> data) async {
    signCount++;
    return data.map((byte) => byte ^ 0xFF).toList();
  }
}
