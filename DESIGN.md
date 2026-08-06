# vless-config-generator — design notes

Origin: `vpn-config-generator` idea in `infra/IDEAS.md` (generic VPN client config
generator for OpenVPN/VLESS/AmneziaWG). Scope narrowed to **VLESS/sing-box only**
— OpenVPN and AmneziaWG are deferred, not part of this repo.

## Purpose

A tool for generating/editing sing-box client configs, focused specifically on
**routing rules**: which apps/ports/protocols/domains go direct vs. through the
VLESS proxy. Not a from-scratch config builder — the user pastes their existing
sing-box `config.json`, the tool lets them edit the `route` section (and, via
the Region dropdown — see "Region selection" below — the `dns` section, plus
for Ukraine some structural `route` rules), and outputs the same config with
those replaced/updated. Everything
else (outbounds, inbounds) passes through untouched.

## Routing rule builder

- A list of rules, drag-reorderable (sing-box matches top to bottom, first hit
  wins — order is significant, must be exposed in the UI).
- Each rule = one or more conditions + an action (`direct`, `proxy`, or
  `reject` — sing-box's built-in reject action, no outbound of its own),
  and can be negated as a whole (`invert`). A rule is either `simple` (flat
  conditions, sing-box's default rule) or `logical` (one level of AND/OR
  branches, each its own independent flat condition set with its own
  optional invert) — matches sing-box's `type: logical` rules, but not
  arbitrarily nested (a branch's own sub-`rules` aren't modeled). Audited
  against the sing-box v1.13 route-rule docs (via Context7); fields
  intentionally left unimplemented (`inbound`, `client`, `source_ip_cidr`/
  `source_port`, `network_type`/`wifi_ssid`/`interface_address`/
  `preferred_by`, `clash_mode`, etc.) target GUI clients with rich
  device/runtime context, not this generator's headless sing-box use case.
- Condition types:
  - `process_name` / `process_path` / `process_path_regex` — app-based
    routing. Only works when sing-box runs as a full local client with
    permission to read the OS process list. Target platforms: **Windows and
    Linux**. On Linux this needs root/`CAP_NET_ADMIN` — the UI must surface
    that caveat, it's not universally available (e.g. won't work on a router
    or restricted environment).
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

## Client credentials — derived from login, not picked from a list

Deployed on the same VDS (zelgray.work) that already runs XRay (VLESS+Reality),
so the server-side client list is a known quantity — no reason to make the user
type UUID/public key/short ID/SNI by hand.

**Superseded design note:** this originally meant a `clients.json` rendered
at **deploy time** by this repo's own Ansible role, direct from infra's
Infisical secrets, blocked on `infra`'s `xray.vless.clients` secret
structure (then a single flat secret). That blocker turned out to be moot —
`xray.vless.clients` was **already a YAML list** in infra, just hand-edited
per client. This was then replaced with a live `GET /api/clients` endpoint
returning *every* dispatched client — which turned out to be its own bug:
any logged-in client could see every other client's UUID/public key/short ID
via that list. Replaced again with `GET /api/client` (singular): the backend
reads the caller's own session cookie and returns only *that* client's data
— no picker, no cross-client leak. `infra`'s Infisical secrets remain the
source of truth for the *shared* Reality parameters (`vless-public-key`,
`vless-sid`), templated into the backend's `config.yaml` the same way
`clients.json.j2` used to read them.

**Superseded again — multi-credential accounts:** the "no picker" design
above assumed one client meant one person meant one credential. Real usage
needs one person holding multiple credentials under the same email — e.g.
one with `flow: xtls-rprx-vision` for a plain Vision config, another with
an empty `flow` for a sing-box config using multiplex (see "Multiplexing
(mux)" above — xray can't reconcile Vision and mux on a single credential,
so switching between them needs two distinct UUIDs). `email` was the thing
enforcing "one client" (a unique constraint); now an *account* (identified
by `email`) can hold several *credentials* (rows sharing that email, each
still with a unique `client_uuid` — migration `4e8b1a6f3c9d` drops the
column's unique constraint). `GET /api/clients` is plural again, but scoped
this time, not a repeat of the "every dispatched client on the server" bug
two paragraphs up: it returns only the credentials belonging to the
logged-in *account*, and login itself checks the (email, uuid) pair rather
than "just email" (`auth.py`'s `verify_client_login`/
`get_clients_from_session`) — knowing any one of an account's own UUIDs
proves ownership of that account, not of anyone else's. The frontend
(`ClientInfo.tsx`) only shows a picker when more than one credential comes
back; with the common case of exactly one, behavior is unchanged from
before.

**Connect address vs. Reality SNI split:** `zelgray.work` is proxied through
Cloudflare, so it can't be used as the actual VLESS dial target — TCP/TLS
traffic to it hits Cloudflare's edge instead of the origin xray server,
breaking Reality entirely. `vless_server` (the `server` field in every
client's API response) points at the `vless.zelgray.work` CNAME instead
(DNS-only, bypasses Cloudflare); `vless_server_name` (the Reality SNI
camouflage target) stays `zelgray.work`, since it's never resolved over the
network — it's just the TLS SNI string sent to the origin. These are two
independent config vars (`vless_server`/`vless_server_name` in
`sources/src/vless_admin/config.py`; `vless_config_generator_vless_server`/
`_vless_server_name` in the ansible role) — the role's `config.yaml.j2`
used to derive both from a single ansible var before this split.

## Region selection

Alongside the routing-rule builder (which edits `route`), the frontend also
fully generates the `dns` section — and, for Ukraine, structural `route`
rules too — based on a "Region" dropdown (`Default` / `Ukraine` / `Russia`
— `frontend/src/components/RegionSelector.tsx`, `frontend/src/lib/
regionConfig.ts`, `frontend/src/types/region.ts`). Originally scoped to
`dns` only (hence the "DNS region" name early on), it grew to also own a
handful of `route.rules` once it became clear some of them (CDN direct-
routing, see below) can't be decided correctly without also knowing the
DNS-side geoip logic — so the dropdown, files, and types were renamed to
`Region`/`region*` to stop implying a DNS-only scope. Same
replace-not-merge treatment `buildOutputConfig` already gives `route`:
`dns.servers`/`dns.rules`/`dns.final` and `route.default_domain_resolver`
are always fully replaced based on the picked region; any other
pre-existing `dns`-level keys in the pasted config pass through untouched.

- **Default** — plain Cloudflare DoH (`1.1.1.1/dns-query`), no
  region-specific routing. Replaces the original placeholder DNS servers
  (`223.5.5.5` UDP — a Chinese resolver with no relevance to this
  deployment's actual traffic).
- **Ukraine** — most Ukrainian ISPs block Cloudflare-fronted `.ru` sites at
  the DNS/IP level (sanctions since 2017: `vk.com`, `mail.ru`, `ok.ru`,
  `yandex.*`, etc.), so those need to resolve through the VLESS tunnel
  instead of the local/ISP resolver — but everything else (including `.ua`
  services) should resolve locally, so CDNs hand back the nearest edge
  instead of a remote one via a foreign DoH server. `SagerNet/sing-geosite`'s
  `geosite-ua.srs`/`geosite-ru.srs` **don't actually exist** as published
  files (confirmed via `curl` — 404; an earlier iteration assumed they did,
  a real bug), so domain-suffix pre-sorting isn't possible. Instead this
  uses sing-box's two-pass DNS resolution: resolve via `dns-direct`
  (Cloudflare, no tunnel) first, then re-route the response through
  `dns-local` or `dns-remote` (Cloudflare via the VLESS tunnel) depending on
  which country's `geoip-ua`/`geoip-ru` rule set (`SagerNet/sing-geoip`,
  confirmed to exist) the resolved IP actually falls into.
- **Russia** — the opposite default: most traffic (including `.ru`)
  resolves fine locally; only domains/IPs actually on Roskomnadzor's
  blocklist need the tunnel. Uses `runetfreedom/russia-v2ray-rules-dat`'s
  `geosite-ru-blocked`/`geoip-ru-blocked` rule sets instead of a generic
  geoip split — RKN blocks plenty of non-Russian services too (Instagram,
  parts of Google, Discord), so "blocked" and "Russian" aren't the same
  criterion. The tunnel's DNS server is Quad9 (`9.9.9.9`), not Cloudflare —
  Cloudflare's own infrastructure (including DoH) has been separately
  throttled/blocked by Russian ISPs since June 2025, so routing *through*
  Cloudflare from inside Russia is a bad assumption; querying Quad9 through
  the VLESS tunnel sidesteps the question entirely since the ISP only ever
  sees an opaque TLS session to the VDS.
- `route.default_domain_resolver` is derived by `buildRegionConfig` (not left
  as a passthrough from the pasted config), since it must reference a
  server tag that actually exists in whichever `dns.servers` the picked
  region produced — an earlier version left it as `"local"` from the
  placeholder config, which stopped matching once the DNS servers were
  retagged `dns-local`/`dns-remote`/`dns-direct`.
- **Ukraine — CDN direct-routing.** Ukraine's `final` is `proxy` (see below),
  so without an explicit carve-out, well-known CDN edge ranges (Cloudflare,
  Google, Fastly, AWS CloudFront) would take an unnecessary detour through
  the VLESS tunnel even though nothing about them is blocked in Ukraine —
  their anycast edges already sit a few ms away. `buildRegionConfig` adds four
  `Loyalsoldier/geoip` ASN-based rule sets (`cdn-cloudflare`/`cdn-google`/
  `cdn-fastly`/`cdn-cloudfront`, `download_detour` direct) plus a structural
  `route.rules` block ahead of the user's own rules: `ip_is_private` →
  direct, `geoip-ru` → proxy, the four CDN rule sets → direct, `geoip-ua` →
  direct — in that exact order. **Order matters**: `geoip-ru` must be
  checked before the CDN rule sets, because a resource reachable only
  through the tunnel could itself sit behind Cloudflare; if the CDN rule
  matched first it would route direct and break the block-bypass. This also
  means the `resolve` structural action is now unconditionally added for
  the `ua` region (`buildRegionConfig`'s `needsIpResolve: true`), since these
  rules always match on geoip regardless of what the user's own rules do.
  Not needed for **Russia**: its `final` is already `direct`, so unblocked
  CDN traffic already goes direct for free — adding the same rule sets there
  would only add a startup dependency on more GitHub-hosted `.srs` downloads
  (already a known soft spot for Russian networks) for no behavioral change.
- **Known gap, deliberately left manual:** beyond the Ukraine CDN/geoip
  block above, region selection does not override the default-outbound
  toggle (`DefaultOutboundToggle` remains the sole owner of `route.final`),
  and Russia still has no auto-injected `route.rules` for
  `geosite-ru-blocked`/`geoip-ru-blocked` → proxy — add that manually via
  the rule builder if you pick the Russia region, or a domain/IP can
  resolve "correctly" (through the right DNS path) while the actual
  TCP/UDP connection still goes the wrong way and hits a block.

## Sing-box version target (Stable / Alpha)

The Ukraine/Russia region profiles (see "Region selection" above) need to
re-route a DNS query based on which country's geoip range the resolved
address falls into — a "resolve first, then route by the resolved IP"
pattern sing-box only has two ways to express:

- `evaluate` + `match_response` (probe once via one DNS server, then decide
  which server actually answers based on the probed IP) — the more precise
  primitive, but needs sing-box **1.14.0**, which as of this writing is only
  released as alpha builds (`v1.14.0-alpha.*` on GitHub), not stable.
- The older single-step "address filter" pattern (`rule_set`/`ip_cidr`
  matched directly against a rule's own query response, its `server` field
  doubling as both prober and answerer) — supported since sing-box
  **1.8.0**/**1.9.0**, works on any current stable release, at the cost of
  folding "who resolves" and "who answers" into the same server (loses the
  original design's "probe via a neutral resolver, then answer via the
  region-appropriate one" decoupling — see the Russia caveat below).

Exposed as a `Stable`/`Alpha` dropdown (`frontend/src/types/
singboxTarget.ts`, `frontend/src/components/SingboxTargetSelector.tsx`),
threaded through `BuildConfigInput.singboxTarget` into `buildRegionConfig`
(`frontend/src/lib/regionConfig.ts`), defaulting to `Stable` since that's
what actually runs on a released sing-box today. Has no effect on the
`Default` region, which has no geoip-based DNS rules to begin with.

- **Ukraine** — `alpha` probes once via `dns-direct`, then re-queries
  `dns-local`/`dns-remote` only once classified. `stable` checks
  `geoip-ua` via `dns-local` and `geoip-ru` via `dns-remote` directly,
  falling through to `dns-direct` if neither matches — an extra DNS round
  trip for domains that are neither, but the same eventual routing outcome.
- **Russia** — `alpha` probes via `dns-local`, and only re-queries
  `dns-remote` if the resolved IP itself lands in `geoip-ru-blocked`.
  `stable` can't decouple probe from answer: it checks `dns-local`'s own
  answer against the blocklist directly, so a domain whose `dns-local`
  answer is already blocked-looking is *kept* as-is rather than re-resolved
  cleanly via `dns-remote` — the one real behavior gap between the two
  targets (see the code comment in `regionConfig.ts` for the full
  reasoning).
- Verified via Context7 against sing-box's actual tagged docs (`v1.13.14`)
  rather than training-data memory: `match_response`/`evaluate` are
  undocumented before 1.14.0, and the address-filter mechanism ("items in
  `ip_cidr` within included rule-sets also function as address filtering
  fields") is confirmed as the pre-1.14 idiom for this exact pattern.

## Multiplexing (mux)

Some ISPs (notably several Russian mobile carriers, per DPI/TSPU-related
reporting) cap the number of concurrent TLS connections a client can hold
open to a single host — low enough (as low as 10) that ordinary browser
usage (several tabs, background mail/messenger sync) can exceed it and
start dropping connections. sing-box's `multiplex` block addresses this by
bundling many logical streams over a handful of physical TLS connections.

- Modeled as an optional card (`frontend/src/components/
  MultiplexSettings.tsx`), gated by a single "enable" checkbox — the
  protocol/max-connections/min-streams/padding fields only render once
  enabled, defaulting to `h2mux` (sing-box's own recommended default over
  `smux`/`yamux`), 4 max connections, 4 min streams, padding off. State
  lives in `frontend/src/types/multiplex.ts` (`MultiplexSettings`).
- `buildOutputConfig` (`frontend/src/lib/buildConfig.ts`,
  `applyMultiplexToOutbound`) applies this to the same outbound the client
  credentials get injected into. When enabled it writes `outbound.multiplex`
  and **deletes any `flow` field** (e.g. the default template's
  `xtls-rprx-vision`) — Vision's flow control and mux multiplexing can't be
  combined. When disabled, `multiplex` is deleted from the outbound (so
  toggling back off cleanly removes it) and `flow` is left untouched either
  way it was found.
- Not region-specific: unlike the Region dropdown, this is a plain checkbox
  independent of the `Default`/`Ukraine`/`Russia` selection, since the
  underlying TLS-connection-count limit isn't tied to a specific country's
  DNS/routing profile in the code — the user enables it based on their own
  ISP's behavior.

## Localization

EN/UA/RU support (`frontend/src/i18n/translations.ts`, `LangContext.tsx`,
`components/LanguageSwitcher.tsx`), inspired by `infra`'s `web-content` role
— its static error pages (401/403/404/50x) show all three languages
stacked, each behind a small uppercase `.lang` badge, since those pages are
read once and never interacted with again. This app is the opposite: a
dense, repeatedly-used form. Showing three stacked translations under every
heading/label/button would roughly triple the visual weight of every field
— so instead of replicating that layout, only the underlying idea (always
show which language you're looking at) carries over, as a language
**switcher**: one active language at a time, picked from a `<select>`
dropdown with a flag emoji per option (`LanguageSwitcher.tsx`,
`i18n/translations.ts`'s `LANG_OPTIONS`), persisted to `localStorage`
(`LangContext.tsx`, key `lang`, default `en`).

- `translations.ts` is a flat `key -> {en, ua, ru}` dictionary plus a
  `t(key, lang, vars?)` helper that does simple `{varName}` substitution —
  no pluralization or nested-message logic, since the app doesn't need it.
  Every heading, help text, label, button, checkbox, warning, and the
  routing-rule condition-type labels/help text (`types/rules.ts`
  `CONDITION_TYPES`, now storing `labelKey`/`helpKey` instead of literal
  English strings) go through it. The Output panel's "Show comments" toggle
  (`lib/annotateConfig.ts`) appends an explanatory `// comment` to known
  lines of the pretty-printed JSON, for reading only — Copy/Download always
  use the plain, comment-free JSON, since comments make the text invalid
  JSON and some sing-box clients (older bundled cores) may fail to parse
  it. Those comments are localized too, but via a separate
  `pattern -> {en, ua, ru}` table in `annotateConfig.ts` itself rather than
  `translations.ts`, since they're keyed by JSON-line substring, not by a
  static UI location.
- `LangContext` is a plain React context, not prop-drilled — any component
  calls `useLang()` directly for `{ lang, setLang, t }`. This was a
  deliberate difference from how `region`/`rules`/etc. are handled (lifted
  into `App.tsx` state and passed down as props): those are business state
  the app orchestrates and reacts to; language is a cross-cutting display
  concern with no business-logic dependents, so context avoids threading it
  through components (`RuleList` → `RuleCard` → `ConditionEditor`) that
  don't otherwise need to know about it.
- A few strings intentionally stay untranslated: literal identifiers the
  user must recognize as-is in the generated config or its own UI state
  (`geosite`/`geoip` as `<option>` values, `binary`/`source` format values,
  `tcp`/`udp`/`http`/`tls`/... protocol enum values) — translating those
  would make them harder to match against actual sing-box config syntax,
  not easier.
- Language choice is purely a frontend/display concern — it has no effect
  on the generated `config.json` (region, rules, and client credentials are
  unaffected), and nothing here touches the backend (`sources/`) or its own
  server-rendered pages (`/login`, `/admin/`), which remain English-only.

## Admin panel + client-credential site auth

Two asks drove introducing a real backend (`sources/`, FastAPI) into what
was a static site: (1) a browser-based admin page to add new VLESS clients,
(2) gating `vless-gen.zelgray.work` with existing client credentials
instead of a separate static password. Key decisions (see the plan this was
implemented from for the full ground-truth investigation):

- The backend lives in **this repo**, not `infra`, and deliberately **does
  not hold Infisical write credentials**. Adding a client
  (`POST /admin/clients`) generates a UUID, stores it in this repo's own
  Postgres `clients` table (status `pending`/`dispatched`, later also
  `pending_removal`/`removing` once a client is deleted — see below), then
  calls
  GitHub's `workflow_dispatch` API against a workflow in `infra`
  (`add-vless-client.yml`) — that workflow is the only thing that writes to
  Infisical and runs the actual xray `ansible-playbook` deploy. This keeps
  the always-on container's blast radius small (a narrow "dispatch this one
  workflow" GitHub token) instead of embedding a live secret-writing
  credential in a permanently-running service.
- **Deleting a client** (`POST /admin/clients/{id}/delete`) mirrors the add
  flow symmetrically rather than introducing a new mechanism: status flips
  to `pending_removal` immediately (before the dispatch call is even
  attempted — same idea as `client_create`'s initial `pending`, so a failed
  dispatch still leaves a distinguishable, retryable state), then to
  `removing` once `workflow_dispatch` against `infra`'s
  `remove-vless-client.yml` actually succeeds. Either status already blocks
  that client's site login the instant it's set (`auth.py` rejects anything
  `!= "dispatched"`), so access is revoked before the removal workflow has
  even started running on GitHub's side — deletion doesn't wait on xray to
  actually restart. The `clients` row itself is only hard-deleted once the
  admin dashboard's next load confirms the workflow's run `conclusion ==
  "success"` (`_refresh_client_runs` in `app.py`, extended from its original
  add-only polling to also poll `removing` clients against the remove
  workflow); a failed removal run surfaces the same "Retry" button as a
  failed add, re-dispatching the remove workflow specifically (never the
  add one) since the retry route branches on the client's current status.
- **Per-client `flow`** — the add-client form has a dropdown
  (`xtls-rprx-vision` / empty), stored on the `clients` row (`flow` column,
  migration `6b1f4e9a2d7c`) and passed through to `infra`'s
  `add-vless-client.yml`/`update-vless-client.yml` as an input. (An earlier
  iteration also offered `xtls-rprx-vision-udp443`; dropped as an outdated
  xray flow value not worth keeping in the dropdown.) "Empty" exists for
  clients running sing-box's multiplex feature (see "Multiplexing (mux)"
  above) — Vision and mux can't be combined, so a client using mux needs its
  server-side xray entry to have no `flow` key at all, not just an empty
  string (xray treats an empty `"flow": ""` differently from the key being
  absent). `infra`'s `config.json.j2` reflects this per-client instead of
  the old hardcoded `"flow": "xtls-rprx-vision"` for every entry: if
  `client.flow` is present and non-empty it's used as-is, present-but-empty
  omits the key, and — for backward compatibility with `vless-clients`
  entries that predate this field and have no `flow` key at all — a
  genuinely *missing* key still defaults to `xtls-rprx-vision`, matching
  the old hardcoded behavior exactly.
  **Bug fixed:** `add_vless_client.yml`/`update_vless_client.yml` originally
  built the entry's `flow` field via `combine({'flow': ...} if non-empty
  else {})`, which meant picking "empty" in the dropdown produced an entry
  with **no `flow` key at all** — indistinguishable from a genuinely legacy
  entry, so `config.json.j2`'s backward-compat branch silently defaulted it
  right back to `xtls-rprx-vision` instead of actually removing the key.
  Both playbooks now always set `flow` explicitly (`vless_client_flow |
  default('')`), so "empty" is written as `"flow": ""` — present but
  falsy — which `config.json.j2` already correctly treats as "omit from
  xray's config", while a truly *missing* key (rows never touched by
  either workflow) still gets the backward-compat default.
  **Second bug fixed, same symptom:** even after the fix above, an empty
  flow still silently became `xtls-rprx-vision` in the live xray config.
  Root cause was one layer further out: `add-vless-client.yml`/
  `update-vless-client.yml`'s `flow` input declared `default:
  "xtls-rprx-vision"` (`required: false`) — and GitHub Actions'
  `workflow_dispatch` REST API silently substitutes an input's declared
  default whenever the dispatched value is an empty string, treating ""
  as "not provided" rather than as a real value (confirmed for `type:
  choice` inputs in [community discussion #172518](
  https://github.com/orgs/community/discussions/172518); empirically
  confirmed here to also apply to plain `type: string`). So this repo's
  backend was correctly sending `"flow": ""` in the dispatch payload the
  whole time (verified via the actual `docker logs`/DB state), but GitHub
  itself replaced it with the default before the workflow ever saw it —
  every dispatched run's `${{ inputs.flow }}` came out as
  `xtls-rprx-vision` regardless of what was actually sent.
  **Third bug fixed, same symptom, worse failure mode:** dropping
  `default:` and making `flow` `required: true` (matching this repo's own
  `Form(...)` fix for the same class of issue) turned out not to be a fix
  either — it just swapped the silent wrong-value bug for an outright
  `422 Unprocessable Entity` from the `dispatches` API whenever an empty
  string was sent, confirmed live via this repo's own container logs.
  GitHub's `workflow_dispatch` REST API apparently cannot carry a
  genuinely empty string for *any* input, required or not: `required:
  false` + `default` silently substitutes the default, `required: true`
  rejects the call. The actual fix (`github_dispatch.py`'s
  `NO_FLOW_SENTINEL`/`_flow_input`): the backend sends the literal string
  `"none"` over the wire instead of `""` whenever flow is empty, and
  both `add_vless_client.yml`/`update_vless_client.yml` translate `"none"`
  back to a real empty string (`'' if vless_client_flow == 'none' else
  vless_client_flow`) before building the client's Infisical entry — the
  same sentinel-and-translate workaround documented in [community
  discussion #172518](https://github.com/orgs/community/discussions/172518)
  for `type: choice` inputs, applied here to a plain `type: string` one.
  `flow` stays `required: true` on both workflows (a value, sentinel or
  real, is always sent now, so there's nothing to default).
- **Editing a client** (`POST /admin/clients/{id}/edit`, email + flow only —
  the UUID itself is never editable through this route, that would be
  credential rotation, a separate concern not implemented here) reuses the
  same pending/in-flight pattern as add and delete, but deliberately does
  **not** revoke site login: status flips to `pending_update` (before the
  dispatch attempt, mirroring `pending_removal`) then `updating` (once
  `infra`'s `update-vless-client.yml` dispatch succeeds), and
  `auth.py`'s `_LOGIN_ALLOWED_STATUSES` explicitly includes both alongside
  `dispatched` — editing metadata isn't a security event, unlike deletion.
  A completed `updating` run flips status back to `dispatched`
  (`client_mark_updated`) but — unlike the add/remove transitions, which
  reset the run-tracking columns — deliberately leaves them alone, so the
  edit's own outcome (e.g. "success") stays visible instead of being wiped.
  A client whose original add was never actually dispatched (`status ==
  "pending"`) has no server-side entry yet to update at all, so editing it
  just persists the new email/flow to the row directly (`client_update`,
  no dispatch) — the next "Retry" of the add naturally picks up the new
  values, since `_dispatch_add_and_mark` always reads `client.email`/
  `client.flow` off the current row. Retry's branch logic was extended to a
  third case (`updating`/`pending_update` → re-dispatch the update
  workflow) so retrying a failed edit can never re-add or re-remove a
  client by mistake. Editing a client's email to match another existing
  row is allowed and does **not** 409 — `email` isn't unique (see "Client
  credentials" above, "Superseded again — multi-credential accounts"),
  so this is now indistinguishable from intentionally adding a second
  credential to the same account by editing an existing row's email to
  match it.
- **Prerequisite in `infra`, now implemented there** (separate repo, own
  history): `xray.vless.clients` was restructured to read from one
  JSON-array Infisical secret (`clients: "{{ infisical_secrets.secrets
  ['vless-clients'] | from_json }}"`), and `.github/workflows/
  add-vless-client.yml` (`workflow_dispatch`, inputs `email`/`uuid`/`flow`)
  logs into Infisical, appends to that secret via `playbooks/
  add_vless_client.yml`, then runs `playbooks/xray.yml`. A parallel
  `remove-vless-client.yml` (input: `uuid`) + `playbooks/
  remove_vless_client.yml` does the mirror-image edit (`rejectattr('id',
  'equalto', vless_client_uuid)` on the same JSON list), and
  `update-vless-client.yml` (inputs `uuid`/`email`/`flow`) + `playbooks/
  update_vless_client.yml` rebuilds the list with that one entry's
  `email`/`flow` replaced (same `rejectattr` removal, then re-appends a
  freshly built `{id, email, flow}` entry — so a stale `flow` from before
  the edit can't leak through) — all three redeploy via the same
  `xray.yml --tags config` afterward. That tag runs only `xray`'s
  config-templating task and its restart-on-change handler (plain
  `docker_container: restart: yes` on the already-running container),
  skipping the `docker` role and the container-recreate/image-pull task
  entirely — applying a client change is just "template the new config,
  restart the existing container," not a redeploy from scratch, which
  matters since this now runs on every single add/edit/remove. No new
  Infisical secret or GitHub token scope needed for either the remove or
  the update workflow, since both reuse the same `vless-clients` secret
  and the same `actions:write`-scoped PAT this repo's backend already
  holds. All three
  workflows run on a **GitHub-hosted runner** (`runs-on: ubuntu-latest`) — a self-hosted
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
- Site login is a real login/logout flow, not Basic Auth: `GET/POST /login`
  (server-rendered form, email + VLESS UUID) sets a signed session cookie;
  nginx `auth_request` against the backend's `/auth` checks that cookie,
  redirecting to `/login` on failure (`POST /logout` clears it). Superseded
  the original Basic-Auth-via-`auth_request` design — Basic Auth's
  browser-native prompt has no logout and caches per-origin until the
  browser's site data is cleared, which made testing as different clients
  painful. Credential = the client's own `email:uuid` (reuses the existing
  secret, no new credential type invented). The UUID field renders as
  `type="password"` (masked, was plain `text`) with
  `autocomplete="current-password"`, and the email field carries
  `autocomplete="username"`, so password managers (e.g. Bitwarden) recognize
  and offer to save/fill the pair instead of ignoring it as a plain-text
  field. Same treatment on `/admin/login`'s username/password fields.
- The admin page (`/admin/`, server-rendered FastAPI/Jinja2, not a React
  route — matches `hotline-listing`'s own precedent) has its own,
  independent `GET/POST /admin/login` + `POST /admin/logout` and its own
  session cookie/nginx `auth_request` target (`/admin/auth`) — so a bug in
  the site's login can't lock the admin out. Superseded the original
  design of a static nginx `auth_basic`/htpasswd for `/admin/`: a real
  login form needs the backend to verify the credential and issue a
  cookie, which nginx's `auth_basic` can't do — so the admin credential
  moved from an nginx-generated htpasswd file into the backend's own
  config (Infisical secrets `vless-config-generator-admin-username` /
  `-admin-password`, split from the original combined `username:password`
  secret).
- Sessions: `itsdangerous`-signed cookies (`site_session`/`admin_session`,
  separate names/paths) carrying only an opaque random id — the signature
  guards against tampering and enforces a hard max-age at the edge, while a
  Postgres `sessions` table (`session_id`, `kind`, `subject`, `expires_at`)
  remains the source of truth for revocation: logout deletes the row
  immediately, regardless of how long the signed cookie would otherwise
  still verify. TTLs: 30 days (site), 12 hours (admin).
- Stack: FastAPI + PostgreSQL + Redis, following the `hotline-listing`
  reference pattern on this VDS exactly (same repo layout, same Ansible
  role shape sourced from `sources/`, same shared Postgres/Redis
  containers, image built in place via `community.docker.docker_image`, no
  compose).
- Bonus consolidation: the geosite/geoip rule-set category fetch (see
  "Rule-set category autocomplete" below) also moved server-side into this
  backend's Redis cache, since a backend now exists anyway — every visitor's
  browser no longer hits the GitHub API directly.
- Deployment confirmation: `workflow_dispatch` itself returns no run id, so
  after dispatching, the admin dashboard best-effort-matches the new run by
  looking at the workflow's recent `workflow_dispatch` runs created at/after
  the client row's `created_at` (`github_run_id`, stored once found). Once
  known, the run's actual `status`/`conclusion` (columns
  `github_run_status`/`github_run_conclusion`) is re-fetched and shown
  every time `/admin/` loads — no background poller or webhook, since this
  is a low-traffic, single-operator tool and a lazy refresh-on-page-load is
  simplest. `conclusion == "success"` is the real "xray restarted with this
  client" signal now; the run columns reset to unset on retry so a stale
  prior run's outcome doesn't linger, and a failed run's conclusion also
  surfaces the retry button (previously only `status != "dispatched"` did).
  The dashboard also refreshes every 5s while any client is mid-action
  (`pending`/`dispatched`/`pending_removal`/`removing`/`pending_update`/
  `updating` without a completed run) — originally a plain `<meta
  http-equiv="refresh">` (whole-page reload), superseded by a JS poller
  hitting `GET /admin/clients/status` instead, since a full reload wiped
  out anything being typed anywhere on the page (the add-client form, an
  in-progress edit on an unrelated row), not just the row that actually
  changed. Each client's row is rendered by a shared Jinja macro
  (`admin/_client_row.html`'s `client_row`), called both from
  `dashboard.html`'s normal template render and from the status endpoint
  (via `app.py`'s `_client_row_macro`) — single source of truth for a
  row's markup either way. Per poll tick, a row whose editable/read-only
  state hasn't changed only gets its status/workflow-run cells patched in
  place (`.js-status`/`.js-run`); a row whose editable state *has* changed
  (e.g. an edit finishing flips it from read-only back to the email
  input/flow select/Save button) gets fully replaced with fresh
  `row_html` from the poll response — safe to do in that direction only,
  since read-only → editable never has in-progress typing to lose, and
  the reverse (editable → read-only, right after Save/Delete is
  submitted) already happens via a full page reload, never mid-poll.
  Polling stops once nothing in the response is still in flight.
- Each row's Save button starts disabled and only enables once its email
  or flow input actually differs from the value the row was rendered
  with (`data-initial` on the input/select, compared on every `input`/
  `change` event) — avoids a no-op submit when nothing was actually
  changed. Delegated at the `document` level rather than per-row, so it
  keeps working for rows the poller swaps in via fresh `row_html` without
  needing to re-attach anything.

## Access control

Client credentials (UUID, public key, short ID) are sensitive, but the
generator UI itself isn't — it's a static rule builder that works from any
config pasted into it. Two independent gates now, deliberately not chained
together — both cookie-session based, both enforced via nginx
`auth_request`:
- `/api/`: log in at `/login` with an existing client's `email:uuid`, gets a
  `site_session` cookie checked against `/auth`. `/` (the static SPA) is
  **not** gated by this site-specific login — superseded the original
  design where `/` and `/api/` shared the same `auth_request`, so using the
  generator required a client login even for someone pasting their own
  config with credentials typed in by hand. (`/` did later gain a separate,
  unrelated Discord SSO gate — see "Deployment shape" below — layered on
  top of, not replacing, this reasoning: it still doesn't require the
  site's own client login.) Logged-out visitors just don't get
  `/api/clients` autofill — the
  Client card shows a note explaining that and a "Log in" button
  (`ClientInfo.tsx`) instead of a raw fetch-error banner, since "not logged
  in" is now an expected, common state rather than a failure — or the live
  rule-set category list (falls back to the bundled snapshot).
- Admin panel (`/admin/`): log in at `/admin/login` with the operator
  credential sourced from two Infisical secrets under `/hosts/shared`
  (`vless-config-generator-admin-username`,
  `vless-config-generator-admin-password` — split from a single
  `username:password` secret, same historical pattern as
  `library.zelgray.work`/`inpx-web-ui` originally used), gets an
  `admin_session` cookie checked against `/admin/auth` — kept independent
  so it survives an outage in the site's own login.

## Deployment shape

- **Separate repository** (this one), not folded into `infra` — confirmed
  decision, mirroring the `hotline-listing` precedent (own `ansible/`, own
  `pre_tasks/infisical.yml`, own minimal `group_vars/all.yml`, connects to
  infra's shared nginx/Infisical project without infra code depending on it).
- **Deploys to zelgray.work VDS** — supersedes the original `IDEAS.md` idea of
  GitHub Pages/Cloudflare Pages hosting. The live client-data requirement is
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
- **Discord SSO gate on `/`** — added later, layered on top of (not
  replacing) this site's own `/api/`/`/admin/` auth: `location /` also
  carries `auth_request` against `meow-elite-club-portal`'s `/auth`, see
  `infra`'s `docs/portal-architecture.md` and this role's `README.md`.

## End-to-end UI flow (summary)

1. Optionally log in at `/login` with your client's `email:uuid` — your own
   server params + credentials come along automatically, no manual entry.
   Skip this and paste your own config with credentials filled in by hand
   instead; the rest of the tool works the same either way.
2. Paste an existing sing-box `config.json` as the base.
3. Build/edit routing rules in the rule list (conditions + direct/proxy
   action, drag to reorder).
4. Set the default outbound (direct/proxy toggle), the Region
   (Default/Ukraine/Russia — plus, for Ukraine/Russia, a Stable/Alpha
   sing-box version target), and optionally enable multiplexing (mux) if
   your ISP caps concurrent TLS connections to one host.
5. Get back the same config with `route` and `dns` replaced — download or
   copy.
6. Everything from step 2 onward runs entirely in the browser; the client
   data (step 1) and rule-set category autocomplete now depend on this
   repo's own backend rather than a deploy-time static file (see "Admin
   panel + client-credential site auth").

## Open items / not yet decided

- The `infra`-side prerequisite has landed (see "Admin panel" above), but
  no live end-to-end test has been run yet — no real `workflow_dispatch`
  has been triggered, no real xray restart observed. Until that's
  verified, treat "add client" (and, likewise, "delete client"/"edit
  client" and their `remove-vless-client.yml`/`update-vless-client.yml`
  counterparts) as implemented-but-unverified in production. Each
  status-machine and its access-implications — deletion's `pending_removal`
  → `removing` → hard-delete on confirmed success, and editing's
  `pending_update` → `updating` → back to `dispatched` without revoking
  login — was exercised locally against a real Postgres (including the
  "pending" no-dispatch edit path and multi-credential login by uuid, see
  "Client credentials" above), with the actual GitHub dispatch call itself
  the only unverified leg in all three — same caveat the add flow always
  had.
- The session-cookie login (see "Admin panel" above) needs a new Infisical
  secret, `vless-config-generator-session-secret` (a random string, e.g.
  `openssl rand -hex 32`), not yet created — without it `session_secret_key`
  falls back to an empty string, which still works but isn't fit for
  production cookie-signing.

## Implementation status

- Scaffolded via `new-service-repo` (Ansible deploy skeleton, root tooling)
  and `new-nginx-service` (subdomain `vless-gen.zelgray.work`, Basic Auth via
  a self-managed htpasswd file, no upstream since there's no backend).
- Frontend: Vite + React + TypeScript in `frontend/`, no build-step-free
  vanilla JS after all — see `frontend/src/`. The logged-in client's own
  `server`/`server_port`/`uuid`/`tls.reality.public_key`/
  `tls.reality.short_id`/`tls.server_name` (from the selected credential in
  `GET /api/clients`) get
  injected into the pasted config's chosen VLESS outbound; everything else
  in the pasted config passes through
  untouched. Rule builder supports every condition type from this doc,
  including `rule_set`-based geosite/geoip (verified against the sing-box
  v1.13 docs via Context7 — `route.rule_set[]` entries with
  `type: "remote"`, referenced from rules via `rule_set: [tags]`) and
  drag-to-reorder (`@dnd-kit`). Default outbound is an explicit toggle
  writing `route.final` — it's typed separately (`FinalAction`, direct/proxy
  only) from a per-rule `Action`, since `route.final` can only reference an
  outbound tag and can't be `reject` the way a rule's own action can.
- **Importing rules from a pasted config** (`frontend/src/lib/
  parseRoute.ts`) — best-effort parses the pasted config's existing
  `route.rule_set`/`route.rules` into the builder's `RuleSetDef`/`Rule`
  model on first paste (only while the builder is still empty, so it never
  clobbers rules the user is already editing), instead of `buildConfig`
  silently discarding them the moment it regenerates `route` from scratch.
  Structural rules `buildConfig` always regenerates itself (`sniff`, DNS
  hijack, `resolve`) are recognized and skipped rather than re-imported as
  user rules. Anything that doesn't map onto the builder's model — a
  `rule_set` entry that isn't `type: remote` (or is missing `tag`/`url`), a
  rule whose `outbound` isn't the detected direct/proxy tag, or `type:
  logical` nesting deeper than one level — is reported back as skipped
  rather than guessed at, and surfaced verbatim in a warning card
  (`frontend/src/components/ImportWarnings.tsx`) right under the paste box,
  so the user sees exactly what won't make it into the output instead of it
  quietly vanishing.
- **Inline help + hover tooltips** — every `CONDITION_TYPES` entry now has a
  `helpKey` (previously only `rule_set`/`ip_is_private`/`process_name`/
  `process_path` did), rendered the same way: a permanently-visible
  `help-text` line under the condition-type dropdown. The newer per-rule
  controls (Simple/Logical mode, AND/OR, Invert, and the action row
  including `reject`) instead get a hover/focus-triggered tooltip
  (`frontend/src/components/InfoTooltip.tsx` — a small ⓘ icon, CSS-only
  bubble, no new dependency) rather than a permanent help line, since a
  rule list can hold many rules and a persistent explanation under every
  toggle would be too much vertical noise per rule.
- Which outbound tag is "direct" and which is "proxy" is auto-detected from
  `type: "direct"` / `type: "vless"` in the parsed config (`App.tsx`) — rules
  and the default-outbound toggle route to whichever tags that finds. There
  used to be a manual override UI for this (`OutboundMapping.tsx`), removed
  since in practice users never paste a config with different outbound
  tags than the default template's (`direct`/`proxy`) — the auto-detect
  alone already covers the real usage.
- The paste box (`frontend/src/lib/defaultConfig.ts`) is pre-loaded with a
  default template (VLESS/Reality outbound placeholder, direct/block
  outbounds, tun inbound, DNS servers) so there's always something to edit
  and export, with a "Reset to default template" button. `buildOutputConfig`
  always prepends `{"action":"sniff"}` and `{"protocol":"dns","action":
  "hijack-dns"}` ahead of the user's rules and preserves any other
  route-level fields (e.g. `auto_detect_interface`) from the pasted config —
  these aren't exposed as rule-builder toggles since they're prerequisites
  for domain-based rules to work at all, not routing decisions.
  `default_domain_resolver` is the one route-level field that is *not*
  preserved from the pasted config — see "Region selection" below for
  why. A third structural entry, `{"action":"resolve","strategy":
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
  table: `email` (not unique — an account can hold several credentials,
  see "Client credentials" above), `client_uuid` (unique), `flow`,
  `status`, `github_run_id`, `github_run_status`, `github_run_conclusion`,
  `action_dispatched_at`, `created_at` — the shared Reality params live in
  `AppConfig`, not per-row; `Session` table: `session_id`, `kind`,
  `subject`, `expires_at`, `created_at`) + Redis cache + Alembic
  migrations. Routes: `GET /api/clients`, `GET /api/ruleset-categories`,
  `GET/POST /login`, `POST /logout`, `GET /auth` (nginx `auth_request`
  target for the site), `GET/POST /admin/login`, `POST /admin/logout`,
  `GET /admin/auth` (nginx `auth_request` target for `/admin/`),
  `GET /admin/` + `GET /admin/clients/status` (JS polling feed, see
  "Admin panel" above) + `POST /admin/clients` + `POST
  /admin/clients/{id}/retry` + `POST /admin/clients/{id}/edit`
  + `POST /admin/clients/{id}/delete` (server-rendered Jinja2,
  `sources/templates/`). Deployed via `community.docker.docker_container`
  on the shared `docker_network`, alongside the existing static-frontend
  sync, in the same Ansible role (`ansible/roles/vless-config-generator/`).
  Nginx routes `/api/` and `/admin/` through `auth_request` against their
  respective backend endpoint, redirecting to `/login` or `/admin/login` on
  401; `/` (the static SPA) goes through a separate Discord SSO gate
  (`meow-elite-club-portal`, layered on top of this site's own login, added
  later — see `infra`'s `docs/portal-architecture.md`) — see "Access
  control" above and that role's `README.md` for the full variable/tag
  reference.
- Multiplexing (`frontend/src/types/multiplex.ts`, `frontend/src/
  components/MultiplexSettings.tsx`, `applyMultiplexToOutbound` in
  `frontend/src/lib/buildConfig.ts`) — see "Multiplexing (mux)" above for
  the full rationale.
- Region selection (`frontend/src/lib/regionConfig.ts`,
  `frontend/src/types/region.ts`, `frontend/src/components/
  RegionSelector.tsx`) fully replaces `dns.servers`/`dns.rules`/
  `dns.final` and `route.default_domain_resolver` based on a
  `Default`/`Ukraine`/`Russia` dropdown — see "Region selection" above
  for the full rationale and the current gap (matching `route.rules` for
  geoip/blocklist routing are still added manually via the rule builder,
  not auto-injected).
- Sing-box version target (`frontend/src/types/singboxTarget.ts`,
  `frontend/src/components/SingboxTargetSelector.tsx`) picks between two
  DNS rule syntaxes for the Ukraine/Russia region profiles — see "Sing-box
  version target (Stable / Alpha)" above for the full rationale.
