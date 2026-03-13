import { json, error } from '@sveltejs/kit';
import { ARABIC_BOT_TOKEN, ARABIC_CHAT_ID, ARABIC_BOT_WEBHOOK_SECRET } from '$env/static/private';
import { clearArabicWords } from '$lib/server/routines.js';

const COMMANDS = {
	'/cleararabicwords': handleClearArabicWords
};

export async function POST({ request }) {
	const secret = request.headers.get('x-telegram-bot-api-secret-token');
	if (secret !== ARABIC_BOT_WEBHOOK_SECRET) {
		throw error(401, 'Unauthorized');
	}

	const update = await request.json();
	const message = update?.message;
	if (!message) return json({ ok: true });

	const chatId = String(message.chat?.id);
	if (chatId !== ARABIC_CHAT_ID) {
		console.warn(`[telegram-webhook] Ignored message from unknown chat_id: ${chatId}`);
		return json({ ok: true });
	}

	const command = message.text?.trim().toLowerCase();
	const handler = COMMANDS[command];

	if (handler) {
		await handler(chatId);
	} else {
		await reply(chatId, `Unknown command: ${message.text}`);
	}

	return json({ ok: true });
}

async function handleClearArabicWords(chatId) {
	await clearArabicWords();
	await reply(chatId, 'clearArabicWords triggered.');
}

async function reply(chatId, text) {
	await fetch(`https://api.telegram.org/bot${ARABIC_BOT_TOKEN}/sendMessage`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ chat_id: chatId, text })
	});
}
