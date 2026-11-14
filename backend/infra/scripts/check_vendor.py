"""Comprueba que vendor/ contiene exactamente lo que fija requirements.txt.

Renovate y OSV-Scanner leen requirements.txt, pero la Lambda despliega vendor/. Esta
comprobación falla si una subida cambia el archivo sin regenerar vendor/ (o al revés), si
METADATA no dice la misma versión que la carpeta y, cuando vendor/ conserva el RECORD de
pip, si algún archivo no coincide con el hash que pip registró al instalarlo.

Uso: python3 -B -I check_vendor.py <carpeta con requirements.txt y vendor/>
"""

import base64
import csv
import hashlib
import re
import sys
from pathlib import Path


def normalize(name):
    # Nombres de paquete según PEP 503: python_dateutil y python-dateutil son el mismo.
    return re.sub(r"[-_.]+", "-", name).lower()


def pinned(requirements):
    pins = {}
    for raw in requirements.read_text().splitlines():
        line = raw.split("#", 1)[0].strip()
        if not line:
            continue
        match = re.fullmatch(r"([A-Za-z0-9][A-Za-z0-9._-]*)==([A-Za-z0-9.+!-]+)", line)
        if match is None:
            raise SystemExit(f"{requirements}: cada dependencia se fija con ==: {raw!r}")
        pins[normalize(match.group(1))] = match.group(2)
    return pins


def installed(vendor):
    found = {}
    for dist in sorted(vendor.glob("*.dist-info")):
        name, _, version = dist.name[: -len(".dist-info")].rpartition("-")
        found[normalize(name)] = (version, dist)
    return found


def metadata_errors(name, version, dist):
    metadata = dist / "METADATA"
    if not metadata.is_file():
        return [f"{dist.name} no tiene METADATA"]
    fields = dict(
        line.split(": ", 1) for line in metadata.read_text().splitlines()[:20] if ": " in line
    )
    if normalize(fields.get("Name", "")) != name or fields.get("Version") != version:
        return [f"{dist.name}/METADATA dice {fields.get('Name')} {fields.get('Version')}"]
    return []


def record_errors(vendor, dist):
    errors = []
    record = dist / "RECORD"
    if not record.is_file():
        return errors
    with record.open(newline="") as handle:
        for row in csv.reader(handle):
            if len(row) < 2 or not row[1]:
                continue  # RECORD y los .pyc no llevan hash.
            path = vendor / row[0]
            algorithm, _, expected = row[1].partition("=")
            if not path.is_file():
                errors.append(f"{row[0]} falta")
                continue
            digest = hashlib.new(algorithm, path.read_bytes()).digest()
            actual = base64.urlsafe_b64encode(digest).rstrip(b"=").decode()
            if actual != expected:
                errors.append(f"{row[0]} no coincide con el hash de {dist.name}/RECORD")
    return errors


def main(folder):
    folder = Path(folder)
    vendor = folder / "vendor"
    pins = pinned(folder / "requirements.txt")
    found = installed(vendor)
    errors = []
    for name, version in pins.items():
        if name not in found:
            errors.append(f"{name}=={version} está en requirements.txt y no en vendor/")
        elif found[name][0] != version:
            errors.append(f"{name}: requirements.txt fija {version} y vendor/ tiene {found[name][0]}")
    for name, (version, _) in found.items():
        if name not in pins:
            errors.append(f"{name} {version} está en vendor/ y no en requirements.txt")
    for name, (version, dist) in found.items():
        errors.extend(metadata_errors(name, version, dist))
        errors.extend(record_errors(vendor, dist))
    if errors:
        print("vendor/ no coincide con requirements.txt:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        print("Regenera vendor/ con el comando del encabezado de requirements.txt.", file=sys.stderr)
        return 1
    print(f"vendor/ coincide con requirements.txt ({len(pins)} paquetes).")
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    sys.exit(main(sys.argv[1]))
