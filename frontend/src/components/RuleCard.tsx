import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ConditionEditor } from './ConditionEditor'
import { RuleBranchEditor } from './RuleBranchEditor'
import { newId } from '../lib/id'
import type { Action, Condition, Rule, RuleBranch, RuleSetDef } from '../types/rules'
import { useLang } from '../i18n/LangContext'

interface Props {
  rule: Rule
  ruleSets: RuleSetDef[]
  onChange: (rule: Rule) => void
  onRemove: () => void
}

export function RuleCard({ rule, ruleSets, onChange, onRemove }: Props) {
  const { t } = useLang()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: rule.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  function setAction(action: Action) {
    onChange({ ...rule, action })
  }

  function setMode(mode: Rule['mode']) {
    onChange({ ...rule, mode })
  }

  function setLogicalMode(logicalMode: Rule['logicalMode']) {
    onChange({ ...rule, logicalMode })
  }

  function addCondition() {
    onChange({
      ...rule,
      conditions: [...rule.conditions, { id: newId(), type: 'domain', values: [] }],
    })
  }

  function updateCondition(updated: Condition) {
    onChange({
      ...rule,
      conditions: rule.conditions.map((condition) => (condition.id === updated.id ? updated : condition)),
    })
  }

  function removeCondition(id: string) {
    onChange({ ...rule, conditions: rule.conditions.filter((condition) => condition.id !== id) })
  }

  function addBranch() {
    const branch: RuleBranch = { id: newId(), conditions: [], invert: false }
    onChange({ ...rule, branches: [...rule.branches, branch] })
  }

  function updateBranch(updated: RuleBranch) {
    onChange({ ...rule, branches: rule.branches.map((branch) => (branch.id === updated.id ? updated : branch)) })
  }

  function removeBranch(id: string) {
    onChange({ ...rule, branches: rule.branches.filter((branch) => branch.id !== id) })
  }

  return (
    <div className="rule-card" ref={setNodeRef} style={style}>
      <div className="rule-card-header">
        <span className="drag-handle" {...attributes} {...listeners}>
          ⠿
        </span>
        <div className="pill-group">
          <button type="button" className={rule.mode === 'simple' ? 'active' : ''} onClick={() => setMode('simple')}>
            {t('ruleCard.modeSimple')}
          </button>
          <button type="button" className={rule.mode === 'logical' ? 'active' : ''} onClick={() => setMode('logical')}>
            {t('ruleCard.modeLogical')}
          </button>
        </div>
        <div className="pill-group" style={{ flex: 1 }}>
          <button type="button" className={rule.action === 'direct' ? 'active' : ''} onClick={() => setAction('direct')}>
            {t('common.direct')}
          </button>
          <button type="button" className={rule.action === 'proxy' ? 'active' : ''} onClick={() => setAction('proxy')}>
            {t('common.proxy')}
          </button>
          <button type="button" className={rule.action === 'reject' ? 'active' : ''} onClick={() => setAction('reject')}>
            {t('common.reject')}
          </button>
        </div>
        <button type="button" className="danger" onClick={onRemove}>
          {t('ruleCard.deleteRule')}
        </button>
      </div>

      <div className="row spacer-top" style={{ marginBottom: 10 }}>
        {rule.mode === 'logical' && (
          <div className="pill-group" style={{ flex: '0 0 auto' }}>
            <button type="button" className={rule.logicalMode === 'and' ? 'active' : ''} onClick={() => setLogicalMode('and')}>
              {t('ruleCard.logicalAnd')}
            </button>
            <button type="button" className={rule.logicalMode === 'or' ? 'active' : ''} onClick={() => setLogicalMode('or')}>
              {t('ruleCard.logicalOr')}
            </button>
          </div>
        )}
        <div className="checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={rule.invert}
              onChange={(event) => onChange({ ...rule, invert: event.target.checked })}
            />
            {t('ruleCard.invert')}
          </label>
        </div>
      </div>

      {rule.mode === 'simple' && (
        <>
          {rule.conditions.length === 0 && <p className="help-text">{t('ruleCard.noConditions')}</p>}
          {rule.conditions.map((condition) => (
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
        </>
      )}

      {rule.mode === 'logical' && (
        <>
          {rule.branches.length === 0 && <p className="help-text">{t('ruleCard.noBranches')}</p>}
          {rule.branches.map((branch, index) => (
            <RuleBranchEditor
              key={branch.id}
              index={index}
              branch={branch}
              ruleSets={ruleSets}
              onChange={updateBranch}
              onRemove={() => removeBranch(branch.id)}
            />
          ))}
          <button type="button" onClick={addBranch}>
            {t('ruleCard.addBranch')}
          </button>
        </>
      )}
    </div>
  )
}
