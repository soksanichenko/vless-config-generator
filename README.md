# vless-config-generator

Browser-based sing-box routing-rule editor for VLESS clients on zelgray.work

## Features

Not a from-scratch config builder — paste an existing sing-box `config.json`
and only its `route`/`dns` sections (plus the picked VLESS outbound's
credentials) get changed. All config editing/output generation still runs
entirely in the browser; a small FastAPI backend (`sources/`) now provides
client data, rule-set categories, site login, and the admin panel described
below.

- **Default config template** — loaded up front so there's always something
  to edit and export, even before pasting your own config
- **Client credentials** — pulls VLESS credentials (UUID, Reality public
  key, short ID, SNI) from the backend's `/api/client` for whichever client
  you logged in as — no picker, no other client's credentials ever exposed
- **Admin panel** (`/admin/`) — add, edit, or delete VLESS clients from a
  browser instead of hand-editing `infra`'s config. Adding/editing a client
  picks its xray `flow` from a dropdown (`xtls-rprx-vision` / empty — pick
  empty for a client using this app's own multiplex option, see above,
  since Vision and mux can't be combined); email/flow are editable in
  place for any client that isn't
  mid-removal. Each action dispatches a GitHub Actions workflow in `infra`
  (add-, update-, or remove-client) that updates Infisical and redeploys
  xray; this app never holds Infisical write credentials itself. Deleting a
  client blocks its site login immediately, before the removal workflow
  even finishes running — editing never does, since it isn't a security
  revocation. The dashboard auto-refreshes every 5s while an
  add/edit/remove is in flight. Gated by its own login (`/admin/login`),
  independent of the site login below — a bug in one can't lock you out of
  the other
- **Site login via client credentials** — `vless-gen.zelgray.work` is
  gated by nginx `auth_request` against the backend: log in at `/login`
  with an existing client's email + VLESS UUID, gets you a signed session
  cookie (`/logout` to end it)
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
- **Multiplexing (mux)** — optional, checkbox-gated card that bundles the
  proxy connection over fewer physical TLS sessions (sing-box `multiplex`
  block: protocol `h2mux`/`smux`/`yamux`, max connections, min streams,
  padding). Useful when an ISP caps concurrent TLS connections to one host.
  Enabling it removes the proxy outbound's `flow` (`xtls-rprx-vision`),
  since Vision and mux can't be combined
- **Region** — dropdown (`Default` / `Ukraine` / `Russia`) that fully
  regenerates the output's `dns` section: `Default` is plain Cloudflare DoH;
  `Ukraine` resolves locally by default and re-routes only domains whose
  resolved IP falls in Russia's geoip range through the VLESS tunnel (also
  routes well-known CDN ranges — Cloudflare/Google/Fastly/CloudFront —
  direct, ahead of your own rules, so unblocked CDN traffic doesn't take an
  unnecessary detour through the tunnel); `Russia` resolves locally by
  default and re-routes only domains/IPs on Roskomnadzor's blocklist through
  the tunnel (via Quad9, not Cloudflare). Russia doesn't auto-add the
  matching `route` rules for its blocklist — add those by hand in the rule
  builder above to keep DNS and routing in sync
- **Syntax-highlighted JSON** — both the base-config editor and the output
  panel highlight JSON tokens as you type/view
- **Output** — copy to clipboard or download the resulting `config.json`; a
  `sniff` rule and a DNS-hijack rule are always included ahead of your rules,
  since domain-based matching needs them to see anything at all. A `resolve`
  action (`prefer_ipv4`) is added automatically when any rule matches on an
  IP (an `ip_cidr` condition or a geoip rule set), since those need the
  destination resolved first. A "Show comments" toggle switches the display
  to an annotated, explanatory version of the same JSON (localized) — Copy
  and Download always stay on the plain, comment-free version, since
  comments aren't valid JSON and some sing-box clients won't parse them
- **Localization** — EN/UA/RU switcher (top-right, persisted in
  `localStorage`); every heading, help text, label, button, and warning is
  translated. Unlike zelgray.work's static error pages (`infra`'s
  `web-content` role), which show all three languages stacked at once since
  they're read once and never interacted with, this is a single-language
  switcher — showing three languages per field would be unusable in a form
  this dense

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
dispatch call just fails loudly; everything else (config editing, existing
client login) works regardless.

## Frontend development

```bash
cd frontend
npm install
npm run dev
```

Without the backend running locally, `/api/client` and
`/api/ruleset-categories` 404 — the client info card shows a load-error
banner and the rule-set category input falls back to its bundled snapshot
list; the rest of the UI still works.

## Backend development

```bash
./install_dependencies.sh  # installs sources/src/requirements.txt too
cp sources/config.yaml.example sources/config.yaml  # point at a local Postgres/Redis
cd sources
PYTHONPATH=src CONFIG_PATH=config.yaml python scripts/create_db.py
PYTHONPATH=src CONFIG_PATH=config.yaml alembic -c alembic.ini upgrade head
PYTHONPATH=src CONFIG_PATH=config.yaml uvicorn vless_admin.app:app --reload --port 8999
```

## License

[MIT](https://opensource.org/licenses/MIT)
