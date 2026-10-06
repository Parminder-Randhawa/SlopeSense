# Working on SlopeSense

Use a feature branch for each change: `feat/<purpose>`, `fix/<problem>` or `chore/<maintenance>`. Start from an up-to-date `main` after earlier work is merged. Keep commits focused and describe their resulting behavior. Push the feature branch and open a pull request; merge through review after Project checks passes. Do not commit credentials, local browser data or generated build output.

## Local validation

Use Node 24 and the pnpm version pinned in `package.json`. Install with `pnpm install --frozen-lockfile`. Run `pnpm dev` for the local application.

- `pnpm format` formats source and project configuration.
- `pnpm check` runs formatting, TypeScript, engine tests, the production build and isolated browser tests.
- Install the test browser once with `pnpm exec playwright install chromium`. A local macOS Chrome installation is also detected; `CHROME_PATH` can select another executable.
- `pnpm test:browser` serves the built bundle on a temporary port, tests it and closes that server. It does not modify the development server or your saved rides.

Engine tests cover GPS gaps, ambiguous matching, weather freshness, recommendations and source geometry. Browser tests cover live/demo separation, recording, saving, replay and responsive interaction. External outages are deliberate in deterministic browser tests. Check current provider rendering separately when changing the map or weather integration. A real outdoor device test is needed for sensor quality; synthetic GPS fixtures cannot establish that.

## CI and pull requests

Project checks runs on pushes and pull requests. It installs the locked dependencies, runs the same local checks on Ubuntu, and retains browser screenshots for seven days. Workflow permissions are read-only and third-party actions are pinned to commit hashes. Dependabot proposes dependency and Actions updates through separate pull requests; validate them before merging.

In GitHub Settings → Rules → Rulesets, protect `main` by requiring a pull request and the **Validate application** status check. These server-side rules require repository admin access and are separate from the workflow file. Keep force pushes and branch deletions blocked on `main`; feature branches remain disposable after merge. For solo work, a required external reviewer is optional.

## Changes to data and storage

Keep demo data explicitly simulated and separate from live rides. Preserve existing activity IDs when extending sample data. Any storage schema change needs a migration that preserves saved rides. Add tests for behavior and failure modes, rather than mirroring the implementation. Describe the source and limits of estimates; never replace missing observations with invented values.
