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
	import { __currentPage, __fontType, __displayType, __userSettings, __audioSettings, __morphologyKey, __verseKey, __websiteTheme, __morphologyModalVisible, __wordMorphologyOnClick, __wordTranslation, __wordTransliteration, __wordTranslationEnabled, __wordTransliterationEnabled, __wordTooltip, __hideNonDuaPart, __signLanguageModeEnabled } from '$utils/stores';
	import { loadFont } from '$utils/loadFont';
	import { wordAudioController } from '$utils/audioController';
	import { updateSettings } from '$utils/updateSettings';
	import { getMushafWordFontLink, isFirefoxDarkNonTajweed, isFirefoxDarkTajweed } from '$utils/getMushafWordFontLink';
	import { fetchAndCacheJson } from '$utils/fetchData';
	import { morphologyDataUrls } from '$data/websiteSettings';

	const fontSizes = JSON.parse($__userSettings).displaySettings.fontSizes;
	const chapter = key.split(':')[0];
	const verse = key.split(':')[1];
	const arabicWords = value.words.arabic;
	const transliterationWords = value.words.transliteration;
	const translationWords = value.words.translation;

	// fix for Ba'da Ma Ja'aka for page 254
	// since it's just a cosmetic change, there's no need of changing it at database level
	const fixedMushafWords = {
		'13:37:8': 'ﱿ', // 6th line last word - Ba'da
		'13:37:9': 'ﲀﲁ' // 7th line first word - Ma Ja'aka
	};

	$: displayIsContinuous = selectableDisplays[$__displayType].continuous;

	// Dynamically load the fonts if mushaf fonts are selected
	//v4 words are hidden by default and shown only when the font is loaded...
	if ([2, 3].includes($__fontType)) {
		loadFont(`p${value.meta.page}`, getMushafWordFontLink(value.meta.page)).then(() => {
			document.querySelectorAll(`.p${value.meta.page}`).forEach((element) => {
				element.classList.remove('invisible');
			});
		});
	}

	/**
	 * Handles click interactions on words or verse-end icons depending on the current page and context.
	 *
	 * Behavior:
	 * 1. **Morphology Page + Word Click**:
	 *    - Sets the selected morphology key and navigates to the word's morphology details.
	 *
	 * 2. **Other Pages + Word Click (if word-level morphology is enabled or modal is visible)**:
	 *    - Opens the morphology modal for the clicked word and sets the selected morphology key.
	 *
	 * 3. **General Case**:
	 *    - Sets the verse key for tracking purposes.
	 *    - If a word is clicked:
	 *      - Triggers audio playback for that specific word.
	 *    - If an end-verse icon is clicked:
	 *      - Adds a bookmark (if continuous display is disabled).
	 */
	function wordClickHandler(props) {
		if ($__currentPage === 'morphology' && props.type === 'word') {
			__morphologyKey.set(props.key);
			goto(`/morphology?word=${props.key}`, { replaceState: false });
		} else if ((!['morphology', 'mushaf'].includes($__currentPage) && props.type === 'word' && $__wordMorphologyOnClick) || $__morphologyModalVisible) {
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

	// Common classes for words and end icons
	$: wordAndEndIconCommonClasses = `
		hover:cursor-pointer
		${window.theme('hover')}
		${$__displayType === 1 ? 'text-center flex flex-col' : 'inline-flex flex-col'}
		${selectableDisplays[$__displayType].layout === 'wbw' ? 'px-3 py-2' : [2, 3].includes($__fontType) ? ($__currentPage === 'mushaf' ? 'p-0' : 'px-0 py-2') : 'px-1 py-2'}
		${exampleVerse && '!p-0'}
	`;

	// Classes for word spans
	$: wordSpanClasses = `
		arabicText leading-normal 
		arabic-font-${$__fontType} 
		${$__currentPage !== 'mushaf' && fontSizes.arabicText} 
		${displayIsContinuous && 'inline-block'}
		${$__fontType === 9 && 'pb-4'}
	`;

	// Classes for v4 Hafs words:
	// 1. Special Firefox + Dark theme cases:
	//    - If font type is 3 (Tajweed) → apply "hafs-palette-firefox-dark"
	//      (fixes Firefox-specific rendering issues).
	//    - If font type is 2 (Non-Tajweed) → no palette applied (leave empty).
	//
	// 2. Otherwise (all non-Firefox or other cases):
	//    - If font type is 3 → apply "theme-palette-tajweed" (tajweed font coloring).
	//    - Else → apply "theme-palette-normal" (default palette).
	//    - If font type is 2 and theme is 5 (Mocha Night) → add "mocha-night-font-color".
	//    - If font type is 2 and theme is 9 (Dark Luxury) → add "dark-luxury-font-color".
	//
	// Summary:
	// - Firefox + dark theme overrides the palette logic (tajweed → special class, non-tajweed → none).
	// - All other browsers/themes follow the normal font-type and theme-based palettes.
	$: v4hafsClasses = `
		invisible v4-words 
		p${value.meta.page} 
		${
			isFirefoxDarkTajweed()
				? 'hafs-palette-firefox-dark'
				: isFirefoxDarkNonTajweed()
					? ''
					: `
						${$__fontType === 3 ? 'theme-palette-tajweed' : 'theme-palette-normal'}
						${$__fontType === 2 && $__websiteTheme === 5 ? 'mocha-night-font-color' : ''}
						${$__fontType === 2 && $__websiteTheme === 9 ? 'dark-luxury-font-color' : ''}
					`
		}
	`;

	// Classes for end icons
	// In Golden Glint theme, the end icon should be gold
	$: endIconClasses = `
		rounded-lg 
		${wordAndEndIconCommonClasses}
		${$__websiteTheme === 1 && `${window.theme('textSecondary')}`}
	`;

	// Classes for word translation and transliteration
	$: wordTranslationClasses = `
		wordTranslationText flex flex-col direction-ltr
		${fontSizes.wordTranslationText}
		theme
	`;

	// Function to check if word should be displayed
	function shouldDisplayWord(wordIndex) {
		return $__currentPage !== 'mushaf' || ($__currentPage === 'mushaf' && +value.words.line[wordIndex] === line);
	}

	// Function to get word key
	function getWordKey(wordIndex) {
		return `${chapter}:${verse}:${wordIndex + 1}`;
	}

	let hoveredWordKey = null;

	let rootDataMap = {};
	let sameRootMap = {};
	let exactWordsMap = {};

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
		return Array.from(root).join(' · ');
	}

	const pauseMarksRegex = /[ۖۗۘۙۚۛۜ۩۞]/g;

	function getWordCounts(wordKey) {
		const meta = rootDataMap[wordKey];
		if (!Array.isArray(meta)) return null;
		const root = meta[1];
		const uthmani = meta[0]?.replace(pauseMarksRegex, '');
		const rootCount = root ? (sameRootMap[root]?.length ?? 0) : 0;
		const exactCount = uthmani ? (exactWordsMap[uthmani]?.length ?? 0) : 0;
		if (!rootCount && !exactCount) return null;
		return { rootCount, exactCount };
	}

	async function screenshotWord(wordKey) {
		const html2canvas = (await import('html2canvas')).default;
		const wordEl = document.getElementById(wordKey);

		// Find the associated tooltip sibling (role="tooltip")
		let tooltipEl = wordEl.nextElementSibling;
		while (tooltipEl && tooltipEl.getAttribute('role') !== 'tooltip') {
			tooltipEl = tooltipEl.nextElementSibling;
		}

		const pad = 8;
		const wordRect = wordEl.getBoundingClientRect();
		const totalW = wordRect.width + pad * 2;
		const totalH = wordRect.height + pad * 2;

		// Fetch root letters for this word
		const rootData = await fetchAndCacheJson(morphologyDataUrls.wordUthmaniAndRoots, 'morphology');
		const root = rootData?.data?.[wordKey]?.[1] ?? null;

		// Isolated off-screen container — only our clones live here, no bleed
		const wordClone = wordEl.cloneNode(true);
		wordClone.querySelector('[title="Screenshot page"]')?.remove();
		wordClone.querySelector('.arabicText').style.setProperty('color', 'green', 'important');

		const counts = getWordCounts(wordKey);

		if (root) {
			const rootLabel = document.createElement('span');
			rootLabel.textContent = Array.from(root).join(' · ');
			rootLabel.style.cssText = 'font-size:18px;font-weight:bold;color:#222;font-family:serif;direction:rtl;';
			wordClone.appendChild(rootLabel);

			if (counts) {
				const countsLabel = document.createElement('span');
				countsLabel.textContent = `${counts.rootCount} / ${counts.exactCount}`;
				countsLabel.style.cssText = 'font-size:12.5px;color:#555;font-family:sans-serif;';
				wordClone.appendChild(countsLabel);
			}
		}

		const wordIndexLabel = document.createElement('span');
		wordIndexLabel.textContent = wordKey;
		wordIndexLabel.style.cssText = 'font-size:12.5px;color:#222;font-family:sans-serif;';
		wordClone.appendChild(wordIndexLabel);

		wordClone.style.position = 'absolute';

		const gapSize = 10;
		wordClone.style.gap = `${gapSize}px`;

		// Extra height: gaps between all children + the added labels' line heights
		const labelHeight = Math.ceil(12.5 * 1.4);
		const addedLabels = root ? (counts ? 3 : 2) : 1;
		const extraH = Math.max(0, wordClone.children.length - 1) * gapSize + labelHeight * addedLabels;

		const container = document.createElement('div');
		container.style.cssText = `position:fixed;top:-9999px;left:-9999px;width:${totalW}px;height:${totalH + extraH}px;background:white;`;

		wordClone.style.left = `${pad}px`;
		wordClone.style.top = `${pad}px`;
		container.appendChild(wordClone);

		document.body.appendChild(container);
		const canvas = await html2canvas(container);
		document.body.removeChild(container);

		const filename = `quranwbw-${wordKey.replaceAll(':', '-')}-${Date.now()}.png`;
		const dataUrl = canvas.toDataURL('image/png');
		await fetch('/api/save-screenshot', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ filename, dataUrl })
		});
		console.warn(`[Screenshot] Sent to Telegram: ${filename}`);
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
			`.trim()}
			on:click={() => wordClickHandler({ key: wordKey, type: 'word' })}
		on:mouseenter={() => { hoveredWordKey = wordKey; }}
		on:mouseleave={() => { hoveredWordKey = null; }}
		>
			{#if $__wordTooltip > 1}
				<!-- svelte-ignore a11y-click-events-have-key-events -->
				<!-- svelte-ignore a11y-no-static-element-interactions -->
				<span
					class="absolute top-0 right-0 text-[9px] leading-none px-1 py-0.5 rounded-bl cursor-pointer select-none border z-10 hidden md:block transition-opacity bg-[#FA8072]"
					style="opacity: {hoveredWordKey === wordKey ? 1 : 0};"
					on:click|stopPropagation={() => screenshotWord(wordKey)}
					title="Screenshot page"
				>📷</span>
			{/if}
			<span class={wordSpanClasses} data-fontSize={fontSizes.arabicText}>
				<!-- Everything except Mushaf fonts -->
				{#if ![2, 3].includes($__fontType)}
					{arabicWords[word]}
					<!-- Mushaf fonts -->
				{:else}
					<span id="word-{wordKey.split(':')[1]}-{wordKey.split(':')[2]}" style="font-family: p{value.meta.page}" class={v4hafsClasses}>
						<!-- word fix, see fixedMushafWords -->
						{#if Object.prototype.hasOwnProperty.call(fixedMushafWords, wordKey)}
							{fixedMushafWords[wordKey]}
						{:else}
							{arabicWords[word]}
						{/if}
					</span>
				{/if}
			</span>

			<!-- word translation and transliteration, only for wbw modes -->
			{#if [1, 3, 7].includes($__displayType)}
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
{#if $__currentPage !== 'mushaf' || ($__currentPage === 'mushaf' && value.words.line[value.words.line.length - 1] === line)}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div class={endIconClasses} on:click={() => wordClickHandler({ key, type: 'end' })}>
		<span class={wordSpanClasses} data-fontSize={fontSizes.arabicText}>
			<!-- Everything except Mushaf fonts -->
			{#if ![2, 3].includes($__fontType)}
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
