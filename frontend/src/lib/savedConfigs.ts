import type { SavedConfigDetail, SavedConfigMeta, SavedConfigsResponse } from '../types/savedConfig'

export async function listSavedConfigs(): Promise<SavedConfigMeta[]> {
  const response = await fetch('/api/saved-configs')
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const data = (await response.json()) as SavedConfigsResponse
  return data.configs
}

export async function saveConfig(configText: string): Promise<SavedConfigMeta> {
  const response = await fetch('/api/saved-configs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config: configText }),
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return (await response.json()) as SavedConfigMeta
}

export async function fetchSavedConfig(id: string): Promise<SavedConfigDetail> {
  const response = await fetch(`/api/saved-configs/${id}`)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return (await response.json()) as SavedConfigDetail
}

export async function deleteSavedConfig(id: string): Promise<void> {
  const response = await fetch(`/api/saved-configs/${id}`, { method: 'DELETE' })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
}
