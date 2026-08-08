export interface SavedConfigMeta {
  id: string
  createdAt: string
}

export interface SavedConfigsResponse {
  configs: SavedConfigMeta[]
}

export interface SavedConfigDetail extends SavedConfigMeta {
  config: string
}
