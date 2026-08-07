# vless-config-generator

Browser-based sing-box routing-rule editor for VLESS clients on zelgray.work

## What it does

1. Builds the Vite/React frontend locally on the Ansible controller
   (`npm run build` in `frontend/`)
2. Creates `{{ nginx_html_path }}/static/vless-config-generator/` (inside
   nginx's own volume, so nginx can serve it directly) and syncs
   `frontend/dist/` into it
3. Builds the `vless-config-generator-api` Docker image in place from
   `sources/` (rsynced to the controller-local data dir) and deploys it as a
   container on the shared Docker network — a FastAPI backend that:
   - serves `/api/clients` (every credential belonging to the logged-in
     account — one email can hold several, never another account's data)
     and `/api/ruleset-categories` (geosite/geoip category autocomplete,
     Redis-cached) to the frontend
   - serves `/login` + `/logout` (site login form, email + VLESS UUID) and
     `/auth`, the nginx `auth_request` target that gates `/api/` (client
     autofill, live rule-set category list) against the resulting session
     cookie
   - serves `/admin/login` + `/admin/logout` and `/admin/auth` (its own,
     independent nginx `auth_request` target), plus `/admin/`, a small
     server-rendered page to add, edit, or delete clients — each action
     dispatches a `workflow_dispatch` (add-, update-, or remove-client
     workflow) in the `infra` repo, which is the only thing that actually
     writes to Infisical and redeploys xray (see `DESIGN.md`)
4. Templates the API's `config.yaml` (DB/Redis URLs, shared Reality
   parameters, GitHub dispatch token, session-signing secret, admin
   username/password) from Infisical secrets
5. Deploys the nginx location config to
   `{{ nginx_domain_custom_locations_path }}/vless-config-generator.conf`
   and the upstream config to
   `{{ nginx_custom_upstream_path }}/vless-config-generator-api.conf` —
   `/api/` and `/admin/` each go through `auth_request` against their own
   backend endpoint (`/auth` or `/admin/auth`), redirecting to `/login` or
   `/admin/login` on a 401; `/` (the static SPA) goes through the Discord
   SSO gate (`meow-elite-club-portal`), see below
6. Purges the Cloudflare cache (when `cf_purge_cache: true`)

The static frontend is served directly by nginx (`alias`, no proxy), the
same as before; only `/api/`, `/admin/`, `/login`, `/logout`, and the
`auth_request` checks go through the new `vless-config-generator-api`
container. There's still no compose file — the API container is deployed
directly via `community.docker.docker_container`, on the same shared
Docker network and shared Postgres/Redis containers `hotline-listing` uses.

**Discord SSO gate on top of the site's own login**: `location /` also
carries `auth_request /internal/zw-auth` against `meow-elite-club-portal`
(see `docs/portal-architecture.md` in `infra`) — `X-Service-Slug: vless-gen`
must match a `GatedService` row created via the portal's `/admin/services`.
Only `/` is gated this way; nginx allows exactly one `auth_request` per
location, so it can't be stacked onto `/api/`/`/admin/` without replacing
their own existing `auth_request`. In the normal browser flow this is
equivalent to gating the whole site (the SPA always loads from `/` first,
then calls `/api/`/`/admin/`) — the one gap is a client that already holds
a stolen/replayed vless-gen session cookie hitting `/api/`/`/admin/`
directly, bypassing Discord entirely. Verified against a real `nginx:1.26`
image that the two auth mechanisms don't interfere with each other.

**A Discord admin-level grant also unlocks `/admin/` itself**, as an
alternative to vless-gen's own admin login, not a replacement for it.
`/admin/`'s existing `auth_request /internal/admin-auth` is untouched and
still checked first; only its `error_page 401` target changed, from
`@admin_login` directly to a new named location, `@admin_login_or_discord`,
which tries a second check — `/internal/zw-admin-auth` (the portal's
`/auth`, with `X-Service-Slug: vless-gen` **and** `X-Require-Level: admin`,
so a Discord member-level grant for this service doesn't qualify) — before
falling through to `@admin_login` (vless-gen's own login page, not
Discord) on a 401 or 403. This is pure OR logic: either credential alone is
enough, and nothing changes for someone with only the shared admin
credential and no Discord grant. Two nginx quirks this relies on, both
confirmed against a real `nginx:1.26` image:
- `proxy_pass` inside a **named** location (`@admin_login_or_discord`)
  cannot carry a URI part — unlike `/admin/`'s own `proxy_pass .../admin/`,
  it forwards the original request URI (already `/admin/...`) unchanged,
  which has the same effect.
- nginx's `recursive_error_pages` is `off` by default, which silently
  swallows a location's own `error_page` when that location was itself
  entered via *another* location's `error_page` — exactly the case here
  (`/admin/`'s error_page leads into `@admin_login_or_discord`, which has
  its own error_page). Without it, a failed Discord check returned a raw
  401/403 instead of falling through to `@admin_login`. Fixed by turning it
  on globally in infra's shared `nginx` role (`nginx.conf.j2`, `http{}`
  scope) rather than per-domain, since it's needed at the location where
  the chain terminates, not where it starts.

**A Discord login can also silently sign into the site's own login**,
skipping the email+`client_uuid` form on repeat visits — full federation,
not just a gate, like Grafana's `auth.proxy`. Unlike Grafana, there's no
account-matching-by-email here: a `Client.email` is just a label chosen
when the credential was created, not necessarily the Discord account's
own (possibly unset/unverified) email, so nothing tries to compare them.
Instead, `/login` is now gated the same as `/` (`auth_request
/internal/zw-auth`, `X-Discord-User-Id` captured via `auth_request_set`
and forwarded to the backend) — reaching it at all in the normal flow
already implies passing that gate first, since the SPA it's linked from
is itself behind it. The backend does the rest, in `models_db.DiscordLink`
(`discord_user_id` → `Client.email`, one row per Discord user):
`POST /login`'s existing email+uuid check, which already proves account
ownership, now also links the caller's Discord identity to that account
if one was forwarded; `GET /login` checks for an existing link first and,
if found (and its account still has a login-allowed-status client),
signs the visitor straight in and skips the form entirely. Logging in
under a different account later just overwrites the link. Verified
against a real Postgres: first login creates the link; a subsequent
visit with no `site_session` cookie auto-signs in via the link; relogging
in under a different account overwrites it; a wrong email/uuid neither
logs in nor creates a link; a request with no Discord header at all falls
through to the normal form.

**An operator can also link a Discord id manually**, from the admin
dashboard's "Discord ID" column on each client row (`POST
/admin/clients/{id}/link-discord`) — the same `DiscordLink` upsert
`POST /login` does implicitly, just triggered by the operator instead of
the account holder's own login. For an operator who already knows which
Discord user a given credential was handed to, this skips waiting on
that person to log in once themselves first. Deliberately **not**
matched automatically by comparing a Discord-verified email against
`Client.email`, even though the portal can supply one (`X-Discord-Email`,
see `meow-elite-club-portal`'s `/auth`) — unlike `Client.email`, which is
just a label, `client_uuid` is the actual bearer-token-like proof of
account ownership here, and auto-matching by email alone would grant
access to anyone whose Discord email happens to match that label,
without ever having been handed the real secret.

**Self-registers with the portal on every deploy** (`POST
/api/services/register`, Bearer-token auth via
`meow_elite_club_portal_service_registration_token` — see
`meow-elite-club-portal`'s own role README) — creates or updates its
`GatedService` row from `vless_config_generator_service_slug`/
`vless_config_generator_domain` instead of that slug also being
hand-typed into `/admin/services`.

## Variables

| Variable | Default | Description |
|---|---|---|
| `vless_config_generator_local_source_dir` | `{{ playbook_dir }}/../..` | Project root on the Ansible controller |
| `vless_config_generator_domain` | `vless-gen.zelgray.work` | Subdomain this site is served on |
| `vless_config_generator_api_container_name` | `vless-config-generator-api` | API container name |
| `vless_config_generator_api_image` | `vless-config-generator-api:local` | API image tag |
| `vless_config_generator_api_http_port` | `8999` | Port the API listens on inside its container |
| `vless_config_generator_api_data_dir` | `{{ docker_volumes_directory }}/vless-config-generator-api` | Rsync target + build context on the target host |
| `vless_config_generator_api_upstream_name` | `vless_config_generator_api_upstream` | Nginx upstream name |
| `vless_config_generator_api_database_url` | built from shared `postgresql_container_name`/`postgres_password` | Postgres URL for the `clients` table |
| `vless_config_generator_api_redis_url` | built from shared `redis_container_name` | Redis URL for the rule-set category cache |
| `vless_config_generator_api_cache_ttl` | `86400` | Rule-set category cache TTL (seconds) |
| `vless_config_generator_vless_server` | `vless.zelgray.work` | Connect address written into every client's API response (zelgray.work is proxied through Cloudflare, so this CNAME is used instead) |
| `vless_config_generator_vless_server_name` | `zelgray.work` | Reality SNI camouflage target written into every client's API response |
| `vless_config_generator_vless_server_port` | `443` | Port written into every client's API response |
| `vless_config_generator_github_repo` | `soksanichenko/infra` | Repo the API dispatches `workflow_dispatch` against |
| `vless_config_generator_github_workflow_file` | `add-vless-client.yml` | Workflow file name for adding a client |
| `vless_config_generator_github_remove_workflow_file` | `remove-vless-client.yml` | Workflow file name for removing a client |
| `vless_config_generator_github_update_workflow_file` | `update-vless-client.yml` | Workflow file name for editing a client's email/flow |
| `nginx_docker_container_name` | `nginx-server` | Nginx container name (for the reload handler) |
| `nginx_volumes_path` | `{{ docker_volumes_directory }}/nginx` | Nginx's volume root on the host |
| `nginx_confd_path` | `{{ nginx_volumes_path }}/conf.d` | conf.d path on the host |
| `nginx_html_path` | `{{ nginx_volumes_path }}/html` | Nginx's html volume root on the host |
| `nginx_domain_custom_locations_path` | `{{ nginx_confd_path }}/{{ vless_config_generator_domain }}-custom-locations` | Per-domain location snippets dir (created by infra's nginx role once `host_domains` includes this subdomain) |
| `nginx_custom_upstream_path` | `{{ nginx_confd_path }}/custom-upstream` | Shared custom-upstream dir (infra's nginx role) |
| `meow_elite_club_portal_upstream_name` | `meow_elite_club_portal_upstream` | Nginx upstream name for the Discord SSO gate's `/auth` and `/bridge/consume` endpoints |
| `vless_config_generator_service_slug` | `vless-gen` | `X-Service-Slug` sent to `/auth`; also the `slug` this role self-registers as its `GatedService` row |
| `meow_elite_club_portal_service_registration_token` | *(from Infisical `/hosts/shared` `meow-elite-club-portal-service-registration-token`)* | Bearer token for `POST /api/services/register` |

## Tags

| Tag | Effect |
|---|---|
| `vless-config-generator` | Run all tasks |
| `vless-config-generator-api` | API container build/deploy only |
| `vless-config-generator-nginx` | Nginx config only |
| `cf-purge` | Cloudflare cache purge only |

## Usage

```bash
cd ansible
ansible-playbook -i inventories/zelgray.work playbooks/deploy.yml
```

## Notes

- The frontend is still built once on the controller and synced straight
  into nginx's html volume, unchanged from before. Only the API is a real,
  always-running service now.
- Adding, editing, or deleting a client via `/admin/` does **not** apply
  anything to the real xray server by itself — it only dispatches a GitHub
  Actions workflow (add-, update-, or remove-client) in the separate
  `infra` repo, which holds the Infisical write credential and runs the
  actual `ansible-playbook` deploy for xray. All three workflows are a
  prerequisite documented in `DESIGN.md`, not part of this role.
- The `clients.json` static file and its Jinja2 template are gone — the
  frontend now fetches `/api/clients` from the live API instead.
- `/admin/` is no longer gated by an nginx-generated htpasswd file — the
  admin credential (Infisical secrets `vless-config-generator-admin-username`
  and `vless-config-generator-admin-password`) is templated straight into
  the API's `config.yaml` and verified by the backend itself, which issues
  a session cookie via `/admin/login`.
- Requires a new Infisical secret, `vless-config-generator-session-secret`
  (a random string, e.g. `openssl rand -hex 32`), for signing session
  cookies — not part of this role's own defaults since it's a secret value.
