# vless-config-generator

Browser-based sing-box routing-rule editor for VLESS clients on zelgray.work

## What it does

1. Builds the Vite/React frontend locally on the Ansible controller
   (`npm run build` in `frontend/`)
2. Creates `{{ nginx_html_path }}/static/vless-config-generator/` (inside
   nginx's own volume, so nginx can serve it directly)
3. Syncs `frontend/dist/` from the Ansible controller into that directory
4. Renders `clients.json` into that same directory from Infisical secrets
   (single client for now — see Notes)
5. Generates an htpasswd file at
   `{{ nginx_htpasswd_path }}/{{ vless_config_generator_htpasswd_file }}`
   from the Infisical secret `vless-config-generator-htpasswd`
   (`/hosts/shared`, format `username:password`)
6. Deploys the nginx location config to
   `{{ nginx_domain_custom_locations_path }}/vless-config-generator.conf` —
   serves the site via `alias` with Basic Auth, no upstream/proxy_pass since
   there is no backend
7. Purges the Cloudflare cache (when `cf_purge_cache: true`)

There is no application backend and no Docker container for this project —
it's a static site served directly by nginx, mirroring the
`transmission-web-gui` static-serving pattern rather than the usual
upstream/container flow.

## Variables

| Variable | Default | Description |
|---|---|---|
| `vless_config_generator_local_source_dir` | `{{ playbook_dir }}/../..` | Project root on the Ansible controller |
| `vless_config_generator_domain` | `vless-gen.zelgray.work` | Subdomain this site is served on |
| `vless_config_generator_htpasswd_realm` | `vless-config-generator` | Basic Auth realm string |
| `vless_config_generator_htpasswd_file` | `vless-config-generator-access.htpasswd` | htpasswd filename |
| `vless_config_generator_client_email` | `zel.gray@gmail.com` | Email shown in the client dropdown |
| `vless_config_generator_client_server` | `zelgray.work` | Server/SNI written into `clients.json` |
| `vless_config_generator_client_port` | `443` | Port written into `clients.json` |
| `nginx_docker_container_name` | `nginx-server` | Nginx container name (for the reload handler) |
| `nginx_confd_container_path` | `/etc/nginx/conf.d` | conf.d path inside the nginx container |
| `nginx_volumes_path` | `{{ docker_volumes_directory }}/nginx` | Nginx's volume root on the host |
| `nginx_confd_path` | `{{ nginx_volumes_path }}/conf.d` | conf.d path on the host |
| `nginx_html_path` | `{{ nginx_volumes_path }}/html` | Nginx's html volume root on the host |
| `nginx_domain_custom_locations_path` | `{{ nginx_confd_path }}/{{ vless_config_generator_domain }}-custom-locations` | Per-domain location snippets dir (created by infra's nginx role once `host_domains` includes this subdomain) |
| `nginx_htpasswd_path` | `{{ nginx_confd_path }}/htpasswd` | htpasswd files dir |

## Tags

| Tag | Effect |
|---|---|
| `vless-config-generator` | Run all tasks |
| `vless-config-generator-nginx` | Nginx config only |
| `cf-purge` | Cloudflare cache purge only |

## Usage

```bash
cd ansible
ansible-playbook -i inventories/zelgray.work playbooks/deploy.yml
```

## Notes

- No Docker image or container is built/run by this role — the frontend is
  built once on the controller and the static output is synced straight into
  nginx's html volume.
- Requires `vless-gen.zelgray.work` to be present in infra's `host_domains`
  (with `external: true`), plus a DNS record and a certbot run, before this
  role's nginx config takes effect.
- `clients.json` currently only ever contains one client, mirroring infra's
  `xray.vless.clients` (a single flat secret, not a list). A real multi-client
  dropdown needs that Infisical secret structure to change first — this
  template just renders whatever's there today.
