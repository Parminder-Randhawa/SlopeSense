# Project development expectations

This is a personal project. Keep the mobile experience, real data provenance, local history and three-mountain home scene intact.

- Work on a focused feature/fix/chore branch; reuse the current branch when continuing its scope. Do not make application commits directly on `main`.
- Use focused, descriptive commits. Push a completed, validated change to its feature branch when the user has authorized publishing. Open a pull request for review; do not merge without authorization.
- Run `pnpm check` before publishing application changes. It includes formatting, TypeScript, engine tests, production build and isolated browser checks. Inspect screenshots for visual changes and check actual provider rendering when changing maps or weather.
- Add behavioral tests for recording, persistence, analytics, data handling and meaningful interaction changes. Keep tests deterministic; exercise outages without depending on third-party uptime.
- Preserve live/demo separation, existing activity IDs and user data. Any storage schema change requires a migration.
- Never commit credentials, local browser data or build output. Use the locked dependencies and pinned Node/pnpm setup.
- Use CONTRIBUTING.md for the workflow and document material data/provider limitations.
