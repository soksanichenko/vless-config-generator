import type { SingBoxConfig } from '../types/singbox'

/**
 * Starting point shown when nothing has been pasted yet. The VLESS outbound's
 * credential fields are placeholders — picking a client above overwrites them.
 * `route` is included only for validity; buildOutputConfig always replaces it.
 */
export const DEFAULT_CONFIG: SingBoxConfig = {
  outbounds: [
    {
      type: 'vless',
      tag: 'proxy',
      server: '',
      server_port: 443,
      uuid: '',
      flow: 'xtls-rprx-vision',
      tls: {
        enabled: true,
        server_name: '',
        utls: { enabled: true, fingerprint: 'chrome' },
        reality: { enabled: true, public_key: '', short_id: '' },
      },
    },
    { type: 'direct', tag: 'direct' },
    { type: 'block', tag: 'block' },
  ],
  inbounds: [
    {
      type: 'tun',
      tag: 'tun-in',
      address: ['172.19.0.1/30'],
      auto_route: true,
      strict_route: true,
    },
    {
      type: 'mixed',
      tag: 'mixed-in',
      listen: '127.0.0.1',
      listen_port: 2080,
    },
  ],
  dns: {
    servers: [{ type: 'https', tag: 'dns-remote', server: '1.1.1.1', path: '/dns-query' }],
    rules: [{ query_type: [32, 33], action: 'predefined', rcode: 'NOERROR' }],
    final: 'dns-remote',
  },
  route: {
    rules: [],
    default_domain_resolver: 'dns-remote',
    auto_detect_interface: true,
    final: 'direct',
  },
}

export const DEFAULT_CONFIG_TEXT = JSON.stringify(DEFAULT_CONFIG, null, 2)
