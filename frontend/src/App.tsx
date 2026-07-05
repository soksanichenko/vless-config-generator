import { useEffect, useMemo, useState } from 'react'
import { ClientInfo } from './components/ClientInfo'
import { ConfigPaste } from './components/ConfigPaste'
import { RuleSetManager } from './components/RuleSetManager'
import { RuleList } from './components/RuleList'
import { DefaultOutboundToggle } from './components/DefaultOutboundToggle'
import { RegionSelector } from './components/RegionSelector'
import { OutputPanel } from './components/OutputPanel'
import { LanguageSwitcher } from './components/LanguageSwitcher'
import { buildOutputConfig } from './lib/buildConfig'
import { DEFAULT_CONFIG_TEXT } from './lib/defaultConfig'
import { listOutbounds } from './types/singbox'
import type { SingBoxConfig } from './types/singbox'
import type { Action, Rule, RuleSetDef } from './types/rules'
import type { ClientResponse, VlessClient } from './types/clients'
import type { Region } from './types/region'
import { useLang } from './i18n/LangContext'

export function App() {
  const { lang, setLang, t } = useLang()
  const [client, setClient] = useState<VlessClient | null>(null)
  const [clientError, setClientError] = useState<string | null>(null)

  const [configText, setConfigText] = useState(DEFAULT_CONFIG_TEXT)
  const [parsedConfig, setParsedConfig] = useState<SingBoxConfig | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)

  const [directTag, setDirectTag] = useState('')
  const [proxyTag, setProxyTag] = useState('')
  const [proxyOutboundIndex, setProxyOutboundIndex] = useState<number | null>(null)

  const [ruleSets, setRuleSets] = useState<RuleSetDef[]>([])
  const [rules, setRules] = useState<Rule[]>([])
  const [defaultAction, setDefaultAction] = useState<Action>('direct')
  const [region, setRegion] = useState<Region>('default')

  useEffect(() => {
    fetch('/api/client')
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json() as Promise<ClientResponse>
      })
      .then((data) => setClient(data.client))
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
  }, [parsedConfig])

  const warnings = useMemo(() => {
    const messages: string[] = []
    if (parsedConfig && !directTag) messages.push(t('warnings.noDirect'))
    if (parsedConfig && !proxyTag) messages.push(t('warnings.noProxy'))
    if (rules.some((rule) => rule.conditions.length === 0)) {
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
    })
  }, [parsedConfig, rules, ruleSets, defaultAction, directTag, proxyTag, proxyOutboundIndex, client, region])

  return (
    <div className="app">
      <div className="app-header">
        <div>
          <h1>{t('app.title')}</h1>
          <p className="subtitle">{t('app.subtitle')}</p>
        </div>
        <LanguageSwitcher value={lang} onChange={setLang} />
      </div>

      <ClientInfo client={client} loadError={clientError} />

      <RegionSelector value={region} onChange={setRegion} />

      <ConfigPaste value={configText} onChange={setConfigText} error={parseError} />

      <RuleSetManager ruleSets={ruleSets} onChange={setRuleSets} />

      <RuleList rules={rules} ruleSets={ruleSets} onChange={setRules} />

      <DefaultOutboundToggle value={defaultAction} onChange={setDefaultAction} />

      <OutputPanel config={outputConfig} warnings={warnings} />
    </div>
  )
}
