import { ANTHROPIC_API_KEY } from '$env/static/private';
import { json, error } from '@sveltejs/kit';

export async function POST({ request }) {
	try {
		const { message, wordKey, mode, surah, ayah, wordIdx, arabicWord, wordTranslation, ayahArabic, ayahTranslation } = await request.json();

		const fullPrompt = [
			`=== Quranic Context ===`,
			`Surah: ${surah} | Ayah: ${ayah} | Word: ${wordIdx} (key: ${wordKey}) | Mode: ${mode}`,
			``,
			`--- Selected Word ---`,
			`Arabic:      ${arabicWord || '(none)'}`,
			`Translation: ${wordTranslation || '(none)'}`,
			``,
			`--- Full Ayah Arabic ---`,
			ayahArabic || '(none)',
			``,
			`--- Full Ayah Translation ---`,
			ayahTranslation || '(none)',
			``,
			`--- User Question ---`,
			message
		].join('\n');

		console.warn('[ask-ai] Full prompt:\n' + fullPrompt);

		const res = await fetch('https://api.anthropic.com/v1/messages', {
			method: 'POST',
			headers: {
				'x-api-key': ANTHROPIC_API_KEY,
				'anthropic-version': '2023-06-01',
				'content-type': 'application/json'
			},
			body: JSON.stringify({
				model: 'claude-opus-4-6',
				max_tokens: 1024,
				system: 'You are a Quran expert assistant. Answer questions about Quranic words, their Arabic grammar, morphology, Tajweed rules, and meanings concisely.',
				messages: [{ role: 'user', content: fullPrompt }]
			})
		});

		const data = await res.json();
		if (!res.ok) throw new Error(data.error?.message ?? `API error ${res.status}`);
		return json({ reply: data.content[0].text });
	} catch (err) {
		console.error('[ask-ai] Error:', err);
		throw error(500, err.message);
	}
}
