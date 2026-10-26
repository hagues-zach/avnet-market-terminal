# Avnet Market Intelligence Terminal

Next.js 15 app (TypeScript, pnpm). Design rules are in [DESIGN.md](DESIGN.md); feature notes are in [docs](docs).

## Run, test and deploy

### Develop

Needs Node 20 or later (CI uses 22) and pnpm 10.

```bash
pnpm install
pnpm dev
```

The app runs on http://localhost:3002. Copy [.env.example](.env.example) to `.env.local` for local settings. Every variable is optional: with none set the app still runs, and features that need one say so (AI features say they are off without a Claude key).

One dependency, `xlsx`, installs from `cdn.sheetjs.com` rather than the npm registry. A network that allows only an internal registry mirror needs that host allowed too, or the tarball mirrored.

### Test

```bash
pnpm test
```

This runs every `src/**/*.test.ts` in its own process and prints a pass or fail line per file with its time, then exits non-zero if any failed. Pass words to run only matching files, for example `pnpm test cycle deck`. Set `TEST_JOBS=1` to run one file at a time. A single file still runs on its own with `npx tsx src/lib/cycle/turns.test.ts`.

The PowerPoint export test (`src/lib/deck/pptx.test.ts`) calls the `unzip` command, so it must be on the PATH. It is on macOS and most Linux images; on Debian or Ubuntu install the `unzip` package.

### CI

[scripts/ci.sh](scripts/ci.sh) is the whole check: install from the frozen lockfile, `tsc --noEmit`, the tests, then `next build`. It needs no secrets and runs the same on any host.

```bash
./scripts/ci.sh
```

- **GitHub (including GitHub Enterprise):** [.github/workflows/terminal-ci.yml](.github/workflows/terminal-ci.yml) runs `ci.sh` and builds the container image on every pull request and on pushes to `main`.
- **Azure Pipelines:** add an `azure-pipelines.yml` that installs Node and pnpm, then runs the script:

  ```yaml
  trigger: [main]
  pool: { vmImage: ubuntu-latest }
  steps:
    - task: NodeTool@0
      inputs: { versionSpec: "22.x" }
    - script: npm install -g pnpm@10.33.2
    - script: ./scripts/ci.sh
      displayName: Type check, test and build
  ```

  If the app sits in a subfolder of the Azure repo, set `workingDirectory` on the last step and add a `paths` filter to the trigger.

### Docker

The [Dockerfile](Dockerfile) builds Next's standalone output into a small image for Azure, AWS or on premises hosting. It runs as a non-root user on port 3002.

```bash
docker build -t avnet-market-terminal .
docker run -p 3002:3002 --env-file .env.local avnet-market-terminal
```

The image includes the Avnet PowerPoint template (`assets/brand/avnet-template-fy27.pptx`) and the `data/` folder (cycle engine output, line card snapshots). Licensed data under `data/cycle/licensed/` is left out, as it is in git. The container has a health check on `/login`, which answers 200 with or without the password gate.

### Differences from Vercel

- **Saved results.** With `STORE_ADAPTER=file` (the default), AI answers and talking points are written to `/app/.cache` and line card snapshots to `/app/data/line-cards`. On a container they last only as long as the container unless a volume is mounted on `/app/.cache` (and on `/app/data/line-cards` to keep new snapshots). Several replicas each keep their own copy; a shared database adapter is being added for that.
- **Next's data cache.** Cached SEC, earnings and macro fetches (`unstable_cache`, `revalidate`) live in `/app/.next/cache` on each container rather than in Vercel's shared cache, so each replica fetches on its own and starts cold after a restart.
- **Password gate.** `SITE_PASSWORD` works the same way, but the login cookie is marked secure, so browsers send it back only over HTTPS (or to localhost). Put the container behind TLS, such as a load balancer or ingress that terminates HTTPS.
- **Outbound network.** Live pages call public sources (sec.gov, Federal Reserve and other macro feeds, trade press news feeds, distributor line card pages, the Claude API). A locked down network needs those hosts allowed, or those pages show their unavailable message.

### Environment variables

All are listed with what they do and their defaults in [.env.example](.env.example):

| Variable | Use |
| --- | --- |
| `SITE_PASSWORD` | Password gate for the whole site; open when unset |
| `SEC_USER_AGENT` | Contact sent to sec.gov; needed for Revenue mix and commentary |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN` | Claude credential; AI features are off without one |
| `STORE_ADAPTER` | Where saved results live; default `file` |
| `KCS_SERVICE_KEY` | Korea Customs key, reserved for the cycle engine |
| `ASK_EVAL_URL`, `QBR_EVAL_URL`, `NEXT_DIST_DIR` | Development only |

Variables for Avnet's Databricks data and database are being added under "Avnet data and database" in `.env.example`.
