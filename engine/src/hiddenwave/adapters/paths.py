from pathlib import Path

# engine/src/hiddenwave/adapters/paths.py -> <repo>
REPO_ROOT = Path(__file__).resolve().parents[4]
CLIENT_DIST_DIR = REPO_ROOT / "client" / "dist"
SAMPLES_DIR = REPO_ROOT / "samples"
EVALUATION_DIR = REPO_ROOT / "evaluation"
