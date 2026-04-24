# Brimble Pipeline

Deployment pipeline project.

## Setup

Prerequisites:

- Bun `1.3.13`
- Docker and Docker Compose

Start the full stack:

```bash
docker compose up
```

Then open:

- Frontend: http://localhost
- API via Caddy: http://localhost/api/deployments
- Health: http://localhost/health

Stop the stack:

```bash
docker compose down
```

Optional development command:

```bash
docker compose up -d --build
```

Use this while actively working on the project. `--build` forces Docker to
rebuild the backend/frontend images so you do not run stale code, and `-d` keeps
the stack running in the background so the terminal stays free.

## Verified End To End

The local hard-requirement closeout was verified against the Compose stack with
this public sample repo:

- `https://github.com/railwayapp-templates/node-express.git`

Successful local deployment:

- Deployment id: `810b3de6-63eb-40df-a460-318b4d90c9e5`
- Image tag: `brimble/node-express:33b85f5e`
- Live local URL through Caddy:
  `http://localhost/810b3de6-63eb-40df-a460-318b4d90c9e5`

Verified behaviors:

- `docker compose up` starts Caddy, backend, frontend, and BuildKit
- `POST /api/deployments` with a Git URL runs the real Railpack -> Docker ->
  Caddy pipeline
- statuses progress through `building`, `deploying`, and `running`
- logs stream live over SSE while the build is active
- logs remain available after the build completes
- the deployment list contains the image tag and final live URL
- Caddy is the single point of ingress for frontend, API, and deployed apps

## Architecture Decisions

The backend is a Bun + Hono service with SQLite for persistence, because the
take-home explicitly favors a lightweight stack and Bun ships `bun:sqlite`
natively. That kept the database setup small while still giving us durable
deployment records and persisted log history.

The pipeline is split into `source`, `builder`, `runner`, and `caddy` modules so
the risky pieces stay isolated. Railpack builds the app image, Docker runs the
container on `brimble-net`, and Caddy is updated dynamically through the admin
API so deployed apps appear at `/<deploymentId>` without rewriting the whole
stack.

The frontend is a Vite SPA with TanStack Query polling deployment state and an
SSE hook for live logs. That keeps the UI simple while still meeting the “logs
while the build is running” requirement.

## What I Would Change

I would add a lightweight job queue or worker boundary around deployments so the
pipeline is not tied to the web process. The current in-process orchestrator is
good for the take-home, but queue-backed execution would make retries,
concurrency limits, and recovery after crashes much safer.

I would also make the Caddy route management more defensive by using `Etag` /
`If-Match` headers from the Caddy admin API. The current single-writer flow is
fine here, but optimistic concurrency would protect route updates if multiple
deployments finish at nearly the same time.

Finally, I would improve deployment history cleanup. The system now cleans up a
container if the pipeline fails after `docker run`, but the old failed test
records remain in the database for visibility. A production version would likely
separate audit history from active deployments more clearly and expose a cleanup
action in the UI.

## Brimble Deployment

Status: ready to deploy from the Brimble dashboard once this repo is pushed to a
Git provider.

Recommended target: `frontend/`

Brimble settings:

- Deployment directory: `frontend`
- Install command: `bun install --frozen-lockfile`
- Build command: `bun run build`
- Output directory: `dist`
- Environment variable: leave `VITE_API_URL` blank unless pointing the UI at a
  deployed Brimble Pipeline API

The frontend includes `frontend/brimble.json` so Brimble rewrites SPA routes to
`/index.html`.

Repository: `https://github.com/eyurenalison/brimble-pipeline.git`

Live URL: pending Brimble import and deploy.

### Brimble Feedback

The import-based deployment flow is easy to understand at a high level: connect
a Git provider, choose the repository, set the deployment directory, and deploy.
The main friction for this monorepo is that the required build settings are not
obvious from the project root. A clearer monorepo preset, or a short checklist
near the deployment-directory field, would reduce guesswork around install,
build, and output paths.

The Vite documentation is useful, especially the SPA rewrite note, but it is
easy to miss that `brimble.json` should live inside the selected deployment
directory when deploying only `frontend/` from a monorepo. I would also like the
dashboard to preview the detected commands before the first deploy, because that
would make mistakes visible before spending build minutes.
