import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { json, error } from '@sveltejs/kit';
import { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, SAVE_LOCAL, LOCAL_SCREENSHOTS_DIR } from '$env/static/private';
import { PUBLIC_TELEGRAM_ENABLED } from '$env/static/public';

export async function POST({ request }) {
	try {
		const { filename, dataUrl } = await request.json();
		const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
		const buffer = Buffer.from(base64, 'base64');

		if (SAVE_LOCAL === 'true') {
			await mkdir(LOCAL_SCREENSHOTS_DIR, { recursive: true });
			await writeFile(join(LOCAL_SCREENSHOTS_DIR, filename), buffer);
		}

		if (PUBLIC_TELEGRAM_ENABLED === 'true') {
			const formData = new FormData();
			formData.append('chat_id', TELEGRAM_CHAT_ID);
			formData.append('photo', new Blob([buffer], { type: 'image/png' }), filename);

			const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
				method: 'POST',
				body: formData
			});

			const result = await res.json();
			if (!result.ok) throw new Error(`Telegram error: ${result.description}`);
		}

		return json({ ok: true });
	} catch (err) {
		console.error('[save-screenshot] Error:', err);
		throw error(500, err.message);
	}
}
