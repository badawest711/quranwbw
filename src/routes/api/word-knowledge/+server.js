import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { json, error } from '@sveltejs/kit';
import { PROGRESSION_DIR } from '$env/static/private';

const FILE_PATH = join(PROGRESSION_DIR, 'word-knowledge.json');

// In-memory map — loaded once from disk at server startup, kept in sync on every write.
let knowledgeMap = {};

try {
	knowledgeMap = JSON.parse(readFileSync(FILE_PATH, 'utf8'));
} catch {
	knowledgeMap = {};
}

/**
 * POST /api/word-knowledge
 * Body: { wordKey: "2:255:3", updates: { known: true } }
 * Merges `updates` into the existing entry, persists to PROGRESSION_DIR/word-knowledge.json.
 * Returns the updated entry (or null if all flags cleared).
 */
export async function POST({ request }) {
	try {
		const { wordKey, updates } = await request.json();

		if (!wordKey || typeof updates !== 'object') {
			throw error(400, 'Missing wordKey or updates');
		}

		knowledgeMap[wordKey] = { ...knowledgeMap[wordKey], ...updates };

		// Remove entry entirely if all flags are false/undefined
		const entry = knowledgeMap[wordKey];
		if (!entry.known && !entry.bookmarked) {
			delete knowledgeMap[wordKey];
		}

		mkdirSync(PROGRESSION_DIR, { recursive: true });
		writeFileSync(FILE_PATH, JSON.stringify(knowledgeMap, null, 2));

		return json({ ok: true, entry: knowledgeMap[wordKey] ?? null });
	} catch (err) {
		console.error('[word-knowledge] Error:', err);
		throw error(500, err.message);
	}
}
