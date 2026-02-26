import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { json, error } from '@sveltejs/kit';
import { PROGRESSION_DIR } from '$env/static/private';
import { WordKnowledgeStore } from '$utils/wordKnowledge.js';

const FILE_PATH = join(PROGRESSION_DIR, 'word-knowledge.json');

// Load once at startup; kept in sync on every write.
let store;
try {
	store = new WordKnowledgeStore(JSON.parse(readFileSync(FILE_PATH, 'utf8')));
} catch {
	store = new WordKnowledgeStore();
}

/**
 * POST /api/word-knowledge
 * Body: { arabic, translation, root, surah, ayah, startWordIndex, endWordIndex }
 * Increments numOfScreenshots if the entry already exists, otherwise inserts it.
 * Persists to PROGRESSION_DIR/word-knowledge.json.
 */
export async function POST({ request }) {
	try {
		const { arabic, translation, root, surah, ayah, startWordIndex, endWordIndex } =
			await request.json();

		if (!surah || !ayah || startWordIndex == null || endWordIndex == null) {
			throw error(400, 'Missing required fields: surah, ayah, startWordIndex, endWordIndex');
		}

		const entry = store.recordScreenshot({
			arabic,
			translation,
			root: root ?? null,
			surah,
			ayah,
			startWordIndex,
			endWordIndex
		});

		console.warn('[word-knowledge] Recorded screenshot:', `${surah}:${ayah}:${startWordIndex}-${endWordIndex}`, `(total: ${entry.numOfScreenshots})`);

		mkdirSync(PROGRESSION_DIR, { recursive: true });
		writeFileSync(FILE_PATH, JSON.stringify(store.toJSON(), null, 2));

		return json({ ok: true, entry });
	} catch (err) {
		console.error('[word-knowledge] Error:', err);
		throw error(500, err.message);
	}
}
