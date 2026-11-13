import 'package:http/browser_client.dart';
import 'package:http/http.dart' as http;

/// Browser client. With [withCredentials] the browser sends and stores the
/// cookies of the API origin, such as the httpOnly session cookie.
http.Client createPlatformClient({required bool withCredentials}) =>
    BrowserClient()..withCredentials = withCredentials;
