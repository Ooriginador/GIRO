#!/usr/bin/env bash
echo "*** FORCE-PUSH INSTRUCTIONS (DO NOT RUN BLINDLY) ***"
echo
echo "Before forcing push, ensure team coordination and that you have backed up the repo bundle."
echo "Backup bundle(s) are in the repo root with name repo-backup-*.bundle"
echo
echo "To force-push all branches and tags to origin (after history rewrite):"
echo "  git push --all --force"
echo "  git push --tags --force"
echo
echo "Recommended sequence (manual):"
echo "  1) Inform team"
echo "  2) Run: git push --all --force"
echo "  3) Run: git push --tags --force"
echo "  4) Update CI secrets and deployment envs"
echo
echo "If you want me to run these commands now, reply 'RUN_FORCE_PUSH' and I will execute them after final confirmation."
