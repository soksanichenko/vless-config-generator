# CLAUDE.md

## Project summary

Browser-based sing-box routing-rule editor for VLESS clients on zelgray.work

## Project structure

```
vless-config-generator/
├── ansible/                        # Deploy to zelgray.work VDS
│   ├── ansible.cfg
│   ├── inventories/zelgray.work/
│   │   ├── hosts.yml
│   │   └── group_vars/all.yml
│   ├── playbooks/
│   │   ├── pre_tasks/infisical.yml
│   │   └── deploy.yml
│   └── roles/vless-config-generator/   # builds frontend, builds+deploys the API container, nginx wiring
├── frontend/                        # Vite + React + TypeScript app
│   └── src/
│       ├── components/              # rule builder UI
│       ├── lib/                     # config parsing/output, client injection, backend API calls
│       └── types/                   # sing-box config, rule, and client types
├── sources/                         # FastAPI backend (vless_admin) — client data, rule-set
│   │                                # category cache, site auth, admin panel
│   ├── Dockerfile
│   ├── entrypoint.sh
│   ├── alembic.ini
│   ├── config.yaml.example          # local-dev config; real config.yaml is gitignored
│   ├── src/
│   │   ├── requirements.txt
│   │   └── vless_admin/
│   │       ├── app.py               # FastAPI routes + lifespan
│   │       ├── config.py            # Pydantic BaseModel + from_yaml
│   │       ├── db.py / models_db.py # SQLAlchemy async + `clients` table
│   │       ├── cache.py             # Redis wrapper
│   │       ├── auth.py              # nginx auth_request target (email:uuid Basic Auth)
│   │       ├── github_categories.py # geosite/geoip category fetch, Redis-cached
│   │       ├── github_dispatch.py   # triggers infra's add-vless-client.yml workflow
│   │       └── alembic/             # migrations
│   └── templates/admin/             # server-rendered admin dashboard
├── install_dependencies.sh
├── pyproject.toml
├── requirements.txt                 # `-r sources/src/requirements.txt` + Ansible tooling
├── requirements.yml                 # Ansible Galaxy collections
└── .pre-commit-config.yaml
```

This project has a real backend now (`sources/`, FastAPI) — the "static
site, no backend" design from the initial scaffold no longer holds. Config
*editing/output generation* still runs entirely client-side in the browser
(pasting a config, building rules, generating the final JSON); the backend
only provides client-dropdown data, rule-set category caching, site login,
and the admin panel. See `DESIGN.md` for the full rationale, including the
cross-repo split with `infra` (this backend never writes to Infisical or
touches the xray server directly — it dispatches a GitHub Actions workflow
in `infra` that does).

## Deployment (Ansible)

```bash
./install_dependencies.sh
cd ansible
ansible-playbook -i inventories/zelgray.work playbooks/deploy.yml
```

Requires env: `INFISICAL_API_URL`, `INFISICAL_CLIENT_ID`, `INFISICAL_CLIENT_SECRET`.

Deploys both the static frontend and the `vless-config-generator-api`
backend container (Postgres + Redis, shared with other services on the
VDS). The admin panel's "add client" action additionally dispatches a
`workflow_dispatch` workflow in the separate `infra` repo — see `DESIGN.md`
for what that does; if it's ever missing/misconfigured the dispatch call
just fails loudly, everything else keeps working.

## Frontend development

```bash
cd frontend
npm install
npm run dev
```

Without the backend running locally, `/api/clients` and
`/api/ruleset-categories` 404 — the client dropdown shows a load-error
banner and the rule-set category input falls back to a bundled snapshot
list; the rest of the UI still works.

## Backend development

```bash
./install_dependencies.sh
cp sources/config.yaml.example sources/config.yaml  # point at a local Postgres/Redis
cd sources
PYTHONPATH=src CONFIG_PATH=config.yaml alembic -c alembic.ini upgrade head
PYTHONPATH=src CONFIG_PATH=config.yaml uvicorn vless_admin.app:app --reload --port 8999
```
