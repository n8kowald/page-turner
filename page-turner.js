(function () {
    "use strict";

    const back_names = ['back', 'previous', 'prev'];
    const next_names = ['next', 'forward'];
    const all_words = back_names.concat(next_names);

    let back_link = '';
    let next_link = '';
    let next_page_arrow = '';
    let back_page_arrow = '';
    let first_run = 0;

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

    function arrayHas(arr, needle) {
        if (!arr) return false;
        if (Array.prototype.includes) return arr.includes(needle);
        return arr.indexOf(needle) !== -1;
    }

    // If show arrows preference not set: default to show
    storage_local.get('arrows', function (items) {
        items = items || {};
        if (items.arrows === undefined) {
            first_run = 1;
            storage_local.set({'arrows': 1}, function () {
            });
        }
    });

    // If prerender preference not set: default to use
    storage_local.get('prerender', function (items) {
        items = items || {};
        if (items.prerender === undefined) {
            first_run = 1;
            storage_local.set({'prerender': 1}, function () {
            });
        }
    });

    function hasBack() {
        return back_link !== '' || !!back_form;
    }

    function hasNext() {
        return next_link !== '' || !!next_form;
    }

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

    function getTypeFromWord(word) {
        if (arrayHas(back_names, word)) {
            return 'back';
        }
        if (arrayHas(next_names, word)) {
            return 'next';
        }
        return undefined;
    }

    // If link starts with #, append this to current url
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

    function setLink(type, link) {
        // A single hash is not a valid link (requires JavaScript)
        if (link === '#') {
            return false;
        }

        if (type === 'back') {
            back_link = sanitiseLink(link);
        } else if (type === 'next') {
            next_link = sanitiseLink(link);
        }
        return true;
    }

    function linkOfTypeExists(type) {
        if (type === 'back') {
            return back_link !== '';
        }
        if (type === 'next') {
            return next_link !== '';
        }
        return false;
    }

    // send icon to background.js
    function updateIcon(nextIcon) {
        runtime_send_message({icon: nextIcon});
    }

    function addPrerenderLink(url) {
        const ptpr = document.getElementById('ptpr');
        if (ptpr !== null) {
            ptpr.href = url;
            return;
        }

        // If a prerender link exists: update the href
        const el = document.querySelector('link[rel=prerender]');
        if (el !== null) {
            el.href = url;
            return;
        }

        // No prerender exists: create it
        const l = document.createElement('link');
        l.rel = 'prerender';
        l.href = url;
        l.id = 'ptpr';
        document.getElementsByTagName('head')[0].appendChild(l);
    }

    function showArrows() {
        chrome.storage.local.get('arrows', function (items) {

            if (hasNext() && next_page_arrow) {
                next_page_arrow.className += ' visible';
                if (items.arrows == 1 || first_run == 1) next_page_arrow.style.display = 'block';
            }

            if (hasBack() && back_page_arrow) {
                back_page_arrow.className += ' visible';
                if (items.arrows == 1 || first_run == 1) back_page_arrow.style.display = 'block';
            }

        });
    }

    // Remove arrow divs if not used
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

    // Search last links first
    function getLinks() {
        const links = document.links;
        const last_link_array_num = links.length - 1;

        // Iterate over the links in reverse order
        for (let i = last_link_array_num; i >= 0; i--) {
            const link_text = links[i].textContent.replace(/[^a-z ]/gi, ' ').trim();
            if (link_text === '') {
                continue;
            }
            const words = link_text.split(' ');

            // Links with more than two words are probably not pagination
            if (words.length > 2) {
                continue;
            }

            // Match on first word
            const word = words[0].toLowerCase();
            if (!arrayHas(all_words, word)) {
                continue;
            }

            // Found!
            const type = getTypeFromWord(word);

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

    function normaliseWords(str) {
        if (!str) return [];
        // Keep it similar to link parsing: letters + spaces.
        const cleaned = String(str).replace(/[^a-z ]/gi, ' ').trim().toLowerCase();
        if (!cleaned) return [];
        return cleaned.split(/\s+/).filter(Boolean);
    }

    function typeFromLabels(primary, secondary, tertiary) {
        // Requirement: first check is the button label
        const sources = [primary, secondary, tertiary];
        for (let s = 0; s < sources.length; s++) {
            const words = normaliseWords(sources[s]);
            if (!words.length) continue;

            // Match first word OR any word
            const first = words[0];
            if (arrayHas(all_words, first)) {
                return getTypeFromWord(first);
            }
            for (let i = 0; i < words.length; i++) {
                if (arrayHas(all_words, words[i])) {
                    return getTypeFromWord(words[i]);
                }
            }
        }
        return undefined;
    }

    function setButtonTarget(type, el) {
        if (!type) return;

        // Prefer a real form association
        const form = el.form || el.closest('form');
        if (!form) return;

        if (type === 'back' && !back_form) {
            back_form = form;
            back_submitter = el;
        } else if (type === 'next' && !next_form) {
            next_form = form;
            next_submitter = el;
        }
    }

    // Look for pagination-like buttons/role=link elements and store form targets
    function getButtons() {
        // Reset button state each scan (pairs with refetchLinks)
        back_form = null;
        next_form = null;
        back_submitter = null;
        next_submitter = null;

        // Prioritise likely pagination containers first.
        const selectors = [
            '.pagination button, .pagination [role="link"]',
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
        ];

        const seen = new Set();
        const candidates = [];

        for (let s = 0; s < selectors.length; s++) {
            const nodes = document.querySelectorAll(selectors[s]);
            for (let i = 0; i < nodes.length; i++) {
                const el = nodes[i];
                if (!el || seen.has(el)) continue;
                seen.add(el);
                candidates.push(el);
            }
        }

        // Walk candidates in order; stop early if we found both.
        for (let i = 0; i < candidates.length; i++) {
            const el = candidates[i];

            // First check must be label (textContent)
            const label = (el.textContent || '').trim();

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
                break;
            }
        }
    }

    function submitForm(form, submitter) {
        if (!form) {
            return false;
        }

        // Prefer requestSubmit so formaction/submitter is respected.
        if (typeof form.requestSubmit === 'function') {
            if (submitter) {
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

    function init() {
        if (has_init) {
            return;
        }
        has_init = true;

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
        storage_local.get('prerender', function (items) {
            items = items || {};
            if (next_link !== '' && (items.prerender === 1 || first_run === 1)) {
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
            back_page_arrow.className += ' clicked';
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
            next_page_arrow.className += ' clicked';
            updateIcon(getClickIcon('next'));
            if (next_link !== '') {
                document.location = next_link;
            } else {
                submitForm(next_form, next_submitter);
            }
        }
    }, false);

    function refetchLinks() {
        back_link = '';
        next_link = '';
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
    // Apply the "show page arrows" setting immediately when changed from the
    // popup (replaces the MV2-era executeScript re-injection of content_script.js)
    if (chrome_api && chrome_api.storage && chrome_api.storage.onChanged) {
        chrome_api.storage.onChanged.addListener(function (changes, area) {
            if (area !== 'local' || !changes.arrows) {
                return;
            }
            const show = changes.arrows.newValue === 1;
            [back_page_arrow, next_page_arrow].forEach(function (arrow) {
                if (arrow && arrow.classList && arrow.classList.contains('visible')) {
                    arrow.style.display = show ? 'block' : 'none';
                }
            });
        });
    }

// Invalidate back/nexts if a Google search changes page results
    const google_search = document.querySelector('input[name=q]');
    if (google_search) {
        google_search.addEventListener('change', function () {
            // Until I can detect new search result completion, a one second
            // delay before fetching new links works.
            setTimeout(refetchLinks, 1000);
        }, false);
    }
})();
