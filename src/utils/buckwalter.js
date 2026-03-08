// Buckwalter transliteration to Arabic Unicode decoder
// Supports the Quranic Arabic Corpus variant (Buckwalter 2 / QAC)
// Reference: http://corpus.quran.com

const BUCKWALTER_MAP = {
	// Consonants
	"'": '\u0621', // ء hamza
	'|': '\u0622', // آ alef madda
	'>': '\u0623', // أ alef with hamza above
	'&': '\u0624', // ؤ waw with hamza
	'<': '\u0625', // إ alef with hamza below
	'}': '\u0626', // ئ yeh with hamza
	A: '\u0627', // ا alef
	b: '\u0628', // ب ba
	p: '\u0629', // ة ta marbuta
	t: '\u062A', // ت ta
	v: '\u062B', // ث tha
	j: '\u062C', // ج jeem
	H: '\u062D', // ح ha
	x: '\u062E', // خ kha
	d: '\u062F', // د dal
	'*': '\u0630', // ذ dhal
	r: '\u0631', // ر ra
	z: '\u0632', // ز zayn
	s: '\u0633', // س seen
	$: '\u0634', // ش sheen
	S: '\u0635', // ص sad
	D: '\u0636', // ض dad
	T: '\u0637', // ط ta (emphatic)
	Z: '\u0638', // ظ dha (emphatic)
	E: '\u0639', // ع ain
	g: '\u063A', // غ ghayn
	f: '\u0641', // ف fa
	q: '\u0642', // ق qaf
	k: '\u0643', // ك kaf
	l: '\u0644', // ل lam
	m: '\u0645', // م meem
	n: '\u0646', // ن nun
	h: '\u0647', // ه ha
	w: '\u0648', // و waw
	Y: '\u0649', // ى alef maqsura
	y: '\u064A', // ي yeh

	// Diacritics (harakat)
	F: '\u064B', // ً tanwin fath
	N: '\u064C', // ٌ tanwin damm
	K: '\u064D', // ٍ tanwin kasr
	a: '\u064E', // َ fatha
	u: '\u064F', // ُ damma
	i: '\u0650', // ِ kasra
	'~': '\u0651', // ّ shadda
	o: '\u0652', // ْ sukun
	'`': '\u0670', // ٰ superscript alef (dagger alef)

	// Buckwalter 2 / QAC extensions
	'{': '\u0671', // ٱ alef wasla
	'^': '\u0654', // ٔ hamza above (combining)
	'#': '\u0655' // ٕ hamza below (combining)
};

/**
 * Decode a Buckwalter-encoded string to Arabic Unicode.
 * Unrecognised characters are passed through unchanged.
 * @param {string} bw
 * @returns {string}
 */
export function decodeBuckwalter(bw) {
	return [...bw].map((ch) => BUCKWALTER_MAP[ch] ?? ch).join('');
}

/**
 * Parse a single data line from the Quranic Arabic Corpus morphology file.
 *
 * Format: (sura:ayah:word:part)\tFORM\tTAG\tFEATURES
 *
 * @param {string} line
 * @returns {{ location: [number, number, number, number], form: string, arabic: string, tag: string, features: string[] } | null}
 */
export function parseCorpusLine(line) {
	if (!line || line.startsWith('#')) return null;

	const parts = line.split('\t');
	if (parts.length < 3) return null;

	const [loc, form, tag, featuresStr] = parts;
	const match = loc.match(/\((\d+):(\d+):(\d+):(\d+)\)/);
	if (!match) return null;

	return {
		location: [+match[1], +match[2], +match[3], +match[4]],
		form,
		arabic: decodeBuckwalter(form),
		tag,
		features: featuresStr ? featuresStr.split('|') : []
	};
}
