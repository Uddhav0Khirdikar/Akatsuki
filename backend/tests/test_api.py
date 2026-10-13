"""Compatibility entry point for the isolated backend regression suite.

The Rust suite starts its own test servers and uses temporary databases.
No running backend, college credentials, or seeded data are required.
"""
from pathlib import Path
import subprocess


if __name__ == "__main__":
    backend = Path(__file__).resolve().parents[1]
    subprocess.run(["cargo", "test", "--locked"], cwd=backend, check=True)
