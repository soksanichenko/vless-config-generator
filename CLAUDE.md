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
│   └── roles/vless-config-generator/   # builds frontend, syncs dist/, renders clients.json
├── frontend/                        # Vite + React + TypeScript app, no backend
│   └── src/
│       ├── components/              # rule builder UI
│       ├── lib/                     # config parsing/output, client injection
│       └── types/                   # sing-box config, rule, and client types
├── install_dependencies.sh
├── pyproject.toml
├── requirements.txt                # Ansible tooling
├── requirements.yml                # Ansible Galaxy collections
└── .pre-commit-config.yaml
```

This is a **static site with no application backend** — no Python app, no
Docker container running app logic. The frontend is built once (`npm run
build`) on the Ansible controller; the only server-side activity is the
Ansible deploy step, which syncs `frontend/dist/` to the VDS and renders
`clients.json` from Infisical-sourced secrets (client dropdown data). See
`DESIGN.md` for the full design rationale.

## Deployment (Ansible)

```bash
./install_dependencies.sh
cd ansible
ansible-playbook -i inventories/zelgray.work playbooks/deploy.yml
```

Requires env: `INFISICAL_API_URL`, `INFISICAL_CLIENT_ID`, `INFISICAL_CLIENT_SECRET`.

## Frontend development

```bash
cd frontend
npm install
npm run dev
```

`clients.json` isn't present in local dev (it's rendered by the Ansible
deploy step) — the client dropdown shows a load-error banner and the rest of
the UI still works; drop a `public/clients.json` locally if you need to test
the dropdown against fixture data.
