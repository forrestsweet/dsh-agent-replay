import assert from 'node:assert/strict'
import test from 'node:test'

import { redactText, sanitizeReplayEvents } from '../lib/index.js'

test('redacts macOS and Windows user paths', () => {
  const result = redactText('/Users/alice/project and C:\\Users\\bob\\project')
  assert.equal(result.value, '~/project and ~\\project')
  assert.equal(result.count, 2)
})

test('redacts common credentials', () => {
  const result = redactText('token=abcdefghijklmnop Bearer abcdefghijklmnop ghp_abcdefghijklmnop')
  assert.equal(result.value, 'token=[REDACTED] Bearer [REDACTED] [REDACTED_SECRET]')
  assert.equal(result.count, 3)
})

test('excludes system and live events and publishes assistant final text', () => {
  const input = [
    { kind: 'system', title: 'Context', summary: 'private', body: 'private' },
    { kind: 'tool', live: true, title: 'bash', summary: 'running', body: 'running' },
    { kind: 'assistant', title: 'Assistant', summary: 'done', body: 'reasoning', publicBody: 'final answer' },
  ]
  const result = sanitizeReplayEvents(input)
  assert.equal(result.events.length, 1)
  assert.equal(result.events[0].body, 'final answer')
})
