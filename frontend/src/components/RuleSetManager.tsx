import { useState } from 'react'
import { newId } from '../lib/id'
import type { RuleSetDef } from '../types/rules'

interface Props {
  ruleSets: RuleSetDef[]
  onChange: (ruleSets: RuleSetDef[]) => void
}

function templateUrl(kind: 'geosite' | 'geoip', category: string): string {
  const repo = kind === 'geosite' ? 'sing-geosite' : 'sing-geoip'
  return `https://raw.githubusercontent.com/SagerNet/${repo}/rule-set/${kind}-${category}.srs`
}

export function RuleSetManager({ ruleSets, onChange }: Props) {
  const [kind, setKind] = useState<'geosite' | 'geoip'>('geosite')
  const [category, setCategory] = useState('')
  const [customTag, setCustomTag] = useState('')
  const [customUrl, setCustomUrl] = useState('')
  const [customFormat, setCustomFormat] = useState<'binary' | 'source'>('binary')

  function addQuick() {
    const trimmed = category.trim().toLowerCase()
    if (!trimmed) return
    const tag = `${kind}-${trimmed}`
    if (ruleSets.some((ruleSet) => ruleSet.tag === tag)) return
    onChange([...ruleSets, { id: newId(), tag, format: 'binary', url: templateUrl(kind, trimmed) }])
    setCategory('')
  }

  function addCustom() {
    const tag = customTag.trim()
    const url = customUrl.trim()
    if (!tag || !url) return
    if (ruleSets.some((ruleSet) => ruleSet.tag === tag)) return
    onChange([...ruleSets, { id: newId(), tag, format: customFormat, url }])
    setCustomTag('')
    setCustomUrl('')
  }

  function remove(id: string) {
    onChange(ruleSets.filter((ruleSet) => ruleSet.id !== id))
  }

  return (
    <div className="card">
      <h2>Rule sets (geosite / geoip)</h2>
      <p className="help-text">
        Reusable remote rule sets, sourced from the sing-geosite/sing-geoip .srs releases. Rules
        below can match against any rule set defined here.
      </p>

      {ruleSets.length > 0 && (
        <div className="chip-list">
          {ruleSets.map((ruleSet) => (
            <span className="chip" key={ruleSet.id}>
              {ruleSet.tag}
              <button type="button" onClick={() => remove(ruleSet.id)} aria-label={`Remove ${ruleSet.tag}`}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="row">
        <div className="field">
          <label htmlFor="ruleset-kind">Category source</label>
          <select id="ruleset-kind" value={kind} onChange={(event) => setKind(event.target.value as 'geosite' | 'geoip')}>
            <option value="geosite">geosite</option>
            <option value="geoip">geoip</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="ruleset-category">Category name</label>
          <input
            id="ruleset-category"
            type="text"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            placeholder="netflix, cn, private, ..."
          />
        </div>
        <div className="field" style={{ flex: '0 0 auto', justifyContent: 'flex-end' }}>
          <label>&nbsp;</label>
          <button type="button" onClick={addQuick} disabled={!category.trim()}>
            Add
          </button>
        </div>
      </div>

      <details>
        <summary className="help-text">Advanced: custom rule set URL</summary>
        <div className="row spacer-top">
          <div className="field">
            <label htmlFor="ruleset-tag">Tag</label>
            <input
              id="ruleset-tag"
              type="text"
              value={customTag}
              onChange={(event) => setCustomTag(event.target.value)}
              placeholder="my-custom-set"
            />
          </div>
          <div className="field">
            <label htmlFor="ruleset-format">Format</label>
            <select
              id="ruleset-format"
              value={customFormat}
              onChange={(event) => setCustomFormat(event.target.value as 'binary' | 'source')}
            >
              <option value="binary">binary</option>
              <option value="source">source</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="ruleset-url">URL</label>
            <input
              id="ruleset-url"
              type="text"
              value={customUrl}
              onChange={(event) => setCustomUrl(event.target.value)}
              placeholder="https://.../custom.srs"
            />
          </div>
          <div className="field" style={{ flex: '0 0 auto', justifyContent: 'flex-end' }}>
            <label>&nbsp;</label>
            <button type="button" onClick={addCustom} disabled={!customTag.trim() || !customUrl.trim()}>
              Add
            </button>
          </div>
        </div>
      </details>
    </div>
  )
}
