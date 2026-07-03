import { useMemo, useRef } from 'react'
import { DEFAULT_CONFIG_TEXT } from '../lib/defaultConfig'
import { highlightJson } from '../lib/jsonHighlight'

interface Props {
  value: string
  onChange: (value: string) => void
  error: string | null
}

export function ConfigPaste({ value, onChange, error }: Props) {
  const highlightRef = useRef<HTMLPreElement>(null)
  const highlighted = useMemo(() => highlightJson(value), [value])

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
      <div className="code-editor">
        <pre className="code-editor-highlight" ref={highlightRef} aria-hidden="true">
          <code dangerouslySetInnerHTML={{ __html: `${highlighted}\n` }} />
        </pre>
        <textarea
          className="code-editor-input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onScroll={(event) => {
            if (highlightRef.current) {
              highlightRef.current.scrollTop = event.currentTarget.scrollTop
              highlightRef.current.scrollLeft = event.currentTarget.scrollLeft
            }
          }}
          placeholder="{ ... paste your sing-box config.json here ... }"
          spellCheck={false}
        />
      </div>
      <div className="row spacer-top">
        <button type="button" onClick={() => onChange(DEFAULT_CONFIG_TEXT)}>
          Reset to default template
        </button>
      </div>
    </div>
  )
}
