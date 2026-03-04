import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { json, error } from '@sveltejs/kit';
import { PROGRESSION_DIR } from '$env/static/private';

const FILE_PATH = join(PROGRESSION_DIR, 'root-lemmas.json');

export async function GET() {
	if (!existsSync(FILE_PATH)) throw error(404, 'root-lemmas.json not generated yet');
	try {
		return json(JSON.parse(readFileSync(FILE_PATH, 'utf8')));
	} catch (err) {
		throw error(500, err.message);
	}
}
