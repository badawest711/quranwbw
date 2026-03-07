import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { json, error } from '@sveltejs/kit';
import { PROGRESSION_DIR, GITHUB_TOKEN, GITHUB_GIST_ID } from '$env/static/private';

const FILE_PATH = join(PROGRESSION_DIR, 'known-lemmas.json');
const GIST_URL = `https://api.github.com/gists/${GITHUB_GIST_ID}`;
const GIST_HEADERS = {
	Authorization: `Bearer ${GITHUB_TOKEN}`,
	'Content-Type': 'application/json',
	'User-Agent': 'quranwbw'
};

// In-memory copy, kept in sync on every write
let words = [];
try {
	words = JSON.parse(readFileSync(FILE_PATH, 'utf8'));
} catch {
	words = [];
}

// Always pull from Gist on cold start (first GET); local file is just a fallback
let initFromGist = true;

// Debounce timer — only write to Gist once after a burst of updates
let gistDebounceTimer = null;

async function syncFromGist() {
	const res = await fetch(GIST_URL, { headers: GIST_HEADERS });
	if (!res.ok) throw new Error(`Gist fetch failed: ${res.status}`);
	const data = await res.json();
	const content = data.files?.['known-lemmas.json']?.content;
	if (!content) throw new Error('known-lemmas.json not found in Gist');
	return JSON.parse(content);
}

async function writeToGist(data) {
	const res = await fetch(GIST_URL, {
		method: 'PATCH',
		headers: GIST_HEADERS,
		body: JSON.stringify({
			files: { 'known-lemmas.json': { content: JSON.stringify(data, null, 2) } }
		})
	});
	if (!res.ok) throw new Error(`Gist write failed: ${res.status}`);
}

function scheduleGistWrite() {
	clearTimeout(gistDebounceTimer);
	gistDebounceTimer = setTimeout(() => {
		writeToGist(words)
			.then(() => console.log('[known-lemmas] Synced to Gist:', words.length, 'entries'))
			.catch((err) => console.error('[known-lemmas] Gist sync failed:', err.message));
	}, 2000);
}

/** GET /api/known-lemmas — returns the full array of known arabic lemma strings */
export async function GET() {
	if (initFromGist) {
		initFromGist = false;
		try {
			words = await syncFromGist();
			mkdirSync(PROGRESSION_DIR, { recursive: true });
			writeFileSync(FILE_PATH, JSON.stringify(words, null, 2));
			console.log('[known-lemmas] Initialized from Gist:', words.length, 'entries');
		} catch (err) {
			console.warn('[known-lemmas] Could not init from Gist:', err.message);
		}
	}
	return json(words);
}

/**
 * POST /api/known-lemmas
 * Body: { words: string[] }
 * Replaces the entire array and persists locally + schedules a Gist sync.
 */
export async function POST({ request }) {
	try {
		const body = await request.json();
		if (!Array.isArray(body.words)) throw error(400, 'Expected { words: string[] }');

		words = body.words;
		mkdirSync(PROGRESSION_DIR, { recursive: true });
		writeFileSync(FILE_PATH, JSON.stringify(words, null, 2));
		scheduleGistWrite();

		console.log('[known-lemmas] Saved:', words.length, 'entries');
		return json({ ok: true, count: words.length });
	} catch (err) {
		console.error('[known-lemmas] Error:', err);
		throw error(500, err.message);
	}
}
