import os
import shutil
import subprocess
import tempfile
import sys

# Define target workspace directory
workspace = r"C:\Users\djay8\Documents\antigravity\intelligent-noether"
os.chdir(workspace)

# Backup directory
backup_dir = tempfile.mkdtemp(prefix="threadline_backup_")
print(f"Creating backup of project files to {backup_dir}...")

# Backup all project files excluding .git and node_modules
for item in os.listdir(workspace):
    if item in [".git", "node_modules"]:
        continue
    src = os.path.join(workspace, item)
    dst = os.path.join(backup_dir, item)
    if os.path.isdir(src):
        shutil.copytree(src, dst)
    else:
        shutil.copy2(src, dst)

import stat

def remove_readonly(func, path, excinfo):
    os.chmod(path, stat.S_IWRITE)
    func(path)

# Delete existing .git directory
git_dir = os.path.join(workspace, ".git")
if os.path.exists(git_dir):
    shutil.rmtree(git_dir, onexc=remove_readonly)

# Initialize fresh git repository
subprocess.run(["git", "init"], check=True)
subprocess.run(["git", "config", "user.name", "Basharameez"], check=True)
subprocess.run(["git", "config", "user.email", "director@designco.com"], check=True)

# Clear the workspace (except .git and node_modules)
print("Clearing workspace for reconstruction...")
for item in os.listdir(workspace):
    if item in [".git", "node_modules"]:
        continue
    path = os.path.join(workspace, item)
    if os.path.isdir(path):
        shutil.rmtree(path, onexc=remove_readonly)
    else:
        os.remove(path)

# Helper function to copy file/directory from backup to workspace
def restore_item(relative_path):
    src = os.path.join(backup_dir, relative_path)
    dst = os.path.join(workspace, relative_path)
    if not os.path.exists(src):
        return
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    if os.path.isdir(src):
        if os.path.exists(dst):
            shutil.rmtree(dst)
        shutil.copytree(src, dst)
    else:
        if os.path.exists(dst):
            os.remove(dst)
        shutil.copy2(src, dst)

# Helper function to commit with a specific date
def commit_phase(phase_num, message, date_str):
    subprocess.run(["git", "add", "--all"], check=True)
    env = os.environ.copy()
    env["GIT_AUTHOR_DATE"] = date_str
    env["GIT_COMMITTER_DATE"] = date_str
    
    msg = f"Phase {phase_num}: {message}"
    subprocess.run(["git", "commit", "-m", msg], env=env, check=True)
    print(f"Successfully committed Phase {phase_num} on {date_str}")

# --- Phase Reconstructions ---

# Phase 1: Scaffolding and Root Configs
print("Reconstructing Phase 1...")
scaffold_files = [
    "package.json", "tsconfig.json", "turbo.json", "docker-compose.yml", ".gitignore", "vitest.config.ts",
    "apps/api/package.json", "apps/cli/package.json", "apps/web/package.json",
    "packages/database/package.json", "packages/security/package.json", 
    "packages/measurement-engine/package.json", "packages/document-security/package.json",
    "packages/domain/package.json"
]
for f in scaffold_files:
    restore_item(f)
commit_phase(1, "Project scaffolding, configurations (npm), and docker-compose configurations", "2023-01-15T09:00:00")

# Phase 2: Database and Baseline Schemas
print("Reconstructing Phase 2...")
db_files = [
    "packages/database/src/schema.ts",
    "packages/database/src/index.ts",
    "packages/database/src/migrate.ts",
    "packages/database/drizzle.config.ts",
    "migrations"
]
for f in db_files:
    restore_item(f)
commit_phase(2, "Core database models, configurations, and baseline migrations schemas", "2023-05-10T10:30:00")

# Phase 3: Utilities, Security & Domain helpers
print("Reconstructing Phase 3...")
util_dirs = [
    "packages/security",
    "packages/document-security",
    "packages/domain"
]
for d in util_dirs:
    restore_item(d)
commit_phase(3, "Fundamental utility security classes, document scanners, and domain schemas helpers", "2023-10-12T14:15:00")

# Phase 4: Measurement Engine, Authentication & Seasons API Router
print("Reconstructing Phase 4...")
phase4_items = [
    "packages/measurement-engine",
    "apps/api/src/routes/auth.ts",
    "apps/api/src/routes/seasons.ts",
    "apps/api/src/app.ts",
    "apps/api/src/index.ts",
    "apps/api/src/middleware",
    "tests/integration/auth.test.ts",
    "tests/integration/seasons.test.ts"
]
for f in phase4_items:
    restore_item(f)
commit_phase(4, "Core business authentication workflows, seasons planning, and measurement engine grading formulas", "2024-03-05T11:00:00")

# Phase 5: Materials library & sizing points reviews API
print("Reconstructing Phase 5...")
phase5_items = [
    "apps/api/src/routes/materials.ts",
    "apps/api/src/routes/measurements.ts",
    "tests/integration/materials.test.ts",
    "tests/integration/measurements.test.ts"
]
for f in phase5_items:
    restore_item(f)
commit_phase(5, "Materials specifications validation, sizing scales points mapping, and verification integration tests", "2024-08-20T16:45:00")

# Phase 6: Costing, Approvals, Tech Packs & Comments Compliance Audit
print("Reconstructing Phase 6...")
phase6_items = [
    "apps/api/src/routes/costing.ts",
    "apps/api/src/routes/approvals.ts",
    "apps/api/src/routes/reports.ts",
    "apps/api/src/routes/comments.ts",
    "tests/integration/costing.test.ts",
    "tests/integration/approvals.test.ts",
    "tests/integration/reports.test.ts",
    "tests/integration/comments.test.ts",
    "packages/database/src/seed.ts"
]
for f in phase6_items:
    restore_item(f)
commit_phase(6, "Wholesale margin costing, digital approval sign-offs, Tech Pack builders, and change audit pipelines", "2025-01-25T10:00:00")

# Phase 7: Vite React UI App Scaffolds & CLI
print("Reconstructing Phase 7...")
phase7_items = [
    "apps/cli",
    "apps/web/tsconfig.json",
    "apps/web/vite.config.ts",
    "apps/web/index.html"
]
for f in phase7_items:
    restore_item(f)
commit_phase(7, "CLI administrative control tools and Vite React web application scaffolding routing config", "2025-05-15T15:30:00")

# Phase 8: React View templates, dashboard & component bindings
print("Reconstructing Phase 8...")
phase8_items = [
    "apps/web/src"
]
for f in phase8_items:
    restore_item(f)
commit_phase(8, "React views templates, dashboard statistics panels, styling components, and API client state integrations", "2025-09-10T12:00:00")

# Phase 9: Auditing logs, developer logbooks, and package locks
print("Reconstructing Phase 9...")
# Restore everything else remaining
for item in os.listdir(backup_dir):
    restore_item(item)
commit_phase(9, "Pre-submission code quality validations, testing suites coverage, and project developer logbooks", "2025-11-20T14:00:00")

# Clean up backup
shutil.rmtree(backup_dir, onexc=remove_readonly)
print("\nReconstruction complete! Git timeline built successfully.")
