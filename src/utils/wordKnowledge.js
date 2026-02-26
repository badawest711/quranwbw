/**
 * @typedef {Object} WordEntry
 * @property {string}      arabic           - Arabic text (one or more words joined with a space)
 * @property {string}      translation      - English translation
 * @property {string|null} root             - Arabic root letter(s); null when not available or multi-word
 * @property {number}      surah            - Surah number (1-based)
 * @property {number}      ayah             - Ayah number (1-based)
 * @property {number}      startWordIndex   - First word in range (1-based, inclusive)
 * @property {number}      endWordIndex     - Last word in range (1-based, inclusive)
 * @property {number}      numOfScreenshots - How many times this entry has been screenshotted
 * @property {string}      dateLastAdded    - ISO 8601 timestamp of the most recent screenshot
 */

/**
 * Build a brand-new WordEntry with numOfScreenshots = 1 and dateLastAdded = now.
 *
 * @param {Omit<WordEntry, 'numOfScreenshots' | 'dateLastAdded'>} data
 * @returns {WordEntry}
 */
export function createEntry({ arabic, translation, root, surah, ayah, startWordIndex, endWordIndex }) {
	return {
		arabic,
		translation,
		root: root ?? null,
		surah,
		ayah,
		startWordIndex,
		endWordIndex,
		numOfScreenshots: 1,
		dateLastAdded: new Date().toISOString()
	};
}

/**
 * In-memory store that mirrors the shape of word-knowledge.json.
 *
 * Usage (server-side):
 *   const store = new WordKnowledgeStore(JSON.parse(fileContents));
 *   store.recordScreenshot({ ... });
 *   writeFileSync(path, JSON.stringify(store.toJSON(), null, 2));
 */
export class WordKnowledgeStore {
	/** @param {{ words?: WordEntry[] }} [data] */
	constructor(data = {}) {
		/** @type {WordEntry[]} */
		this.words = Array.isArray(data.words) ? data.words : [];
	}

	/**
	 * Find an existing entry by its unique identity (surah + ayah + word range).
	 *
	 * @param {number} surah
	 * @param {number} ayah
	 * @param {number} startWordIndex
	 * @param {number} endWordIndex
	 * @returns {WordEntry|undefined}
	 */
	findEntry(surah, ayah, startWordIndex, endWordIndex) {
		return this.words.find(
			(e) =>
				e.surah === surah &&
				e.ayah === ayah &&
				e.startWordIndex === startWordIndex &&
				e.endWordIndex === endWordIndex
		);
	}

	/**
	 * Record a screenshot event.
	 * - If a matching entry already exists → increments numOfScreenshots.
	 * - Otherwise → inserts a new entry.
	 *
	 * @param {Omit<WordEntry, 'numOfScreenshots' | 'dateLastAdded'>} data
	 * @returns {WordEntry} The updated or newly created entry
	 */
	recordScreenshot({ arabic, translation, root, surah, ayah, startWordIndex, endWordIndex }) {
		const existing = this.findEntry(surah, ayah, startWordIndex, endWordIndex);
		if (existing) {
			existing.numOfScreenshots += 1;
			existing.dateLastAdded = new Date().toISOString();
			return existing;
		}
		const entry = createEntry({ arabic, translation, root, surah, ayah, startWordIndex, endWordIndex });
		this.words.push(entry);
		return entry;
	}

	/** Serialise back to the JSON file shape. */
	toJSON() {
		return { words: this.words };
	}
}
