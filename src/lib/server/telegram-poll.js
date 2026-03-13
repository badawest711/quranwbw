import { ARABIC_BOT_TOKEN, ARABIC_CHAT_ID } from '$env/static/private';
import { clearArabicWords } from '$lib/server/routines.js';

const COMMANDS = {
	'/cleararabicwords': handleClearArabicWords,
	'/clearchat': handleClearChat
};

let offset = 0;
let polling = false;
const botMessageIds = [];

export function startTelegramPolling() {
	if (polling) return;
	polling = true;
	console.log('[telegram-poll] Started polling Arabic bot');
	poll();
}

async function poll() {
	while (polling) {
		try {
			const res = await fetch(
				`https://api.telegram.org/bot${ARABIC_BOT_TOKEN}/getUpdates?offset=${offset}&timeout=30&allowed_updates=["message"]`
			);
			const data = await res.json();

			if (data.ok && data.result.length > 0) {
				for (const update of data.result) {
					offset = update.update_id + 1;
					await handleUpdate(update);
				}
			}
		} catch (err) {
			console.error('[telegram-poll] Error:', err.message);
			await sleep(5000);
		}
	}
}

async function handleUpdate(update) {
	const message = update?.message;
	if (!message) return;

	const chatId = String(message.chat?.id);
	if (chatId !== ARABIC_CHAT_ID) {
		console.warn(`[telegram-poll] Ignored message from unknown chat_id: ${chatId}`);
		return;
	}

	const command = message.text?.trim().toLowerCase();
	const handler = COMMANDS[command];

	if (handler) {
		await handler(chatId);
	} else {
		await reply(chatId, `Unknown command: ${message.text}`);
	}
}

async function handleClearArabicWords(chatId) {
	await clearArabicWords();
	await reply(chatId, 'clearArabicWords triggered.');
}

async function handleClearChat(chatId) {
	if (botMessageIds.length === 0) return;

	// deleteMessages supports up to 100 IDs at a time
	const chunks = [];
	for (let i = 0; i < botMessageIds.length; i += 100) {
		chunks.push(botMessageIds.slice(i, i + 100));
	}

	for (const chunk of chunks) {
		await fetch(`https://api.telegram.org/bot${ARABIC_BOT_TOKEN}/deleteMessages`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ chat_id: chatId, message_ids: chunk })
		});
	}

	botMessageIds.length = 0;
}

async function reply(chatId, text) {
	const res = await fetch(`https://api.telegram.org/bot${ARABIC_BOT_TOKEN}/sendMessage`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ chat_id: chatId, text })
	});
	const data = await res.json();
	if (data.ok) botMessageIds.push(data.result.message_id);
}

function sleep(ms) {
	return new Promise((r) => setTimeout(r, ms));
}
