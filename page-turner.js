/*
 * Page Turner - Navigate paginated webpages with your keyboard's arrow keys.
 * Copyright (C) 2012-2026 Nathan Kowald
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * This program is free software: you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the
 * Free Software Foundation, either version 3 of the License, or (at your
 * option) any later version. See the LICENSE file for details.
 */

(function () {
    "use strict";

    const back_names = ['back', 'previous', 'prev'];
    const next_names = ['next', 'forward'];
    const all_words = back_names.concat(next_names);

    let back_link = '';
    let next_link = '';
    let next_page_arrow = '';
    let back_page_arrow = '';

    // Button-driven pagination fallback (form submit)
    let back_form = null;
    let next_form = null;

    // button/input to preserve formaction/submitter intent
    let back_submitter = null;
    let next_submitter = null;

    // Used by click/keydown handlers.
    let icon = 'inactive.png';

    // Prevent double-init when injected after DOM is already ready.
    let has_init = false;

    // --- Environment guards -------------------------------------------------
    // In a normal browser tab (e.g., QUnit tests opened as a file), `chrome`
    // may not exist, or may exist without extension APIs.
    const chrome_api = (typeof chrome !== 'undefined') ? chrome : null;
    const storage_local = (chrome_api && chrome_api.storage && chrome_api.storage.local) ? chrome_api.storage.local : {
        get: function (key, cb) {
            if (typeof cb === 'function') cb({});
        },
        set: function (obj, cb) {
            if (typeof cb === 'function') cb();
        }
    };
    const runtime_send_message = (chrome_api && chrome_api.runtime && chrome_api.runtime.sendMessage)
        ? chrome_api.runtime.sendMessage.bind(chrome_api.runtime)
        : function () {
        };

    // Preferences are fetched once at startup (single storage round-trip)
    // and cached; unset preferences default to on.
    let prefs = null;
    const prefs_waiters = [];

    /**
     * Run a callback with the cached preferences, waiting for the initial
     * storage fetch if it has not resolved yet.
     *
     * @param {Function} cb - Called with the {arrows, prerender} object.
     */
    function withPrefs(cb) {
        if (prefs) {
            cb(prefs);
            return;
        }
        prefs_waiters.push(cb);
    }

    storage_local.get(['arrows', 'prerender'], function (items) {
        items = items || {};

        // Persist defaults for any preference not set yet.
        // Unset preferences default to on (1) - popup/popup.js encodes the
        // same rule when initialising its toggles; keep them in sync.
        const defaults = {};
        if (items.arrows === undefined) defaults.arrows = 1;
        if (items.prerender === undefined) defaults.prerender = 1;
        if (defaults.arrows !== undefined || defaults.prerender !== undefined) {
            storage_local.set(defaults, function () {
            });
        }

        prefs = {
            arrows: (items.arrows === undefined) ? 1 : items.arrows,
            prerender: (items.prerender === undefined) ? 1 : items.prerender
        };

        while (prefs_waiters.length) {
            prefs_waiters.shift()(prefs);
        }
    });

    /**
     * Whether a "back" target exists (link or form-submit fallback).
     *
     * @returns {boolean} True if back navigation is possible.
     */
    function hasBack() {
        return back_link !== '' || !!back_form;
    }

    /**
     * Whether a "next" target exists (link or form-submit fallback).
     *
     * @returns {boolean} True if next navigation is possible.
     */
    function hasNext() {
        return next_link !== '' || !!next_form;
    }

    /**
     * Pick the extension icon for the current back/next state.
     *
     * @returns {string} Icon filename, e.g. 'both.png' or 'inactive.png'.
     */
    function getIcon() {
        if (hasBack() && hasNext()) {
            return 'both.png';
        }
        if (hasBack() && !hasNext()) {
            return 'back.png';
        }
        if (!hasBack() && hasNext()) {
            return 'next.png';
        }
        return 'inactive.png';
    }

    /**
     * Pick the "clicked" feedback variant of the current icon.
     *
     * @param {string} direction - 'back' or 'next'.
     * @returns {string} Icon filename, or '' if no click variant applies.
     */
    function getClickIcon(direction) {
        const current = getIcon();

        if (direction === 'next' && current === 'both.png') {
            return 'both-c-next.png';
        }
        if (direction === 'next' && current === 'next.png') {
            return 'next-c.png';
        }
        if (direction === 'back' && current === 'both.png') {
            return 'both-c-back.png';
        }
        if (direction === 'back' && current === 'back.png') {
            return 'back-c.png';
        }

        return '';
    }

    /**
     * Map a pagination word to its direction.
     *
     * @param {string} word - Lower-cased word, e.g. 'prev' or 'forward'.
     * @returns {string|undefined} 'back', 'next', or undefined if no match.
     */
    function getTypeFromWord(word) {
        if (back_names.includes(word)) {
            return 'back';
        }
        if (next_names.includes(word)) {
            return 'next';
        }
        return undefined;
    }

    /**
     * If a link starts with #, resolve it against the current URL
     * (stripping any existing anchor first).
     *
     * @param {string} link - Raw href value.
     * @returns {string} Absolute or unchanged link.
     */
    function sanitiseLink(link) {
        if (link.charAt(0) === '#') {

            // strip existing anchors
            if (document.URL.indexOf('#') !== -1) {
                link = document.URL.substr(0, document.URL.indexOf('#')) + link;
            } else {
                link = document.URL + link;
            }
        }

        return link;
    }

    /**
     * Only accept links that navigate to a real page. `javascript:` (and
     * other non-http schemes) are never pagination targets and sites' CSP
     * can block navigating to them, e.g. XenForo forums.
     *
     * @param {string} link - Raw href value.
     * @returns {boolean} True if the link is a usable pagination target.
     */
    function isNavigableLink(link) {
        // Empty or bare-hash hrefs require JavaScript to do anything
        if (link === '' || link === '#') {
            return false;
        }
        try {
            const url = new URL(link, document.baseURI);
            return url.protocol === 'http:' ||
                url.protocol === 'https:' ||
                url.protocol === 'file:';
        } catch (e) {
            return false;
        }
    }

    /**
     * Store a found pagination link for the given direction.
     *
     * @param {string} type - 'back' or 'next'.
     * @param {string} link - Raw href value.
     * @returns {boolean} True if the link was accepted and stored.
     */
    function setLink(type, link) {
        if (!isNavigableLink(link)) {
            return false;
        }

        if (type === 'back') {
            back_link = sanitiseLink(link);
        } else if (type === 'next') {
            next_link = sanitiseLink(link);
        }
        return true;
    }

    /**
     * Whether a link (not a form fallback) is already stored for a direction.
     *
     * @param {string} type - 'back' or 'next'.
     * @returns {boolean} True if that direction's link is set.
     */
    function linkOfTypeExists(type) {
        if (type === 'back') {
            return back_link !== '';
        }
        if (type === 'next') {
            return next_link !== '';
        }
        return false;
    }

    // Set while this document is being prerendered: the latest icon to
    // report once the document is actually shown.
    let pending_prerender_icon = '';

    /**
     * Send the icon to background.js so it can update the toolbar.
     *
     * A prerendered document (e.g. the page 2 this extension asks the
     * browser to preload) must not change the toolbar icon of the page
     * the user is looking at; defer until the document is activated.
     *
     * @param {string} nextIcon - Icon filename to display.
     */
    function updateIcon(nextIcon) {
        if (document.prerendering) {
            if (pending_prerender_icon === '') {
                document.addEventListener('prerenderingchange', function () {
                    runtime_send_message({icon: pending_prerender_icon});
                    pending_prerender_icon = '';
                }, {once: true});
            }
            pending_prerender_icon = nextIcon;
            return;
        }
        runtime_send_message({icon: nextIcon});
    }

    /**
     * Whether the browser supports the Speculation Rules API. The old
     * <link rel="prerender"> was removed from Chrome and silently did nothing.
     *
     * @returns {boolean} True if speculation rules can be used.
     */
    function supportsSpeculationRules() {
        return typeof HTMLScriptElement !== 'undefined' &&
            typeof HTMLScriptElement.supports === 'function' &&
            HTMLScriptElement.supports('speculationrules');
    }

    /**
     * Remove the injected speculation-rules script, if present.
     */
    function removePrerenderLink() {
        const el = document.getElementById('ptpr');
        if (el && el.parentNode) {
            el.parentNode.removeChild(el);
        }
    }

    /**
     * Prerender a URL by injecting a speculation-rules script, replacing
     * any previous rule set.
     *
     * @param {string} url - URL of the page to prerender.
     */
    function addPrerenderLink(url) {
        if (!supportsSpeculationRules()) {
            return;
        }

        // Replace any previous rule set (rules can't be edited in place)
        removePrerenderLink();

        const s = document.createElement('script');
        s.type = 'speculationrules';
        s.id = 'ptpr';
        s.textContent = JSON.stringify({prerender: [{urls: [url]}]});
        (document.head || document.documentElement).appendChild(s);
    }

    /**
     * Mark available arrows visible, displaying them if the user's
     * preference allows it.
     */
    function showArrows() {
        withPrefs(function (p) {

            if (hasNext() && next_page_arrow) {
                next_page_arrow.classList.add('visible');
                if (p.arrows === 1) next_page_arrow.style.display = 'block';
            }

            if (hasBack() && back_page_arrow) {
                back_page_arrow.classList.add('visible');
                if (p.arrows === 1) back_page_arrow.style.display = 'block';
            }

        });
    }

    /**
     * Remove arrow divs for directions with no capability (no link and
     * no form).
     */
    function updateArrows() {
        if (!back_page_arrow || !next_page_arrow) return;

        // Remove back arrow only when there is NO back capability (no link and no form)
        if (!hasBack() && back_page_arrow.parentNode) {
            back_page_arrow.parentNode.removeChild(back_page_arrow);
        }

        // Remove next arrow only when there is NO next capability (no link and no form)
        if (!hasNext() && next_page_arrow.parentNode) {
            next_page_arrow.parentNode.removeChild(next_page_arrow);
        }
    }

    /**
     * Store pagination targets declared with explicit rel attributes
     * (<a rel="next">, <link rel="prev">, ...). These are unambiguous
     * pagination semantics, so they beat the text scan.
     */
    function getRelLinks() {
        // rel link types are case-insensitive in HTML, hence the `i` flag
        const rel_selectors = {
            back: 'a[rel~="prev" i], link[rel~="prev" i], a[rel~="previous" i], link[rel~="previous" i]',
            next: 'a[rel~="next" i], link[rel~="next" i]'
        };

        for (const type in rel_selectors) {
            if (linkOfTypeExists(type)) {
                continue;
            }
            const el = document.querySelector(rel_selectors[type]);
            const hrefNode = el && el.getAttributeNode('href');
            if (hrefNode) {
                setLink(type, hrefNode.value);
            }
        }
    }

    /**
     * Whether a word uses ordinary casing: "next", "Next" or "NEXT".
     * Oddly-cased words like "NeXT" are names, not pagination.
     *
     * @param {string} word - Word as it appears in the link text.
     * @returns {boolean} True if the casing looks like pagination text.
     */
    function hasNormalCase(word) {
        return word === word.toLowerCase() ||
            word === word.toUpperCase() ||
            word === word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }

    /**
     * Scan the page's links for pagination text and store back/next
     * targets. Searches last links first, since pagination usually sits
     * at the bottom of the page.
     */
    function getLinks() {
        const links = document.links;
        const last_link_array_num = links.length - 1;

        // Iterate over the links in reverse order
        for (let i = last_link_array_num; i >= 0; i--) {
            const words = normaliseWords(links[i].textContent);

            // Links with more than two words are probably not pagination
            if (!words.length || words.length > 2) {
                continue;
            }

            // Match on first word only
            const type = typeFromWords(words.slice(0, 1));
            if (!type) {
                continue;
            }

            // Set found links (if not set already)
            const hrefNode = links[i].getAttributeNode('href');
            const link = hrefNode ? hrefNode.value : undefined;
            if (!linkOfTypeExists(type) && typeof link !== 'undefined') {
                setLink(type, link);
            }

            // If back AND next links found: exit loop, we're done
            if (back_link !== '' && next_link !== '') {
                break;
            }
        }
    }

    /**
     * Normalise a label into words (letters + spaces only). Original
     * casing is preserved so typeFromWords can reject odd casings.
     *
     * @param {string} str - Label text, e.g. from textContent or aria-label.
     * @returns {string[]} Array of words; empty if nothing usable.
     */
    function normaliseWords(str) {
        if (!str) return [];
        const cleaned = String(str).replace(/[^a-z ]/gi, ' ').trim();
        if (!cleaned) return [];
        return cleaned.split(/\s+/);
    }

    /**
     * Map words to a pagination direction. Matching is case-insensitive,
     * but oddly-cased words like "NeXT" are rejected (see hasNormalCase).
     *
     * @param {string[]} words - Words in their original casing.
     * @returns {string|undefined} 'back', 'next', or undefined if no match.
     */
    function typeFromWords(words) {
        for (let i = 0; i < words.length; i++) {
            const word = words[i].toLowerCase();
            if (all_words.includes(word) && hasNormalCase(words[i])) {
                return getTypeFromWord(word);
            }
        }
        return undefined;
    }

    /**
     * Determine pagination direction from up to three labels, checked in
     * order (button label first, then aria-label, then title).
     *
     * @param {string} primary - Button label (textContent).
     * @param {string} secondary - aria-label value.
     * @param {string} tertiary - title attribute value.
     * @returns {string|undefined} 'back', 'next', or undefined if no match.
     */
    function typeFromLabels(primary, secondary, tertiary) {
        const sources = [primary, secondary, tertiary];
        for (let s = 0; s < sources.length; s++) {
            const type = typeFromWords(normaliseWords(sources[s]));
            if (type) return type;
        }
        return undefined;
    }

    /**
     * Whether an element can be passed to requestSubmit() as a submitter.
     *
     * @param {Element|null} el - Element to check.
     * @returns {boolean} True if it is a submit button.
     */
    function isSubmitButton(el) {
        if (!el || !el.tagName) return false;
        if (el.tagName === 'BUTTON') return el.type === 'submit';
        if (el.tagName === 'INPUT') return el.type === 'submit' || el.type === 'image';
        return false;
    }

    /**
     * Pick the form's submit control for a direction: a submit button
     * whose label matches the direction wins; otherwise the form's first
     * submit control.
     *
     * @param {HTMLFormElement} form - Form to search.
     * @param {string} type - 'back' or 'next'.
     * @returns {Element|null} Submit control, or null if the form has none.
     */
    function findSubmitter(form, type) {
        const controls = form.querySelectorAll('button, input');
        let first = null;
        for (let i = 0; i < controls.length; i++) {
            const el = controls[i];
            if (!isSubmitButton(el)) continue;
            if (!first) first = el;

            const label = el.tagName === 'INPUT' ? el.value : el.textContent;
            const aria = el.getAttribute('aria-label') || '';
            const title = el.getAttribute('title') || '';
            if (typeFromLabels(label, aria, title) === type) {
                return el;
            }
        }
        return first;
    }

    /**
     * Store a button's form as the submit target for a direction, if that
     * direction has no form yet. The button itself is kept as the
     * submitter so formaction/submitter intent is preserved. When the
     * matched element is not itself a submit button (e.g. a form matched
     * via its aria-label), the form's own submit button is used instead —
     * preferring one whose label matches the direction.
     *
     * @param {string|undefined} type - 'back' or 'next'.
     * @param {Element} el - Button/input element inside (or associated with) a form.
     */
    function setButtonTarget(type, el) {
        if (!type) return;

        // An anchor with a real href is a link target, not a form submit.
        // Some sites (e.g. eBay) give an icon-only <a> no text and no
        // rel="next", labelling the direction only via aria-label - so the
        // text and rel scans miss it and it first surfaces here.
        if (el.tagName === 'A') {
            const hrefNode = el.getAttributeNode('href');
            if (hrefNode) {
                setLink(type, hrefNode.value);
            }
            return;
        }

        // Prefer a real form association
        const form = (el.form instanceof HTMLFormElement && el.form) || el.closest('form');
        if (!form) return;

        let submitter = el;
        if (!isSubmitButton(submitter)) {
            submitter = findSubmitter(form, type);
        }

        if (type === 'back' && !back_form) {
            back_form = form;
            back_submitter = submitter;
        } else if (type === 'next' && !next_form) {
            next_form = form;
            next_submitter = submitter;
        }
    }

    // Likely pagination containers. Buttons inside these are the most
    // trustworthy candidates and are scanned first; the whole page is only
    // scanned as a fallback when these come up empty.
    const pagination_containers = [
        'nav',
        '[role="navigation"]',
        '.pagination',
        '.pager',
        '[id*="pagination" i]',
        '[class*="pagination" i]',
        '[aria-label*="pagination" i]'
    ].join(', ');

    // Button/input/role=link elements that might drive pagination
    const button_candidates = [
        'button',
        '[role="link"]',
        'input[type="submit"]',
        'input[type="button"]',
        // Explicit aria-label matches:
        '[aria-label*="next" i]',
        '[aria-label*="prev" i]',
        '[aria-label*="previous" i]',
        '[aria-label*="back" i]',
        '[aria-label*="forward" i]'
    ].join(', ');

    /**
     * Classify candidate elements by label and store their forms as submit
     * targets for any direction still missing.
     *
     * @param {NodeList} nodes - Candidate elements to inspect.
     * @param {Set} seen - Elements already inspected (dedupes across calls).
     * @returns {boolean} True when both directions are resolved.
     */
    function scanButtonCandidates(nodes, seen) {
        for (let i = 0; i < nodes.length; i++) {
            const el = nodes[i];
            if (!el || seen.has(el)) continue;
            seen.add(el);

            // First check must be label. For submit/image inputs the visible
            // label is the value attribute, not textContent (e.g. DuckDuckGo
            // HTML paginates with <input type="submit" value="Next">).
            const label = ((el.tagName === 'INPUT' ? el.value : el.textContent) || '').trim();

            // Then aria-label, then title
            const aria = (el.getAttribute && el.getAttribute('aria-label')) ? el.getAttribute('aria-label') : '';
            const title = (el.getAttribute && el.getAttribute('title')) ? el.getAttribute('title') : '';

            const type = typeFromLabels(label, aria, title);
            if (!type) continue;

            // Only set if we don't already have that direction
            if (type === 'back' && (back_link !== '' || back_form)) continue;
            if (type === 'next' && (next_link !== '' || next_form)) continue;

            setButtonTarget(type, el);

            if (hasBack() && hasNext()) {
                return true;
            }
        }
        return false;
    }

    /**
     * Scan for pagination-like buttons and store their forms as submit
     * targets. Hybrid approach: likely pagination containers are scanned
     * first; only if a direction is still missing does the scan broaden to
     * the whole page. Resets button state on each scan (pairs with
     * refetchLinks).
     */
    function getButtons() {
        back_form = null;
        next_form = null;
        back_submitter = null;
        next_submitter = null;

        // Real links cover both directions: no form fallback needed
        if (back_link !== '' && next_link !== '') {
            return;
        }

        const seen = new Set();

        // Fast path: only look inside likely pagination containers
        const containers = document.querySelectorAll(pagination_containers);
        for (let c = 0; c < containers.length; c++) {
            if (scanButtonCandidates(containers[c].querySelectorAll(button_candidates), seen)) {
                return;
            }
        }

        // Fallback: broaden to the whole page so pagination in unusual
        // markup is still found
        scanButtonCandidates(document.querySelectorAll(button_candidates), seen);
    }

    /**
     * Submit a pagination form, preferring requestSubmit so the
     * formaction/submitter is respected.
     *
     * @param {HTMLFormElement|null} form - Form to submit.
     * @param {Element|null} submitter - Button to submit with, if any.
     * @returns {boolean} True if a submission was triggered.
     */
    function submitForm(form, submitter) {
        if (!form) {
            return false;
        }

        // Prefer requestSubmit so formaction/submitter is respected.
        if (typeof form.requestSubmit === 'function') {
            if (isSubmitButton(submitter)) {
                form.requestSubmit(submitter);
            } else {
                form.requestSubmit();
            }
            return true;
        }

        // Fallback: plain submit.
        if (typeof form.submit === 'function') {
            form.submit();
            return true;
        }

        return false;
    }

    /**
     * Show click feedback on an arrow, clearing it after the sprite has been
     * seen so the state can re-fire on pages that don't unload (e.g. # links).
     *
     * @param {Element|null} arrow - Arrow div to flash.
     */
    function flashClicked(arrow) {
        if (!arrow || !arrow.classList) return;
        arrow.classList.remove('clicked');
        arrow.classList.add('clicked');
        setTimeout(function () {
            arrow.classList.remove('clicked');
        }, 250);
    }

    /**
     * One-time setup: detect pagination targets, insert the arrow divs,
     * start prerendering and set the toolbar icon. Safe to call more than
     * once; only the first call runs.
     */
    function init() {
        if (has_init) {
            return;
        }
        has_init = true;

        getRelLinks();
        getLinks();
        getButtons();

        // Create arrows
        const df = document.createDocumentFragment();
        const next = document.createElement('div');
        const back = document.createElement('div');

        next.setAttribute('class', 'pt_indicator');
        next.id = 'pt_next_page';
        next.innerHTML = '&nbsp;';

        back.setAttribute('class', 'pt_indicator');
        back.id = 'pt_back_page';
        back.innerHTML = '&nbsp;';

        df.appendChild(next);
        df.appendChild(back);
        document.body.appendChild(df);

        // Cache arrow elements
        next_page_arrow = document.getElementById('pt_next_page');
        back_page_arrow = document.getElementById('pt_back_page');

        // Prerendering speeds up page-turning by preloading the next page
        withPrefs(function (p) {
            if (next_link !== '' && p.prerender === 1) {
                addPrerenderLink(next_link);
            }
        });

        // Show arrows (if preference is to show)
        showArrows();

        // Determine and update extension icon
        icon = getIcon();
        updateIcon(icon);

        updateArrows();
    }

    // DOM has loaded
    document.addEventListener('DOMContentLoaded', init, false);

    // If the script is injected after DOM is ready, run immediately.
    if (document.readyState !== 'loading') {
        init();
    }

    window.addEventListener('resize', function () {
        if (back_page_arrow) {
            back_page_arrow.style.top = '50%';
        }
        if (next_page_arrow) {
            next_page_arrow.style.top = '50%';
        }
    }, false);

    // Set keyboard shortcuts for back/next links
    document.addEventListener('keydown', function (e) {
        // Don't override when modifier keys are held
        if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) {
            return;
        }

        // Detect context: don't hijack arrow keys inside editable controls
        const element = document.activeElement;

        if (element && (
            element.tagName === 'INPUT' ||
            element.tagName === 'SELECT' ||
            element.tagName === 'TEXTAREA' ||
            element.isContentEditable
        )) {
            return;
        }

        // Left arrow
        if (e.key === 'ArrowLeft' && hasBack()) {
            e.preventDefault();
            e.stopImmediatePropagation();
            flashClicked(back_page_arrow);
            updateIcon(getClickIcon('back'));
            if (back_link !== '') {
                document.location = back_link;
            } else {
                submitForm(back_form, back_submitter);
            }
        }

        // Right arrow
        if (e.key === 'ArrowRight' && hasNext()) {
            e.preventDefault();
            e.stopImmediatePropagation();
            flashClicked(next_page_arrow);
            updateIcon(getClickIcon('next'));
            if (next_link !== '') {
                document.location = next_link;
            } else {
                submitForm(next_form, next_submitter);
            }
        }
    }, false);

    /**
     * Re-run pagination detection from scratch and refresh the icon and
     * arrows. Used when the page content changes without a navigation.
     */
    function refetchLinks() {
        back_link = '';
        next_link = '';
        getRelLinks();
        getLinks();
        getButtons();

        icon = getIcon();
        updateIcon(icon);
        updateArrows();
    }


    // Public API for tests (and optional debugging). Avoids leaking individual globals.
    if (typeof window !== 'undefined') {
        window.PageTurner = window.PageTurner || {};

        window.PageTurner.getState = function () {
            return {
                back_link: back_link,
                next_link: next_link,
                back_form: back_form,
                next_form: next_form,
                back_submitter: back_submitter,
                next_submitter: next_submitter,
                icon: icon
            };
        };

        window.PageTurner.setState = function (partial) {
            if (!partial || typeof partial !== 'object') {
                return;
            }
            if (Object.prototype.hasOwnProperty.call(partial, 'back_link')) {
                back_link = partial.back_link || '';
            }
            if (Object.prototype.hasOwnProperty.call(partial, 'next_link')) {
                next_link = partial.next_link || '';
            }
            if (Object.prototype.hasOwnProperty.call(partial, 'back_form')) {
                back_form = partial.back_form || null;
            }
            if (Object.prototype.hasOwnProperty.call(partial, 'next_form')) {
                next_form = partial.next_form || null;
            }
            if (Object.prototype.hasOwnProperty.call(partial, 'back_submitter')) {
                back_submitter = partial.back_submitter || null;
            }
            if (Object.prototype.hasOwnProperty.call(partial, 'next_submitter')) {
                next_submitter = partial.next_submitter || null;
            }
            // Keep icon in sync if tests tweak state.
            icon = getIcon();
        };

        window.PageTurner.hasBack = hasBack;
        window.PageTurner.hasNext = hasNext;
        window.PageTurner.getIcon = getIcon;
        window.PageTurner.getTypeFromWord = getTypeFromWord;
        window.PageTurner.refetchLinks = refetchLinks;

        // Expose submit helper for tests of button/form pagination.
        window.PageTurner._submitForm = submitForm;
    }
    // Apply settings immediately when changed from the popup (replaces the
    // MV2-era executeScript re-injection of content_script.js)
    if (chrome_api && chrome_api.storage && chrome_api.storage.onChanged) {
        chrome_api.storage.onChanged.addListener(function (changes, area) {
            if (area !== 'local') {
                return;
            }

            // Keep the cached preferences in sync
            if (prefs) {
                if (changes.arrows) prefs.arrows = changes.arrows.newValue;
                if (changes.prerender) prefs.prerender = changes.prerender.newValue;
            }

            if (changes.arrows) {
                const show = changes.arrows.newValue === 1;
                [back_page_arrow, next_page_arrow].forEach(function (arrow) {
                    if (arrow && arrow.classList && arrow.classList.contains('visible')) {
                        arrow.style.display = show ? 'block' : 'none';
                    }
                });
            }

            if (changes.prerender) {
                if (changes.prerender.newValue === 1) {
                    if (next_link !== '') {
                        addPrerenderLink(next_link);
                    }
                } else {
                    removePrerenderLink();
                }
            }
        });
    }

    // Invalidate back/nexts if a Google search changes page results
    const google_search = document.querySelector('input[name=q]');
    if (google_search) {
        google_search.addEventListener('change', function () {
            // Until I can detect new search result completion, a one-second
            // delay before fetching new links works.
            setTimeout(refetchLinks, 1000);
        }, false);
    }
})();
