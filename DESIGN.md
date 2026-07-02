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
  - `ip_cidr` / `geoip` — mentioned as a sing-box capability, not fleshed out
    in detail yet.
- **Default outbound** (what happens when no rule matches) is a **user-facing
  toggle** — direct or proxy, not a hardcoded default. This was an explicit
  design decision (not "safer default wins").

## Client credentials — dropdown, not manual entry

Deployed on the same VDS (zelgray.work) that already runs XRay (VLESS+Reality),
so the server-side client list is a known quantity — no reason to make the user
type UUID/public key/short ID/SNI by hand. Instead: a dropdown of existing
clients, populated from data rendered at **deploy time** by Ansible (Jinja2),
not entered live in the browser.

Source of truth (in `infra`, read-only from this repo's perspective):
- `infra/ansible/roles/xray/templates/config.json.j2` — the actual XRay server
  config template.
- `infra/ansible/inventories/zelgray.work/group_vars/all.yml` (`vless:` block,
  around line 81) — `port`, `clients: [{id, email}]`, `private_key`,
  `public_key`, `sid`. All values sourced from Infisical `/hosts/zelgray-work`
  (`vless-client-id`, `vless-private-key`, `vless-public-key`, `vless-sid`).

**Current limitation:** as of this design, `xray.vless.clients` in infra has
exactly **one** client (`zel.gray@gmail.com`, secret key `vless-client-id` —
singular, not a list of secrets). A real multi-client dropdown needs that
Infisical secret structure to change (e.g. a JSON blob of multiple id/email
pairs instead of one flat secret) — **this is a prerequisite change in the
`infra` repo, not yet done, out of scope for this repo to make unilaterally.**

Planned mechanism once that exists: this repo's own Ansible role renders a
`clients.json` (or embeds the data into the static HTML) from those same
Infisical secrets — reading `/hosts/zelgray-work` directly via its own
`pre_tasks/infisical.yml`, with no code dependency on the `infra` repo itself
(same pattern as `hotline-listing`).

## Access control

Client credentials (UUID, public key, short ID) are sensitive even behind
Basic Auth-only exposure is the intended bar — same pattern as
`library.zelgray.work` (`inpx-web-ui`): nginx Basic Auth, htpasswd sourced from
an Infisical secret under `/hosts/shared`.

## Deployment shape

- **Separate repository** (this one), not folded into `infra` — confirmed
  decision, mirroring the `hotline-listing` precedent (own `ansible/`, own
  `pre_tasks/infisical.yml`, own minimal `group_vars/all.yml`, connects to
  infra's shared nginx/Infisical project without infra code depending on it).
- **Deploys to zelgray.work VDS** — supersedes the original `IDEAS.md` idea of
  GitHub Pages/Cloudflare Pages hosting. The client-dropdown requirement is
  exactly why: it needs Ansible-rendered, Infisical-sourced data at deploy
  time, which a static host with no build step can't provide.
- **Static site, no application backend** — HTML/JS/CSS only, no Python app,
  no Docker container running app logic. This deviates from the
  `new-service-repo` skill's default assumption (Docker-container-backed
  service like `hotline-listing`) — when scaffolding this repo with that
  skill, expect it to ask how to adapt rather than force a Dockerfile/CMD that
  doesn't apply. The only "backend" activity is the Ansible deploy step that
  renders `clients.json` and rsyncs static files.
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
6. Everything from step 2 onward runs entirely in the browser; only the
   client list (step 1) depends on the deploy-time data file.

## Open items / not yet decided

- Multi-client support requires an `infra`-side Infisical secret restructure
  (currently a single flat secret, not a list) — blocked on that being done
  first. `clients.json` currently renders exactly one client.

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
