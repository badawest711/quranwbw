import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { json, error } from '@sveltejs/kit';

const SCREENSHOTS_DIR = 'C:\\Users\\aydyn\\Documents\\QuranWBW\\screenshots';

export async function POST({ request }) {
	try {
		const { filename, dataUrl } = await request.json();
		const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
		const buffer = Buffer.from(base64, 'base64');

		await mkdir(SCREENSHOTS_DIR, { recursive: true });

		const filepath = join(SCREENSHOTS_DIR, filename);
		await writeFile(filepath, buffer);

		return json({ path: filepath });
	} catch (err) {
		console.error('[save-screenshot] Error:', err);
		throw error(500, err.message);
	}
}
