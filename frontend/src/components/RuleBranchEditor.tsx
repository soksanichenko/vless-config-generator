import { ConditionEditor } from './ConditionEditor'
import { InfoTooltip } from './InfoTooltip'
import { newId } from '../lib/id'
import type { Condition, RuleBranch, RuleSetDef } from '../types/rules'
import { useLang } from '../i18n/LangContext'

interface Props {
  index: number
  branch: RuleBranch
  ruleSets: RuleSetDef[]
  onChange: (branch: RuleBranch) => void
  onRemove: () => void
}

export function RuleBranchEditor({ index, branch, ruleSets, onChange, onRemove }: Props) {
  const { t } = useLang()

  function addCondition() {
    onChange({ ...branch, conditions: [...branch.conditions, { id: newId(), type: 'domain', values: [] }] })
  }

  function updateCondition(updated: Condition) {
    onChange({
      ...branch,
      conditions: branch.conditions.map((condition) => (condition.id === updated.id ? updated : condition)),
    })
  }

  function removeCondition(id: string) {
    onChange({ ...branch, conditions: branch.conditions.filter((condition) => condition.id !== id) })
  }

  return (
    <div className="rule-branch">
      <div className="rule-branch-header">
        <span className="help-text">{t('ruleCard.branchLabel', { index: index + 1 })}</span>
        <div className="checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={branch.invert}
              onChange={(event) => onChange({ ...branch, invert: event.target.checked })}
            />
            {t('ruleCard.invert')}
          </label>
          <InfoTooltip text={t('ruleCard.branchInvertHelp')} />
        </div>
        <button type="button" className="danger" onClick={onRemove} aria-label={t('ruleCard.removeBranchAria')}>
          ×
        </button>
      </div>

      {branch.conditions.length === 0 && <p className="help-text">{t('ruleCard.noConditions')}</p>}
      {branch.conditions.map((condition) => (
        <ConditionEditor
          key={condition.id}
          condition={condition}
          ruleSets={ruleSets}
          onChange={updateCondition}
          onRemove={() => removeCondition(condition.id)}
        />
      ))}
      <button type="button" onClick={addCondition}>
        {t('ruleCard.addCondition')}
      </button>
    </div>
  )
}
