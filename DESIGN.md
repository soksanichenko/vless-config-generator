# vless-config-generator — design notes

Origin: `vpn-config-generator` idea in `infra/IDEAS.md` (generic VPN client config
generator for OpenVPN/VLESS/AmneziaWG). Scope narrowed to **VLESS/sing-box only**
— OpenVPN and AmneziaWG are deferred, not part of this repo.

## Purpose

A tool for generating/editing sing-box client configs, focused specifically on
**routing rules**: which apps/ports/protocols/domains go direct vs. through the
VLESS proxy. Not a from-scratch config builder — the user pastes their existing
sing-box `config.json`, the tool lets them edit the `route` section, and outputs
the same config with `route` replaced/updated. Everything else (outbounds,
inbounds, DNS) passes through untouched.

## Routing rule builder

- A list of rules, drag-reorderable (sing-box matches top to bottom, first hit
  wins — order is significant, must be exposed in the UI).
- Each rule = one or more conditions + an action (`direct` or `proxy`).
- Condition types:
  - `process_name` / `process_path` — app-based routing. Only works when
    sing-box runs as a full local client with permission to read the OS
    process list. Target platforms: **Windows and Linux**. On Linux this
    needs root/`CAP_NET_ADMIN` — the UI must surface that caveat, it's not
    universally available (e.g. won't work on a router or restricted
    environment).
  - `port` / `port_range`
  - `network` (tcp/udp)
  - `protocol` (http/tls/quic/...)
  - Domain matching — **both** manual lists (`domain`/`domain_suffix`/
    `domain_keyword`) and geosite/geoip categories are supported.
    - Manual: user types domains directly, no external dependency.
    - Category: modern sing-box (≥1.8) does this via `route.rule_set` with
      `type: remote` pointing at `.srs` binary databases (e.g. from the
      `sing-geosite`/`sing-geoip` repos), **not** inline `geosite:` matching
      (that's deprecated). Exact JSON schema for `rule_set` entries was not
      verified against current sing-box docs during design — **verify via
      Context7/official docs before implementing this part**, don't trust
      training-data memory for the syntax.
  - `ip_cidr` — manual CIDR list. `geoip` is covered the same way as
    `geosite`: a `rule_set` condition referencing a geoip `.srs` rule set.
  - `ip_is_private` — matches RFC1918/link-local destinations, no values
    needed beyond picking the condition and an action.
- **Default outbound** (what happens when no rule matches) is a **user-facing
  toggle** — direct or proxy, not a hardcoded default. This was an explicit
  design decision (not "safer default wins").

## Client credentials — dropdown, not manual entry

Deployed on the same VDS (zelgray.work) that already runs XRay (VLESS+Reality),
so the server-side client list is a known quantity — no reason to make the user
type UUID/public key/short ID/SNI by hand. Instead: a dropdown of existing
clients.

**Superseded design note:** this originally meant a `clients.json` rendered
at **deploy time** by this repo's own Ansible role, direct from infra's
Infisical secrets, blocked on `infra`'s `xray.vless.clients` secret
structure (then a single flat secret). That blocker turned out to be moot —
`xray.vless.clients` was **already a YAML list** in infra, just hand-edited
per client. The dropdown is now served live by this repo's own backend
(`/api/clients`, backed by its own Postgres `clients` table — see "Admin
panel" below) instead of a deploy-time static file; `infra`'s Infisical
secrets are still the source of truth for the *shared* Reality parameters
(`vless-public-key`, `vless-sid`), templated into the backend's
`config.yaml` the same way `clients.json.j2` used to read them.

## Admin panel + client-credential site auth

Two asks drove introducing a real backend (`sources/`, FastAPI) into what
was a static site: (1) a browser-based admin page to add new VLESS clients,
(2) gating `vless-gen.zelgray.work` with existing client credentials
instead of a separate static password. Key decisions (see the plan this was
implemented from for the full ground-truth investigation):

- The backend lives in **this repo**, not `infra`, and deliberately **does
  not hold Infisical write credentials**. Adding a client
  (`POST /admin/clients`) generates a UUID, stores it in this repo's own
  Postgres `clients` table (status `pending`/`dispatched`), then calls
  GitHub's `workflow_dispatch` API against a workflow in `infra`
  (`add-vless-client.yml`) — that workflow is the only thing that writes to
  Infisical and runs the actual xray `ansible-playbook` deploy. This keeps
  the always-on container's blast radius small (a narrow "dispatch this one
  workflow" GitHub token) instead of embedding a live secret-writing
  credential in a permanently-running service.
- **Prerequisite in `infra`, now implemented there** (separate repo, own
  history): `xray.vless.clients` was restructured to read from one
  JSON-array Infisical secret (`clients: "{{ infisical_secrets.secrets
  ['vless-clients'] | from_json }}"`), and `.github/workflows/
  add-vless-client.yml` (`workflow_dispatch`, inputs `email`/`uuid`) logs
  into Infisical, appends to that secret via `playbooks/
  add_vless_client.yml`, then runs `playbooks/xray.yml`. Runs on a
  **GitHub-hosted runner** (`runs-on: ubuntu-latest`) — a self-hosted
  runner on the VDS was considered but rejected in favor of less manual
  maintenance; the workflow instead loads an SSH key from the
  `SSH_PRIVATE_KEY` repo secret (`webfactory/ssh-agent`) to reach the VDS,
  plus `INFISICAL_CLIENT_ID`/`INFISICAL_CLIENT_SECRET` repo secrets
  (existing shared Infisical identity, not a narrowly-scoped one — a
  per-secret-scoped Infisical identity turned out not to be possible).
  This repo's backend holds a GitHub PAT (`actions:write` scoped to
  `soksanichenko/infra` only, stored in Infisical at `/hosts/zelgray-work`)
  to call the dispatch API.
- xray's only reload path (`ansible/roles/xray/handlers/main.yml` in
  `infra`) is a **hard container restart** (`docker_container: restart:
  yes`), no SIGHUP/hot-reload. Adding a client always briefly drops
  existing connections; nothing here changes that.
- Site login is **Basic Auth via nginx `auth_request`** — no new login page.
  nginx forwards the browser's `Authorization` header to the backend's
  `/auth` instead of checking a static htpasswd file. Credential = the
  client's own `email:uuid` (reuses the existing secret, no new credential
  type invented).
- The admin page itself (`/admin/`, server-rendered FastAPI/Jinja2, not a
  React route — matches `hotline-listing`'s own precedent) is gated by a
  **separate, static** htpasswd, independent of the live client-cred auth —
  so a bug/outage in `/auth` can't lock the admin out of fixing it.
- Stack: FastAPI + PostgreSQL + Redis, following the `hotline-listing`
  reference pattern on this VDS exactly (same repo layout, same Ansible
  role shape sourced from `sources/`, same shared Postgres/Redis
  containers, image built in place via `community.docker.docker_image`, no
  compose).
- Bonus consolidation: the geosite/geoip rule-set category fetch (see
  "Rule-set category autocomplete" below) also moved server-side into this
  backend's Redis cache, since a backend now exists anyway — every visitor's
  browser no longer hits the GitHub API directly.
- "Deployed" status tracking is best-effort/manual in v1 — no confirmation
  loop from `infra`'s workflow run back into this app; the admin dashboard
  shows `pending`/`dispatched` (dispatch call succeeded) with a retry
  button, not a true "xray actually restarted with this client" signal.

## Access control

Client credentials (UUID, public key, short ID) are sensitive. Two
independent gates now, deliberately not chained together:
- Main site (`/`, `/api/`): nginx `auth_request` against the backend's
  `/auth` — log in with an existing client's `email:uuid`.
- Admin panel (`/admin/`): a separate, static htpasswd sourced from an
  Infisical secret under `/hosts/shared` (`vless-config-generator-admin-
  htpasswd`) — same historical pattern as `library.zelgray.work`
  (`inpx-web-ui`), kept independent so it survives an outage in the other.

## Deployment shape

- **Separate repository** (this one), not folded into `infra` — confirmed
  decision, mirroring the `hotline-listing` precedent (own `ansible/`, own
  `pre_tasks/infisical.yml`, own minimal `group_vars/all.yml`, connects to
  infra's shared nginx/Infisical project without infra code depending on it).
- **Deploys to zelgray.work VDS** — supersedes the original `IDEAS.md` idea of
  GitHub Pages/Cloudflare Pages hosting. The client-dropdown requirement is
  exactly why: it needs Ansible-rendered, Infisical-sourced data at deploy
  time, which a static host with no build step can't provide.
- **Superseded: "static site, no application backend"** — true at initial
  scaffold (deviated from the `new-service-repo` skill's default
  Docker-container-backed assumption, like `hotline-listing`). No longer
  true: a FastAPI backend (`sources/`) was added for the admin panel and
  client-credential site auth (see above) — this repo now follows the
  `hotline-listing` shape it originally diverged from. The frontend itself
  is still a static build rsynced straight into nginx's html volume; only
  `/api/`, `/admin/`, and the `auth_request` check go through the backend.
- **Nginx wiring** — not yet decided subpath vs. subdomain; to be resolved via
  the `new-nginx-service` skill (which owns that decision) once this repo has
  something to wire in. Given the Basic Auth requirement and that this is a
  distinct standalone tool, a subdomain (e.g. `vless-gen.zelgray.work`) is the
  more likely fit, similar to `library.zelgray.work` — not finalized.

## End-to-end UI flow (summary)

1. Pick a client from the dropdown (server params + credentials come along
   with the selection — no manual entry).
2. Paste an existing sing-box `config.json` as the base.
3. Build/edit routing rules in the rule list (conditions + direct/proxy
   action, drag to reorder).
4. Set the default outbound (direct/proxy toggle).
5. Get back the same config with `route` replaced — download or copy.
6. Everything from step 2 onward runs entirely in the browser; the client
   list (step 1) and rule-set category autocomplete now depend on this
   repo's own backend rather than a deploy-time static file (see "Admin
   panel + client-credential site auth").

## Open items / not yet decided

- The `infra`-side prerequisite has landed (see "Admin panel" above), but
  no live end-to-end test has been run yet — no real `workflow_dispatch`
  has been triggered, no real xray restart observed. Until that's
  verified, treat "add client" as implemented-but-unverified in production.

## Implementation status

- Scaffolded via `new-service-repo` (Ansible deploy skeleton, root tooling)
  and `new-nginx-service` (subdomain `vless-gen.zelgray.work`, Basic Auth via
  a self-managed htpasswd file, no upstream since there's no backend).
- Frontend: Vite + React + TypeScript in `frontend/`, no build-step-free
  vanilla JS after all — see `frontend/src/`. Client dropdown injects the
  selected client's `server`/`server_port`/`uuid`/`tls.reality.public_key`/
  `tls.reality.short_id`/`tls.server_name` into the pasted config's chosen
  VLESS outbound; everything else in the pasted config passes through
  untouched. Rule builder supports every condition type from this doc,
  including `rule_set`-based geosite/geoip (verified against the sing-box
  v1.13 docs via Context7 — `route.rule_set[]` entries with
  `type: "remote"`, referenced from rules via `rule_set: [tags]`) and
  drag-to-reorder (`@dnd-kit`). Default outbound is an explicit toggle
  writing `route.final`.
- Outbound-mapping UI lets the user pick which existing outbound tag is
  "direct" and which is "proxy" (auto-detected from `type: "direct"` /
  `type: "vless"`, overridable) — rules and the default-outbound toggle
  route to whichever tags are picked there.
- The paste box (`frontend/src/lib/defaultConfig.ts`) is pre-loaded with a
  default template (VLESS/Reality outbound placeholder, direct/block
  outbounds, tun inbound, DNS servers) so there's always something to edit
  and export, with a "Reset to default template" button. `buildOutputConfig`
  always prepends `{"action":"sniff"}` and `{"protocol":"dns","action":
  "hijack-dns"}` ahead of the user's rules and preserves any other
  route-level fields (e.g. `default_domain_resolver`) from the pasted
  config — these aren't exposed as rule-builder toggles since they're
  prerequisites for domain-based rules to work at all, not routing
  decisions. A third structural entry, `{"action":"resolve","strategy":
  "prefer_ipv4"}`, is added conditionally — only when a rule matches on an
  IP directly (an `ip_cidr` condition, or a `rule_set` condition referencing
  a geoip rule set) — since geoip `.srs` data is IP-based and needs the
  destination resolved first, which isn't guaranteed outside tun inbounds.
- Both the base-config paste box and the output panel syntax-highlight JSON
  (`frontend/src/lib/jsonHighlight.ts`, a small regex tokenizer — no syntax
  highlighting dependency). The paste box overlays a highlighted `<pre>`
  behind a transparent-text `<textarea>`, scroll-synced via a ref, so it
  stays editable; both boxes share the same fixed size (400px).
- `RuleSetDef` carries a `kind: 'geosite' | 'geoip'` field (set on both
  quick-add and the custom-URL form) so `buildOutputConfig` can tell which
  rule sets are IP-based for the `resolve`-action decision above. Category
  names for quick-add (and its autocomplete datalist) are fetched from the
  `SagerNet/sing-geosite`/`sing-geoip` GitHub repos' `rule-set` branch,
  now via this repo's own backend (`sources/src/vless_admin/
  github_categories.py`, Redis-cached) rather than directly from the
  browser; the frontend (`frontend/src/lib/fetchRuleSetCategories.ts`)
  still layers a `localStorage` cache in front of that call and falls back
  to a bundled full snapshot (`frontend/src/lib/ruleSetCategories.ts`) if
  the backend itself is unreachable.
- Backend (`sources/`, package `vless_admin`) scaffolded 1:1 on
  `hotline-listing`'s pattern: FastAPI + SQLAlchemy async/Postgres (`Client`
  table: `email`, `client_uuid`, `status`, `created_at` — the shared
  Reality params live in `AppConfig`, not per-row) + Redis cache + Alembic
  migrations. Routes: `GET /api/clients`, `GET /api/ruleset-categories`,
  `GET /auth` (nginx `auth_request` target), `GET /admin/` +
  `POST /admin/clients` + `POST /admin/clients/{id}/retry` (server-rendered
  Jinja2, `sources/templates/admin/dashboard.html`). Deployed via
  `community.docker.docker_container` on the shared `docker_network`,
  alongside the existing static-frontend sync, in the same Ansible role
  (`ansible/roles/vless-config-generator/`). Nginx now routes `/api/` and
  `/` through `auth_request` against `/auth`, and `/admin/` through its own
  separate `auth_basic`/htpasswd — see that role's `README.md` for the full
  variable/tag reference.
