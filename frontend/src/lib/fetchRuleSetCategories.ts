import { GEOIP_CATEGORIES, GEOSITE_CATEGORIES } from './ruleSetCategories'

const CACHE_TTL_MS = 24 * 60 * 60 * 1000

type CacheEntry = {
  fetchedAt: number
  categories: string[]
}

function cacheKey(kind: 'geosite' | 'geoip'): string {
  return `ruleset-categories:${kind}`
}

function readCache(kind: 'geosite' | 'geoip'): CacheEntry | null {
  try {
    const raw = localStorage.getItem(cacheKey(kind))
    if (!raw) return null
    return JSON.parse(raw) as CacheEntry
  } catch {
    return null
  }
}

function writeCache(kind: 'geosite' | 'geoip', categories: string[]): void {
  try {
    const entry: CacheEntry = { fetchedAt: Date.now(), categories }
    localStorage.setItem(cacheKey(kind), JSON.stringify(entry))
  } catch {
    // localStorage unavailable (private browsing, quota) — skip caching.
  }
}

async function fetchFromBackend(kind: 'geosite' | 'geoip'): Promise<string[]> {
  const response = await fetch(`/api/ruleset-categories?kind=${kind}`)
  if (!response.ok) throw new Error(`Backend category lookup failed: ${response.status}`)
  const body = (await response.json()) as { categories: string[] }
  if (!body.categories || body.categories.length === 0) {
    throw new Error('Backend returned no matching rule sets')
  }
  return body.categories
}

/**
 * Resolves the known geosite/geoip category names, preferring a same-day
 * localStorage cache, then this app's own backend (which does the actual
 * GitHub fetch + Redis caching server-side), then the bundled fallback list.
 */
export async function getRuleSetCategories(kind: 'geosite' | 'geoip'): Promise<string[]> {
  const cached = readCache(kind)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.categories
  }

  try {
    const categories = await fetchFromBackend(kind)
    writeCache(kind, categories)
    return categories
  } catch {
    if (cached) return cached.categories
    return kind === 'geosite' ? GEOSITE_CATEGORIES : GEOIP_CATEGORIES
  }
}
