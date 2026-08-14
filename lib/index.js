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
//#region src/index.ts
/** DeepSeek Harness host half for the Agent Replay browser plugin. */
const name = "dsh-agent-replay";
/** The first release is browser-only; the host entry participates in bundle discovery. */
function apply() {}

//#endregion
export { apply, name, redactText, sanitizeReplayEvents };