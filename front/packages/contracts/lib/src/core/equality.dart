/// Value equality for generated types, including lists.
library;

/// True when [a] and [b] are equal; lists compare element by element.
bool contractEquals(Object? a, Object? b) {
  if (identical(a, b)) return true;
  if (a is List && b is List) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (!contractEquals(a[i], b[i])) return false;
    }
    return true;
  }
  return a == b;
}

/// Hash consistent with [contractEquals].
int contractHash(Iterable<Object?> values) =>
    Object.hashAll(values.map((v) => v is List ? contractHash(v) : v));
