#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="${ROOT_DIR}/dist/public-artifacts"
TARBALL_PATH="${OUTPUT_DIR}/latest.tar.gz"
CHECKSUM_PATH="${OUTPUT_DIR}/latest.sha256"

mkdir -p "${OUTPUT_DIR}"

python3 - <<'PY' "${ROOT_DIR}" "${TARBALL_PATH}" "${CHECKSUM_PATH}"
from __future__ import annotations

import gzip
import hashlib
import os
import stat
import subprocess
import sys
import tarfile
from pathlib import Path

root = Path(sys.argv[1]).resolve()
tarball_path = Path(sys.argv[2]).resolve()
checksum_path = Path(sys.argv[3]).resolve()

result = subprocess.run(
    ["git", "-C", str(root), "ls-files", "-z"],
    check=True,
    capture_output=True,
)
tracked_files = [entry.decode("utf-8") for entry in result.stdout.split(b"\0") if entry]
if not tracked_files:
    raise SystemExit("no tracked files found to publish")

ZERO_MTIME = 0


def add_path(tf: tarfile.TarFile, repo_root: Path, rel_path: str) -> None:
    path = repo_root / rel_path
    st = path.lstat()

    info = tarfile.TarInfo(name=rel_path)
    info.mtime = ZERO_MTIME
    info.uid = 0
    info.gid = 0
    info.uname = ""
    info.gname = ""
    info.mode = stat.S_IMODE(st.st_mode)

    if path.is_symlink():
        info.type = tarfile.SYMTYPE
        info.linkname = os.readlink(path)
        tf.addfile(info)
        return

    info.size = st.st_size
    with path.open("rb") as fh:
        tf.addfile(info, fh)


tarball_path.parent.mkdir(parents=True, exist_ok=True)
checksum_path.parent.mkdir(parents=True, exist_ok=True)

with tarball_path.open("wb") as raw_file:
    with gzip.GzipFile(filename="", mode="wb", fileobj=raw_file, mtime=ZERO_MTIME) as gz_file:
        with tarfile.open(fileobj=gz_file, mode="w") as tf:
            for rel_path in sorted(tracked_files):
                add_path(tf, root, rel_path)

sha256 = hashlib.sha256(tarball_path.read_bytes()).hexdigest()
checksum_path.write_text(f"{sha256}  {tarball_path.name}\n", encoding="utf-8")
PY

echo "built ${TARBALL_PATH}"
echo "wrote ${CHECKSUM_PATH}"
