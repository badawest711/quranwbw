import { json, error } from '@sveltejs/kit';
import { RECITATION_BOT_TOKEN, RECITATION_CHAT_ID } from '$env/static/private';
import { PUBLIC_TELEGRAM_ENABLED } from '$env/static/public';

export async function POST({ request }) {
	try {
		const { text } = await request.json();

		if (PUBLIC_TELEGRAM_ENABLED === 'true') {
			const res = await fetch(`https://api.telegram.org/bot${RECITATION_BOT_TOKEN}/sendMessage`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ chat_id: RECITATION_CHAT_ID, text })
			});
			const result = await res.json();
			if (!result.ok) throw new Error(`Telegram error: ${result.description}`);
		}

		return json({ ok: true });
	} catch (err) {
		console.error('[telegram-message] Error:', err);
		throw error(500, err.message);
	}
}
