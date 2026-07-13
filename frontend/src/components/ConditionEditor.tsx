import { useEffect, useState } from 'react'
import { CONDITION_TYPES, conditionTypeInfo, type Condition, type ConditionType } from '../types/rules'
import type { RuleSetDef } from '../types/rules'
import { useLang } from '../i18n/LangContext'

interface Props {
  condition: Condition
  ruleSets: RuleSetDef[]
  onChange: (condition: Condition) => void
  onRemove: () => void
}

export function ConditionEditor({ condition, ruleSets, onChange, onRemove }: Props) {
  const { t } = useLang()
  const info = conditionTypeInfo(condition.type)

  // Decoupled from `condition.values` so a trailing space/comma while typing isn't
  // immediately trimmed/filtered away by the derived array re-rendering underneath
  // the cursor. Only resynced when the condition's type changes (values reset to []).
  const [textValue, setTextValue] = useState(() => condition.values.join(', '))
  useEffect(() => {
    setTextValue(condition.values.join(', '))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [condition.type])

  function setType(type: ConditionType) {
    onChange({ ...condition, type, values: [] })
  }

  function setTextValues(raw: string) {
    setTextValue(raw)
    onChange({
      ...condition,
      values: raw
        .split(',')
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    })
  }

  function toggleValue(value: string) {
    const has = condition.values.includes(value)
    onChange({
      ...condition,
      values: has ? condition.values.filter((entry) => entry !== value) : [...condition.values, value],
    })
  }

  return (
    <div className="condition-row">
      <div className="field" style={{ flex: '0 0 200px' }}>
        <select value={condition.type} onChange={(event) => setType(event.target.value as ConditionType)}>
          {CONDITION_TYPES.map((entry) => (
            <option key={entry.type} value={entry.type}>
              {t(entry.labelKey)}
            </option>
          ))}
        </select>
        {info.helpKey && <p className="help-text">{t(info.helpKey)}</p>}
      </div>

      <div className="field">
        {info.valueKind === 'text' && (
          <input
            type="text"
            placeholder={`${info.placeholder ?? ''} ${t('condition.commaSeparated')}`}
            value={textValue}
            onChange={(event) => setTextValues(event.target.value)}
          />
        )}

        {info.valueKind === 'enum' && (
          <div className="checkbox-group">
            {info.enumOptions?.map((option) => (
              <label key={option}>
                <input
                  type="checkbox"
                  checked={condition.values.includes(option)}
                  onChange={() => toggleValue(option)}
                />
                {option}
              </label>
            ))}
          </div>
        )}

        {info.valueKind === 'boolean' && <p className="help-text">{t('condition.matchesAutomatically')}</p>}

        {info.valueKind === 'rule_set' && (
          <div className="checkbox-group">
            {ruleSets.length === 0 && <p className="help-text">{t('condition.noRuleSets')}</p>}
            {ruleSets.map((ruleSet) => (
              <label key={ruleSet.id}>
                <input
                  type="checkbox"
                  checked={condition.values.includes(ruleSet.id)}
                  onChange={() => toggleValue(ruleSet.id)}
                />
                {ruleSet.tag}
              </label>
            ))}
          </div>
        )}
      </div>

      <button type="button" className="danger" onClick={onRemove} aria-label={t('condition.removeAria')}>
        ×
      </button>
    </div>
  )
}
