# Secrets Rotation Playbook

This playbook guides the safe rotation and remediation steps after secrets
were found in repository history. Follow these steps in order and coordinate
with your team before performing destructive actions (history rewrite / force-push).

1. Inventory

- Review `scripts/gitleaks_report.json` for the full list of findings.
- Confirm which findings are real credentials vs. examples/placeholders.
- Export a list of affected services (Stripe, JWT, license server, etc.).

2. Immediate revocation / rotation (High priority)

- For any production credential (Stripe live keys, license keys, cloud API
  keys) revoke/rotate immediately via provider console.
- Invalidate any JWT secrets used for session tokens; force logout if necessary.
- Replace the secret values in all deployment platforms (Railway, GitHub
  Actions secrets, server envs).

3. Prevent further leakage

- Ensure `.gitignore` excludes `.env` and secrets (already present).
- Add secret-scanning to CI (GitHub Advanced Security or a gitleaks job).
- Install pre-commit hooks to prevent accidental commits of secrets.

4. Clean the Git history (already prepared)

- A backup bundle was created in the repo root (file `repo-backup-*.bundle`).
- We also prepared `scripts/paths-to-remove.txt` and `scripts/replacements.txt`.
- To remove files from history (already executed):
  - `git filter-repo --invert-paths --paths-from-file scripts/paths-to-remove.txt`
- To replace literal secrets (requires exact values in `scripts/replacements.txt`):
  - `git filter-repo --replace-text scripts/replacements.txt`

5. Force-push and team coordination

- After rewrite, all branches and tags must be force-pushed:
  - `git push --all --force`
  - `git push --tags --force`
- Notify all contributors to re-clone or reset their local repos:
  - `git fetch origin --prune`
  - `git reset --hard origin/main` (or appropriate branch)

6. Post-remediation checks

- Verify CI runs and that secrets in CI are updated.
- Run an additional full secret scan (gitleaks/trufflehog) on the cleaned repo.
- Monitor logs and access patterns for suspicious activity tied to rotated keys.

7. Long-term improvements

- Enable GitHub secret scanning and alerting.
- Enforce commit signing and protected branches.
- Keep `scripts/gitleaks_report.json` and remediation artifacts offline after use.

If you want, I can prepare the team notification and perform the final force-push.
