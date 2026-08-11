import type { SingBoxConfig } from '../types/singbox'
import type { Region } from '../types/region'

/**
 * Recovers which region profile a pasted/loaded config's `dns` section was built
 * for. buildRegionConfig (regionConfig.ts) gives each region a distinct dns.servers
 * shape, which is a more reliable fingerprint than digging through route.rule_set
 * tags since it's always present, even when a region adds no rule sets of its own:
 * - `ua`: three servers, tagged dns-local/dns-remote/dns-direct.
 * - `ru`: two servers, tagged dns-local/dns-remote, with dns-remote at 9.9.9.9.
 * - `default`: a single dns-remote server at 1.1.1.1.
 * Only meaningful for configs this tool (or an earlier version of it) produced;
 * returns null for anything else rather than guessing.
 */
export function detectRegion(config: SingBoxConfig): Region | null {
  const dns = config.dns
  if (!dns || typeof dns !== 'object') return null
  const servers = (dns as Record<string, unknown>).servers
  if (!Array.isArray(servers)) return null

  const isServerObject = (server: unknown): server is Record<string, unknown> =>
    typeof server === 'object' && server !== null

  const hasTag = (tag: string): boolean => servers.some((server) => isServerObject(server) && server.tag === tag)
  const hasServerAddress = (address: string): boolean =>
    servers.some((server) => isServerObject(server) && server.server === address)

  if (hasTag('dns-direct') && hasTag('dns-local') && hasTag('dns-remote')) return 'ua'
  if (hasTag('dns-local') && hasTag('dns-remote') && hasServerAddress('9.9.9.9')) return 'ru'
  if (servers.length === 1 && hasTag('dns-remote') && hasServerAddress('1.1.1.1')) return 'default'
  return null
}
