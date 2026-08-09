import type { Region } from '../types/region'
import type { SingboxTarget } from '../types/singboxTarget'

export interface RegionConfigResult {
  dns: Record<string, unknown>
  /** Region-specific remote rule sets referenced by `dns.rules` above and/or `routeRules`
   * below — merged into route.rule_set. */
  extraRuleSets: Record<string, unknown>[]
  /** Same tag as dns.final — route.default_domain_resolver must reference a server that
   * actually exists in dns.servers above, so it can't be left as a passthrough from the
   * pasted config. */
  defaultDomainResolver: string
  /** Structural route.rules this region needs ahead of the user's own rules, e.g. to keep
   * the actual TCP/UDP routing in sync with what dns.rules already decided for a domain.
   * Empty when the region has nothing to add on top of the user's own rule builder. */
  routeRules: Record<string, unknown>[]
  /** Whether routeRules above match on a geoip rule set, which needs the destination
   * resolved first — same trigger as needsIpResolve for the user's own rules. */
  needsIpResolve: boolean
}

/** Blocks HTTPS/SVCB record lookups everywhere — sing-box otherwise resolves them
 * redundantly alongside A/AAAA, adding latency for no benefit in this setup. */
const BLOCK_HTTPS_SVCB_RULE = { query_type: [32, 33], action: 'predefined', rcode: 'NOERROR' }

export function buildRegionConfig(
  region: Region,
  directTag: string,
  proxyTag: string,
  singboxTarget: SingboxTarget,
): RegionConfigResult {
  if (region === 'ua') {
    // geosite-ua/geosite-ru don't exist as published .srs files, so domains can't be
    // pre-sorted by suffix — resolve first, then re-route by which country's geoip the
    // resolved address actually falls into. `alpha` probes once via dns-direct and only
    // re-queries dns-local/dns-remote once classified (needs sing-box 1.14's evaluate/
    // match_response). `stable` folds probe+answer into one query per candidate server —
    // works on any current release, at the cost of an extra DNS round trip for domains
    // that turn out to be neither UA nor RU.
    const dnsRules =
      singboxTarget === 'alpha'
        ? [
            BLOCK_HTTPS_SVCB_RULE,
            { domain_suffix: '.lan', action: 'predefined', rcode: 'NOERROR' },
            { action: 'evaluate', server: 'dns-direct' },
            { match_response: true, rule_set: 'geoip-ua', action: 'route', server: 'dns-local' },
            { match_response: true, rule_set: 'geoip-ru', action: 'route', server: 'dns-remote' },
            { action: 'route', server: 'dns-direct' },
          ]
        : [
            BLOCK_HTTPS_SVCB_RULE,
            { domain_suffix: '.lan', action: 'predefined', rcode: 'NOERROR' },
            { rule_set: 'geoip-ua', server: 'dns-local' },
            { rule_set: 'geoip-ru', server: 'dns-remote' },
            { action: 'route', server: 'dns-direct' },
          ]
    return {
      dns: {
        strategy: 'prefer_ipv4',
        servers: [
          { type: 'local', tag: 'dns-local' },
          {
            type: 'https',
            tag: 'dns-remote',
            server: '1.1.1.1',
            path: '/dns-query',
            detour: proxyTag,
          },
          {
            type: 'https',
            tag: 'dns-direct',
            server: '1.1.1.1',
            path: '/dns-query',
          },
        ],
        rules: dnsRules,
        final: 'dns-direct',
      },
      extraRuleSets: [
        {
          type: 'remote',
          tag: 'geoip-ua',
          format: 'binary',
          url: 'https://raw.githubusercontent.com/SagerNet/sing-geoip/rule-set/geoip-ua.srs',
          download_detour: directTag,
        },
        {
          type: 'remote',
          tag: 'geoip-ru',
          format: 'binary',
          url: 'https://raw.githubusercontent.com/SagerNet/sing-geoip/rule-set/geoip-ru.srs',
          download_detour: proxyTag,
        },
        // CDN edge ranges — final is "proxy" for this region, so without these, CDN
        // traffic (unblocked, not needing the tunnel) would take an unnecessary detour
        // through it. Not needed for the "ru" region, whose final is already "direct".
        ...(
          [
            ['cdn-cloudflare', 'cloudflare'],
            ['cdn-google', 'google'],
            ['cdn-fastly', 'fastly'],
            ['cdn-cloudfront', 'cloudfront'],
          ] as const
        ).map(([tag, name]) => ({
          type: 'remote',
          tag,
          format: 'binary',
          url: `https://raw.githubusercontent.com/Loyalsoldier/geoip/release/srs/${name}.srs`,
          download_detour: directTag,
        })),
      ],
      // geoip-ru must be checked before the CDN rule_set: some resources reachable only
      // through the tunnel may themselves sit behind Cloudflare, so the tunnel decision
      // has to win over the "it's a CDN, go direct" shortcut.
      routeRules: [
        { ip_is_private: true, outbound: directTag },
        { rule_set: 'geoip-ru', outbound: proxyTag },
        { rule_set: ['cdn-cloudflare', 'cdn-google', 'cdn-fastly', 'cdn-cloudfront'], outbound: directTag },
        { rule_set: 'geoip-ua', outbound: directTag },
      ],
      needsIpResolve: true,
      defaultDomainResolver: 'dns-local',
    }
  }

  if (region === 'ru') {
    // Domains RKN blocks by name resolve straight through dns-remote. Everything else
    // resolves locally by default. `alpha` probes once via dns-local and re-queries
    // dns-remote only if the resolved IP itself falls into the (separately maintained)
    // blocked-IP list — needs sing-box 1.14's evaluate/match_response to decouple the
    // probe from the answer. `stable` can't decouple them: it checks dns-local's own
    // answer against the blocked-IP list, so a domain whose dns-local answer is already
    // blocked-looking is *kept* rather than re-resolved via dns-remote — no clean-answer
    // fallback for name-unlisted domains, unlike the alpha variant.
    const dnsRules =
      singboxTarget === 'alpha'
        ? [
            BLOCK_HTTPS_SVCB_RULE,
            { domain_suffix: '.lan', action: 'predefined', rcode: 'NOERROR' },
            { rule_set: ['geosite-ru-blocked'], server: 'dns-remote' },
            { action: 'evaluate', server: 'dns-local' },
            { match_response: true, rule_set: 'geoip-ru-blocked', action: 'route', server: 'dns-remote' },
            { action: 'route', server: 'dns-local' },
          ]
        : [
            BLOCK_HTTPS_SVCB_RULE,
            { domain_suffix: '.lan', action: 'predefined', rcode: 'NOERROR' },
            { rule_set: ['geosite-ru-blocked'], server: 'dns-remote' },
            { rule_set: 'geoip-ru-blocked', server: 'dns-local' },
            { action: 'route', server: 'dns-local' },
          ]
    return {
      dns: {
        strategy: 'prefer_ipv4',
        servers: [
          { type: 'local', tag: 'dns-local' },
          {
            type: 'https',
            tag: 'dns-remote',
            server: '9.9.9.9',
            path: '/dns-query',
            detour: proxyTag,
          },
        ],
        rules: dnsRules,
        final: 'dns-local',
      },
      extraRuleSets: [
        {
          type: 'remote',
          tag: 'geosite-ru-blocked',
          format: 'binary',
          url: 'https://raw.githubusercontent.com/runetfreedom/russia-v2ray-rules-dat/release/sing-box/rule-set-geosite/geosite-ru-blocked.srs',
          download_detour: proxyTag,
        },
        {
          type: 'remote',
          tag: 'geoip-ru-blocked',
          format: 'binary',
          url: 'https://raw.githubusercontent.com/runetfreedom/russia-v2ray-rules-dat/release/sing-box/rule-set-geoip/geoip-ru-blocked.srs',
          download_detour: proxyTag,
        },
      ],
      // No CDN rule_set here: final for this region is already "direct", so unblocked
      // CDN traffic already goes direct for free — adding one would only add a startup
      // dependency on another GitHub-hosted .srs download for no behavioral change.
      routeRules: [],
      needsIpResolve: false,
      defaultDomainResolver: 'dns-local',
    }
  }

  return {
    dns: {
      servers: [{ type: 'https', tag: 'dns-remote', server: '1.1.1.1', path: '/dns-query' }],
      rules: [BLOCK_HTTPS_SVCB_RULE],
      final: 'dns-remote',
    },
    extraRuleSets: [],
    routeRules: [],
    needsIpResolve: false,
    defaultDomainResolver: 'dns-remote',
  }
}
