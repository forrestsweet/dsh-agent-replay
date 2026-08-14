window.__ModuleLoader__.load({ id: "dsh-agent-replay", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
let __deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
let react = require("react");
let react_jsx_runtime = require("react/jsx-runtime");

//#region src/privacy.ts
/** Redact common local-user paths and credential shapes before sharing a replay. */
function redactText(input) {
	let value = input;
	let count = 0;
	const replace = (pattern, replacement) => {
		value = value.replace(pattern, () => {
			count += 1;
			return replacement;
		});
	};
	replace(/\/Users\/[^/\s]+/g, "~");
	replace(/\b[A-Za-z]:\\Users\\[^\\\s]+/gi, "~");
	replace(/\b(?:sk|ghp|github_pat|xox[baprs])[-_][A-Za-z0-9_-]{12,}\b/g, "[REDACTED_SECRET]");
	replace(/\bBearer\s+[A-Za-z0-9._~+\/-]{12,}=*/gi, "Bearer [REDACTED]");
	value = value.replace(/\b(api[_-]?key|token|secret|password)\s*[:=]\s*["']?[^\s,"']{8,}/gi, (_match, key) => {
		count += 1;
		return `${key}=[REDACTED]`;
	});
	return {
		value,
		count
	};
}
/** Select share-safe events and apply redaction without mutating the session data. */
function sanitizeReplayEvents(events) {
	let redactions = 0;
	return {
		events: events.filter((event) => event.kind !== "system" && !event.live).map((event) => {
			const title = redactText(event.title);
			const summary = redactText(event.summary);
			const body = redactText(event.publicBody ?? event.body);
			redactions += title.count + summary.count + body.count;
			return {
				...event,
				title: title.value,
				summary: summary.value,
				body: body.value
			};
		}),
		redactions
	};
}

//#endregion
//#region src/client/styles.ts
/**
* This stylesheet deliberately follows ui-trajectory's dimensions and states:
* 32px toolbar, 20px toolbar actions, 30px ledger rows, split inspector,
* semantic --dsw-* tokens, and the same hover/focus treatments.
*/
const STYLES = String.raw`
[data-agent-replay="true"]{display:none}
/* Replay is a read-only full-height view. The active view is the only mounted
   conversation.view entry, so :has(.ar-root) scopes this to Replay and the
   composer returns as soon as the user switches back to Chat or Trajectory. */
[data-conversation-scroll]:has(.ar-root)>[data-composer-seat]{display:none}
.ar-root,.ar-root *{box-sizing:border-box}
.ar-root{display:flex;flex-direction:column;overflow:hidden;width:100%;height:100%;min-width:0;min-height:0;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-1);font-family:var(--dsw-font-family)}
.ar-toolbar{position:sticky;top:0;z-index:4;display:flex;align-items:center;width:100%;height:32px;flex:none;padding:0 6px;gap:8px;border-bottom:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1)}
.ar-toolbar-actions{display:flex;align-items:center;gap:2px;flex:none}
.ar-toolbar-button{display:inline-flex;align-items:center;height:20px;padding:0 7px;gap:4px;border:0;border-radius:3px;color:var(--dsw-alias-label-tertiary);background:transparent;cursor:pointer;font:var(--dsw-font-xxs-12)}
.ar-toolbar-button:hover,.ar-toolbar-button.active{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}
.ar-toolbar-button:focus-visible{outline:1px solid var(--dsw-alias-state-business-primary);outline-offset:1px}
.ar-toolbar-button svg{width:12px;height:12px;flex:none}
.ar-search{display:flex;align-items:center;width:164px;min-width:84px;height:22px;margin-left:auto;padding:0 6px;gap:4px;border:1px solid var(--dsw-alias-border-l2);border-radius:4px;color:var(--dsw-alias-label-caption);background:var(--dsw-alias-bg-layer-2)}
.ar-search:hover{border-color:var(--dsw-alias-label-caption)}.ar-search:focus-within{border-color:var(--dsw-alias-state-business-primary);background:var(--dsw-alias-bg-layer-1)}
.ar-search svg{width:11px;height:11px;flex:none}.ar-search input{width:100%;min-width:0;padding:0;border:0;outline:0;color:var(--dsw-alias-label-primary);background:transparent;font:var(--dsw-font-xxs-12)}.ar-search input::placeholder{color:var(--dsw-alias-label-caption)}
.ar-status{display:flex;align-items:center;gap:5px;flex:none;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxs-12)}.ar-status>i{width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-state-success-primary)}.ar-status>i.live{animation:ar-pulse 1.5s ease-in-out infinite}.ar-status>b{padding-left:8px;border-left:1px solid var(--dsw-alias-border-l2);font-weight:400;color:var(--dsw-alias-label-caption)}
.ar-summary{display:flex;align-items:center;height:50px;flex:none;padding:0 12px;border-bottom:1px solid var(--dsw-alias-border-l2);background:var(--dsw-specific-sidebar-fill)}
.ar-metric{display:flex;align-items:baseline;gap:5px;min-width:82px;padding:0 12px;border-right:1px solid var(--dsw-alias-border-l2)}.ar-metric:first-child{padding-left:0}.ar-metric strong{font:var(--dsw-font-s-strong-14);font-variant-numeric:tabular-nums}.ar-metric span{color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxs-12)}.ar-metric.danger strong{color:var(--dsw-alias-state-error-primary)}
.ar-event-map{display:flex;align-items:center;justify-content:flex-end;height:22px;flex:1;margin-left:12px;gap:2px;overflow:hidden}.ar-event-map i{display:block;width:3px;height:7px;flex:none;border-radius:1px;background:var(--dsw-alias-label-caption)}.ar-event-map i.user{height:12px;background:var(--dsw-alias-state-business-primary)}.ar-event-map i.assistant{height:16px;background:var(--dsw-alias-brand-primary-new-colorprimary-new-color)}.ar-event-map i.tool{height:10px;background:var(--dsw-alias-state-warn-label)}.ar-event-map i.error{height:16px;background:var(--dsw-alias-state-error-primary)}
.ar-workspace{display:flex;flex:1;width:100%;min-height:0;overflow:hidden;background:var(--dsw-alias-bg-layer-1)}
.ar-sidebar{display:flex;flex-direction:column;width:40%;min-width:300px;min-height:0;border-right:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1)}
.ar-filters{display:flex;align-items:center;height:30px;flex:none;padding:0 6px;gap:2px;border-bottom:1px solid var(--dsw-alias-border-l2);background:var(--dsw-specific-sidebar-fill);overflow-x:auto}
.ar-filters button{display:inline-flex;align-items:center;height:20px;padding:0 5px;border:0;border-radius:3px;color:var(--dsw-alias-label-tertiary);background:transparent;cursor:pointer;font:var(--dsw-font-xxs-12);white-space:nowrap}.ar-filters button:hover,.ar-filters button.active{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}
.ar-list{flex:1;min-height:0;overflow-y:auto}.ar-event{position:relative;display:grid;grid-template-columns:28px minmax(0,1fr) 44px;align-items:center;width:100%;height:44px;padding:0 8px;gap:4px;border:0;border-bottom:1px solid var(--dsw-alias-border-l1);outline:0;color:inherit;background:transparent;text-align:left;cursor:default;transition:background-color 120ms var(--ds-ease-in-out),opacity 120ms var(--ds-ease-in-out)}
.ar-event:hover{background:var(--dsw-alias-interactive-bg-hover)}.ar-event.active{background:var(--dsw-alias-interactive-bg-active)}.ar-event.active::before{position:absolute;top:0;bottom:0;left:0;width:3px;background:var(--dsw-alias-brand-primary-new-colorprimary-new-color);content:""}.ar-event.future{opacity:.24}.ar-event.played:not(.active){opacity:.62}
.ar-event-icon{display:flex;align-items:center;justify-content:center;width:20px;height:20px;color:var(--dsw-alias-label-secondary)}.ar-event-icon.assistant{color:var(--dsw-alias-brand-primary-new-colorprimary-new-color)}.ar-event-icon.tool{color:var(--dsw-alias-state-warn-label)}.ar-event-icon.error{color:var(--dsw-alias-state-error-primary)}.ar-icon-svg{width:13px;height:13px}
.ar-event-copy{display:flex;flex-direction:column;min-width:0}.ar-event-copy strong,.ar-event-copy span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ar-event-copy strong{font:var(--dsw-font-xs-13);font-weight:500}.ar-event-copy span{margin-top:1px;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxs-12)}.ar-event-time{color:var(--dsw-alias-label-caption);font:var(--dsw-font-xxs-12);font-variant-numeric:tabular-nums;text-align:right}
.ar-older{display:flex;align-items:center;justify-content:center;width:100%;height:29px;border:0;border-bottom:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-1);cursor:pointer;font:var(--dsw-font-xxs-12)}.ar-older:hover:not(:disabled){color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}.ar-older:disabled{cursor:default}
.ar-no-match{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--dsw-alias-label-tertiary);text-align:center}.ar-no-match svg{width:16px;margin-bottom:8px}.ar-no-match strong{font:var(--dsw-font-xs-13)}.ar-no-match span{margin-top:4px;font:var(--dsw-font-xxs-12)}
.ar-player{display:flex;align-items:center;height:42px;flex:none;padding:0 6px;gap:6px;border-top:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1)}.ar-play,.ar-restart{display:inline-flex;align-items:center;height:24px;padding:0 6px;gap:4px;border:0;border-radius:3px;color:var(--dsw-alias-label-tertiary);background:transparent;cursor:pointer;font:var(--dsw-font-xxs-12)}.ar-play:hover,.ar-restart:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}.ar-play svg,.ar-restart svg{width:12px;height:12px}.ar-restart{width:24px;justify-content:center}
.ar-progress{display:flex;align-items:center;flex:1;min-width:40px;gap:6px}.ar-progress>div{height:2px;flex:1;background:var(--dsw-alias-border-l2)}.ar-progress i{display:block;height:100%;background:var(--dsw-alias-state-business-primary);transition:width 120ms var(--ds-ease-in-out)}.ar-progress span{color:var(--dsw-alias-label-caption);font:var(--dsw-font-xxs-12);font-variant-numeric:tabular-nums;white-space:nowrap}.ar-player select{height:22px;padding:0 4px;border:1px solid var(--dsw-alias-border-l2);border-radius:4px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2);font:var(--dsw-font-xxs-12)}
.ar-detail{flex:1;min-width:0;min-height:0;overflow-y:auto;background:var(--dsw-alias-bg-layer-1)}.ar-detail-head{display:grid;grid-template-columns:32px minmax(0,1fr) auto;align-items:start;padding:16px;gap:8px;border-bottom:1px solid var(--dsw-alias-border-l2);background:var(--dsw-specific-sidebar-fill)}.ar-detail-icon{display:flex;align-items:center;justify-content:center;width:24px;height:24px;color:var(--dsw-alias-label-secondary)}.ar-detail-icon.assistant{color:var(--dsw-alias-brand-primary-new-colorprimary-new-color)}.ar-detail-icon.tool{color:var(--dsw-alias-state-warn-label)}.ar-detail-icon.error{color:var(--dsw-alias-state-error-primary)}.ar-detail-icon svg{width:14px;height:14px}.ar-detail-head>div>span{color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxs-12)}.ar-detail-head h2{margin:3px 0 0;font:var(--dsw-font-s-strong-14)}.ar-detail-head p{margin:4px 0 0;color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xs-13);line-height:1.5}.ar-live-badge{display:flex;align-items:center;gap:4px;padding:2px 5px;border-radius:3px;color:var(--dsw-alias-state-success-primary);background:var(--dsw-alias-state-success-tertiary);font:var(--dsw-font-xxs-12)}.ar-live-badge i{width:5px;height:5px;border-radius:50%;background:currentColor}
.ar-facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));border-bottom:1px solid var(--dsw-alias-border-l2)}.ar-facts>div{padding:9px 12px;border-right:1px solid var(--dsw-alias-border-l2)}.ar-facts span,.ar-facts strong{display:block}.ar-facts span{color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxs-12)}.ar-facts strong{margin-top:3px;font:var(--dsw-font-xs-13);font-weight:500;font-variant-numeric:tabular-nums}
.ar-content-card{margin:12px;border:1px solid var(--dsw-alias-border-l2);border-radius:4px;overflow:hidden}.ar-content-head{display:flex;align-items:center;justify-content:space-between;height:30px;padding:0 8px;border-bottom:1px solid var(--dsw-alias-border-l2);background:var(--dsw-specific-sidebar-fill)}.ar-content-head>span{color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxs-12);font-weight:500}.ar-content-head button{display:flex;align-items:center;height:20px;padding:0 5px;gap:4px;border:0;border-radius:3px;color:var(--dsw-alias-label-tertiary);background:transparent;cursor:pointer;font:var(--dsw-font-xxs-12)}.ar-content-head button:hover:not(:disabled){color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}.ar-content-head button svg{width:11px}.ar-content-card pre{min-height:160px;max-height:52vh;margin:0;padding:12px;overflow:auto;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-markdown-code-block);white-space:pre-wrap;word-break:break-word;font:var(--dsw-font-markdown-code-block-small);line-height:1.6}.ar-truth-note{display:flex;align-items:center;margin:0 12px 12px;gap:5px;color:var(--dsw-alias-label-caption);font:var(--dsw-font-xxs-12)}.ar-truth-note svg{width:11px}.ar-select-hint{display:grid;place-items:center;height:100%;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xs-13)}
.ar-publish{width:100%;min-height:100%}.ar-publish-head{display:flex;align-items:flex-start;justify-content:space-between;padding:16px;border-bottom:1px solid var(--dsw-alias-border-l2);background:var(--dsw-specific-sidebar-fill)}.ar-publish-head>div>span{color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxs-12)}.ar-publish-head h2{margin:3px 0 0;font:var(--dsw-font-s-strong-14)}.ar-publish-head p{max-width:560px;margin:4px 0 0;color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xs-13);line-height:1.5}.ar-publish-head>svg{width:16px;color:var(--dsw-alias-label-tertiary)}
.ar-settings{border-bottom:1px solid var(--dsw-alias-border-l2)}.ar-settings label,.ar-setting-row{display:grid;grid-template-columns:150px minmax(0,1fr);align-items:center;min-height:44px;padding:6px 12px;border-bottom:1px solid var(--dsw-alias-border-l1)}.ar-settings label>span:first-child,.ar-setting-row>span{display:flex;align-items:center;gap:5px;color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xs-13)}.ar-setting-row>span svg{width:13px}.ar-settings-input{width:100%}.ar-setting-row>div{display:flex;flex-direction:column}.ar-setting-row strong{font:var(--dsw-font-xs-13);font-weight:400}.ar-setting-row small{margin-top:2px;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxs-12)}
.ar-share-preview{position:relative;margin:12px;padding:14px;border:1px solid var(--dsw-alias-border-l2);border-radius:4px;background:var(--dsw-alias-bg-layer-3)}.ar-share-preview>span{color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxs-12)}.ar-share-preview h3{margin:5px 0 0;font:var(--dsw-font-l-strong-16)}.ar-share-preview p{margin:6px 0 0;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xs-13)}.ar-export{margin:12px}
.ar-empty-root{align-items:center;justify-content:center;text-align:center}.ar-empty-mark{display:grid;place-items:center;width:32px;height:32px;color:var(--dsw-alias-label-tertiary)}.ar-empty-mark svg{width:18px}.ar-empty-root h2{margin:8px 0 0;font:var(--dsw-font-s-strong-14)}.ar-empty-root p{max-width:360px;margin:4px 20px 0;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xs-13);line-height:1.5}
@keyframes ar-pulse{50%{opacity:.35}}@media(prefers-reduced-motion:reduce){.ar-status>i.live{animation:none}}@media(max-width:760px){.ar-status>b,.ar-metric:nth-child(2),.ar-metric:nth-child(3){display:none}.ar-sidebar{min-width:270px;width:42%}.ar-settings label,.ar-setting-row{grid-template-columns:110px minmax(0,1fr)}}@media(max-width:600px){.ar-status{display:none}.ar-workspace{overflow-y:auto;flex-direction:column}.ar-sidebar{width:100%;min-width:0;height:360px;flex:none;border-right:0;border-bottom:1px solid var(--dsw-alias-border-l2)}.ar-detail{overflow:visible}.ar-event-map{display:none}}
`;

//#endregion
//#region src/client/index.tsx
const COPY = {
	en: {
		tab: "Replay",
		title: "Session replay",
		subtitle: "A local timeline built from this session’s real events",
		local: "Local session data",
		search: "Search events",
		all: "All",
		user: "User",
		assistant: "Assistant",
		tool: "Tools",
		command: "Commands",
		system: "System",
		error: "Errors",
		events: "events",
		tools: "tools",
		errors: "errors",
		elapsed: "elapsed",
		running: "Running",
		recorded: "Recorded",
		play: "Play replay",
		pause: "Pause replay",
		restart: "Replay from start",
		copy: "Copy",
		copied: "Copied",
		details: "Event details",
		emptyTitle: "Nothing to replay yet",
		emptyBody: "Send a message in Chat. Real session events will appear here automatically.",
		noMatch: "No matching events",
		noMatchBody: "Try another search or filter.",
		earlier: "Load earlier history",
		loading: "Loading…",
		loadedWindow: "Loaded window",
		sequence: "Sequence",
		event: "Event",
		timestamp: "Timestamp",
		duration: "Duration",
		turn: "Turn",
		step: "Step",
		live: "LIVE",
		speed: "Speed",
		startReplay: "Replay from start",
		resume: "Resume",
		raw: "Recorded content",
		select: "Select an event to inspect it.",
		publish: "Create share page",
		publishTitle: "Share page",
		publishHint: "Turn this session into a redacted, standalone replay for documentation, demos, and bug reports.",
		pageTitle: "Title",
		privacy: "Privacy",
		privacyReady: "System context excluded · paths and common secrets redacted",
		included: "Public replay",
		includedHint: "User, assistant, tool, command, and error events",
		exportHtml: "Export HTML",
		back: "Event details",
		redacted: "redactions",
		preview: "Share preview"
	},
	zh: {
		tab: "回放",
		title: "会话回放",
		subtitle: "完全基于当前会话真实事件生成的本地时间线",
		local: "本地会话数据",
		search: "搜索事件",
		all: "全部",
		user: "用户",
		assistant: "助手",
		tool: "工具",
		command: "命令",
		system: "系统",
		error: "错误",
		events: "个事件",
		tools: "次工具",
		errors: "个错误",
		elapsed: "总耗时",
		running: "运行中",
		recorded: "已记录",
		play: "播放回放",
		pause: "暂停回放",
		restart: "从头回放",
		copy: "复制",
		copied: "已复制",
		details: "事件详情",
		emptyTitle: "还没有可回放的内容",
		emptyBody: "先在「对话」中发送一条消息，真实会话事件会自动出现在这里。",
		noMatch: "没有匹配的事件",
		noMatchBody: "请尝试其他关键词或筛选条件。",
		earlier: "加载更早记录",
		loading: "加载中…",
		loadedWindow: "当前加载范围",
		sequence: "序号",
		event: "事件",
		timestamp: "时间",
		duration: "耗时",
		turn: "轮次",
		step: "步骤",
		live: "实时",
		speed: "速度",
		startReplay: "从头回放",
		resume: "继续",
		raw: "记录内容",
		select: "选择一个事件查看详情。",
		publish: "生成分享页",
		publishTitle: "分享页",
		publishHint: "把本次会话转换成经过脱敏的独立回放，用于文档、演示和问题反馈。",
		pageTitle: "页面标题",
		privacy: "隐私处理",
		privacyReady: "已排除系统上下文，并脱敏本地路径和常见密钥",
		included: "公开内容",
		includedHint: "用户、助手、工具、命令和错误事件",
		exportHtml: "导出 HTML",
		back: "事件详情",
		redacted: "处脱敏",
		preview: "分享预览"
	}
};
function language() {
	return (document.documentElement.lang || navigator.language).toLowerCase().startsWith("zh") ? "zh" : "en";
}
const PlayIcon = __deepseek_ai_dsh_client_ui_primitives.IconPlayOutline16;
const PauseIcon = __deepseek_ai_dsh_client_ui_primitives.IconPauseOutline16;
const RestartIcon = __deepseek_ai_dsh_client_ui_primitives.IconRefreshOutline16;
const SearchIcon = __deepseek_ai_dsh_client_ui_primitives.IconSearchOutline16;
const CopyIcon = __deepseek_ai_dsh_client_ui_primitives.IconCopyOutline16;
const ShareIcon = __deepseek_ai_dsh_client_ui_primitives.IconShareOutline16;
const DownloadIcon = __deepseek_ai_dsh_client_ui_primitives.IconDownloadOutline16;
const ShieldIcon = __deepseek_ai_dsh_client_ui_primitives.IconCheckOutline16;
const ClockIcon = __deepseek_ai_dsh_client_ui_primitives.IconDataOutline16;
function EventIcon({ kind }) {
	const props = { className: "ar-icon-svg" };
	if (kind === "user") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.IconUserOutline16, { ...props });
	if (kind === "assistant") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.IconSparkle16, { ...props });
	if (kind === "tool") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.IconCordisPluginOutline14, { ...props });
	if (kind === "command") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.IconCodeOutline16, { ...props });
	if (kind === "error") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.IconWarningOutline16, { ...props });
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.IconSettingsOutline16, { ...props });
}
function toPretty(value) {
	try {
		return JSON.stringify(JSON.parse(value), null, 2);
	} catch {
		return value;
	}
}
function stringifyUnknown(value) {
	if (typeof value === "string") return value;
	if (value === void 0 || value === null) return "";
	try {
		return JSON.stringify(value, null, 2);
	} catch {
		return String(value);
	}
}
function contentText(content) {
	return content.map((block) => {
		if (typeof block !== "object" || block === null) return stringifyUnknown(block);
		const item = block;
		if (typeof item.text === "string") return item.text;
		if (item.type === "image") return "[Image attachment]";
		if (item.type === "tool-result" && "content" in item) return stringifyUnknown(item.content);
		return stringifyUnknown(block);
	}).filter(Boolean).join("\n\n");
}
function assistantText(blocks) {
	return blocks.map((block) => {
		if (block.kind === "text") return block.text;
		if (block.kind === "reasoning") return block.text;
		if (block.kind === "tool-call") return `${block.name}\n${toPretty(block.argsRaw)}`;
		if (block.kind === "image") return "[Image attachment]";
		return stringifyUnknown(block.block);
	}).filter(Boolean).join("\n\n");
}
function oneLine(value, fallback) {
	const text = value.replace(/\s+/g, " ").trim();
	if (!text) return fallback;
	return text.length > 100 ? `${text.slice(0, 100)}…` : text;
}
function baseMeta(node) {
	const record = node;
	const meta = [];
	if (typeof record.turn === "number") meta.push({
		label: "Turn",
		value: String(record.turn)
	});
	if (typeof record.step === "number") meta.push({
		label: "Step",
		value: String(record.step)
	});
	return meta;
}
function nodeEvent(node) {
	const base = {
		id: `node-${node.seq}`,
		seq: node.seq,
		time: node.time,
		sourceKind: node.kind
	};
	const meta = baseMeta(node);
	switch (node.kind) {
		case "user": {
			const body = contentText(node.content);
			return {
				...base,
				kind: "user",
				title: "User message",
				summary: oneLine(body, "Message"),
				body,
				meta
			};
		}
		case "steering": {
			const body = contentText(node.content);
			return {
				...base,
				kind: "user",
				title: "Steering message",
				summary: oneLine(body, "Steering"),
				body,
				meta
			};
		}
		case "assistant": {
			const body = assistantText(node.blocks);
			const publicBody = node.blocks.filter((block) => block.kind === "text").map((block) => block.kind === "text" ? block.text : "").filter(Boolean).join("\n\n");
			const model = node.provenance?.model;
			const timing = node.timing;
			const durationMs = timing?.stepStartTime === null || timing?.stepStartTime === void 0 ? void 0 : Math.max(0, timing.completedTime - timing.stepStartTime);
			return {
				...base,
				kind: "assistant",
				title: model ? `Assistant · ${model}` : "Assistant response",
				summary: oneLine(publicBody || body, node.interrupted ? "Interrupted response" : "Response"),
				body,
				publicBody,
				meta,
				durationMs
			};
		}
		case "tool-result": {
			const name = node.call?.name ?? node.callId;
			const result = contentText(node.content);
			const args = node.call?.argsRaw ? toPretty(node.call.argsRaw) : "";
			const body = [args && `Arguments\n${args}`, result && `Result\n${result}`].filter(Boolean).join("\n\n");
			return {
				...base,
				kind: node.isError ? "error" : "tool",
				title: name,
				summary: node.isError ? oneLine(result, "Tool failed") : oneLine(result, "Tool completed"),
				body,
				meta,
				durationMs: node.callTime === null ? void 0 : Math.max(0, node.time - node.callTime)
			};
		}
		case "command": {
			const command = `/${node.name ?? "command"}${node.args ?? ""}`;
			const outcome = node.outcome?.text ?? (node.outcome === null ? "Running" : node.outcome.kind);
			return {
				...base,
				kind: node.outcome?.kind === "error" ? "error" : "command",
				title: command,
				summary: oneLine(outcome, command),
				body: outcome,
				meta
			};
		}
		case "turn-error": return {
			...base,
			kind: "error",
			title: node.code ?? "Turn error",
			summary: node.message,
			body: node.message,
			meta
		};
		case "model-retry": return {
			...base,
			kind: "system",
			title: "Model retry",
			summary: node.retryState,
			body: stringifyUnknown(node),
			meta
		};
		case "turn-max-tokens": return {
			...base,
			kind: "system",
			title: "Token limit reached",
			summary: "The turn ended at its output token limit.",
			body: "",
			meta
		};
		case "compaction": return {
			...base,
			kind: "system",
			title: "Context compacted",
			summary: node.shadowedItemCount === null ? "Conversation context compacted" : `${node.shadowedItemCount} items compacted`,
			body: node.summary ?? "",
			meta
		};
		case "context": {
			const body = contentText(node.content);
			return {
				...base,
				kind: "system",
				title: node.provenance.label ?? "Context",
				summary: oneLine(body, "Context injected"),
				body,
				meta
			};
		}
		default: return {
			...base,
			kind: "system",
			title: node.kind,
			summary: oneLine(stringifyUnknown(node), node.kind),
			body: stringifyUnknown(node),
			meta
		};
	}
}
function runningToolEvent(call, index) {
	const body = toPretty(call.argsRaw);
	return {
		id: `running-${call.callId}`,
		seq: Number.MAX_SAFE_INTEGER - 1e3 + index,
		time: call.time,
		kind: "tool",
		sourceKind: "tool-call",
		title: call.name,
		summary: oneLine(body, "Tool is running"),
		body,
		meta: [{
			label: "Turn",
			value: String(call.turn)
		}, {
			label: "Step",
			value: String(call.step)
		}],
		live: true
	};
}
function partialEvent(snapshot) {
	if (snapshot.partial === null) return null;
	const body = assistantText(snapshot.partial.blocks);
	return {
		id: `partial-${snapshot.partial.turn}-${snapshot.partial.step}`,
		seq: Number.MAX_SAFE_INTEGER,
		time: null,
		kind: "assistant",
		sourceKind: "assistant-partial",
		title: "Assistant streaming",
		summary: oneLine(body, "Generating response…"),
		body,
		meta: [{
			label: "Turn",
			value: String(snapshot.partial.turn)
		}, {
			label: "Step",
			value: String(snapshot.partial.step)
		}],
		live: true
	};
}
function buildEvents(snapshot) {
	const settled = snapshot.nodes.map(nodeEvent);
	const running = snapshot.runningCalls.map(runningToolEvent);
	const partial = partialEvent(snapshot);
	return [
		...settled,
		...running,
		...partial === null ? [] : [partial]
	].sort((a, b) => a.seq - b.seq);
}
function formatClock(time, live) {
	if (time === null) return live;
	return new Intl.DateTimeFormat(void 0, {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit"
	}).format(time);
}
function formatDuration(ms) {
	if (ms < 1e3) return `${Math.round(ms)} ms`;
	if (ms < 6e4) return `${(ms / 1e3).toFixed(ms < 1e4 ? 1 : 0)} s`;
	return `${Math.floor(ms / 6e4)}m ${Math.floor(ms % 6e4 / 1e3).toString().padStart(2, "0")}s`;
}
function offsetLabel(time, start, live) {
	if (time === null || start === null) return live;
	const seconds = Math.max(0, Math.round((time - start) / 1e3));
	return `+${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}
function escapeHtml(value) {
	return value.replace(/[&<>"']/g, (char) => ({
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		"\"": "&quot;",
		"'": "&#039;"
	})[char] ?? char);
}
function shareHtml(title, events) {
	const safeTitle = escapeHtml(title);
	return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safeTitle}</title><style>
:root{color-scheme:light;--dsw-alias-bg-layer-1:#fff;--dsw-alias-bg-layer-2:#fff;--dsw-alias-bg-module-platform:#f5f6f7;--dsw-specific-sidebar-fill:#f9fafb;--dsw-alias-border-l1:rgba(0,0,0,.04);--dsw-alias-border-l2:rgba(0,0,0,.1);--dsw-alias-label-primary:#0f1115;--dsw-alias-label-secondary:#61666b;--dsw-alias-label-tertiary:#81858c;--dsw-alias-label-caption:#adb2b8;--dsw-alias-interactive-bg-hover:rgba(38,49,72,.06);--dsw-alias-interactive-bg-active:rgba(38,49,72,.1);--dsw-alias-brand:#4176e6;--dsw-alias-warn:#dd8629;--dsw-alias-error:#ec1313;--dsw-code:#fafafa}
@media(prefers-color-scheme:dark){:root{color-scheme:dark;--dsw-alias-bg-layer-1:#232324;--dsw-alias-bg-layer-2:#2c2c2e;--dsw-alias-bg-module-platform:#353638;--dsw-specific-sidebar-fill:#1b1b1c;--dsw-alias-border-l1:rgba(255,255,255,.06);--dsw-alias-border-l2:rgba(255,255,255,.12);--dsw-alias-label-primary:#f9fafb;--dsw-alias-label-secondary:#cfd3d6;--dsw-alias-label-tertiary:#adb2b8;--dsw-alias-label-caption:#81858c;--dsw-alias-interactive-bg-hover:rgba(255,255,255,.08);--dsw-alias-interactive-bg-active:rgba(255,255,255,.14);--dsw-alias-brand:#5686fe;--dsw-alias-warn:#dd8629;--dsw-alias-error:#f25a5a;--dsw-code:#1b1b1c}}
*{box-sizing:border-box}html,body{height:100%}body{margin:0;overflow:hidden;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-1);font:12px/18px Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.root{display:flex;flex-direction:column;height:100%}.toolbar{display:flex;align-items:center;height:32px;flex:none;padding:0 6px;gap:6px;border-bottom:1px solid var(--dsw-alias-border-l2)}.toolbar strong{padding:0 5px;font-weight:500}.toolbar button{display:inline-flex;align-items:center;height:20px;padding:0 7px;border:0;border-radius:3px;color:var(--dsw-alias-label-tertiary);background:transparent;cursor:pointer;font:inherit}.toolbar button:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}.toolbar .count{margin-left:auto;color:var(--dsw-alias-label-tertiary)}.overview{display:grid;grid-template-columns:46px 1fr;height:72px;flex:none;border-bottom:1px solid var(--dsw-alias-border-l2);background:var(--dsw-specific-sidebar-fill)}.lanes{display:grid;grid-template-rows:repeat(3,1fr);align-items:center;padding-left:8px;color:var(--dsw-alias-label-caption);font-size:10px}.timeline{display:grid;grid-template-rows:repeat(3,1fr);padding:5px 8px 5px 0;gap:2px}.lane{display:flex;align-items:center;gap:2px;min-width:0}.block{height:8px;min-width:3px;flex:1;border-radius:1px;background:var(--dsw-alias-label-caption);opacity:.8}.block[data-kind=user]{background:var(--dsw-alias-brand)}.block[data-kind=assistant]{height:10px;background:var(--dsw-alias-brand)}.block[data-kind=tool]{background:var(--dsw-alias-warn)}.block[data-kind=error]{background:var(--dsw-alias-error)}.split{display:flex;flex:1;min-height:0}.tablePane{width:54%;min-width:320px;overflow:auto;border-right:1px solid var(--dsw-alias-border-l2)}table{width:100%;border-spacing:0;table-layout:fixed}th{position:sticky;top:0;z-index:1;height:30px;padding:0 8px;border-bottom:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-tertiary);background:var(--dsw-specific-sidebar-fill);font-weight:500;text-align:left}th:first-child{width:104px;text-align:right}td{height:30px;padding:0 8px;border-bottom:1px solid var(--dsw-alias-border-l1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}tr{cursor:default}tbody tr:hover{background:var(--dsw-alias-interactive-bg-hover)}tbody tr.active{background:var(--dsw-alias-interactive-bg-active)}tbody tr.active td:first-child{box-shadow:inset 3px 0 var(--dsw-alias-brand)}.kind{display:inline-flex;align-items:center;height:19px;padding:0 5px;border-radius:4px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-module-platform);font-size:10px;font-weight:650;letter-spacing:.035em}.kind[data-kind=user],.kind[data-kind=assistant]{color:var(--dsw-alias-brand)}.kind[data-kind=tool]{color:var(--dsw-alias-warn)}.kind[data-kind=error]{color:var(--dsw-alias-error)}.seq{color:var(--dsw-alias-label-caption);font-variant-numeric:tabular-nums}.details{display:flex;flex:1;flex-direction:column;min-width:0;overflow:auto}.detailsHeader{padding:14px 16px;border-bottom:1px solid var(--dsw-alias-border-l2);background:var(--dsw-specific-sidebar-fill)}.detailsHeader span{color:var(--dsw-alias-label-tertiary)}.detailsHeader h2{margin:3px 0 0;font-size:14px;line-height:20px}.detailsHeader p{margin:4px 0 0;color:var(--dsw-alias-label-secondary)}.facts{display:grid;grid-template-columns:repeat(3,1fr);border-bottom:1px solid var(--dsw-alias-border-l2)}.fact{padding:9px 12px;border-right:1px solid var(--dsw-alias-border-l2)}.fact span,.fact strong{display:block}.fact span{color:var(--dsw-alias-label-tertiary)}.fact strong{margin-top:2px;font-weight:500}.payloadHead{height:30px;padding:6px 12px;border-bottom:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-tertiary);background:var(--dsw-specific-sidebar-fill)}pre{flex:1;min-height:180px;margin:0;padding:12px;overflow:auto;color:var(--dsw-alias-label-primary);background:var(--dsw-code);white-space:pre-wrap;word-break:break-word;font:12px/19px ui-monospace,SFMono-Regular,Menlo,monospace}@media(max-width:700px){.overview{display:none}.split{overflow:auto;flex-direction:column}.tablePane{width:100%;height:48%;min-width:0;border-right:0;border-bottom:1px solid var(--dsw-alias-border-l2)}.details{min-height:52%}}
</style></head><body><main class="root"><div class="toolbar"><strong>${safeTitle}</strong><button id="play">▶ Replay</button><span class="count" id="count"></span></div><div class="overview"><div class="lanes"><span>Input</span><span>Model</span><span>Tools</span></div><div class="timeline"><div class="lane" id="inputLane"></div><div class="lane" id="modelLane"></div><div class="lane" id="toolLane"></div></div></div><div class="split"><div class="tablePane"><table><thead><tr><th>Event</th><th>Content</th><th>Time</th></tr></thead><tbody id="rows"></tbody></table></div><section class="details"><header class="detailsHeader"><span id="kind"></span><h2 id="title"></h2><p id="summary"></p></header><div class="facts"><div class="fact"><span>Sequence</span><strong id="sequence"></strong></div><div class="fact"><span>Time</span><strong id="time"></strong></div><div class="fact"><span>Duration</span><strong id="duration"></strong></div></div><div class="payloadHead">Recorded content</div><pre id="body"></pre></section></div></main><script>const events=${JSON.stringify(events.map((event) => ({
		kind: event.kind,
		title: event.title,
		summary: event.summary,
		body: event.body,
		time: event.time,
		durationMs: event.durationMs
	}))).replace(/<\/script/gi, "<\\/script")};const rows=document.querySelector('#rows');const inputLane=document.querySelector('#inputLane');const modelLane=document.querySelector('#modelLane');const toolLane=document.querySelector('#toolLane');let active=0,timer=null;document.querySelector('#count').textContent=events.length+' events';const fmt=t=>t?new Date(t).toLocaleTimeString(): '—';const dur=n=>n==null?'—':n<1000?Math.round(n)+' ms':(n/1000).toFixed(1)+' s';function select(i){active=i;document.querySelectorAll('tbody tr').forEach((el,n)=>el.classList.toggle('active',n===i));const e=events[i];document.querySelector('#kind').textContent=e.kind.toUpperCase();document.querySelector('#title').textContent=e.title;document.querySelector('#summary').textContent=e.summary;document.querySelector('#sequence').textContent='#'+(i+1);document.querySelector('#time').textContent=fmt(e.time);document.querySelector('#duration').textContent=dur(e.durationMs);document.querySelector('#body').textContent=e.body||e.summary;document.querySelectorAll('.block').forEach((el,n)=>el.style.opacity=n<=i?'.9':'.22')}events.forEach((e,i)=>{const tr=document.createElement('tr');const a=document.createElement('td');const tag=document.createElement('span');tag.className='kind';tag.dataset.kind=e.kind;tag.textContent=e.kind.toUpperCase();a.appendChild(tag);const b=document.createElement('td');b.textContent=e.title+' · '+e.summary;const c=document.createElement('td');c.className='seq';c.textContent=fmt(e.time);tr.append(a,b,c);tr.onclick=()=>{clearInterval(timer);timer=null;select(i)};rows.appendChild(tr);const block=document.createElement('i');block.className='block';block.dataset.kind=e.kind;(e.kind==='user'?inputLane:e.kind==='assistant'?modelLane:toolLane).appendChild(block)});document.querySelector('#play').onclick=()=>{clearInterval(timer);select(0);timer=setInterval(()=>{if(active>=events.length-1){clearInterval(timer);timer=null;return}select(active+1)},900)};if(events.length)select(0)<\/script></body></html>`;
}
function ReplayView({ useSession, loadOlder }) {
	const snapshot = useSession((value) => value);
	const t = COPY[language()];
	const events = (0, react.useMemo)(() => buildEvents(snapshot), [snapshot]);
	const [filter, setFilter] = (0, react.useState)("all");
	const [query, setQuery] = (0, react.useState)("");
	const [selectedId, setSelectedId] = (0, react.useState)(null);
	const [playing, setPlaying] = (0, react.useState)(false);
	const [replaying, setReplaying] = (0, react.useState)(false);
	const [rate, setRate] = (0, react.useState)(1);
	const [copied, setCopied] = (0, react.useState)(false);
	const [loadingOlder, setLoadingOlder] = (0, react.useState)(false);
	const [publishOpen, setPublishOpen] = (0, react.useState)(false);
	const [shareTitle, setShareTitle] = (0, react.useState)(() => localStorage.getItem("agent-replay:title") ?? "");
	(0, react.useEffect)(() => {
		localStorage.removeItem("agent-replay:repo");
	}, []);
	const filtered = (0, react.useMemo)(() => {
		const needle = query.trim().toLowerCase();
		return events.filter((event) => (filter === "all" || event.kind === filter) && (!needle || `${event.title}\n${event.summary}\n${event.body}`.toLowerCase().includes(needle)));
	}, [
		events,
		filter,
		query
	]);
	const activeIndex = Math.max(0, filtered.findIndex((event) => event.id === selectedId));
	const active = filtered[activeIndex] ?? null;
	const timed = events.filter((event) => event.time !== null);
	const startTime = timed[0]?.time ?? null;
	const endTime = timed.at(-1)?.time ?? startTime;
	const elapsed = startTime === null || endTime === null ? 0 : Math.max(0, endTime - startTime);
	const toolCount = events.filter((event) => event.sourceKind === "tool-result").length;
	const errorCount = events.filter((event) => event.kind === "error").length;
	const published = (0, react.useMemo)(() => sanitizeReplayEvents(events), [events]);
	const defaultTitle = events.find((event) => event.kind === "user")?.summary ?? t.title;
	const resolvedTitle = shareTitle.trim() || defaultTitle;
	(0, react.useEffect)(() => {
		if (filtered.length === 0) {
			setPlaying(false);
			return;
		}
		if (selectedId === null || !filtered.some((event) => event.id === selectedId)) setSelectedId(filtered.at(-1)?.id ?? null);
	}, [filtered, selectedId]);
	(0, react.useEffect)(() => {
		if (!playing || filtered.length === 0) return;
		const index = filtered.findIndex((event) => event.id === selectedId);
		const current = filtered[index];
		const next = filtered[index + 1];
		if (current === void 0 || next === void 0) {
			setPlaying(false);
			setReplaying(false);
			return;
		}
		const recordedGap = current.time === null || next.time === null ? 800 : Math.max(0, next.time - current.time);
		const delay = Math.min(4e3, Math.max(350, recordedGap / rate));
		const timer = window.setTimeout(() => {
			const index$1 = filtered.findIndex((event) => event.id === selectedId);
			if (index$1 < 0 || index$1 >= filtered.length - 1) {
				setPlaying(false);
				setReplaying(false);
				return;
			}
			setSelectedId(filtered[index$1 + 1]?.id ?? null);
		}, delay);
		return () => window.clearTimeout(timer);
	}, [
		filtered,
		playing,
		rate,
		selectedId
	]);
	const filters = [
		"all",
		"user",
		"assistant",
		"tool",
		"command",
		"system",
		"error"
	];
	const filterLabels = {
		all: t.all,
		user: t.user,
		assistant: t.assistant,
		tool: t.tool,
		command: t.command,
		system: t.system,
		error: t.error
	};
	const progress = filtered.length <= 1 ? 100 : activeIndex / (filtered.length - 1) * 100;
	function replayFromStart() {
		setSelectedId(filtered[0]?.id ?? null);
		setReplaying(true);
		setPlaying(filtered.length > 1);
	}
	async function copyBody() {
		if (!active) return;
		try {
			await navigator.clipboard.writeText(active.body || active.summary);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 1400);
		} catch {}
	}
	async function earlier() {
		setLoadingOlder(true);
		try {
			await loadOlder();
		} finally {
			setLoadingOlder(false);
		}
	}
	function exportReplay() {
		if (published.events.length === 0) return;
		localStorage.setItem("agent-replay:title", shareTitle);
		localStorage.removeItem("agent-replay:repo");
		const blob = new Blob([shareHtml(resolvedTitle, published.events)], { type: "text/html;charset=utf-8" });
		const href = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = href;
		anchor.download = `${resolvedTitle.replace(/[^a-z0-9\u4e00-\u9fff]+/gi, "-").replace(/^-|-$/g, "") || "agent-replay"}.html`;
		anchor.click();
		window.setTimeout(() => URL.revokeObjectURL(href), 1e3);
	}
	if (events.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: "ar-root ar-empty-root",
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "ar-empty-mark",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PlayIcon, {})
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", { children: t.emptyTitle }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: t.emptyBody })
		]
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: "ar-root",
		"data-conversation-composer-overlay": "",
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
				className: "ar-toolbar",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "ar-toolbar-actions",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							className: "ar-toolbar-button",
							onClick: playing ? () => setPlaying(false) : replayFromStart,
							children: [playing ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PauseIcon, {}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PlayIcon, {}), playing ? t.pause : t.startReplay]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							className: `ar-toolbar-button ${publishOpen ? "active" : ""}`,
							onClick: () => {
								setPublishOpen((value) => !value);
								setPlaying(false);
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ShareIcon, {}), publishOpen ? t.back : t.publish]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "ar-search",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SearchIcon, {}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							value: query,
							onChange: (event) => setQuery(event.target.value),
							placeholder: t.search
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "ar-status",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.StateDot, {
								state: snapshot.running ? "ongoing" : "done",
								size: 10
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: snapshot.running ? t.running : t.recorded }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: t.local })
						]
					})
				]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: "ar-summary",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "ar-metric",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: events.length }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t.events })]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "ar-metric",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: toolCount }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t.tools })]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: `ar-metric ${errorCount > 0 ? "danger" : ""}`,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: errorCount }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t.errors })]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "ar-metric",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: formatDuration(elapsed) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t.elapsed })]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "ar-event-map",
						"aria-hidden": "true",
						children: events.slice(-80).map((event) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { className: event.kind }, event.id))
					})
				]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "ar-workspace",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("aside", {
					className: "ar-sidebar",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "ar-filters",
							children: filters.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								className: filter === item ? "active" : "",
								onClick: () => setFilter(item),
								children: filterLabels[item]
							}, item))
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "ar-list",
							children: [snapshot.hasMore && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								className: "ar-older",
								disabled: loadingOlder,
								onClick: () => void earlier(),
								children: loadingOlder ? t.loading : t.earlier
							}), filtered.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "ar-no-match",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SearchIcon, {}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: t.noMatch }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t.noMatchBody })
								]
							}) : filtered.map((event, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								className: `ar-event ${active?.id === event.id ? "active" : ""} ${replaying && index > activeIndex ? "future" : ""} ${replaying && index < activeIndex ? "played" : ""}`,
								onClick: () => {
									setSelectedId(event.id);
									setPlaying(false);
									setReplaying(false);
									setPublishOpen(false);
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: `ar-event-icon ${event.kind}`,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EventIcon, { kind: event.kind })
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: "ar-event-copy",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: event.title }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: event.summary })]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "ar-event-time",
										children: offsetLabel(event.time, startTime, t.live)
									})
								]
							}, event.id))]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "ar-player",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									className: "ar-play",
									onClick: () => {
										if (playing) {
											setPlaying(false);
											return;
										}
										if (!replaying || activeIndex >= filtered.length - 1) {
											replayFromStart();
											return;
										}
										setPlaying(true);
									},
									"aria-label": playing ? t.pause : replaying ? t.resume : t.play,
									children: [playing ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PauseIcon, {}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PlayIcon, {}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: playing ? t.pause : replaying ? t.resume : t.play })]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "ar-progress",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: { width: `${progress}%` } }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: filtered.length === 0 ? "0 / 0" : `${activeIndex + 1} / ${filtered.length}` })]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
									value: rate,
									onChange: (event) => setRate(Number(event.target.value)),
									"aria-label": t.speed,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "1",
											children: "1×"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "2",
											children: "2×"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "4",
											children: "4×"
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									className: "ar-restart",
									onClick: replayFromStart,
									"aria-label": t.restart,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RestartIcon, {})
								})
							]
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("main", {
					className: "ar-detail",
					children: publishOpen ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "ar-publish",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "ar-publish-head",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t.publishTitle }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", { children: t.publish }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: t.publishHint })
								] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ShareIcon, {})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "ar-settings",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t.pageTitle }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.Input, {
										className: "ar-settings-input",
										value: shareTitle,
										onChange: (event) => setShareTitle(event.target.value),
										placeholder: defaultTitle
									})] }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "ar-setting-row",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ShieldIcon, {}), t.privacy] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: t.privacyReady }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("small", { children: [
											published.redactions,
											" ",
											t.redacted
										] })] })]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "ar-setting-row",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ShareIcon, {}), t.included] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("strong", { children: [
											published.events.length,
											" ",
											t.events
										] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: t.includedHint })] })]
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "ar-share-preview",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t.preview }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", { children: resolvedTitle }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", { children: [
										published.events.length,
										" ",
										t.events,
										" · ",
										toolCount,
										" ",
										t.tools,
										" · ",
										formatDuration(elapsed)
									] })
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.Button, {
								className: "ar-export",
								size: "sm",
								variant: "primary",
								icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DownloadIcon, { size: 13 }),
								disabled: published.events.length === 0,
								onClick: exportReplay,
								children: t.exportHtml
							})
						]
					}) : active === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "ar-select-hint",
						children: t.select
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "ar-detail-head",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: `ar-detail-icon ${active.kind}`,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EventIcon, { kind: active.kind })
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
										t.details,
										" · ",
										active.sourceKind
									] }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", { children: active.title }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: active.summary })
								] }),
								active.live && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("b", {
									className: "ar-live-badge",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", {}), t.live]
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "ar-facts",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t.sequence }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("strong", { children: ["#", active.seq > 1e9 ? "—" : active.seq] })] }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t.timestamp }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: formatClock(active.time, t.live) })] }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t.duration }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: active.durationMs === void 0 ? "—" : formatDuration(active.durationMs) })] }),
								active.meta.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: item.label === "Turn" ? t.turn : item.label === "Step" ? t.step : item.label }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: item.value })] }, item.label))
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
							className: "ar-content-card",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "ar-content-head",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t.raw }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									onClick: () => void copyBody(),
									disabled: !active.body,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CopyIcon, {}), copied ? t.copied : t.copy]
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", { children: active.body || active.summary })]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "ar-truth-note",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ClockIcon, {}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
								t.loadedWindow,
								": ",
								startTime === null ? "—" : formatClock(startTime, t.live),
								" — ",
								endTime === null ? "—" : formatClock(endTime, t.live)
							] })]
						})
					] })
				})]
			})
		]
	});
}
/** Services required by the browser plugin. */
const inject = ["slots", "sessions"];
/** Add a native, session-scoped Replay tab to the conversation view ring. */
function apply(ctx) {
	ctx.effect(() => {
		const style = document.createElement("style");
		style.dataset.agentReplay = "true";
		style.textContent = STYLES;
		document.head.appendChild(style);
		return () => style.remove();
	}, "agent-replay: styles");
	ctx.slots.inject("conversation.view", () => ctx.slots.register({
		name: "conversation.view",
		id: "agent-replay",
		order: 20,
		label: () => COPY[language()].tab,
		inject: (sessionId) => ({ loadOlder: async () => {
			await ctx.sessions.binding(sessionId)?.session.loadOlder();
		} })
	}, ReplayView));
}

//#endregion
exports.apply = apply;
exports.inject = inject;
return module.exports; } });
//# sourceMappingURL=client.js.map