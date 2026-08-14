/** DeepSeek Harness host half for the Agent Replay browser plugin. */
export const name = 'dsh-agent-replay'

export { redactText, sanitizeReplayEvents } from './privacy.ts'

/** The first release is browser-only; the host entry participates in bundle discovery. */
export function apply(): void {}
