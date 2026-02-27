<script>
	export let key;
	export let value;
	export let line = null;
	export let exampleVerse = false;

	import VerseOptionsDropdown from '$display/verses/VerseOptionsDropdown.svelte';
	import Tooltip from '$ui/FlowbiteSvelte/tooltip/Tooltip.svelte';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { selectableDisplays, selectableWordTranslations, selectableWordTransliterations } from '$data/options';
	import { supplicationsFromQuran } from '$data/quranMeta';
	import { __currentPage, __fontType, __displayType, __userSettings, __audioSettings, __morphologyKey, __verseKey, __websiteTheme, __morphologyModalVisible, __wordMorphologyOnClick, __wordTranslation, __wordTransliteration, __wordTranslationEnabled, __wordTransliterationEnabled, __wordTooltip, __hideNonDuaPart, __signLanguageModeEnabled, __wordKnowledge } from '$utils/stores';
	import { loadFont } from '$utils/loadFont';
	import { wordAudioController } from '$utils/audioController';
	import { updateSettings } from '$utils/updateSettings';
	import { getMushafWordFontLink, isFirefoxDarkNonTajweed, isFirefoxDarkTajweed } from '$utils/getMushafWordFontLink';
	import { fetchAndCacheJson } from '$utils/fetchData';
	import { morphologyDataUrls, wordsAudioURL } from '$data/websiteSettings';
	import { PUBLIC_TELEGRAM_ENABLED } from '$env/static/public';

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

	const fontSizes = JSON.parse($__userSettings).displaySettings.fontSizes;
	const chapter = key.split(':')[0];
	const verse = key.split(':')[1];
	const arabicWords = value.words.arabic;
	const transliterationWords = value.words.transliteration;
	const translationWords = value.words.translation;

	// ═══════════════════════════════════════════════════════════════════════════
	// BUTTON CONFIGURATIONS
	// ═══════════════════════════════════════════════════════════════════════════

	const topLeftButtons = [
		{ icon: '⭐', bg: BUTTON_COLOR_LIGHT_BLUE },
		{ icon: '🔖', bg: BUTTON_COLOR_PLUM }
	];

	const cornerButtons = [
		{ 
			icon: '◀', 
			position: 'bottom-0 left-0',  
			rounded: 'rounded-tr', 
			bg: BUTTON_COLOR_LIGHT_BLUE, 
			onClick: (word) => selectAdjacentWord(word, +1) 
		},
		{ 
			icon: '▶', 
			position: 'bottom-0 right-0', 
			rounded: 'rounded-tl', 
			bg: BUTTON_COLOR_LIGHT_BLUE, 
			onClick: (word) => selectAdjacentWord(word, -1) 
		}
	];

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
			${selectableDisplays[$__displayType].layout === 'wbw' ? 'px-3 py-2' : MUSHAF_FONT_TYPES.includes($__fontType) ? ($__currentPage === PAGE_MUSHAF ? 'p-0' : 'px-0 py-2') : 'px-1 py-2'}
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

	function openContextMenuDialog(wk) {
		contextMenuDialogWordKey = wk;
		contextMenuDialogText = '';
		contextMenuDialogOpen = true;
	}

	function confirmContextMenuDialog() {
		const wordKey = contextMenuDialogWordKey;
		const caption = contextMenuDialogText;
		contextMenuDialogOpen = false;
		screenshotWord(wordKey, caption);
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
		const knowledgeArabicSet = new Set($__wordKnowledge.flatMap((e) => e.arabic.split(' ')));
		highlightedWordIndices = new Set(
			arabicWords.reduce((acc, w, i) => {
				if (knowledgeArabicSet.has(w)) acc.push(i + 1); // 1-based
				return acc;
			}, [])
		);
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
		return { rootCount, exactCount };
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

	async function sendScreenshotToServer(filename, canvas, caption = '', audioUrls = []) {
		const dataUrl = canvas.toDataURL('image/png');
		await fetch('/api/save-screenshot', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ filename, dataUrl, caption, audioUrls })
		});
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

async function screenshotMultipleWords(caption = '') {
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
		const audioUrls = sortedKeys.map(getWordAudioUrl);
		await sendScreenshotToServer(filename, canvas, caption, audioUrls);

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

	async function screenshotSingleWord(wordKey, caption = '') {
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
	await sendScreenshotToServer(filename, canvas, caption, [getWordAudioUrl(wordKey)]);

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

	async function screenshotWord(wordKey, caption = '') {
		playScreenshotPing();
		if (startWordIndex !== null) {
			await screenshotMultipleWords(caption);
		} else {
			await screenshotSingleWord(wordKey, caption);
		}
	}
</script>

<!-- words -->
{#each { length: value.meta.words } as _, word}
	{#if shouldDisplayWord(word)}
		{@const wordKey = getWordKey(word)}
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
			style={highlightedWordIndices.has(word + 1) ? 'background-color: #bcd9a240;' : ''}
			on:click={() => wordClickHandler({ key: wordKey, type: 'word' })}
		on:mouseenter={() => { hoveredWordKey = wordKey; }}
		on:mouseleave={() => { hoveredWordKey = null; }}
		>
			{#if $__wordTooltip > 1}
				<!-- svelte-ignore a11y-click-events-have-key-events -->
				<!-- svelte-ignore a11y-no-static-element-interactions -->
				<span
					data-screenshot-exclude
					class="absolute top-0 right-0 text-[9px] leading-none px-1 py-0.5 rounded-bl cursor-pointer select-none border z-10 hidden md:block transition-all {hoveredButtonKey === wordKey ? 'bg-cyan-400' : 'bg-[#FA8072]'}"
					style="opacity: {hoveredWordKey === wordKey ? 1 : 0};"
					on:click|stopPropagation={() => screenshotWord(wordKey)}
				on:contextmenu|preventDefault|stopPropagation={() => openContextMenuDialog(wordKey)}
					on:mouseenter|stopPropagation={() => { hoveredButtonKey = wordKey; }}
					on:mouseleave|stopPropagation={() => { hoveredButtonKey = null; }}
				>📷</span>
				{#if hoveredButtonKey === wordKey}
					<div data-screenshot-exclude class="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full z-30 bg-black text-white text-[10px] font-sans rounded px-1.5 py-0.5 whitespace-nowrap">
						Screenshot word
					</div>
				{/if}
			{/if}

			<!-- svelte-ignore a11y-click-events-have-key-events -->
			<!-- svelte-ignore a11y-no-static-element-interactions -->

			<!-- top-left pair -->
			<div
				data-screenshot-exclude
				class="absolute top-0 left-0 flex hidden md:flex z-10 transition-all"
				style="opacity: {hoveredWordKey === wordKey ? 1 : 0};"
			>
				{#each topLeftButtons as btn}
					<span
						class="text-[9px] leading-none px-1 py-0.5 rounded-br cursor-pointer select-none border"
						style="background:{btn.bg};"
						on:click|stopPropagation={() => {}}
					>{btn.icon}</span>
				{/each}
			</div>

			<!-- corner buttons -->
			{#each cornerButtons as btn}
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
