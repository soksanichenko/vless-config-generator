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
        Paste your existing sing-box client config. Only the <code>route</code> section (and the
        selected proxy outbound's credentials, if a client is picked above) will be changed —
        everything else passes through untouched.
      </p>
      {error && <div className="error-banner">{error}</div>}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="{ ... paste your sing-box config.json here ... }"
        spellCheck={false}
      />
    </div>
  )
}
