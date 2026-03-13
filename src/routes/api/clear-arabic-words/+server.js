import { json } from '@sveltejs/kit';
import { clearArabicWords } from '$lib/server/routines.js';

export async function POST() {
	await clearArabicWords();
	return json({ ok: true });
}
