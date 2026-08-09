import { useEffect, useMemo, useState } from 'react'
import { ClientInfo } from './components/ClientInfo'
import { ConfigPaste } from './components/ConfigPaste'
import { ImportWarnings } from './components/ImportWarnings'
import { RuleSetManager } from './components/RuleSetManager'
import { RuleList } from './components/RuleList'
import { BuilderModeToggle } from './components/BuilderModeToggle'
import { SimpleResourcePicker } from './components/SimpleResourcePicker'
import { DefaultOutboundToggle } from './components/DefaultOutboundToggle'
import { RegionSelector } from './components/RegionSelector'
import { MultiplexSettings } from './components/MultiplexSettings'
import { SingboxTargetSelector } from './components/SingboxTargetSelector'
import { OutputPanel } from './components/OutputPanel'
import { SavedConfigs } from './components/SavedConfigs'
import { LanguageSwitcher } from './components/LanguageSwitcher'
import { UserMenu } from './components/UserMenu'
import { buildOutputConfig } from './lib/buildConfig'
import { DEFAULT_CONFIG_TEXT } from './lib/defaultConfig'
import { parseExistingRoute } from './lib/parseRoute'
import { listOutbounds } from './types/singbox'
import type { SingBoxConfig } from './types/singbox'
import type { FinalAction, Rule, RuleSetDef } from './types/rules'
import type { ClientsResponse, VlessClient } from './types/clients'
import type { Whoami } from './types/whoami'
import { regionForLang } from './types/region'
import type { Region } from './types/region'
import { DEFAULT_MULTIPLEX_SETTINGS } from './types/multiplex'
import type { MultiplexSettings as MultiplexSettingsValue } from './types/multiplex'
import { DEFAULT_SINGBOX_TARGET } from './types/singboxTarget'
import type { SingboxTarget } from './types/singboxTarget'
import { DEFAULT_BUILDER_MODE } from './types/builderMode'
import type { BuilderMode } from './types/builderMode'
import { useLang } from './i18n/LangContext'

export function App() {
  const { lang, setLang, t } = useLang()
  const [clients, setClients] = useState<VlessClient[]>([])
  const [selectedUuid, setSelectedUuid] = useState<string | null>(null)
  const [clientError, setClientError] = useState<string | null>(null)
  const [canGenerateCredentials, setCanGenerateCredentials] = useState(false)
  const [generateStatus, setGenerateStatus] = useState<
    'idle' | 'generating' | 'provisioning' | 'error'
  >('idle')
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
  const [builderMode, setBuilderMode] = useState<BuilderMode>(DEFAULT_BUILDER_MODE)
  const [region, setRegion] = useState<Region>(() => regionForLang(lang))
  // Region tracks the UI language only until the user picks one explicitly —
  // after that, language and region change independently of each other (see
  // handleRegionChange below). Not tied to builderMode: the Region control
  // is available in both Basic and Advanced.
  const [regionFollowsLang, setRegionFollowsLang] = useState(true)
  const [multiplex, setMultiplex] = useState<MultiplexSettingsValue>(DEFAULT_MULTIPLEX_SETTINGS)
  const [singboxTarget, setSingboxTarget] = useState<SingboxTarget>(DEFAULT_SINGBOX_TARGET)

  useEffect(() => {
    if (regionFollowsLang) setRegion(regionForLang(lang))
  }, [regionFollowsLang, lang])

  function handleRegionChange(value: Region) {
    setRegion(value)
    setRegionFollowsLang(false)
  }

  async function loadClients(): Promise<VlessClient[]> {
    const response = await fetch('/api/clients')
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = (await response.json()) as ClientsResponse
    setClients(data.clients)
    setSelectedUuid((current) => current ?? data.clients[0]?.uuid ?? null)
    return data.clients
  }

  useEffect(() => {
    loadClients().catch((error: unknown) =>
      setClientError(error instanceof Error ? error.message : String(error)),
    )
  }, [])

  useEffect(() => {
    fetch('/api/whoami')
      .then((response) => (response.ok ? (response.json() as Promise<Whoami>) : null))
      .then((data) => setCanGenerateCredentials(data?.canGenerateCredentials ?? false))
      .catch(() => setCanGenerateCredentials(false))
  }, [])

  async function handleGenerateCredentials() {
    setGenerateStatus('generating')
    try {
      const response = await fetch('/api/self-service/generate', { method: 'POST' })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
    } catch (error: unknown) {
      setGenerateStatus('error')
      setClientError(error instanceof Error ? error.message : String(error))
      return
    }
    setCanGenerateCredentials(false)
    setGenerateStatus('provisioning')

    // The new client starts out "pending" (see vless_admin.auth's
    // _LOGIN_ALLOWED_STATUSES) until the infra add-client GitHub Actions
    // workflow this endpoint dispatched confirms — same asynchronous
    // window the admin panel's own "Add client" already has, just polled
    // from the SPA side instead of a manual page reload. Same 5s cadence
    // as the admin dashboard's own status poll.
    for (let attempt = 0; attempt < 12; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 5000))
      try {
        const found = await loadClients()
        if (found.length > 0) {
          setClientError(null)
          setGenerateStatus('idle')
          return
        }
      } catch {
        // keep polling — a transient failure here shouldn't abandon the wait
      }
    }
    // Still not provisioned after a minute — leave status as 'provisioning'
    // rather than 'error': generation itself succeeded, this is just slow.
  }

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
      singboxTarget,
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
    singboxTarget,
  ])

  const isAdvanced = builderMode === 'advanced'
  const configPasteStep = isAdvanced ? 5 : 3
  const routingRulesStep = isAdvanced ? 6 : 4
  const defaultOutboundStep = isAdvanced ? 7 : 5
  const outputStep = isAdvanced ? 8 : 6
  const savedConfigsStep = isAdvanced ? 9 : 7

  return (
    <div className="app">
      <div className="app-header">
        <div>
          <h1>{t('app.title')}</h1>
          <p className="subtitle">{t('app.subtitle')}</p>
        </div>
        <div className="header-actions">
          <LanguageSwitcher value={lang} onChange={setLang} />
          <a className="button" href="https://meow-elite.club/">
            {t('header.portal')}
          </a>
          <UserMenu />
        </div>
      </div>

      <BuilderModeToggle value={builderMode} onChange={setBuilderMode} />

      <ClientInfo
        clients={clients}
        selectedUuid={selectedUuid}
        onSelect={setSelectedUuid}
        loadError={clientError}
        canGenerateCredentials={canGenerateCredentials}
        generateStatus={generateStatus}
        onGenerateCredentials={handleGenerateCredentials}
      />

      <RegionSelector value={region} onChange={handleRegionChange} />

      {isAdvanced && (
        <>
          <MultiplexSettings value={multiplex} onChange={setMultiplex} />

          <SingboxTargetSelector value={singboxTarget} onChange={setSingboxTarget} />
        </>
      )}

      <ConfigPaste stepNumber={configPasteStep} value={configText} onChange={setConfigText} error={parseError} />

      <ImportWarnings ruleSets={skippedImport.ruleSets} rules={skippedImport.rules} />

      {!isAdvanced && (
        <SimpleResourcePicker
          stepNumber={routingRulesStep}
          ruleSets={ruleSets}
          rules={rules}
          onChangeRuleSets={setRuleSets}
          onChangeRules={setRules}
        />
      )}

      {isAdvanced && (
        <>
          <RuleSetManager ruleSets={ruleSets} onChange={setRuleSets} />

          <RuleList stepNumber={routingRulesStep} rules={rules} ruleSets={ruleSets} onChange={setRules} />
        </>
      )}

      <DefaultOutboundToggle stepNumber={defaultOutboundStep} value={defaultAction} onChange={setDefaultAction} />

      <OutputPanel stepNumber={outputStep} config={outputConfig} warnings={warnings} />

      <SavedConfigs
        stepNumber={savedConfigsStep}
        config={outputConfig}
        loggedIn={clients.length > 0}
        onLoad={setConfigText}
      />
    </div>
  )
}
