export interface VlessClient {
  email: string
  uuid: string
  server: string
  serverPort: number
  publicKey: string
  shortId: string
  serverName: string
}

export interface ClientResponse {
  client: VlessClient
}
