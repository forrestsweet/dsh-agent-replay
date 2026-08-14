import type { Context } from '@deepseek-ai/cordis'
import type {
  AssistantBlock, ConversationNode, ConversationSnapshot, RunningToolCall, SessionId,
} from '@deepseek-ai/dsh-client-runtime/client'
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import {
  Button, Input, StateDot,
  IconCheckOutline16, IconCodeOutline16, IconCopyOutline16, IconCordisPluginOutline14,
  IconDataOutline16, IconDownloadOutline16, IconPauseOutline16, IconPlayOutline16,
  IconRefreshOutline16, IconSearchOutline16, IconSettingsOutline16, IconShareOutline16,
  IconSparkle16, IconUserOutline16, IconWarningOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { useEffect, useMemo, useState } from 'react'
import type { ReactElement } from 'react'
import { sanitizeReplayEvents } from '../privacy.ts'
import { STYLES } from './styles.ts'

type ReplayKind = 'user' | 'assistant' | 'tool' | 'command' | 'system' | 'error'
type Filter = 'all' | ReplayKind

interface ReplayEvent {
  id: string
  seq: number
  time: number | null
  kind: ReplayKind
  sourceKind: string
  title: string
  summary: string
  body: string
  publicBody?: string
  meta: readonly { label: string; value: string }[]
  durationMs?: number
  live?: boolean
}

interface ReplayInjected {
  loadOlder: () => Promise<void>
}

interface ReplayViewOwnerProps {
  inspect?: { callId: string } | null
  onInspectDone?: () => void
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    'conversation.view': { kind: 'list'; scope: 'session'; owner: ReplayViewOwnerProps }
  }
}

type ReplayViewProps = PropsRuntime<'conversation.view'> & InjectFace<ReplayInjected>

const COPY = {
  en: {
    tab: 'Replay', title: 'Session replay', subtitle: 'A local timeline built from this session’s real events',
    local: 'Local session data', search: 'Search events', all: 'All', user: 'User', assistant: 'Assistant',
    tool: 'Tools', command: 'Commands', system: 'System', error: 'Errors', events: 'events', tools: 'tools',
    errors: 'errors', elapsed: 'elapsed', running: 'Running', recorded: 'Recorded', play: 'Play replay', pause: 'Pause replay',
    restart: 'Replay from start', copy: 'Copy', copied: 'Copied', details: 'Event details', emptyTitle: 'Nothing to replay yet',
    emptyBody: 'Send a message in Chat. Real session events will appear here automatically.', noMatch: 'No matching events',
    noMatchBody: 'Try another search or filter.', earlier: 'Load earlier history', loading: 'Loading…', loadedWindow: 'Loaded window',
    sequence: 'Sequence', event: 'Event', timestamp: 'Timestamp', duration: 'Duration', turn: 'Turn', step: 'Step',
    live: 'LIVE', speed: 'Speed', startReplay: 'Replay from start', resume: 'Resume',
    raw: 'Recorded content', select: 'Select an event to inspect it.', publish: 'Create share page',
    publishTitle: 'Share page', publishHint: 'Turn this session into a redacted, standalone replay for documentation, demos, and bug reports.',
    pageTitle: 'Title',
    privacy: 'Privacy', privacyReady: 'System context excluded · paths and common secrets redacted',
    included: 'Public replay', includedHint: 'User, assistant, tool, command, and error events',
    exportHtml: 'Export HTML', back: 'Event details', redacted: 'redactions', preview: 'Share preview',
  },
  zh: {
    tab: '回放', title: '会话回放', subtitle: '完全基于当前会话真实事件生成的本地时间线',
    local: '本地会话数据', search: '搜索事件', all: '全部', user: '用户', assistant: '助手',
    tool: '工具', command: '命令', system: '系统', error: '错误', events: '个事件', tools: '次工具',
    errors: '个错误', elapsed: '总耗时', running: '运行中', recorded: '已记录', play: '播放回放', pause: '暂停回放',
    restart: '从头回放', copy: '复制', copied: '已复制', details: '事件详情', emptyTitle: '还没有可回放的内容',
    emptyBody: '先在「对话」中发送一条消息，真实会话事件会自动出现在这里。', noMatch: '没有匹配的事件',
    noMatchBody: '请尝试其他关键词或筛选条件。', earlier: '加载更早记录', loading: '加载中…', loadedWindow: '当前加载范围',
    sequence: '序号', event: '事件', timestamp: '时间', duration: '耗时', turn: '轮次', step: '步骤',
    live: '实时', speed: '速度', startReplay: '从头回放', resume: '继续',
    raw: '记录内容', select: '选择一个事件查看详情。', publish: '生成分享页',
    publishTitle: '分享页', publishHint: '把本次会话转换成经过脱敏的独立回放，用于文档、演示和问题反馈。',
    pageTitle: '页面标题',
    privacy: '隐私处理', privacyReady: '已排除系统上下文，并脱敏本地路径和常见密钥',
    included: '公开内容', includedHint: '用户、助手、工具、命令和错误事件',
    exportHtml: '导出 HTML', back: '事件详情', redacted: '处脱敏', preview: '分享预览',
  },
} as const

function language(): keyof typeof COPY {
  const lang = document.documentElement.lang || navigator.language
  return lang.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

const PlayIcon = IconPlayOutline16
const PauseIcon = IconPauseOutline16
const RestartIcon = IconRefreshOutline16
const SearchIcon = IconSearchOutline16
const CopyIcon = IconCopyOutline16
const ShareIcon = IconShareOutline16
const DownloadIcon = IconDownloadOutline16
const ShieldIcon = IconCheckOutline16
const ClockIcon = IconDataOutline16

function EventIcon({ kind }: { kind: ReplayKind }): ReactElement {
  const props = { className: 'ar-icon-svg' }
  if (kind === 'user') return <IconUserOutline16 {...props} />
  if (kind === 'assistant') return <IconSparkle16 {...props} />
  if (kind === 'tool') return <IconCordisPluginOutline14 {...props} />
  if (kind === 'command') return <IconCodeOutline16 {...props} />
  if (kind === 'error') return <IconWarningOutline16 {...props} />
  return <IconSettingsOutline16 {...props} />
}

function toPretty(value: string): string {
  try { return JSON.stringify(JSON.parse(value), null, 2) } catch { return value }
}

function stringifyUnknown(value: unknown): string {
  if (typeof value === 'string') return value
  if (value === undefined || value === null) return ''
  try { return JSON.stringify(value, null, 2) } catch { return String(value) }
}

function contentText(content: readonly unknown[]): string {
  return content.map((block) => {
    if (typeof block !== 'object' || block === null) return stringifyUnknown(block)
    const item = block as Record<string, unknown>
    if (typeof item.text === 'string') return item.text
    if (item.type === 'image') return '[Image attachment]'
    if (item.type === 'tool-result' && 'content' in item) return stringifyUnknown(item.content)
    return stringifyUnknown(block)
  }).filter(Boolean).join('\n\n')
}

function assistantText(blocks: readonly AssistantBlock[]): string {
  return blocks.map((block) => {
    if (block.kind === 'text') return block.text
    if (block.kind === 'reasoning') return block.text
    if (block.kind === 'tool-call') return `${block.name}\n${toPretty(block.argsRaw)}`
    if (block.kind === 'image') return '[Image attachment]'
    return stringifyUnknown(block.block)
  }).filter(Boolean).join('\n\n')
}

function oneLine(value: string, fallback: string): string {
  const text = value.replace(/\s+/g, ' ').trim()
  if (!text) return fallback
  return text.length > 100 ? `${text.slice(0, 100)}…` : text
}

function baseMeta(node: ConversationNode): { label: string; value: string }[] {
  const record = node as unknown as Record<string, unknown>
  const meta: { label: string; value: string }[] = []
  if (typeof record.turn === 'number') meta.push({ label: 'Turn', value: String(record.turn) })
  if (typeof record.step === 'number') meta.push({ label: 'Step', value: String(record.step) })
  return meta
}

function nodeEvent(node: ConversationNode): ReplayEvent {
  const base = { id: `node-${node.seq}`, seq: node.seq, time: node.time, sourceKind: node.kind }
  const meta = baseMeta(node)
  switch (node.kind) {
    case 'user': {
      const body = contentText(node.content)
      return { ...base, kind: 'user', title: 'User message', summary: oneLine(body, 'Message'), body, meta }
    }
    case 'steering': {
      const body = contentText(node.content)
      return { ...base, kind: 'user', title: 'Steering message', summary: oneLine(body, 'Steering'), body, meta }
    }
    case 'assistant': {
      const body = assistantText(node.blocks)
      const publicBody = node.blocks
        .filter(block => block.kind === 'text')
        .map(block => block.kind === 'text' ? block.text : '')
        .filter(Boolean)
        .join('\n\n')
      const model = node.provenance?.model
      const timing = node.timing
      const durationMs = timing?.stepStartTime === null || timing?.stepStartTime === undefined
        ? undefined : Math.max(0, timing.completedTime - timing.stepStartTime)
      return {
        ...base, kind: 'assistant', title: model ? `Assistant · ${model}` : 'Assistant response',
        summary: oneLine(publicBody || body, node.interrupted ? 'Interrupted response' : 'Response'),
        body, publicBody, meta, durationMs,
      }
    }
    case 'tool-result': {
      const name = node.call?.name ?? node.callId
      const result = contentText(node.content)
      const args = node.call?.argsRaw ? toPretty(node.call.argsRaw) : ''
      const body = [args && `Arguments\n${args}`, result && `Result\n${result}`].filter(Boolean).join('\n\n')
      return {
        ...base, kind: node.isError ? 'error' : 'tool', title: name,
        summary: node.isError ? oneLine(result, 'Tool failed') : oneLine(result, 'Tool completed'), body, meta,
        durationMs: node.callTime === null ? undefined : Math.max(0, node.time - node.callTime),
      }
    }
    case 'command': {
      const command = `/${node.name ?? 'command'}${node.args ?? ''}`
      const outcome = node.outcome?.text ?? (node.outcome === null ? 'Running' : node.outcome.kind)
      return { ...base, kind: node.outcome?.kind === 'error' ? 'error' : 'command', title: command, summary: oneLine(outcome, command), body: outcome, meta }
    }
    case 'turn-error':
      return { ...base, kind: 'error', title: node.code ?? 'Turn error', summary: node.message, body: node.message, meta }
    case 'model-retry':
      return { ...base, kind: 'system', title: 'Model retry', summary: node.retryState, body: stringifyUnknown(node), meta }
    case 'turn-max-tokens':
      return { ...base, kind: 'system', title: 'Token limit reached', summary: 'The turn ended at its output token limit.', body: '', meta }
    case 'compaction':
      return { ...base, kind: 'system', title: 'Context compacted', summary: node.shadowedItemCount === null ? 'Conversation context compacted' : `${node.shadowedItemCount} items compacted`, body: node.summary ?? '', meta }
    case 'context': {
      const body = contentText(node.content)
      return { ...base, kind: 'system', title: node.provenance.label ?? 'Context', summary: oneLine(body, 'Context injected'), body, meta }
    }
    default:
      return { ...base, kind: 'system', title: node.kind, summary: oneLine(stringifyUnknown(node), node.kind), body: stringifyUnknown(node), meta }
  }
}

function runningToolEvent(call: RunningToolCall, index: number): ReplayEvent {
  const body = toPretty(call.argsRaw)
  return {
    id: `running-${call.callId}`, seq: Number.MAX_SAFE_INTEGER - 1000 + index, time: call.time,
    kind: 'tool', sourceKind: 'tool-call', title: call.name, summary: oneLine(body, 'Tool is running'), body,
    meta: [{ label: 'Turn', value: String(call.turn) }, { label: 'Step', value: String(call.step) }], live: true,
  }
}

function partialEvent(snapshot: ConversationSnapshot): ReplayEvent | null {
  if (snapshot.partial === null) return null
  const body = assistantText(snapshot.partial.blocks)
  return {
    id: `partial-${snapshot.partial.turn}-${snapshot.partial.step}`, seq: Number.MAX_SAFE_INTEGER,
    time: null, kind: 'assistant', sourceKind: 'assistant-partial', title: 'Assistant streaming',
    summary: oneLine(body, 'Generating response…'), body,
    meta: [{ label: 'Turn', value: String(snapshot.partial.turn) }, { label: 'Step', value: String(snapshot.partial.step) }], live: true,
  }
}

function buildEvents(snapshot: ConversationSnapshot): ReplayEvent[] {
  const settled = snapshot.nodes.map(nodeEvent)
  const running = snapshot.runningCalls.map(runningToolEvent)
  const partial = partialEvent(snapshot)
  return [...settled, ...running, ...(partial === null ? [] : [partial])]
    .sort((a, b) => a.seq - b.seq)
}

function formatClock(time: number | null, live: string): string {
  if (time === null) return live
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(time)
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)} s`
  const minutes = Math.floor(ms / 60_000)
  const seconds = Math.floor((ms % 60_000) / 1000)
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`
}

function offsetLabel(time: number | null, start: number | null, live: string): string {
  if (time === null || start === null) return live
  const seconds = Math.max(0, Math.round((time - start) / 1000))
  const minutes = Math.floor(seconds / 60)
  return `+${minutes.toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char] ?? char)
}

function shareHtml(title: string, events: readonly ReplayEvent[]): string {
  const safeTitle = escapeHtml(title)
  const data = JSON.stringify(events.map(event => ({
    kind: event.kind, title: event.title, summary: event.summary, body: event.body,
    time: event.time, durationMs: event.durationMs,
  }))).replace(/<\/script/gi, '<\\/script')
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safeTitle}</title><style>
:root{color-scheme:light;--dsw-alias-bg-layer-1:#fff;--dsw-alias-bg-layer-2:#fff;--dsw-alias-bg-module-platform:#f5f6f7;--dsw-specific-sidebar-fill:#f9fafb;--dsw-alias-border-l1:rgba(0,0,0,.04);--dsw-alias-border-l2:rgba(0,0,0,.1);--dsw-alias-label-primary:#0f1115;--dsw-alias-label-secondary:#61666b;--dsw-alias-label-tertiary:#81858c;--dsw-alias-label-caption:#adb2b8;--dsw-alias-interactive-bg-hover:rgba(38,49,72,.06);--dsw-alias-interactive-bg-active:rgba(38,49,72,.1);--dsw-alias-brand:#4176e6;--dsw-alias-warn:#dd8629;--dsw-alias-error:#ec1313;--dsw-code:#fafafa}
@media(prefers-color-scheme:dark){:root{color-scheme:dark;--dsw-alias-bg-layer-1:#232324;--dsw-alias-bg-layer-2:#2c2c2e;--dsw-alias-bg-module-platform:#353638;--dsw-specific-sidebar-fill:#1b1b1c;--dsw-alias-border-l1:rgba(255,255,255,.06);--dsw-alias-border-l2:rgba(255,255,255,.12);--dsw-alias-label-primary:#f9fafb;--dsw-alias-label-secondary:#cfd3d6;--dsw-alias-label-tertiary:#adb2b8;--dsw-alias-label-caption:#81858c;--dsw-alias-interactive-bg-hover:rgba(255,255,255,.08);--dsw-alias-interactive-bg-active:rgba(255,255,255,.14);--dsw-alias-brand:#5686fe;--dsw-alias-warn:#dd8629;--dsw-alias-error:#f25a5a;--dsw-code:#1b1b1c}}
*{box-sizing:border-box}html,body{height:100%}body{margin:0;overflow:hidden;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-1);font:12px/18px Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.root{display:flex;flex-direction:column;height:100%}.toolbar{display:flex;align-items:center;height:32px;flex:none;padding:0 6px;gap:6px;border-bottom:1px solid var(--dsw-alias-border-l2)}.toolbar strong{padding:0 5px;font-weight:500}.toolbar button{display:inline-flex;align-items:center;height:20px;padding:0 7px;border:0;border-radius:3px;color:var(--dsw-alias-label-tertiary);background:transparent;cursor:pointer;font:inherit}.toolbar button:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}.toolbar .count{margin-left:auto;color:var(--dsw-alias-label-tertiary)}.overview{display:grid;grid-template-columns:46px 1fr;height:72px;flex:none;border-bottom:1px solid var(--dsw-alias-border-l2);background:var(--dsw-specific-sidebar-fill)}.lanes{display:grid;grid-template-rows:repeat(3,1fr);align-items:center;padding-left:8px;color:var(--dsw-alias-label-caption);font-size:10px}.timeline{display:grid;grid-template-rows:repeat(3,1fr);padding:5px 8px 5px 0;gap:2px}.lane{display:flex;align-items:center;gap:2px;min-width:0}.block{height:8px;min-width:3px;flex:1;border-radius:1px;background:var(--dsw-alias-label-caption);opacity:.8}.block[data-kind=user]{background:var(--dsw-alias-brand)}.block[data-kind=assistant]{height:10px;background:var(--dsw-alias-brand)}.block[data-kind=tool]{background:var(--dsw-alias-warn)}.block[data-kind=error]{background:var(--dsw-alias-error)}.split{display:flex;flex:1;min-height:0}.tablePane{width:54%;min-width:320px;overflow:auto;border-right:1px solid var(--dsw-alias-border-l2)}table{width:100%;border-spacing:0;table-layout:fixed}th{position:sticky;top:0;z-index:1;height:30px;padding:0 8px;border-bottom:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-tertiary);background:var(--dsw-specific-sidebar-fill);font-weight:500;text-align:left}th:first-child{width:104px;text-align:right}td{height:30px;padding:0 8px;border-bottom:1px solid var(--dsw-alias-border-l1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}tr{cursor:default}tbody tr:hover{background:var(--dsw-alias-interactive-bg-hover)}tbody tr.active{background:var(--dsw-alias-interactive-bg-active)}tbody tr.active td:first-child{box-shadow:inset 3px 0 var(--dsw-alias-brand)}.kind{display:inline-flex;align-items:center;height:19px;padding:0 5px;border-radius:4px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-module-platform);font-size:10px;font-weight:650;letter-spacing:.035em}.kind[data-kind=user],.kind[data-kind=assistant]{color:var(--dsw-alias-brand)}.kind[data-kind=tool]{color:var(--dsw-alias-warn)}.kind[data-kind=error]{color:var(--dsw-alias-error)}.seq{color:var(--dsw-alias-label-caption);font-variant-numeric:tabular-nums}.details{display:flex;flex:1;flex-direction:column;min-width:0;overflow:auto}.detailsHeader{padding:14px 16px;border-bottom:1px solid var(--dsw-alias-border-l2);background:var(--dsw-specific-sidebar-fill)}.detailsHeader span{color:var(--dsw-alias-label-tertiary)}.detailsHeader h2{margin:3px 0 0;font-size:14px;line-height:20px}.detailsHeader p{margin:4px 0 0;color:var(--dsw-alias-label-secondary)}.facts{display:grid;grid-template-columns:repeat(3,1fr);border-bottom:1px solid var(--dsw-alias-border-l2)}.fact{padding:9px 12px;border-right:1px solid var(--dsw-alias-border-l2)}.fact span,.fact strong{display:block}.fact span{color:var(--dsw-alias-label-tertiary)}.fact strong{margin-top:2px;font-weight:500}.payloadHead{height:30px;padding:6px 12px;border-bottom:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-tertiary);background:var(--dsw-specific-sidebar-fill)}pre{flex:1;min-height:180px;margin:0;padding:12px;overflow:auto;color:var(--dsw-alias-label-primary);background:var(--dsw-code);white-space:pre-wrap;word-break:break-word;font:12px/19px ui-monospace,SFMono-Regular,Menlo,monospace}@media(max-width:700px){.overview{display:none}.split{overflow:auto;flex-direction:column}.tablePane{width:100%;height:48%;min-width:0;border-right:0;border-bottom:1px solid var(--dsw-alias-border-l2)}.details{min-height:52%}}
</style></head><body><main class="root"><div class="toolbar"><strong>${safeTitle}</strong><button id="play">▶ Replay</button><span class="count" id="count"></span></div><div class="overview"><div class="lanes"><span>Input</span><span>Model</span><span>Tools</span></div><div class="timeline"><div class="lane" id="inputLane"></div><div class="lane" id="modelLane"></div><div class="lane" id="toolLane"></div></div></div><div class="split"><div class="tablePane"><table><thead><tr><th>Event</th><th>Content</th><th>Time</th></tr></thead><tbody id="rows"></tbody></table></div><section class="details"><header class="detailsHeader"><span id="kind"></span><h2 id="title"></h2><p id="summary"></p></header><div class="facts"><div class="fact"><span>Sequence</span><strong id="sequence"></strong></div><div class="fact"><span>Time</span><strong id="time"></strong></div><div class="fact"><span>Duration</span><strong id="duration"></strong></div></div><div class="payloadHead">Recorded content</div><pre id="body"></pre></section></div></main><script>const events=${data};const rows=document.querySelector('#rows');const inputLane=document.querySelector('#inputLane');const modelLane=document.querySelector('#modelLane');const toolLane=document.querySelector('#toolLane');let active=0,timer=null;document.querySelector('#count').textContent=events.length+' events';const fmt=t=>t?new Date(t).toLocaleTimeString(): '—';const dur=n=>n==null?'—':n<1000?Math.round(n)+' ms':(n/1000).toFixed(1)+' s';function select(i){active=i;document.querySelectorAll('tbody tr').forEach((el,n)=>el.classList.toggle('active',n===i));const e=events[i];document.querySelector('#kind').textContent=e.kind.toUpperCase();document.querySelector('#title').textContent=e.title;document.querySelector('#summary').textContent=e.summary;document.querySelector('#sequence').textContent='#'+(i+1);document.querySelector('#time').textContent=fmt(e.time);document.querySelector('#duration').textContent=dur(e.durationMs);document.querySelector('#body').textContent=e.body||e.summary;document.querySelectorAll('.block').forEach((el,n)=>el.style.opacity=n<=i?'.9':'.22')}events.forEach((e,i)=>{const tr=document.createElement('tr');const a=document.createElement('td');const tag=document.createElement('span');tag.className='kind';tag.dataset.kind=e.kind;tag.textContent=e.kind.toUpperCase();a.appendChild(tag);const b=document.createElement('td');b.textContent=e.title+' · '+e.summary;const c=document.createElement('td');c.className='seq';c.textContent=fmt(e.time);tr.append(a,b,c);tr.onclick=()=>{clearInterval(timer);timer=null;select(i)};rows.appendChild(tr);const block=document.createElement('i');block.className='block';block.dataset.kind=e.kind;(e.kind==='user'?inputLane:e.kind==='assistant'?modelLane:toolLane).appendChild(block)});document.querySelector('#play').onclick=()=>{clearInterval(timer);select(0);timer=setInterval(()=>{if(active>=events.length-1){clearInterval(timer);timer=null;return}select(active+1)},900)};if(events.length)select(0)</script></body></html>`
}

function ReplayView({ useSession, loadOlder }: ReplayViewProps): ReactElement {
  const snapshot = useSession(value => value)
  const t = COPY[language()]
  const events = useMemo(() => buildEvents(snapshot), [snapshot])
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [replaying, setReplaying] = useState(false)
  const [rate, setRate] = useState(1)
  const [copied, setCopied] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)
  const [shareTitle, setShareTitle] = useState(() => localStorage.getItem('agent-replay:title') ?? '')

  useEffect(() => {
    // Remove the repository field persisted by the discarded early preview.
    localStorage.removeItem('agent-replay:repo')
  }, [])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return events.filter(event => (filter === 'all' || event.kind === filter)
      && (!needle || `${event.title}\n${event.summary}\n${event.body}`.toLowerCase().includes(needle)))
  }, [events, filter, query])
  const activeIndex = Math.max(0, filtered.findIndex(event => event.id === selectedId))
  const active = filtered[activeIndex] ?? null
  const timed = events.filter(event => event.time !== null)
  const startTime = timed[0]?.time ?? null
  const endTime = timed.at(-1)?.time ?? startTime
  const elapsed = startTime === null || endTime === null ? 0 : Math.max(0, endTime - startTime)
  const toolCount = events.filter(event => event.sourceKind === 'tool-result').length
  const errorCount = events.filter(event => event.kind === 'error').length
  const published = useMemo(() => sanitizeReplayEvents(events), [events])
  const defaultTitle = events.find(event => event.kind === 'user')?.summary ?? t.title
  const resolvedTitle = shareTitle.trim() || defaultTitle

  useEffect(() => {
    if (filtered.length === 0) {
      setPlaying(false)
      return
    }
    if (selectedId === null || !filtered.some(event => event.id === selectedId)) {
      setSelectedId(filtered.at(-1)?.id ?? null)
    }
  }, [filtered, selectedId])

  useEffect(() => {
    if (!playing || filtered.length === 0) return
    const index = filtered.findIndex(event => event.id === selectedId)
    const current = filtered[index]
    const next = filtered[index + 1]
    if (current === undefined || next === undefined) {
      setPlaying(false)
      setReplaying(false)
      return
    }
    const recordedGap = current.time === null || next.time === null
      ? 800
      : Math.max(0, next.time - current.time)
    // Preserve the recorded rhythm while keeping long idle periods practical.
    const delay = Math.min(4_000, Math.max(350, recordedGap / rate))
    const timer = window.setTimeout(() => {
      const index = filtered.findIndex(event => event.id === selectedId)
      if (index < 0 || index >= filtered.length - 1) {
        setPlaying(false)
        setReplaying(false)
        return
      }
      setSelectedId(filtered[index + 1]?.id ?? null)
    }, delay)
    return () => window.clearTimeout(timer)
  }, [filtered, playing, rate, selectedId])

  const filters: readonly Filter[] = ['all', 'user', 'assistant', 'tool', 'command', 'system', 'error']
  const filterLabels = { all: t.all, user: t.user, assistant: t.assistant, tool: t.tool, command: t.command, system: t.system, error: t.error }
  const progress = filtered.length <= 1 ? 100 : (activeIndex / (filtered.length - 1)) * 100

  function replayFromStart(): void {
    setSelectedId(filtered[0]?.id ?? null)
    setReplaying(true)
    setPlaying(filtered.length > 1)
  }

  async function copyBody(): Promise<void> {
    if (!active) return
    try {
      await navigator.clipboard.writeText(active.body || active.summary)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {}
  }

  async function earlier(): Promise<void> {
    setLoadingOlder(true)
    try { await loadOlder() } finally { setLoadingOlder(false) }
  }

  function exportReplay(): void {
    if (published.events.length === 0) return
    localStorage.setItem('agent-replay:title', shareTitle)
    localStorage.removeItem('agent-replay:repo')
    const blob = new Blob([shareHtml(resolvedTitle, published.events)], { type: 'text/html;charset=utf-8' })
    const href = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = href
    anchor.download = `${resolvedTitle.replace(/[^a-z0-9\u4e00-\u9fff]+/gi, '-').replace(/^-|-$/g, '') || 'agent-replay'}.html`
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(href), 1_000)
  }

  if (events.length === 0) {
    return <div className="ar-root ar-empty-root">
      <div className="ar-empty-mark"><PlayIcon /></div>
      <h2>{t.emptyTitle}</h2>
      <p>{t.emptyBody}</p>
    </div>
  }

  return <div className="ar-root" data-conversation-composer-overlay="">
    <header className="ar-toolbar">
      <div className="ar-toolbar-actions">
        <button className="ar-toolbar-button" onClick={playing ? () => setPlaying(false) : replayFromStart}>{playing ? <PauseIcon /> : <PlayIcon />}{playing ? t.pause : t.startReplay}</button>
        <button className={`ar-toolbar-button ${publishOpen ? 'active' : ''}`} onClick={() => { setPublishOpen(value => !value); setPlaying(false) }}><ShareIcon />{publishOpen ? t.back : t.publish}</button>
      </div>
      <div className="ar-search"><SearchIcon /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={t.search} /></div>
      <div className="ar-status"><StateDot state={snapshot.running ? 'ongoing' : 'done'} size={10} /><span>{snapshot.running ? t.running : t.recorded}</span><b>{t.local}</b></div>
    </header>

    <section className="ar-summary">
      <div className="ar-metric"><strong>{events.length}</strong><span>{t.events}</span></div>
      <div className="ar-metric"><strong>{toolCount}</strong><span>{t.tools}</span></div>
      <div className={`ar-metric ${errorCount > 0 ? 'danger' : ''}`}><strong>{errorCount}</strong><span>{t.errors}</span></div>
      <div className="ar-metric"><strong>{formatDuration(elapsed)}</strong><span>{t.elapsed}</span></div>
      <div className="ar-event-map" aria-hidden="true">{events.slice(-80).map(event => <i key={event.id} className={event.kind} />)}</div>
    </section>

    <div className="ar-workspace">
      <aside className="ar-sidebar">
        <div className="ar-filters">{filters.map(item => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{filterLabels[item]}</button>)}</div>
        <div className="ar-list">
          {snapshot.hasMore && <button className="ar-older" disabled={loadingOlder} onClick={() => void earlier()}>{loadingOlder ? t.loading : t.earlier}</button>}
          {filtered.length === 0 ? <div className="ar-no-match"><SearchIcon /><strong>{t.noMatch}</strong><span>{t.noMatchBody}</span></div> : filtered.map((event, index) => <button
            key={event.id}
            className={`ar-event ${active?.id === event.id ? 'active' : ''} ${replaying && index > activeIndex ? 'future' : ''} ${replaying && index < activeIndex ? 'played' : ''}`}
            onClick={() => { setSelectedId(event.id); setPlaying(false); setReplaying(false); setPublishOpen(false) }}
          >
            <span className={`ar-event-icon ${event.kind}`}><EventIcon kind={event.kind} /></span>
            <span className="ar-event-copy"><strong>{event.title}</strong><span>{event.summary}</span></span>
            <span className="ar-event-time">{offsetLabel(event.time, startTime, t.live)}</span>
          </button>)}
        </div>
        <div className="ar-player">
          <button className="ar-play" onClick={() => {
            if (playing) { setPlaying(false); return }
            if (!replaying || activeIndex >= filtered.length - 1) { replayFromStart(); return }
            setPlaying(true)
          }} aria-label={playing ? t.pause : replaying ? t.resume : t.play}>{playing ? <PauseIcon /> : <PlayIcon />}<span>{playing ? t.pause : replaying ? t.resume : t.play}</span></button>
          <div className="ar-progress"><div><i style={{ width: `${progress}%` }} /></div><span>{filtered.length === 0 ? '0 / 0' : `${activeIndex + 1} / ${filtered.length}`}</span></div>
          <select value={rate} onChange={event => setRate(Number(event.target.value))} aria-label={t.speed}><option value="1">1×</option><option value="2">2×</option><option value="4">4×</option></select>
          <button className="ar-restart" onClick={replayFromStart} aria-label={t.restart}><RestartIcon /></button>
        </div>
      </aside>

      <main className="ar-detail">
        {publishOpen ? <div className="ar-publish">
          <div className="ar-publish-head"><div><span>{t.publishTitle}</span><h2>{t.publish}</h2><p>{t.publishHint}</p></div><ShareIcon /></div>
          <div className="ar-settings">
            <label><span>{t.pageTitle}</span><Input className="ar-settings-input" value={shareTitle} onChange={event => setShareTitle(event.target.value)} placeholder={defaultTitle} /></label>
            <div className="ar-setting-row"><span><ShieldIcon />{t.privacy}</span><div><strong>{t.privacyReady}</strong><small>{published.redactions} {t.redacted}</small></div></div>
            <div className="ar-setting-row"><span><ShareIcon />{t.included}</span><div><strong>{published.events.length} {t.events}</strong><small>{t.includedHint}</small></div></div>
          </div>
          <div className="ar-share-preview">
            <span>{t.preview}</span><h3>{resolvedTitle}</h3>
            <p>{published.events.length} {t.events} · {toolCount} {t.tools} · {formatDuration(elapsed)}</p>
          </div>
          <Button className="ar-export" size="sm" variant="primary" icon={<DownloadIcon size={13} />} disabled={published.events.length === 0} onClick={exportReplay}>{t.exportHtml}</Button>
        </div> : active === null ? <div className="ar-select-hint">{t.select}</div> : <>
          <div className="ar-detail-head">
            <span className={`ar-detail-icon ${active.kind}`}><EventIcon kind={active.kind} /></span>
            <div><span>{t.details} · {active.sourceKind}</span><h2>{active.title}</h2><p>{active.summary}</p></div>
            {active.live && <b className="ar-live-badge"><i />{t.live}</b>}
          </div>
          <div className="ar-facts">
            <div><span>{t.sequence}</span><strong>#{active.seq > 1_000_000_000 ? '—' : active.seq}</strong></div>
            <div><span>{t.timestamp}</span><strong>{formatClock(active.time, t.live)}</strong></div>
            <div><span>{t.duration}</span><strong>{active.durationMs === undefined ? '—' : formatDuration(active.durationMs)}</strong></div>
            {active.meta.map(item => <div key={item.label}><span>{item.label === 'Turn' ? t.turn : item.label === 'Step' ? t.step : item.label}</span><strong>{item.value}</strong></div>)}
          </div>
          <section className="ar-content-card">
            <div className="ar-content-head"><span>{t.raw}</span><button onClick={() => void copyBody()} disabled={!active.body}><CopyIcon />{copied ? t.copied : t.copy}</button></div>
            <pre>{active.body || active.summary}</pre>
          </section>
          <div className="ar-truth-note"><ClockIcon /><span>{t.loadedWindow}: {startTime === null ? '—' : formatClock(startTime, t.live)} — {endTime === null ? '—' : formatClock(endTime, t.live)}</span></div>
        </>}
      </main>
    </div>
  </div>
}

/** Services required by the browser plugin. */
export const inject = ['slots', 'sessions']

/** Add a native, session-scoped Replay tab to the conversation view ring. */
export function apply(ctx: Context): void {
  ctx.effect(() => {
    const style = document.createElement('style')
    style.dataset.agentReplay = 'true'
    style.textContent = STYLES
    document.head.appendChild(style)
    return () => style.remove()
  }, 'agent-replay: styles')

  ctx.slots.inject('conversation.view', () => ctx.slots.register({
    name: 'conversation.view', id: 'agent-replay', order: 20, label: () => COPY[language()].tab,
    inject: (sessionId: SessionId): ReplayInjected => ({
      loadOlder: async () => { await ctx.sessions.binding(sessionId)?.session.loadOlder() },
    }),
  }, ReplayView))
}
