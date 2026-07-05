import { useEffect, useMemo, useState } from 'react'
import { ClientDropdown } from './components/ClientDropdown'
import { ConfigPaste } from './components/ConfigPaste'
import { OutboundMapping } from './components/OutboundMapping'
import { RuleSetManager } from './components/RuleSetManager'
import { RuleList } from './components/RuleList'
import { DefaultOutboundToggle } from './components/DefaultOutboundToggle'
import { OutputPanel } from './components/OutputPanel'
import { buildOutputConfig } from './lib/buildConfig'
import { DEFAULT_CONFIG_TEXT } from './lib/defaultConfig'
import { listOutbounds } from './types/singbox'
import type { SingBoxConfig } from './types/singbox'
import type { Action, Rule, RuleSetDef } from './types/rules'
import type { ClientsFile, VlessClient } from './types/clients'

export function App() {
  const [clients, setClients] = useState<VlessClient[]>([])
  const [clientsError, setClientsError] = useState<string | null>(null)
  const [selectedClientEmail, setSelectedClientEmail] = useState<string | null>(null)

  const [configText, setConfigText] = useState(DEFAULT_CONFIG_TEXT)
  const [parsedConfig, setParsedConfig] = useState<SingBoxConfig | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)

  const [directTag, setDirectTag] = useState('')
  const [proxyTag, setProxyTag] = useState('')
  const [proxyOutboundIndex, setProxyOutboundIndex] = useState<number | null>(null)

  const [ruleSets, setRuleSets] = useState<RuleSetDef[]>([])
  const [rules, setRules] = useState<Rule[]>([])
  const [defaultAction, setDefaultAction] = useState<Action>('direct')

  useEffect(() => {
    fetch('/api/clients')
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json() as Promise<ClientsFile>
      })
      .then((data) => setClients(data.clients ?? []))
      .catch((error: unknown) => setClientsError(error instanceof Error ? error.message : String(error)))
  }, [])

  useEffect(() => {
    const trimmed = configText.trim()
    if (!trimmed) {
      setParsedConfig(null)
      setParseError(null)
      return
    }
    try {
      const parsed = JSON.parse(trimmed) as SingBoxConfig
      setParsedConfig(parsed)
      setParseError(null)
    } catch (error) {
      setParsedConfig(null)
      setParseError(error instanceof Error ? error.message : String(error))
    }
  }, [configText])

  const outbounds = useMemo(() => (parsedConfig ? listOutbounds(parsedConfig) : []), [parsedConfig])

  // Auto-detect direct/proxy outbounds whenever a new config is parsed.
  useEffect(() => {
    if (outbounds.length === 0) {
      setDirectTag('')
      setProxyTag('')
      setProxyOutboundIndex(null)
      return
    }
    const direct = outbounds.find((outbound) => outbound.type === 'direct')
    const proxy = outbounds.find((outbound) => outbound.type === 'vless')
    setDirectTag(direct?.tag ?? '')
    setProxyTag(proxy?.tag ?? '')
    setProxyOutboundIndex(proxy?.index ?? null)
    // Re-detect only when a new config is pasted, not on every outbound-mapping edit.
  }, [parsedConfig])

  const selectedClient = clients.find((client) => client.email === selectedClientEmail) ?? null

  const warnings = useMemo(() => {
    const messages: string[] = []
    if (parsedConfig && !directTag) messages.push('No direct outbound selected — rules using "Direct" will reference an empty tag.')
    if (parsedConfig && !proxyTag) messages.push('No proxy outbound selected — rules using "Proxy" will reference an empty tag.')
    if (rules.some((rule) => rule.conditions.length === 0)) {
      messages.push('One or more rules have no conditions and will be dropped from the output.')
    }
    return messages
  }, [parsedConfig, directTag, proxyTag, rules])

  const outputConfig = useMemo(() => {
    if (!parsedConfig) return null
    return buildOutputConfig({
      config: parsedConfig,
      rules,
      ruleSets,
      defaultAction,
      directTag,
      proxyTag,
      proxyOutboundIndex,
      selectedClient,
    })
  }, [parsedConfig, rules, ruleSets, defaultAction, directTag, proxyTag, proxyOutboundIndex, selectedClient])

  return (
    <div className="app">
      <h1>VLESS Config Generator</h1>
      <p className="subtitle">Build sing-box routing rules for your VLESS/Reality client config.</p>

      <ClientDropdown
        clients={clients}
        loadError={clientsError}
        selectedEmail={selectedClientEmail}
        onSelect={setSelectedClientEmail}
      />

      <ConfigPaste value={configText} onChange={setConfigText} error={parseError} />

      <OutboundMapping
        outbounds={outbounds}
        directTag={directTag}
        proxyTag={proxyTag}
        proxyOutboundIndex={proxyOutboundIndex}
        onDirectTagChange={setDirectTag}
        onProxyChange={(tag, index) => {
          setProxyTag(tag)
          setProxyOutboundIndex(index)
        }}
      />

      <RuleSetManager ruleSets={ruleSets} onChange={setRuleSets} />

      <RuleList rules={rules} ruleSets={ruleSets} onChange={setRules} />

      <DefaultOutboundToggle value={defaultAction} onChange={setDefaultAction} />

      <OutputPanel config={outputConfig} warnings={warnings} />
    </div>
  )
}
