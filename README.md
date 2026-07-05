# vless-config-generator

Browser-based sing-box routing-rule editor for VLESS clients on zelgray.work

## Features

Not a from-scratch config builder — paste an existing sing-box `config.json`
and only its `route` section (plus the picked VLESS outbound's credentials)
gets changed. All config editing/output generation still runs entirely in
the browser; a small FastAPI backend (`sources/`) now provides client data,
rule-set categories, site login, and the admin panel described below.

- **Default config template** — loaded up front so there's always something
  to edit and export, even before pasting your own config
- **Client picker** — pulls VLESS credentials (UUID, Reality public key,
  short ID, SNI) from the backend's `/api/clients`, no manual entry
- **Admin panel** (`/admin/`) — add new VLESS clients from a browser
  instead of hand-editing `infra`'s config. Adding a client dispatches a
  GitHub Actions workflow in `infra` that writes the new client's UUID to
  Infisical and redeploys xray; this app never holds Infisical write
  credentials itself. Gated by its own separate Basic Auth credential,
  independent of the site login below
- **Site login via client credentials** — `vless-gen.zelgray.work` is
  gated by nginx `auth_request` against the backend instead of a static
  htpasswd: log in with an existing client's email + VLESS UUID
- **Outbound mapping** — auto-detects which outbound in your pasted config is
  "direct" and which is the VLESS "proxy", overridable
- **Routing rule builder** — drag-reorderable rule list (first match wins),
  each rule combining any of: domain (exact/suffix/keyword/regex), rule sets
  (geosite/geoip `.srs`, both quick-add by category and custom URLs),
  IP CIDR, private IP (LAN), port/port range, network (tcp/udp), protocol,
  process name/path (Windows/Linux only, needs root/`CAP_NET_ADMIN` on Linux)
- **Rule-set category autocomplete** — geosite/geoip category names come
  from the backend's `/api/ruleset-categories` (which fetches the
  `SagerNet/sing-geosite`/`sing-geoip` GitHub repos and caches the result in
  Redis); the frontend additionally caches the response in `localStorage`
  for 24h and falls back to a bundled snapshot list if the backend itself
  is unreachable (e.g. offline local dev)
- **Default outbound toggle** — explicit direct/proxy choice for unmatched
  traffic, no implicit default
- **Syntax-highlighted JSON** — both the base-config editor and the output
  panel highlight JSON tokens as you type/view
- **Output** — copy to clipboard or download the resulting `config.json`; a
  `sniff` rule and a DNS-hijack rule are always included ahead of your rules,
  since domain-based matching needs them to see anything at all. A `resolve`
  action (`prefer_ipv4`) is added automatically when any rule matches on an
  IP (an `ip_cidr` condition or a geoip rule set), since those need the
  destination resolved first

## Deployment

```bash
./install_dependencies.sh

cd ansible
ansible-playbook -i inventories/zelgray.work playbooks/deploy.yml
```

Requires env: `INFISICAL_API_URL`, `INFISICAL_CLIENT_ID`, `INFISICAL_CLIENT_SECRET`.

The admin panel's "add client" action dispatches a `workflow_dispatch`
GitHub Actions workflow in the separate `infra` repo, which holds the
Infisical write credential and actually applies the new client to xray —
see `DESIGN.md`. If that workflow is ever missing/misconfigured, the
dispatch call just fails loudly; everything else (config editing, the
existing client dropdown, login) works regardless.

## Frontend development

```bash
cd frontend
npm install
npm run dev
```

Without the backend running locally, `/api/clients` and
`/api/ruleset-categories` 404 — the client dropdown shows a load-error
banner and the rule-set category input falls back to its bundled snapshot
list; the rest of the UI still works.

## Backend development

```bash
./install_dependencies.sh  # installs sources/src/requirements.txt too
cp sources/config.yaml.example sources/config.yaml  # point at a local Postgres/Redis
cd sources
PYTHONPATH=src CONFIG_PATH=config.yaml alembic -c alembic.ini upgrade head
PYTHONPATH=src CONFIG_PATH=config.yaml uvicorn vless_admin.app:app --reload --port 8999
```

## License

[MIT](https://opensource.org/licenses/MIT)
