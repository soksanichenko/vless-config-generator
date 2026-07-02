import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ConditionEditor } from './ConditionEditor'
import { newId } from '../lib/id'
import type { Action, Condition, Rule, RuleSetDef } from '../types/rules'

interface Props {
  rule: Rule
  ruleSets: RuleSetDef[]
  onChange: (rule: Rule) => void
  onRemove: () => void
}

export function RuleCard({ rule, ruleSets, onChange, onRemove }: Props) {
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

  return (
    <div className="rule-card" ref={setNodeRef} style={style}>
      <div className="rule-card-header">
        <span className="drag-handle" {...attributes} {...listeners}>
          ⠿
        </span>
        <div className="pill-group" style={{ flex: 1 }}>
          <button type="button" className={rule.action === 'direct' ? 'active' : ''} onClick={() => setAction('direct')}>
            Direct
          </button>
          <button type="button" className={rule.action === 'proxy' ? 'active' : ''} onClick={() => setAction('proxy')}>
            Proxy
          </button>
        </div>
        <button type="button" className="danger" onClick={onRemove}>
          Delete rule
        </button>
      </div>

      {rule.conditions.length === 0 && <p className="help-text">No conditions yet — this rule won't be included in the output.</p>}

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
        + Add condition
      </button>
    </div>
  )
}
