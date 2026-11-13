# Roadmap

## Release 12.0.0

We have released version 12.0.0 on AMO and GitHub on 12 Nov 2026.

Look at [docs/releases/v12.0.0.md](docs/releases/v12.0.0.md) or [archived ROADMAP](https://github.com/menhera-org/TabArray/blob/988a1fa7a1e9dcea22bd8daf2b2de443fefd7d14/ROADMAP.md) for details.

### Not in 12.0.0

| Issue | Reason |
|---|---|
| #156, #34 | Moving to a non-persistent background page and then to Manifest V3. Firefox still supports Manifest V2. The language override content scripts block #156, and the change touches every part of the extension, so it is too risky for one release. |
| #501 | Per-container Mozilla VPN locations need changes from Mozilla. |
| #473 | Firefox's fingerprinting protection hides dark mode from websites on purpose. This is not a bug in the extension. |
| #496 | A "+" button on each container to open a new tab. Firefox's tab group menu already opens a new tab in a group, and 12.0.0 keeps fewer ways of doing the same thing. |

### Release checklist (for v12.0.0)

- Every issue above is fixed, or moved to "Not in 12.0.0" with a reason in the issue.
- `npm run build` passes, and addons-linter reports no errors.
- A build from the source tarball matches the build from Git byte for byte.
- Translations are merged from Weblate after the string freeze. Untranslated strings fall back to English.
- Release notes are written in `docs/releases/v12.0.0.md`.
