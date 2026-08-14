export interface ReplayPrivacyEvent {
  kind: string
  live?: boolean
  title: string
  summary: string
  body: string
  publicBody?: string
}

/** Redact common local-user paths and credential shapes before sharing a replay. */
export function redactText(input: string): { value: string; count: number } {
  let value = input
  let count = 0
  const replace = (pattern: RegExp, replacement: string) => {
    value = value.replace(pattern, () => { count += 1; return replacement })
  }

  replace(/\/Users\/[^/\s]+/g, '~')
  replace(/\b[A-Za-z]:\\Users\\[^\\\s]+/gi, '~')
  replace(/\b(?:sk|ghp|github_pat|xox[baprs])[-_][A-Za-z0-9_-]{12,}\b/g, '[REDACTED_SECRET]')
  replace(/\bBearer\s+[A-Za-z0-9._~+\/-]{12,}=*/gi, 'Bearer [REDACTED]')
  value = value.replace(/\b(api[_-]?key|token|secret|password)\s*[:=]\s*["']?[^\s,"']{8,}/gi, (_match, key: string) => {
    count += 1
    return `${key}=[REDACTED]`
  })
  return { value, count }
}

/** Select share-safe events and apply redaction without mutating the session data. */
export function sanitizeReplayEvents<T extends ReplayPrivacyEvent>(events: readonly T[]): { events: T[]; redactions: number } {
  let redactions = 0
  const result = events.filter(event => event.kind !== 'system' && !event.live).map((event) => {
    const title = redactText(event.title)
    const summary = redactText(event.summary)
    const body = redactText(event.publicBody ?? event.body)
    redactions += title.count + summary.count + body.count
    return { ...event, title: title.value, summary: summary.value, body: body.value }
  })
  return { events: result, redactions }
}
