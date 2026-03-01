<script>
	export let key;
	export let value;
	export let line = null;
	export let exampleVerse = false;

	import VerseOptionsDropdown from '$display/verses/VerseOptionsDropdown.svelte';
	import Tooltip from '$ui/FlowbiteSvelte/tooltip/Tooltip.svelte';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { selectableDisplays, selectableWordTranslations, selectableWordTransliterations, selectableReciters } from '$data/options';
	import { supplicationsFromQuran } from '$data/quranMeta';
	import { __currentPage, __fontType, __displayType, __userSettings, __audioSettings, __morphologyKey, __verseKey, __websiteTheme, __morphologyModalVisible, __wordMorphologyOnClick, __wordTranslation, __wordTransliteration, __wordTranslationEnabled, __wordTransliterationEnabled, __wordTooltip, __hideNonDuaPart, __signLanguageModeEnabled, __wordKnowledge, __reciter } from '$utils/stores';
	import { loadFont } from '$utils/loadFont';
	import { wordAudioController } from '$utils/audioController';
	import { updateSettings } from '$utils/updateSettings';
	import { getMushafWordFontLink, isFirefoxDarkNonTajweed, isFirefoxDarkTajweed } from '$utils/getMushafWordFontLink';
	import { fetchAndCacheJson } from '$utils/fetchData';
	import { morphologyDataUrls, wordsAudioURL, staticEndpoint } from '$data/websiteSettings';
	import { PUBLIC_TELEGRAM_ENABLED, PUBLIC_WORD_KNOWLEDGE_HIGHLIGHTS_ENABLED, PUBLIC_WORD_RATIO_PROGRESS_BARS_ENABLED, PUBLIC_SHOW_RATIO_PROGRESS_BAR_FOR_NON_ROOT, PUBLIC_SHOW_RATIO_PROGRESS_BACKGROUND } from '$env/static/public';

	// ═══════════════════════════════════════════════════════════════════════════
	// CONSTANTS & MAGIC VALUES
	// ═══════════════════════════════════════════════════════════════════════════

	// Font & Display
	const MUSHAF_FONT_TYPES = [2, 3];
	const WBW_DISPLAY_TYPES = [1, 3, 7];
	const FONT_TYPE_TAJWEED = 3;
	const FONT_TYPE_NON_TAJWEED = 2;
	const FONT_TYPE_SPECIAL = 9;
	const THEME_MOCHA_NIGHT = 5;
	const THEME_DARK_LUXURY = 9;
	const THEME_GOLDEN_GLINT = 1;

	const RECITERS_FOR_AUDIO = ["Mishary Rashid Alafasy", "Mahmoud Khalil Al-Husary", "Abdul Basit (Murattal)"];

	// Pages
	const PAGE_MORPHOLOGY = 'morphology';
	const PAGE_MUSHAF = 'mushaf';
	const PAGE_SUPPLICATIONS = 'supplications';

	// Colors
	const COLOR_ROOT_TEXT = '#222';
	const COLOR_MUTED_TEXT = '#555';
	const COLOR_BACKGROUND_SCREENSHOT = '#F4F0E4';
	const COLOR_TOOLTIP_BG = '#7FFFD4';
	const COLOR_HIGHLIGHT_BG = '#bcd9a240';
	const COLOR_ROOT_LABEL_FONT = 'serif';
	const BUTTON_COLOR_LIGHT_BLUE = '#B0E0E6';
	const BUTTON_COLOR_PLUM = '#DDA0DD';
	const COLOR_PROGRESS_TRACK = 'rgba(128,128,128,0.2)';
	const COLOR_PROGRESS_ROOT  = 'rgba(0,255,255,0.7)';
	const COLOR_PROGRESS_LEMMA   = 'rgba(220,38,38,0.8)';
	const COLOR_RATIO_PROGRESS_BG = 'rgba(0,0,0,0.05)';

	// Screenshot & Audio
	const SCREENSHOT_PAD = 8;
	const SCREENSHOT_GAP = 4;
	const AUDIO_FREQUENCY = 880;
	const AUDIO_GAIN = 0.3;
	const AUDIO_GAIN_MIN = 0.001;
	const AUDIO_DURATION = 0.15;
	const AUDIO_PING_INTERVAL = 0.18;

	// Font sizes for screenshot labels
	const ROOT_LABEL_FONT_SIZE = '18px';
	const COUNTS_LABEL_FONT_SIZE = '12.5px';
	const INDEX_LABEL_FONT_SIZE = '12.5px';
	const LABEL_SECTION_FONT_SIZE = '11px';
	const BUTTON_FONT_SIZE_PX = '9px';

	// Layout
	const WORD_GAP_SIZE = 15;
	const LABEL_HEIGHT_MULTIPLIER = 1.4;
	const ROOT_SEPARATOR = ' · ';

	// Context menu dialog
	const DIALOG_MIN_WIDTH = '580px';
	const DIALOG_TEXTAREA_ROWS = 3;

	// Calculation
	const WORD_RATIO_SQRT_MULTIPLIER = 5;

	// Regex patterns
	const PAUSE_MARKS_REGEX = /[ۖۗۘۙۚۛۜ۩۞]/g;

	// Fixed word corrections (cosmetic fixes, not in database)
	const FIXED_MUSHAF_WORDS = {
		'13:37:8': 'ﱿ', // 6th line last word - Ba'da
		'13:37:9': 'ﲀﲁ' // 7th line first word - Ma Ja'aka
	};

	// ═══════════════════════════════════════════════════════════════════════════
	// PROPS & DERIVED VALUES
	// ═══════════════════════════════════════════════════════════════════════════

	const flag = (v) => v === 'true';

	const WORD_KNOWLEDGE_HIGHLIGHTS_ENABLED       = flag(PUBLIC_WORD_KNOWLEDGE_HIGHLIGHTS_ENABLED);
	const PROGRESS_BAR_THICKNESS                  = 2; // px — adjust to change bar height
	const WORD_RATIO_PROGRESS_BARS_ENABLED        = flag(PUBLIC_WORD_RATIO_PROGRESS_BARS_ENABLED);
	const SHOW_RATIO_PROGRESS_BAR_FOR_NON_ROOT    = flag(PUBLIC_SHOW_RATIO_PROGRESS_BAR_FOR_NON_ROOT);
	const SHOW_RATIO_PROGRESS_BACKGROUND          = flag(PUBLIC_SHOW_RATIO_PROGRESS_BACKGROUND);

	const fontSizes = JSON.parse($__userSettings).displaySettings.fontSizes;
	const chapter = key.split(':')[0];
	const verse = key.split(':')[1];
	const arabicWords = value.words.arabic;
	const transliterationWords = value.words.transliteration;
	const translationWords = value.words.translation;

	// ═══════════════════════════════════════════════════════════════════════════
	// BUTTON CONFIGURATIONS
	// ═══════════════════════════════════════════════════════════════════════════

	const buttons = {
		saveTajweed: { icon: '🎙️', tooltip: 'Save Tajweed word', position: 'top-0 left-0',  rounded: 'rounded-br', bg: '#FA8072', bgHovered: '#22d3ee', condition: () => $__wordTooltip > 1, onClick: (wordKey) => screenshotWord(wordKey, '', 'tajweed'), onContextMenu: (wordKey) => openContextMenuDialog(wordKey, 'tajweed') },
		saveArabic:  { icon: '📷', tooltip: 'Save Arabic word',   position: 'top-0 right-0', rounded: 'rounded-bl', bg: '#FA8072', bgHovered: '#22d3ee', condition: () => $__wordTooltip > 1, onClick: (wordKey) => screenshotWord(wordKey, '', 'arabic'), onContextMenu: (wordKey) => openContextMenuDialog(wordKey, 'arabic') },
		prev:        { icon: '◀', tooltip: 'Select previous word', corner: true, position: 'bottom-0 left-0',  rounded: 'rounded-tr', bg: BUTTON_COLOR_LIGHT_BLUE, onClick: (word) => selectAdjacentWord(word, +1) },
		next:        { icon: '▶', tooltip: 'Select next word',     corner: true, position: 'bottom-0 right-0', rounded: 'rounded-tl', bg: BUTTON_COLOR_LIGHT_BLUE, onClick: (word) => selectAdjacentWord(word, -1) }
	};

	// ═══════════════════════════════════════════════════════════════════════════
	// REACTIVE DECLARATIONS
	// ═══════════════════════════════════════════════════════════════════════════

	$: displayIsContinuous = selectableDisplays[$__displayType].continuous;

	// Dynamically load fonts for mushaf display
	if (MUSHAF_FONT_TYPES.includes($__fontType)) {
		loadFont(`p${value.meta.page}`, getMushafWordFontLink(value.meta.page)).then(() => {
			document.querySelectorAll(`.p${value.meta.page}`).forEach((element) => {
				element.classList.remove('invisible');
			});
		});
	}

	/**
	 * Handles click interactions on words or verse-end icons.
	 * Routes to morphology, modal, audio, or bookmarks based on context.
	 */
	function wordClickHandler(props) {
		if ($__currentPage === PAGE_MORPHOLOGY && props.type === 'word') {
			__morphologyKey.set(props.key);
			goto(`/morphology?word=${props.key}`, { replaceState: false });
		} else if ((![ PAGE_MORPHOLOGY, PAGE_MUSHAF].includes($__currentPage) && props.type === 'word' && $__wordMorphologyOnClick) || $__morphologyModalVisible) {
			__morphologyKey.set(props.key);
			__morphologyModalVisible.set(true);
		} else {
			__verseKey.set(props.key);
			if (props.type === 'word') {
				wordAudioController({
					key: props.key,
					chapter: +props.key.split(':')[0],
					verse: +props.key.split(':')[1]
				});
			} else if (props.type === 'end') {
				if (!displayIsContinuous) {
					updateSettings({
						type: 'userBookmarks',
						key: props.key,
						set: true
					});
				}
			}
		}
	}

	// ═══════════════════════════════════════════════════════════════════════════
	// STYLE GENERATION HELPERS
	// ═══════════════════════════════════════════════════════════════════════════

	function getWordAndEndIconClasses() {
		return `
			hover:cursor-pointer
			${window.theme('hover')}
			${$__displayType === 1 ? 'text-center flex flex-col' : 'inline-flex flex-col'}
			${selectableDisplays[$__displayType].layout === 'wbw' ? 'px-3 py-[10px]' : MUSHAF_FONT_TYPES.includes($__fontType) ? ($__currentPage === PAGE_MUSHAF ? 'p-0' : 'px-0 py-[10px]') : 'px-1 py-[10px]'}
			${exampleVerse && '!p-0'}
		`;
	}

	function getWordSpanClasses() {
		return `
			arabicText leading-normal 
			arabic-font-${$__fontType} 
			${$__currentPage !== PAGE_MUSHAF && fontSizes.arabicText} 
			${displayIsContinuous && 'inline-block'}
			${$__fontType === FONT_TYPE_SPECIAL && 'pb-4'}
		`;
	}

	function getV4HafsClasses() {
		const baseClasses = `invisible v4-words p${value.meta.page}`;
		
		if (isFirefoxDarkTajweed()) {
			return `${baseClasses} hafs-palette-firefox-dark`;
		} 
		if (isFirefoxDarkNonTajweed()) {
			return baseClasses;
		}

		const paletteClass = $__fontType === FONT_TYPE_TAJWEED ? 'theme-palette-tajweed' : 'theme-palette-normal';
		const themeClass = $__fontType === FONT_TYPE_NON_TAJWEED && $__websiteTheme === THEME_MOCHA_NIGHT 
			? 'mocha-night-font-color' 
			: $__fontType === FONT_TYPE_NON_TAJWEED && $__websiteTheme === THEME_DARK_LUXURY 
				? 'dark-luxury-font-color' 
				: '';

		return `${baseClasses} ${paletteClass} ${themeClass}`;
	}

	function getEndIconClasses() {
		const commonClasses = getWordAndEndIconClasses();
		const themeClass = $__websiteTheme === THEME_GOLDEN_GLINT ? window.theme('textSecondary') : '';
		return `rounded-lg ${commonClasses} ${themeClass}`;
	}

	function getWordTranslationClasses() {
		return `
			wordTranslationText flex flex-col direction-ltr
			${fontSizes.wordTranslationText}
			theme
		`;
	}

	// ═══════════════════════════════════════════════════════════════════════════
	// STATE & DATA
	// ═══════════════════════════════════════════════════════════════════════════

	// Hover states
	let hoveredWordKey = null;
	let hoveredButtonKey = null;

	// Screenshot context menu dialog
	let contextMenuDialogOpen = false;
	let contextMenuDialogText = '';
	let contextMenuDialogWordKey = null;
	let contextMenuDialogMode = 'arabic';

	function openContextMenuDialog(wk, mode) {
		contextMenuDialogWordKey = wk;
		contextMenuDialogMode = mode;
		contextMenuDialogText = '';
		contextMenuDialogOpen = true;
	}

	function confirmContextMenuDialog() {
		const wordKey = contextMenuDialogWordKey;
		const caption = contextMenuDialogText;
		const mode = contextMenuDialogMode;
		contextMenuDialogOpen = false;
		screenshotWord(wordKey, caption, mode);
	}

	// Word selection for multi-word screenshots
	let startWordIndex = null;
	let stopWordIndex = null;
	let anchorWordIndex = null;

	// Morphology data caches
	let rootDataMap = {};
	let sameRootMap = {};
	let exactWordsMap = {};

	// Highlighted words from word knowledge store
	let highlightedWordIndices = new Set();

	// ═══════════════════════════════════════════════════════════════════════════
	// REACTIVE SIDE EFFECTS & COMPUTED VALUES
	// ═══════════════════════════════════════════════════════════════════════════

	// Recompute class strings when dependencies change
	let wordAndEndIconCommonClasses = '';
	let wordSpanClasses = '';
	let v4hafsClasses = '';
	let endIconClasses = '';
	let wordTranslationClasses = '';

	$: {
		wordAndEndIconCommonClasses = getWordAndEndIconClasses();
		wordSpanClasses = getWordSpanClasses();
		v4hafsClasses = getV4HafsClasses();
		endIconClasses = getEndIconClasses();
		wordTranslationClasses = getWordTranslationClasses();
	}

	// Update highlighted indices when word knowledge changes
	$: {
		if (WORD_KNOWLEDGE_HIGHLIGHTS_ENABLED) {
			const knowledgeArabicSet = new Set($__wordKnowledge.flatMap((e) => e.arabic.split(' ')));
			highlightedWordIndices = new Set(
				arabicWords.reduce((acc, w, i) => {
					if (knowledgeArabicSet.has(w)) acc.push(i + 1); // 1-based
					return acc;
				}, [])
			);
		}
	}

	// ═══════════════════════════════════════════════════════════════════════════
	// UTILITY FUNCTIONS
	// ═══════════════════════════════════════════════════════════════════════════

	function shouldDisplayWord(wordIndex) {
		return $__currentPage !== PAGE_MUSHAF || ($__currentPage === PAGE_MUSHAF && +value.words.line[wordIndex] === line);
	}

	function getWordKey(wordIndex) {
		return `${chapter}:${verse}:${wordIndex + 1}`;
	}

	// ═══════════════════════════════════════════════════════════════════════════
	// MORPHOLOGY DATA FUNCTIONS
	// ═══════════════════════════════════════════════════════════════════════════

	onMount(async () => {
		const [rootRes, sameRootRes, exactRes] = await Promise.all([
			fetchAndCacheJson(morphologyDataUrls.wordUthmaniAndRoots, 'morphology'),
			fetchAndCacheJson(morphologyDataUrls.wordsWithSameRootKeys, 'morphology'),
			fetchAndCacheJson(morphologyDataUrls.exactWordsKeys, 'morphology')
		]);
		rootDataMap = rootRes?.data ?? {};
		sameRootMap = sameRootRes?.data ?? {};
		exactWordsMap = exactRes?.data ?? {};
	});

	function formatRoot(wordKey) {
		const root = rootDataMap[wordKey]?.[1];
		if (!root) return null;
		return Array.from(root).join(ROOT_SEPARATOR);
	}

	function getWordCounts(wordKey) {
		const meta = rootDataMap[wordKey];
		if (!Array.isArray(meta)) return null;
		const root = meta[1];
		const uthmani = meta[0]?.replace(PAUSE_MARKS_REGEX, '');
		const rootCount = root ? (sameRootMap[root]?.length ?? 0) : 0;
		const exactCount = uthmani ? (exactWordsMap[uthmani]?.length ?? 0) : 0;
		if (!rootCount && !exactCount) return null;
		let r = rootCount || 1;
		let e = exactCount || 1;
		if (e > r) { const tmp = r; r = e; e = tmp; }
		return { rootCount: r, exactCount: e };
	}

	// ═══════════════════════════════════════════════════════════════════════════
	// WORD SELECTION & HIGHLIGHTING
	// ═══════════════════════════════════════════════════════════════════════════

	function selectAdjacentWord(currentWordIndex, direction) {
		anchorWordIndex = currentWordIndex;

		if (startWordIndex === null) {
			// First selection — pick the immediate neighbour
			const target = currentWordIndex + direction;
			if (target < 0 || target >= value.meta.words) return;
			startWordIndex = target;
			stopWordIndex = target;
		} else if (direction === 1) {
			// Extend upper boundary (higher index = left in RTL)
			let next = stopWordIndex + 1;
			if (next === currentWordIndex) next++;
			if (next >= value.meta.words) return;
			stopWordIndex = next;
		} else {
			// Extend lower boundary (lower index = right in RTL)
			let next = startWordIndex - 1;
			if (next === currentWordIndex) next--;
			if (next < 0) return;
			startWordIndex = next;
		}
	}

	function clearHighlights() {
		startWordIndex = null;
		stopWordIndex = null;
		anchorWordIndex = null;
	}

	function syncWordKnowledgeEntry(entry) {
		__wordKnowledge.update((words) => {
			const idx = words.findIndex(
				(e) =>
					e.surah === entry.surah &&
					e.ayah === entry.ayah &&
					e.startWordIndex === entry.startWordIndex &&
					e.endWordIndex === entry.endWordIndex
			);
			if (idx >= 0) {
				const updated = [...words];
				updated[idx] = entry;
				return updated;
			}
			return [...words, entry];
		});
	}

	// ═══════════════════════════════════════════════════════════════════════════
	// SCREENSHOT UTILITIES (Audio + DOM Manipulation)
	// ═══════════════════════════════════════════════════════════════════════════

	function playScreenshotPing() {
		const ctx = new AudioContext();
		const pingCount = PUBLIC_TELEGRAM_ENABLED === 'true' ? 2 : 1;
		for (let i = 0; i < pingCount; i++) {
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.connect(gain);
			gain.connect(ctx.destination);
			osc.frequency.value = AUDIO_FREQUENCY;
			const t = ctx.currentTime + i * AUDIO_PING_INTERVAL;
			gain.gain.setValueAtTime(AUDIO_GAIN, t);
			gain.gain.exponentialRampToValueAtTime(AUDIO_GAIN_MIN, t + AUDIO_DURATION);
			osc.start(t);
			osc.stop(t + AUDIO_DURATION);
		}
	}

	function createRootLabel(root) {
		const label = document.createElement('span');
		label.textContent = root;
		label.style.cssText = `font-size:${ROOT_LABEL_FONT_SIZE};font-weight:bold;color:${COLOR_ROOT_TEXT};font-family:${COLOR_ROOT_LABEL_FONT};direction:rtl;`;
		return label;
	}

	function createCountsLabel(counts) {
		const label = document.createElement('span');
		label.textContent = `${counts.rootCount} / ${counts.exactCount}`;
		label.style.cssText = `font-size:${COUNTS_LABEL_FONT_SIZE};color:${COLOR_MUTED_TEXT};font-family:sans-serif;`;
		return label;
	}

	function cloneWordElement(wordKey) {
		const el = document.getElementById(wordKey);
		const clone = el.cloneNode(true);
		clone.querySelectorAll('[data-screenshot-exclude]').forEach((e) => e.remove());
		clone.querySelector('.arabicText').style.setProperty('color', 'green', 'important');
		clone.classList.remove('ring-2', 'ring-blue-400', 'ring-red-400');
		clone.style.cssText += 'position:relative;flex:0 0 auto;gap:' + WORD_GAP_SIZE + 'px;';
		return clone;
	}

	async function captureWordVisualsToCanvas(container) {
		const html2canvas = (await import('html2canvas')).default;
		document.body.appendChild(container);
		const canvas = await html2canvas(container);
		document.body.removeChild(container);
		return canvas;
	}

	function getWordAudioUrl(wk) {
		const [ch, vs, wd] = wk.split(':').map(Number);
		return `${wordsAudioURL}/${ch}/${String(ch).padStart(3, '0')}_${String(vs).padStart(3, '0')}_${String(wd).padStart(3, '0')}.mp3?version=2`;
	}

	async function sendScreenshotToServer(filename, canvas, caption = '', audioUrls = [], audiosBase64 = [], mode = 'arabic') {
		const dataUrl = canvas.toDataURL('image/png');
		await fetch('/api/save-screenshot', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ filename, dataUrl, caption, audioUrls, audiosBase64, mode })
		});
	}

	// Converts an ArrayBuffer to a base64 string.
	function arrayBufferToBase64(buf) {
		const bytes = new Uint8Array(buf);
		let binary = '';
		const chunk = 8192;
		for (let i = 0; i < bytes.length; i += chunk) {
			binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)));
		}
		return btoa(binary);
	}

	// Core: fetches verse audio for a specific reciter and either slices it to the word range
	// (when timestamps exist) or falls back to the full verse MP3.
	// Returns { base64, format } or null on fetch failure.
	async function buildVerseClipBase64ForReciter(sortedKeys, reciter) {
		const ch = parseInt(chapter);
		const vs = parseInt(verse);
		const verseAudioUrl = `${reciter.url}/${String(ch).padStart(3, '0')}${String(vs).padStart(3, '0')}.mp3`;

		const timestampData = await fetchAndCacheJson(`${staticEndpoint}/timestamps/timestamps.json?version=2`, 'other');
		const verseTimestampStr = timestampData?.data?.[ch]?.[vs]?.[reciter.id];

		if (!verseTimestampStr) {
			console.log(`[Audio] ${reciter.reciter} (id:${reciter.id}): no timestamps in timestamps.json → sending full verse MP3`);
			const resp = await fetch(verseAudioUrl);
			if (!resp.ok) {
				console.warn(`[Audio] ${reciter.reciter}: failed to fetch verse audio (HTTP ${resp.status})`);
				return null;
			}
			return { base64: arrayBufferToBase64(await resp.arrayBuffer()), format: 'mp3' };
		}

		console.log(`[Audio] ${reciter.reciter} (id:${reciter.id}): timestamps found, building sliced MP3 clip`);
		const timestamps = verseTimestampStr.split('|').map(Number);

		// sortedKeys are like "2:5:3" — word number is 1-based; timestamp index is 0-based
		const firstWordNum = parseInt(sortedKeys[0].split(':')[2]);
		const lastWordNum = parseInt(sortedKeys[sortedKeys.length - 1].split(':')[2]);
		const startTime = timestamps[firstWordNum - 1] ?? 0;
		const endTime = timestamps[lastWordNum] ?? null; // null = clip to audio end

		const verseResp = await fetch(verseAudioUrl);
		if (!verseResp.ok) {
			console.warn(`[Audio] ${reciter.reciter}: failed to fetch verse audio (HTTP ${verseResp.status})`);
			return null;
		}
		const verseArrayBuffer = await verseResp.arrayBuffer();

		const audioCtx = new AudioContext();
		const audioBuffer = await audioCtx.decodeAudioData(verseArrayBuffer);
		await audioCtx.close();

		const sampleRate = audioBuffer.sampleRate;
		const numChannels = audioBuffer.numberOfChannels;
		const startSample = Math.floor(startTime * sampleRate);
		const endSample = endTime !== null ? Math.floor(endTime * sampleRate) : audioBuffer.length;
		const sliceLength = Math.max(0, Math.min(endSample, audioBuffer.length) - startSample);

		// Encode slice as MP3 via lamejs
		const { Mp3Encoder } = await import('@breezystack/lamejs');
		const encoder = new Mp3Encoder(numChannels, sampleRate, 128);
		const pcmToInt16 = (f32) => Math.max(-32768, Math.min(32767, f32 < 0 ? f32 * 32768 : f32 * 32767));

		const left = new Int16Array(sliceLength);
		const right = numChannels > 1 ? new Int16Array(sliceLength) : null;
		const leftData = audioBuffer.getChannelData(0);
		const rightData = numChannels > 1 ? audioBuffer.getChannelData(1) : null;
		for (let i = 0; i < sliceLength; i++) {
			left[i] = pcmToInt16(leftData[startSample + i]);
			if (right) right[i] = pcmToInt16(rightData[startSample + i]);
		}

		const chunkSize = 1152; // lamejs required frame size
		const mp3Parts = [];
		for (let i = 0; i < sliceLength; i += chunkSize) {
			const l = left.subarray(i, i + chunkSize);
			const r = right ? right.subarray(i, i + chunkSize) : l;
			const chunk = encoder.encodeBuffer(l, r);
			if (chunk.length > 0) mp3Parts.push(chunk);
		}
		const flushed = encoder.flush();
		if (flushed.length > 0) mp3Parts.push(flushed);

		const mp3Buf = new Uint8Array(mp3Parts.reduce((acc, p) => acc + p.length, 0));
		let offset = 0;
		for (const part of mp3Parts) { mp3Buf.set(part, offset); offset += part.length; }

		return { base64: arrayBufferToBase64(mp3Buf.buffer), format: 'mp3' };
	}

	// Builds an audio entry for each reciter in RECITERS_FOR_AUDIO in parallel.
	// Returns an array of { name, base64, format } for successful fetches.
	async function buildAllReciterAudios(sortedKeys) {
		const reciterObjects = RECITERS_FOR_AUDIO
			.map((name) => Object.values(selectableReciters).find((r) => r.reciter === name))
			.filter(Boolean);

		console.log(`[Audio] Building audio for ${reciterObjects.length} reciters:`, reciterObjects.map((r) => `${r.reciter} (id:${r.id})`));

		const results = await Promise.all(
			reciterObjects.map(async (reciter) => {
				const result = await buildVerseClipBase64ForReciter(sortedKeys, reciter);
				if (!result) {
					console.warn(`[Audio] ${reciter.reciter}: no audio produced, skipping`);
					return null;
				}
				console.log(`[Audio] ${reciter.reciter}: ready (${result.format}, ~${Math.round(result.base64.length * 0.75 / 1024)} KB)`);
				return { name: reciter.reciter, base64: result.base64, format: result.format };
			})
		);
		const filtered = results.filter(Boolean);
		console.log(`[Audio] Final: ${filtered.length}/${reciterObjects.length} reciters have audio`);
		return filtered;
	}

	async function sendWordKnowledgeData(surah, ayah, startIdx, endIdx, arabic, translation, root) {
		const response = await fetch('/api/word-knowledge', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				surah,
				ayah,
				startWordIndex: startIdx,
				endWordIndex: endIdx,
				arabic,
				translation,
				root
			})
		});
		const { entry: wkEntry } = await response.json();
		syncWordKnowledgeEntry(wkEntry);
	}

	// helper used by both single- and multi-word screenshots
// returns a clone element with its additional labels appended (vertical stacking maintained)
function buildScreenshotElement(wordKey, includeIndex = false) {
	const clone = cloneWordElement(wordKey);

	// root label
	const root = formatRoot(wordKey);
	if (root) {
		clone.appendChild(createRootLabel(root));
	}

	// counts label
	const counts = getWordCounts(wordKey);
	if (counts) {
		clone.appendChild(createCountsLabel(counts));
	}

	// optional index
	if (includeIndex) {
		const idx = document.createElement('span');
		idx.textContent = wordKey;
		idx.style.cssText = `font-size:${INDEX_LABEL_FONT_SIZE};color:${COLOR_ROOT_TEXT};font-family:sans-serif;`;
		clone.appendChild(idx);
	}

	return clone;
} 

async function screenshotMultipleWords(caption = '', mode = 'arabic') {
	const rangeIndices = new Set();
	for (let i = startWordIndex; i <= stopWordIndex; i++) rangeIndices.add(i);
	rangeIndices.add(anchorWordIndex);
	const sortedKeys = Array.from(rangeIndices).sort((a, b) => a - b).map((i) => getWordKey(i));

	const wordRow = document.createElement('div');
	wordRow.style.cssText = 'display:flex;direction:rtl;align-items:flex-start;gap:' + SCREENSHOT_GAP + 'px;';

	sortedKeys.forEach((key) => {
		const el = buildScreenshotElement(key); // clone with internal labels
		wordRow.appendChild(el);
	});

		const startNum = startWordIndex + 1;
		const stopNum = stopWordIndex + 1;
		const label = document.createElement('div');
		label.textContent = startNum === stopNum
			? `${chapter}:${verse}  word ${startNum}`
			: `${chapter}:${verse}  words ${startNum}–${stopNum}`;
		label.style.cssText = `text-align:center;font-size:${LABEL_SECTION_FONT_SIZE};color:${COLOR_MUTED_TEXT};font-family:sans-serif;margin-top:4px;`;

		const wrapper = document.createElement('div');
		wrapper.style.cssText = `position:fixed;top:-9999px;left:-9999px;background:${COLOR_BACKGROUND_SCREENSHOT};padding:${SCREENSHOT_PAD}px;display:flex;flex-direction:column;align-items:center;`;
		wrapper.appendChild(wordRow);
		wrapper.appendChild(label);

		const canvas = await captureWordVisualsToCanvas(wrapper);

		const wordRange = sortedKeys.map((k) => k.split(':')[2]).join('-');
		const filename = `quranwbw-${chapter}-${verse}-w${wordRange}-${Date.now()}.png`;
		const audiosBase64 = mode === 'tajweed' ? await buildAllReciterAudios(sortedKeys) : [];
		const audioUrls = mode === 'tajweed' && audiosBase64.length === 0 ? sortedKeys.map(getWordAudioUrl) : [];
		await sendScreenshotToServer(filename, canvas, caption, audioUrls, audiosBase64, mode);

		const wordIndices = sortedKeys.map((k) => parseInt(k.split(':')[2])); // 1-based
		const arabicText = sortedKeys.map((k) => arabicWords[parseInt(k.split(':')[2]) - 1]).join(' ');
		const translationText = sortedKeys.map((k) => translationWords[parseInt(k.split(':')[2]) - 1]).join(' ');
		const roots = sortedKeys.map((k) => rootDataMap[k]?.[1]).filter(Boolean);

		await sendWordKnowledgeData(
			parseInt(chapter),
			parseInt(verse),
			Math.min(...wordIndices),
			Math.max(...wordIndices),
			arabicText,
			translationText,
			roots.length ? roots.join(' / ') : null
		);

		console.warn(`[Screenshot] Sent to Telegram: ${filename} | Arabic: ${arabicText}`);
	}

	async function screenshotSingleWord(wordKey, caption = '', mode = 'arabic') {
	const wordEl = document.getElementById(wordKey);
	const wordRect = wordEl.getBoundingClientRect();
	const totalW = wordRect.width + SCREENSHOT_PAD * 2;
	const totalH = wordRect.height + SCREENSHOT_PAD * 2;

	// clone element with labels and index
	const el = buildScreenshotElement(wordKey, true);
	el.style.position = 'absolute';

	const extraH = Math.max(0, el.children.length - 1) * WORD_GAP_SIZE +
		Math.ceil(parseFloat(INDEX_LABEL_FONT_SIZE) * LABEL_HEIGHT_MULTIPLIER) * el.children.length;

	const container = document.createElement('div');
	container.style.cssText = `position:fixed;top:-9999px;left:-9999px;width:${totalW}px;height:${totalH + extraH}px;background:${COLOR_BACKGROUND_SCREENSHOT};`;

	container.appendChild(el);
	el.style.left = SCREENSHOT_PAD + 'px';
	el.style.top = SCREENSHOT_PAD + 'px';

	const canvas = await captureWordVisualsToCanvas(container);
	const filename = `quranwbw-${wordKey.replaceAll(':', '-')}-${Date.now()}.png`;
	await sendScreenshotToServer(filename, canvas, caption, mode === 'tajweed' ? [getWordAudioUrl(wordKey)] : [], [], mode);

	const _wIdx = parseInt(wordKey.split(':')[2]) - 1; // 0-based
	await sendWordKnowledgeData(
		parseInt(chapter),
		parseInt(verse),
		_wIdx + 1,
		_wIdx + 1,
		arabicWords[_wIdx],
		translationWords[_wIdx],
		rootDataMap[wordKey]?.[1] ?? null
	);

	console.warn(`[Screenshot] Sent to Telegram: ${filename} | Arabic: ${arabicWords[_wIdx]}`);
}

	async function screenshotWord(wordKey, caption = '', mode = 'arabic') {
		playScreenshotPing();
		if (startWordIndex !== null) {
			await screenshotMultipleWords(caption, mode);
		} else {
			await screenshotSingleWord(wordKey, caption, mode);
		}
	}
</script>

<!-- words -->
{#each { length: value.meta.words } as _, word}
	{#if shouldDisplayWord(word)}
		{@const wordKey = getWordKey(word)}
		{@const hasProgressBar = WORD_RATIO_PROGRESS_BARS_ENABLED && !!rootDataMap[wordKey] && (SHOW_RATIO_PROGRESS_BAR_FOR_NON_ROOT || !!rootDataMap[wordKey][1])}
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<div
			id={wordKey}
			class={`
				word relative rounded-lg ${wordAndEndIconCommonClasses} text-center print:break-inside-avoid
				${$__audioSettings.playingWordKey === wordKey || ($__currentPage === 'morphology' && $__morphologyKey === wordKey) || ($__morphologyModalVisible && $__morphologyKey === wordKey) ? window.theme('bgSecondaryDark') : ''}
				${$__currentPage === 'supplications' && word + 1 < (supplicationsFromQuran[key] || 0) ? ($__hideNonDuaPart ? 'hidden' : 'opacity-30') : ''}
				${anchorWordIndex === word && startWordIndex !== null ? 'ring-2 ring-red-400' : ''}
				${anchorWordIndex !== word && startWordIndex !== null && word >= startWordIndex && word <= stopWordIndex ? 'ring-2 ring-blue-400' : ''}
			`.trim()}
			style={WORD_KNOWLEDGE_HIGHLIGHTS_ENABLED && highlightedWordIndices.has(word + 1) ? `background-color: ${COLOR_HIGHLIGHT_BG};` : SHOW_RATIO_PROGRESS_BACKGROUND && hasProgressBar ? `background-color: ${COLOR_RATIO_PROGRESS_BG};` : ''}
			on:click={() => wordClickHandler({ key: wordKey, type: 'word' })}
		on:mouseenter={() => { hoveredWordKey = wordKey; }}
		on:mouseleave={() => { hoveredWordKey = null; }}
		>
			{#if buttons.saveArabic.condition()}
				<!-- svelte-ignore a11y-click-events-have-key-events -->
				<!-- svelte-ignore a11y-no-static-element-interactions -->
				<span
					data-screenshot-exclude
					class="absolute {buttons.saveArabic.position} {buttons.saveArabic.rounded} text-[9px] leading-none px-1 py-0.5 cursor-pointer select-none border z-10 hidden md:block transition-all"
					style="opacity: {hoveredWordKey === wordKey ? 1 : 0}; background: {hoveredButtonKey === wordKey ? buttons.saveArabic.bgHovered : buttons.saveArabic.bg};"
					on:click|stopPropagation={() => buttons.saveArabic.onClick(wordKey)}
				on:contextmenu|preventDefault|stopPropagation={() => buttons.saveArabic.onContextMenu(wordKey)}
					on:mouseenter|stopPropagation={() => { hoveredButtonKey = wordKey; }}
					on:mouseleave|stopPropagation={() => { hoveredButtonKey = null; }}
				>{buttons.saveArabic.icon}</span>
				{#if hoveredButtonKey === wordKey}
					<div data-screenshot-exclude class="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full z-30 bg-black text-white text-[10px] font-sans rounded px-1.5 py-0.5 whitespace-nowrap">
						{buttons.saveArabic.tooltip}
					</div>
				{/if}
			{/if}

			<!-- svelte-ignore a11y-click-events-have-key-events -->
			<!-- svelte-ignore a11y-no-static-element-interactions -->

			<!-- saveTajweed button -->
			{#if buttons.saveTajweed.condition()}
				<!-- svelte-ignore a11y-click-events-have-key-events -->
				<!-- svelte-ignore a11y-no-static-element-interactions -->
				<span
					data-screenshot-exclude
					class="absolute {buttons.saveTajweed.position} {buttons.saveTajweed.rounded} text-[9px] leading-none px-1 py-0.5 cursor-pointer select-none border z-10 hidden md:block transition-all"
					style="opacity: {hoveredWordKey === wordKey ? 1 : 0}; background: {hoveredButtonKey === wordKey ? buttons.saveTajweed.bgHovered : buttons.saveTajweed.bg};"
					on:click|stopPropagation={() => buttons.saveTajweed.onClick(wordKey)}
				on:contextmenu|preventDefault|stopPropagation={() => buttons.saveTajweed.onContextMenu(wordKey)}
					on:mouseenter|stopPropagation={() => { hoveredButtonKey = wordKey; }}
					on:mouseleave|stopPropagation={() => { hoveredButtonKey = null; }}
				>{buttons.saveTajweed.icon}</span>
				{#if hoveredButtonKey === wordKey}
					<div data-screenshot-exclude class="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full z-30 bg-black text-white text-[10px] font-sans rounded px-1.5 py-0.5 whitespace-nowrap">
						{buttons.saveTajweed.tooltip}
					</div>
				{/if}
			{/if}

			<!-- corner buttons -->
			{#each Object.values(buttons).filter(b => b.corner) as btn}
				<span
					data-screenshot-exclude
					class="absolute {btn.position} {btn.rounded} text-[9px] leading-none px-1 py-0.5 cursor-pointer select-none border z-10 hidden md:block transition-all"
					style="opacity:{hoveredWordKey === wordKey ? 1 : 0};background:{btn.bg};"
										on:click|stopPropagation={() => btn.onClick(word)}
				>{btn.icon}</span>
			{/each}

			<!-- cancel highlight button -->
			{#if startWordIndex !== null}
				<!-- svelte-ignore a11y-click-events-have-key-events -->
				<!-- svelte-ignore a11y-no-static-element-interactions -->
				<span
					data-screenshot-exclude
					class="absolute bottom-0 left-1/2 -translate-x-1/2 text-[9px] leading-none px-1 py-0.5 rounded-t cursor-pointer select-none border z-10 hidden md:block bg-red-300 transition-all"
					style="opacity:{hoveredWordKey === wordKey ? 1 : 0};"
					on:click|stopPropagation={clearHighlights}
				>✕</span>
			{/if}

			<span class={wordSpanClasses} data-fontSize={fontSizes.arabicText}>
				<!-- Everything except Mushaf fonts -->
				{#if !MUSHAF_FONT_TYPES.includes($__fontType)}
					{arabicWords[word]}
					<!-- Mushaf fonts -->
				{:else}
					<span id="word-{wordKey.split(':')[1]}-{wordKey.split(':')[2]}" style="font-family: p{value.meta.page}" class={v4hafsClasses}>
						<!-- word fix, see FIXED_MUSHAF_WORDS -->
						{#if Object.prototype.hasOwnProperty.call(FIXED_MUSHAF_WORDS, wordKey)}
							{FIXED_MUSHAF_WORDS[wordKey]}
						{:else}
							{arabicWords[word]}
						{/if}
					</span>
				{/if}
			</span>

			{#if WORD_RATIO_PROGRESS_BARS_ENABLED && rootDataMap[wordKey] && (SHOW_RATIO_PROGRESS_BAR_FOR_NON_ROOT || rootDataMap[wordKey][1])}
				{@const counts = getWordCounts(wordKey)}
				{@const barPct = Math.min(Math.sqrt(WORD_RATIO_SQRT_MULTIPLIER * (counts?.rootCount ?? 0)), 50) / 50 * 100}
				{@const lemmaPct = Math.min(Math.sqrt(WORD_RATIO_SQRT_MULTIPLIER * (counts?.exactCount ?? 0)), 50) / 50 * 100}
				<div
					data-screenshot-exclude
					class="w-full relative overflow-hidden rounded-full"
					style="height:{PROGRESS_BAR_THICKNESS}px; background:{COLOR_PROGRESS_TRACK};"
				>
					<div style="position:absolute; left:50%; transform:translateX(-50%); width:{barPct}%; height:100%; background:{COLOR_PROGRESS_ROOT}; border-radius:inherit;"></div>
					<div style="position:absolute; left:50%; transform:translateX(-50%); width:{lemmaPct}%; height:100%; background:{COLOR_PROGRESS_LEMMA}; border-radius:inherit;"></div>
				</div>
			{/if}

			<!-- word translation and transliteration, only for wbw modes -->
			{#if WBW_DISPLAY_TYPES.includes($__displayType)}
				<div class={wordTranslationClasses} data-fontSize={fontSizes.wordTranslationText}>
					<span class="leading-normal {selectableWordTransliterations[$__wordTransliteration].font} {$__wordTransliterationEnabled ? 'block' : 'hidden'}">{transliterationWords[word]}</span>
					<span class="leading-normal {selectableWordTranslations[$__wordTranslation].font} {$__wordTranslationEnabled ? 'block' : 'hidden'}">
						<span class={$__signLanguageModeEnabled && 'font-Arabic-Sign-Language'}>{translationWords[word]}</span>
					</span>
				</div>
			{/if}
		</div>

		<!-- word tooltip -->
		{#if $__wordTooltip > 1}
			<Tooltip arrow={false} type="light" class="z-[19] hidden md:block text-center inline-flex font-sans font-normal ring-1 ring-black bg-[#7FFFD4]">
				<div class="flex flex-col items-center gap-1">
					{#if $__wordTooltip === 2 || $__wordTooltip === 4}
						<span>{@html transliterationWords[word]}</span>
					{/if}
					{#if formatRoot(wordKey)}
						<span class="text-xl font-bold" style="font-family: serif; direction: rtl;">{formatRoot(wordKey)}</span>
					{/if}
					{#if getWordCounts(wordKey)}
						<span class="text-xs opacity-70">{getWordCounts(wordKey).rootCount} / {getWordCounts(wordKey).exactCount}</span>
					{/if}
				</div>
			</Tooltip>
		{/if}
	{/if}
{/each}

<!-- end icon -->
{#if $__currentPage !== PAGE_MUSHAF || ($__currentPage === PAGE_MUSHAF && value.words.line[value.words.line.length - 1] === line)}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div class={endIconClasses} on:click={() => wordClickHandler({ key, type: 'end' })}>
		<span class={wordSpanClasses} data-fontSize={fontSizes.arabicText}>
			<!-- Everything except Mushaf fonts -->
			{#if !MUSHAF_FONT_TYPES.includes($__fontType)}
				<span class="colored-fonts">{value.words.end}</span>
				<!-- Mushaf fonts -->
			{:else}
				<span style="font-family: p{value.meta.page}" class="{v4hafsClasses} custom-ayah-icon-color">{value.words.end}</span>
			{/if}
		</span>
	</div>
	{#if displayIsContinuous && !$__morphologyModalVisible}
		<VerseOptionsDropdown page={value.meta.page} />
	{/if}

	<!-- end icon tooltip -->
	<Tooltip arrow={false} type="light" class="z-[19] inline-flex font-sans font-normal">
		End of {key}
	</Tooltip>
{/if}

{#if contextMenuDialogOpen}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div
		class="fixed inset-0 z-[999] flex items-center justify-center bg-black/40"
		on:click|self={() => (contextMenuDialogOpen = false)}
	>
		<div
			class="shadow-xl p-6 flex flex-col gap-4 font-sans rounded-3xl border {window.theme('bgMain')} {window.theme('border')} {window.theme('text')}"
			style="min-width: {DIALOG_MIN_WIDTH};"
		>
			<textarea
				bind:value={contextMenuDialogText}
				rows={DIALOG_TEXTAREA_ROWS}
				dir="ltr"
				class="block w-full p-2.5 text-sm text-left rounded-3xl bg-transparent border resize-none overflow-y-auto {window.theme('border')} {window.theme('input')} {window.theme('placeholder')}"
				placeholder=""
				on:keydown={(e) => { if (e.key === 'Escape') contextMenuDialogOpen = false; }}
			></textarea>
			<div class="flex gap-2 justify-end">
				<button
					class="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 inline-flex items-center justify-center py-2 px-4 rounded-3xl transition-colors duration-150 cursor-pointer text-sm"
					on:click={() => (contextMenuDialogOpen = false)}
				>Cancel</button>
				<button
					class="inline-flex items-center justify-center py-2 px-4 {window.theme('input')} rounded-3xl transition-colors duration-150 cursor-pointer text-sm {window.theme('hoverBorder')} {window.theme('bgSecondaryLight')}"
					on:click={confirmContextMenuDialog}
				>OK</button>
			</div>
		</div>
	</div>
{/if}
