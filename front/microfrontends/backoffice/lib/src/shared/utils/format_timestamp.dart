/// Formats a timestamp as `dd/MM/yyyy HH:mm` in the time zone of the value.
String formatTimestamp(DateTime value) {
  String two(int n) => n.toString().padLeft(2, '0');
  return '${two(value.day)}/${two(value.month)}/${value.year} '
      '${two(value.hour)}:${two(value.minute)}';
}
