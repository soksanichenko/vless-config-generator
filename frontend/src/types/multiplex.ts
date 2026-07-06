export type MultiplexProtocol = 'h2mux' | 'smux' | 'yamux'

export interface MultiplexSettings {
  enabled: boolean
  protocol: MultiplexProtocol
  maxConnections: number
  minStreams: number
  padding: boolean
}

export const MULTIPLEX_PROTOCOLS: MultiplexProtocol[] = ['h2mux', 'smux', 'yamux']

export const DEFAULT_MULTIPLEX_SETTINGS: MultiplexSettings = {
  enabled: false,
  protocol: 'h2mux',
  maxConnections: 4,
  minStreams: 4,
  padding: false,
}
