import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { json, error } from '@sveltejs/kit';
import { PROGRESSION_DIR } from '$env/static/private';

const FILE_PATH = join(PROGRESSION_DIR, 'known-lemmas.json');

// In-memory copy, kept in sync on every write
let words = [];
try {
	words = JSON.parse(readFileSync(FILE_PATH, 'utf8'));
} catch {
	words = [];
}

/** GET /api/known-lemmas — returns the full array of known arabic lemma strings */
export async function GET() {
	return json(words);
}

/**
 * POST /api/known-lemmas
 * Body: { words: string[] }
 * Replaces the entire array and persists to PROGRESSION_DIR/known-lemmas.json.
 */
export async function POST({ request }) {
	try {
		const body = await request.json();
		if (!Array.isArray(body.words)) throw error(400, 'Expected { words: string[] }');

		words = body.words;
		mkdirSync(PROGRESSION_DIR, { recursive: true });
		writeFileSync(FILE_PATH, JSON.stringify(words, null, 2));

		console.log('[known-lemmas] Saved:', words.length, 'entries');
		return json({ ok: true, count: words.length });
	} catch (err) {
		console.error('[known-lemmas] Error:', err);
		throw error(500, err.message);
	}
}
