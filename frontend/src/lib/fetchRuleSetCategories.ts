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

async function fetchFromGitHub(kind: 'geosite' | 'geoip'): Promise<string[]> {
  const repo = kind === 'geosite' ? 'sing-geosite' : 'sing-geoip'
  const headers = { Accept: 'application/vnd.github+json' }

  const branchResponse = await fetch(`https://api.github.com/repos/SagerNet/${repo}/branches/rule-set`, {
    headers,
  })
  if (!branchResponse.ok) throw new Error(`GitHub branch lookup failed: ${branchResponse.status}`)
  const branch = (await branchResponse.json()) as { commit: { sha: string } }

  const treeResponse = await fetch(
    `https://api.github.com/repos/SagerNet/${repo}/git/trees/${branch.commit.sha}`,
    { headers },
  )
  if (!treeResponse.ok) throw new Error(`GitHub tree lookup failed: ${treeResponse.status}`)
  const tree = (await treeResponse.json()) as { tree: { path: string }[] }

  const pattern = new RegExp(`^${kind}-(.+)\\.srs$`)
  const categories = tree.tree
    .map((entry) => entry.path.match(pattern)?.[1])
    .filter((category): category is string => Boolean(category))
    .sort()

  if (categories.length === 0) throw new Error('GitHub tree returned no matching rule sets')
  return categories
}

/**
 * Resolves the known geosite/geoip category names, preferring a same-day
 * localStorage cache, then a live GitHub fetch, then the bundled fallback list.
 */
export async function getRuleSetCategories(kind: 'geosite' | 'geoip'): Promise<string[]> {
  const cached = readCache(kind)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.categories
  }

  try {
    const categories = await fetchFromGitHub(kind)
    writeCache(kind, categories)
    return categories
  } catch {
    if (cached) return cached.categories
    return kind === 'geosite' ? GEOSITE_CATEGORIES : GEOIP_CATEGORIES
  }
}
