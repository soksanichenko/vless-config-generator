import { GEOIP_CATEGORIES, GEOSITE_CATEGORIES } from './ruleSetCategories'

export type RuleSetSource = 'sagernet' | 'runetfreedom'

const CACHE_TTL_MS = 24 * 60 * 60 * 1000

type CacheEntry = {
  fetchedAt: number
  categories: string[]
}

function cacheKey(source: RuleSetSource, kind: 'geosite' | 'geoip'): string {
  return `ruleset-categories:${source}:${kind}`
}

function readCache(source: RuleSetSource, kind: 'geosite' | 'geoip'): CacheEntry | null {
  try {
    const raw = localStorage.getItem(cacheKey(source, kind))
    if (!raw) return null
    return JSON.parse(raw) as CacheEntry
  } catch {
    return null
  }
}

function writeCache(source: RuleSetSource, kind: 'geosite' | 'geoip', categories: string[]): void {
  try {
    const entry: CacheEntry = { fetchedAt: Date.now(), categories }
    localStorage.setItem(cacheKey(source, kind), JSON.stringify(entry))
  } catch {
    // localStorage unavailable (private browsing, quota) — skip caching.
  }
}

async function fetchFromBackend(source: RuleSetSource, kind: 'geosite' | 'geoip'): Promise<string[]> {
  const response = await fetch(`/api/ruleset-categories?kind=${kind}&source=${source}`)
  if (!response.ok) throw new Error(`Backend category lookup failed: ${response.status}`)
  const body = (await response.json()) as { categories: string[] }
  if (!body.categories || body.categories.length === 0) {
    throw new Error('Backend returned no matching rule sets')
  }
  return body.categories
}

/**
 * Resolves the known geosite/geoip category names for a source, preferring a
 * same-day localStorage cache, then this app's own backend (which does the actual
 * GitHub fetch + Redis caching server-side). The bundled offline fallback list only
 * covers SagerNet (this tool's original/default source) — for any other source, a
 * failed fetch with no cache just yields an empty list rather than a misleading
 * guess at what that source actually publishes.
 */
export async function getRuleSetCategories(
  kind: 'geosite' | 'geoip',
  source: RuleSetSource = 'sagernet',
): Promise<string[]> {
  const cached = readCache(source, kind)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.categories
  }

  try {
    const categories = await fetchFromBackend(source, kind)
    writeCache(source, kind, categories)
    return categories
  } catch {
    if (cached) return cached.categories
    if (source !== 'sagernet') return []
    return kind === 'geosite' ? GEOSITE_CATEGORIES : GEOIP_CATEGORIES
  }
}
