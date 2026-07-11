interface Props {
  text: string
}

/** Small hover/focus-triggered tooltip icon, for controls too compact to carry a
 * permanently-visible help-text line (pill toggles, checkboxes) without cluttering
 * a list of many rules. */
export function InfoTooltip({ text }: Props) {
  return (
    <span className="info-tooltip" tabIndex={0} aria-label={text}>
      <span className="info-tooltip-icon" aria-hidden="true">
        ⓘ
      </span>
      <span className="info-tooltip-bubble" role="tooltip">
        {text}
      </span>
    </span>
  )
}
