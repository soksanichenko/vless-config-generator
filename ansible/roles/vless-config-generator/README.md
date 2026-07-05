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
   - serves `/api/clients` (client-dropdown data) and
     `/api/ruleset-categories` (geosite/geoip category autocomplete,
     Redis-cached) to the frontend
   - serves `/auth`, the nginx `auth_request` target that gates the main
     site using each client's own email/UUID as their login
   - serves `/admin/`, a small server-rendered page to add new clients —
     each addition dispatches a `workflow_dispatch` in the `infra` repo,
     which is the only thing that actually writes to Infisical and
     redeploys xray (see `DESIGN.md`)
4. Templates the API's `config.yaml` (DB/Redis URLs, shared Reality
   parameters, GitHub dispatch token) from Infisical secrets
5. Generates an **admin-only** htpasswd file at
   `{{ nginx_htpasswd_path }}/{{ vless_config_generator_admin_htpasswd_file }}`
   from the Infisical secret `vless-config-generator-admin-htpasswd`
   (`/hosts/shared`, format `username:password`) — deliberately separate
   from the main site's auth, so a bug/outage in the API's `/auth` endpoint
   can't lock the admin out of `/admin/`
6. Deploys the nginx location config to
   `{{ nginx_domain_custom_locations_path }}/vless-config-generator.conf`
   and the upstream config to
   `{{ nginx_custom_upstream_path }}/vless-config-generator-api.conf` —
   `/` uses `auth_request` against the API, `/api/` proxies to the API
   (behind the same `auth_request`), `/admin/` proxies to the API behind
   its own static `auth_basic`
7. Purges the Cloudflare cache (when `cf_purge_cache: true`)

The static frontend is served directly by nginx (`alias`, no proxy), the
same as before; only `/api/`, `/admin/`, and the `auth_request` check now go
through the new `vless-config-generator-api` container. There's still no
compose file — the API container is deployed directly via
`community.docker.docker_container`, on the same shared Docker network and
shared Postgres/Redis containers `hotline-listing` uses.

## Variables

| Variable | Default | Description |
|---|---|---|
| `vless_config_generator_local_source_dir` | `{{ playbook_dir }}/../..` | Project root on the Ansible controller |
| `vless_config_generator_domain` | `vless-gen.zelgray.work` | Subdomain this site is served on |
| `vless_config_generator_admin_htpasswd_realm` | `vless-config-generator-admin` | Basic Auth realm string for `/admin/` |
| `vless_config_generator_admin_htpasswd_file` | `vless-config-generator-admin-access.htpasswd` | Admin htpasswd filename |
| `vless_config_generator_api_container_name` | `vless-config-generator-api` | API container name |
| `vless_config_generator_api_image` | `vless-config-generator-api:local` | API image tag |
| `vless_config_generator_api_http_port` | `8999` | Port the API listens on inside its container |
| `vless_config_generator_api_data_dir` | `{{ docker_volumes_directory }}/vless-config-generator-api` | Rsync target + build context on the target host |
| `vless_config_generator_api_upstream_name` | `vless_config_generator_api_upstream` | Nginx upstream name |
| `vless_config_generator_api_database_url` | built from shared `postgresql_container_name`/`postgres_password` | Postgres URL for the `clients` table |
| `vless_config_generator_api_redis_url` | built from shared `redis_container_name` | Redis URL for the rule-set category cache |
| `vless_config_generator_api_cache_ttl` | `86400` | Rule-set category cache TTL (seconds) |
| `vless_config_generator_vless_server` | `zelgray.work` | Server/SNI written into every client's API response |
| `vless_config_generator_vless_server_port` | `443` | Port written into every client's API response |
| `vless_config_generator_github_repo` | `soksanichenko/infra` | Repo the API dispatches `workflow_dispatch` against |
| `vless_config_generator_github_workflow_file` | `add-vless-client.yml` | Workflow file name in that repo |
| `nginx_docker_container_name` | `nginx-server` | Nginx container name (for the reload handler) |
| `nginx_confd_container_path` | `/etc/nginx/conf.d` | conf.d path inside the nginx container |
| `nginx_volumes_path` | `{{ docker_volumes_directory }}/nginx` | Nginx's volume root on the host |
| `nginx_confd_path` | `{{ nginx_volumes_path }}/conf.d` | conf.d path on the host |
| `nginx_html_path` | `{{ nginx_volumes_path }}/html` | Nginx's html volume root on the host |
| `nginx_domain_custom_locations_path` | `{{ nginx_confd_path }}/{{ vless_config_generator_domain }}-custom-locations` | Per-domain location snippets dir (created by infra's nginx role once `host_domains` includes this subdomain) |
| `nginx_custom_upstream_path` | `{{ nginx_confd_path }}/custom-upstream` | Shared custom-upstream dir (infra's nginx role) |
| `nginx_htpasswd_path` | `{{ nginx_confd_path }}/htpasswd` | htpasswd files dir |

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
- Adding a client via `/admin/` does **not** apply anything to the real
  xray server by itself — it only dispatches a GitHub Actions workflow in
  the separate `infra` repo, which holds the Infisical write credential and
  runs the actual `ansible-playbook` deploy for xray. That workflow is a
  prerequisite documented in `DESIGN.md`, not part of this role.
- The `clients.json` static file and its Jinja2 template are gone — the
  frontend now fetches `/api/clients` from the live API instead.
