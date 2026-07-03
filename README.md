# vless-config-generator

Browser-based sing-box routing-rule editor for VLESS clients on zelgray.work

## Features

Not a from-scratch config builder — paste an existing sing-box `config.json`
and only its `route` section (plus the picked VLESS outbound's credentials)
gets changed. Everything runs client-side in the browser.

- **Default config template** — loaded up front so there's always something
  to edit and export, even before pasting your own config
- **Client picker** — pulls VLESS credentials (UUID, Reality public key,
  short ID, SNI) from a deploy-time `clients.json`, no manual entry
- **Outbound mapping** — auto-detects which outbound in your pasted config is
  "direct" and which is the VLESS "proxy", overridable
- **Routing rule builder** — drag-reorderable rule list (first match wins),
  each rule combining any of: domain (exact/suffix/keyword/regex), rule sets
  (geosite/geoip `.srs`, both quick-add by category and custom URLs),
  IP CIDR, private IP (LAN), port/port range, network (tcp/udp), protocol,
  process name/path (Windows/Linux only, needs root/`CAP_NET_ADMIN` on Linux)
- **Rule-set category autocomplete** — geosite/geoip category names are
  fetched live from the `SagerNet/sing-geosite`/`sing-geoip` GitHub repos and
  cached in `localStorage` for 24h; falls back to a bundled snapshot list if
  the fetch fails or is unavailable (e.g. offline local dev)
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

## Development

```bash
cd frontend
npm install
npm run dev
```

## License

[MIT](https://opensource.org/licenses/MIT)
