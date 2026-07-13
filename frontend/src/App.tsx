import { useEffect, useMemo, useState } from 'react'
import { ClientInfo } from './components/ClientInfo'
import { ConfigPaste } from './components/ConfigPaste'
import { ImportWarnings } from './components/ImportWarnings'
import { RuleSetManager } from './components/RuleSetManager'
import { RuleList } from './components/RuleList'
import { DefaultOutboundToggle } from './components/DefaultOutboundToggle'
import { RegionSelector } from './components/RegionSelector'
import { MultiplexSettings } from './components/MultiplexSettings'
import { OutputPanel } from './components/OutputPanel'
import { LanguageSwitcher } from './components/LanguageSwitcher'
import { buildOutputConfig } from './lib/buildConfig'
import { DEFAULT_CONFIG_TEXT } from './lib/defaultConfig'
import { parseExistingRoute } from './lib/parseRoute'
import { listOutbounds } from './types/singbox'
import type { SingBoxConfig } from './types/singbox'
import type { FinalAction, Rule, RuleSetDef } from './types/rules'
import type { ClientsResponse, VlessClient } from './types/clients'
import type { Region } from './types/region'
import { DEFAULT_MULTIPLEX_SETTINGS } from './types/multiplex'
import type { MultiplexSettings as MultiplexSettingsValue } from './types/multiplex'
import { useLang } from './i18n/LangContext'

export function App() {
  const { lang, setLang, t } = useLang()
  const [clients, setClients] = useState<VlessClient[]>([])
  const [selectedUuid, setSelectedUuid] = useState<string | null>(null)
  const [clientError, setClientError] = useState<string | null>(null)
  const client = useMemo(
    () => clients.find((candidate) => candidate.uuid === selectedUuid) ?? null,
    [clients, selectedUuid],
  )

  const [configText, setConfigText] = useState(DEFAULT_CONFIG_TEXT)
  const [parsedConfig, setParsedConfig] = useState<SingBoxConfig | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)

  const [directTag, setDirectTag] = useState('')
  const [proxyTag, setProxyTag] = useState('')
  const [proxyOutboundIndex, setProxyOutboundIndex] = useState<number | null>(null)

  const [ruleSets, setRuleSets] = useState<RuleSetDef[]>([])
  const [rules, setRules] = useState<Rule[]>([])
  const [defaultAction, setDefaultAction] = useState<FinalAction>('direct')
  const [skippedImport, setSkippedImport] = useState<{
    ruleSets: Record<string, unknown>[]
    rules: Record<string, unknown>[]
  }>({ ruleSets: [], rules: [] })
  const [region, setRegion] = useState<Region>('default')
  const [multiplex, setMultiplex] = useState<MultiplexSettingsValue>(DEFAULT_MULTIPLEX_SETTINGS)

  useEffect(() => {
    fetch('/api/clients')
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json() as Promise<ClientsResponse>
      })
      .then((data) => {
        setClients(data.clients)
        setSelectedUuid(data.clients[0]?.uuid ?? null)
      })
      .catch((error: unknown) => setClientError(error instanceof Error ? error.message : String(error)))
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

  // Auto-detect direct/proxy outbounds whenever a new config is parsed, and — if the
  // rule builder is still empty — import any rules/rule sets already baked into the
  // pasted config's `route` section, since buildConfig would otherwise silently
  // discard them the moment it regenerates `route` from scratch. Intentionally reads
  // `rules`/`ruleSets` without listing them as dependencies: this must only fire off
  // of a config paste, not on every manual rule edit.
  useEffect(() => {
    if (outbounds.length === 0) {
      setDirectTag('')
      setProxyTag('')
      setProxyOutboundIndex(null)
      setSkippedImport({ ruleSets: [], rules: [] })
      return
    }
    const direct = outbounds.find((outbound) => outbound.type === 'direct')
    const proxy = outbounds.find((outbound) => outbound.type === 'vless')
    const newDirectTag = direct?.tag ?? ''
    const newProxyTag = proxy?.tag ?? ''
    setDirectTag(newDirectTag)
    setProxyTag(newProxyTag)
    setProxyOutboundIndex(proxy?.index ?? null)

    if (parsedConfig && rules.length === 0 && ruleSets.length === 0) {
      const parsed = parseExistingRoute(parsedConfig, newDirectTag, newProxyTag)
      if (parsed.ruleSets.length > 0) setRuleSets(parsed.ruleSets)
      if (parsed.rules.length > 0) setRules(parsed.rules)
      if (parsed.defaultAction) setDefaultAction(parsed.defaultAction)
      setSkippedImport({ ruleSets: parsed.skippedRuleSets, rules: parsed.skippedRules })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedConfig])

  const warnings = useMemo(() => {
    const messages: string[] = []
    if (parsedConfig && !directTag) messages.push(t('warnings.noDirect'))
    if (parsedConfig && !proxyTag) messages.push(t('warnings.noProxy'))
    if (
      rules.some((rule) =>
        rule.mode === 'logical'
          ? rule.branches.every((branch) => branch.conditions.length === 0)
          : rule.conditions.length === 0,
      )
    ) {
      messages.push(t('warnings.emptyRules'))
    }
    return messages
  }, [parsedConfig, directTag, proxyTag, rules, t])

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
      selectedClient: client,
      region,
      multiplex,
    })
  }, [
    parsedConfig,
    rules,
    ruleSets,
    defaultAction,
    directTag,
    proxyTag,
    proxyOutboundIndex,
    client,
    region,
    multiplex,
  ])

  return (
    <div className="app">
      <div className="app-header">
        <div>
          <h1>{t('app.title')}</h1>
          <p className="subtitle">{t('app.subtitle')}</p>
        </div>
        <LanguageSwitcher value={lang} onChange={setLang} />
      </div>

      <ClientInfo
        clients={clients}
        selectedUuid={selectedUuid}
        onSelect={setSelectedUuid}
        loadError={clientError}
      />

      <RegionSelector value={region} onChange={setRegion} />

      <MultiplexSettings value={multiplex} onChange={setMultiplex} />

      <ConfigPaste value={configText} onChange={setConfigText} error={parseError} />

      <ImportWarnings ruleSets={skippedImport.ruleSets} rules={skippedImport.rules} />

      <RuleSetManager ruleSets={ruleSets} onChange={setRuleSets} />

      <RuleList rules={rules} ruleSets={ruleSets} onChange={setRules} />

      <DefaultOutboundToggle value={defaultAction} onChange={setDefaultAction} />

      <OutputPanel config={outputConfig} warnings={warnings} />
    </div>
  )
}
