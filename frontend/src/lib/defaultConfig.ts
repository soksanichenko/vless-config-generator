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
      address: ['172.19.0.1/30', 'fdfe:dcba:9876::1/126'],
      auto_route: true,
      strict_route: true,
    },
  ],
  dns: {
    servers: [
      { type: 'tls', tag: 'remote', server: '1.1.1.1' },
      { type: 'udp', tag: 'local', server: '223.5.5.5' },
    ],
  },
  route: {
    rules: [],
    default_domain_resolver: 'local',
    auto_detect_interface: true,
    final: 'direct',
  },
}

export const DEFAULT_CONFIG_TEXT = JSON.stringify(DEFAULT_CONFIG, null, 2)
