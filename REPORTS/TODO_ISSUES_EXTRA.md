## Remaining Markers (automated scan)

An automated scan found additional `TODO|FIXME|placeholder|mock` markers across the repository (docs, templates and some code). Many are documentation checkpoints or audit notes that require human decisions. Recommended next steps:

- Create issues for any item that needs product/arch decisions.
- For code TODOs that are straightforward, implement in small PRs and reference the related issue.
- Run `git grep -n "TODO\|FIXME\|placeholder\|mock"` to get a live list before each cleanup PR.

High-level locations to review (examples):

- `docs/UNINSTALL-GUIDE.md`
- `docs/HARDWARE-IMPLEMENTATION.md`
- `docs/templates/*`
- `REPORTS/*`

Use this file as an adjunct to `REPORTS/TODO_ISSUES.md` for follow-up actions.
