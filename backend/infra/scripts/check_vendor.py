"""Checks that vendor/ holds exactly what requirements.txt pins.

Renovate and OSV-Scanner read requirements.txt, but the Lambda deploys vendor/. This
check fails if an upgrade changes the file without regenerating vendor/ (or the other way
around), if METADATA does not state the same version as the folder and, when vendor/ keeps
pip's RECORD, if any file does not match the hash pip recorded when installing it.

Usage: python3 -B -I check_vendor.py <folder with requirements.txt and vendor/>
"""

import base64
import csv
import hashlib
import re
import sys
from pathlib import Path


def normalize(name):
    # Package names per PEP 503: python_dateutil and python-dateutil are the same.
    return re.sub(r"[-_.]+", "-", name).lower()


def pinned(requirements):
    pins = {}
    for raw in requirements.read_text().splitlines():
        line = raw.split("#", 1)[0].strip()
        if not line:
            continue
        match = re.fullmatch(r"([A-Za-z0-9][A-Za-z0-9._-]*)==([A-Za-z0-9.+!-]+)", line)
        if match is None:
            raise SystemExit(f"{requirements}: every dependency is pinned with ==: {raw!r}")
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
        return [f"{dist.name} has no METADATA"]
    fields = dict(
        line.split(": ", 1) for line in metadata.read_text().splitlines()[:20] if ": " in line
    )
    if normalize(fields.get("Name", "")) != name or fields.get("Version") != version:
        return [f"{dist.name}/METADATA says {fields.get('Name')} {fields.get('Version')}"]
    return []


def record_errors(vendor, dist):
    errors = []
    record = dist / "RECORD"
    if not record.is_file():
        return errors
    with record.open(newline="") as handle:
        for row in csv.reader(handle):
            if len(row) < 2 or not row[1]:
                continue  # RECORD and the .pyc files carry no hash.
            path = vendor / row[0]
            algorithm, _, expected = row[1].partition("=")
            if not path.is_file():
                errors.append(f"{row[0]} is missing")
                continue
            digest = hashlib.new(algorithm, path.read_bytes()).digest()
            actual = base64.urlsafe_b64encode(digest).rstrip(b"=").decode()
            if actual != expected:
                errors.append(f"{row[0]} does not match the hash in {dist.name}/RECORD")
    return errors


def main(folder):
    folder = Path(folder)
    vendor = folder / "vendor"
    pins = pinned(folder / "requirements.txt")
    found = installed(vendor)
    errors = []
    for name, version in pins.items():
        if name not in found:
            errors.append(f"{name}=={version} is in requirements.txt and not in vendor/")
        elif found[name][0] != version:
            errors.append(f"{name}: requirements.txt pins {version} and vendor/ has {found[name][0]}")
    for name, (version, _) in found.items():
        if name not in pins:
            errors.append(f"{name} {version} is in vendor/ and not in requirements.txt")
    for name, (version, dist) in found.items():
        errors.extend(metadata_errors(name, version, dist))
        errors.extend(record_errors(vendor, dist))
    if errors:
        print("vendor/ does not match requirements.txt:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        print("Regenerate vendor/ with the command in the header of requirements.txt.", file=sys.stderr)
        return 1
    print(f"vendor/ matches requirements.txt ({len(pins)} packages).")
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    sys.exit(main(sys.argv[1]))
