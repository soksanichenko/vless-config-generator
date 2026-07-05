const TOKEN_PATTERN =
  /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(?:true|false)\b|\bnull\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g

// Matches a trailing `// comment` appended by annotateConfigJson — never occurs in
// plain stringified JSON, since URLs use "://" (no space before the slashes).
const LINE_COMMENT_PATTERN = / \/\/.*$/

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function highlightLine(line: string): string {
  return escapeHtml(line).replace(TOKEN_PATTERN, (match) => {
    let cls = 'json-number'
    if (match.startsWith('"')) {
      cls = match.endsWith(':') ? 'json-key' : 'json-string'
    } else if (match === 'true' || match === 'false') {
      cls = 'json-boolean'
    } else if (match === 'null') {
      cls = 'json-null'
    }
    return `<span class="${cls}">${match}</span>`
  })
}

/** Renders formatted JSON as HTML with `json-*` span classes for syntax highlighting.
 * Also handles trailing `// comment` lines from annotateConfigJson, keeping them out
 * of the normal token pass so they render as plain dimmed text. */
export function highlightJson(json: string): string {
  return json
    .split('\n')
    .map((line) => {
      const commentMatch = line.match(LINE_COMMENT_PATTERN)
      if (!commentMatch || commentMatch.index === undefined) return highlightLine(line)
      const code = line.slice(0, commentMatch.index)
      const comment = line.slice(commentMatch.index)
      return `${highlightLine(code)}<span class="json-comment">${escapeHtml(comment)}</span>`
    })
    .join('\n')
}
