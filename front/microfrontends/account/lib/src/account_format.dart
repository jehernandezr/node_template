String _two(int value) => value.toString().padLeft(2, '0');

/// Formats a date as dd/mm/yyyy.
String formatDate(DateTime value) =>
    '${_two(value.day)}/${_two(value.month)}/${value.year}';

/// Formats a date and time as dd/mm/yyyy HH:mm.
String formatDateTime(DateTime value) =>
    '${formatDate(value)} ${_two(value.hour)}:${_two(value.minute)}';
