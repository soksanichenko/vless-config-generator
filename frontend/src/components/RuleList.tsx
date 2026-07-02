import { DndContext, closestCenter, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { RuleCard } from './RuleCard'
import { newId } from '../lib/id'
import type { Rule, RuleSetDef } from '../types/rules'

interface Props {
  rules: Rule[]
  ruleSets: RuleSetDef[]
  onChange: (rules: Rule[]) => void
}

export function RuleList({ rules, ruleSets, onChange }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  function addRule() {
    onChange([...rules, { id: newId(), conditions: [], action: 'direct' }])
  }

  function updateRule(updated: Rule) {
    onChange(rules.map((rule) => (rule.id === updated.id ? updated : rule)))
  }

  function removeRule(id: string) {
    onChange(rules.filter((rule) => rule.id !== id))
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = rules.findIndex((rule) => rule.id === active.id)
    const newIndex = rules.findIndex((rule) => rule.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    onChange(arrayMove(rules, oldIndex, newIndex))
  }

  return (
    <div className="card">
      <h2>4. Routing rules</h2>
      <p className="help-text">
        Matched top to bottom — the first matching rule wins. Drag the handle to reorder.
      </p>

      {rules.length === 0 && <p className="help-text">No rules yet.</p>}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={rules.map((rule) => rule.id)} strategy={verticalListSortingStrategy}>
          {rules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              ruleSets={ruleSets}
              onChange={updateRule}
              onRemove={() => removeRule(rule.id)}
            />
          ))}
        </SortableContext>
      </DndContext>

      <button type="button" onClick={addRule}>
        + Add rule
      </button>
    </div>
  )
}
