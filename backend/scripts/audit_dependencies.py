"""Audit the lockfile, with an explicit guard for SQLx's inactive RSA dependency.

Cargo retains SQLx's optional database drivers in Cargo.lock. RUSTSEC-2023-0071
is excluded only after cargo tree confirms that rsa is absent from the active
graph across all platforms, including build and development dependencies.
If a change activates rsa, the normal advisory scan fails without this exclusion.
"""
import argparse
from pathlib import Path
import subprocess


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--audit-bin", default="cargo", help="cargo or a standalone cargo-audit executable")
    args = parser.parse_args()
    backend = Path(__file__).resolve().parents[1]
    graph = subprocess.run(
        ["cargo", "tree", "--locked", "--target", "all", "--prefix", "none", "--color", "never"],
        cwd=backend, check=True, capture_output=True, text=True,
    )
    command = [args.audit_bin, "audit", "--deny", "warnings"]
    if not any(line.startswith("rsa v") for line in graph.stdout.splitlines()):
        print("Checked all targets: rsa is not active; excluding its optional SQLx/MySQL lockfile advisory RUSTSEC-2023-0071.", flush=True)
        command.extend(["--ignore", "RUSTSEC-2023-0071"])
    subprocess.run(command, cwd=backend, check=True)


if __name__ == "__main__":
    main()
