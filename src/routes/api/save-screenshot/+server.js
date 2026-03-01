import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { json, error } from '@sveltejs/kit';
import { ARABIC_BOT_TOKEN, ARABIC_CHAT_ID, SAVE_LOCAL, ARABIC_SCREENSHOTS_DIR, TAJWEED_BOT_TOKEN, TAJWEED_CHAT_ID, TAJWEED_SCREENSHOTS_DIR } from '$env/static/private';
import { PUBLIC_TELEGRAM_ENABLED } from '$env/static/public';

export async function POST({ request }) {
	try {
		const { filename, dataUrl, caption = '', audioUrls = [], audiosBase64 = [], mode = 'arabic' } = await request.json();
		const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
		const buffer = Buffer.from(base64, 'base64');

		const isTajweed = mode === 'tajweed';
		const BOT_TOKEN = isTajweed ? TAJWEED_BOT_TOKEN : ARABIC_BOT_TOKEN;
		const CHAT_ID = isTajweed ? TAJWEED_CHAT_ID : ARABIC_CHAT_ID;
		const SCREENSHOTS_DIR = isTajweed ? TAJWEED_SCREENSHOTS_DIR : ARABIC_SCREENSHOTS_DIR;

		if (SAVE_LOCAL === 'true') {
			await mkdir(SCREENSHOTS_DIR, { recursive: true });
			await writeFile(join(SCREENSHOTS_DIR, filename), buffer);
			for (const { name, base64: ab64, format = 'wav' } of audiosBase64) {
				const audioBuf = Buffer.from(ab64, 'base64');
				const audioFilename = filename.replace('.png', `-${name.replace(/\s+/g, '_')}.${format}`);
				await writeFile(join(SCREENSHOTS_DIR, audioFilename), audioBuf);
			}
		}

		if (PUBLIC_TELEGRAM_ENABLED === 'true') {
			const formData = new FormData();
			formData.append('chat_id', CHAT_ID);
			formData.append('photo', new Blob([buffer], { type: 'image/png' }), filename);
			if (caption) {
				formData.append('caption', `<b><i>${caption}</i></b>`);
				formData.append('parse_mode', 'HTML');
			}

			const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
				method: 'POST',
				body: formData
			});

			const result = await res.json();
			if (!result.ok) throw new Error(`Telegram error: ${result.description}`);

			if (audiosBase64.length > 0) {
				// Multi-reciter clips — one file per reciter, sent sequentially
				for (const { name, base64: ab64, format = 'wav' } of audiosBase64) {
					const audioBuf = Buffer.from(ab64, 'base64');
					const audioFilename = filename.replace('.png', `-${name.replace(/\s+/g, '_')}.${format}`);
					const mimeType = format === 'mp3' ? 'audio/mpeg' : 'audio/wav';
					const audioFormData = new FormData();
					audioFormData.append('chat_id', CHAT_ID);
					audioFormData.append('audio', new Blob([audioBuf], { type: mimeType }), audioFilename);
					audioFormData.append('performer', name);
					const audioRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendAudio`, {
						method: 'POST',
						body: audioFormData
					});
					const audioResult = await audioRes.json();
					if (!audioResult.ok) throw new Error(`Telegram audio error (${name}): ${audioResult.description}`);
				}
			} else if (audioUrls.length === 1) {
				// Single word — send by URL directly
				const audioRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendAudio`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ chat_id: CHAT_ID, audio: audioUrls[0] })
				});
				const audioResult = await audioRes.json();
				if (!audioResult.ok) throw new Error(`Telegram audio error: ${audioResult.description}`);
			}
		}

		return json({ ok: true });
	} catch (err) {
		console.error('[save-screenshot] Error:', err);
		throw error(500, err.message);
	}
}
