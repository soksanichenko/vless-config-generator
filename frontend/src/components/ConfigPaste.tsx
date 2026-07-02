import { DEFAULT_CONFIG_TEXT } from '../lib/defaultConfig'

interface Props {
  value: string
  onChange: (value: string) => void
  error: string | null
}

export function ConfigPaste({ value, onChange, error }: Props) {
  return (
    <div className="card">
      <h2>2. Base config.json</h2>
      <p className="help-text">
        Paste your existing sing-box client config, or start from the default template below and
        edit it directly. Only the <code>route</code> section (and the selected proxy outbound's
        credentials, if a client is picked above) will be changed — everything else passes through
        untouched. A <code>sniff</code> rule and a DNS-hijack rule are always added ahead of your
        rules, since domain-based matching needs them to see anything at all.
      </p>
      {error && <div className="error-banner">{error}</div>}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="{ ... paste your sing-box config.json here ... }"
        spellCheck={false}
      />
      <div className="row spacer-top">
        <button type="button" onClick={() => onChange(DEFAULT_CONFIG_TEXT)}>
          Reset to default template
        </button>
      </div>
    </div>
  )
}
