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

test('Search bottom to top', function () {
    equal(PageTurner.getState().next_link, 'next.html', 'expects next_link to be next.html');
    equal(PageTurner.getState().back_link, 'back.html', 'expects back_link to be back.html');
});

test('arrow dom node insertions', function () {
    const next = document.getElementById('pt_next_page');
    ok(!!next, 'Next div should exist');
    const back = document.getElementById('pt_back_page');
    ok(!!back, 'Back div should exist');
});

// Test page contains two found links by default
test('Correct icons', function () {
    let icon = PageTurner.getIcon();
    equal(icon, 'both.png', 'Both icon should be used');

    // Remove back link
    PageTurner.setState({ back_link: '' });
    icon = PageTurner.getIcon();
    equal(icon, 'next.png', 'Next icon should be used');

    // Remove next link
    PageTurner.setState({ next_link: '' });
    icon = PageTurner.getIcon();
    equal(icon, 'inactive.png', 'Inactive icon should be used');

    // Restore back/next links for later tests
    PageTurner.setState({ next_link: 'next.html' });
    PageTurner.setState({ back_link: 'back.html' });
});


test('getTypeFromWord tests', function () {
    let word = 'back';
    equal(PageTurner.getTypeFromWord(word), 'back', 'Should detect back');
    word = 'previous';
    equal(PageTurner.getTypeFromWord(word), 'back', 'Should detect back');
    word = 'prev';
    equal(PageTurner.getTypeFromWord(word), 'back', 'Should detect back');
    word = 'next';
    equal(PageTurner.getTypeFromWord(word), 'next', 'Should detect next');
    word = 'forward';
    equal(PageTurner.getTypeFromWord(word), 'next', 'Should detect next');
});

// Change links - test that
test('Refetching links should update link values, icon and arrows', function () {
    // First delete all back links to simulate only finding next links
    const back_lis = document.querySelectorAll('li.back');
    for (let i = 0; i < back_lis.length; i++) {
        back_lis[i].firstChild.href = '#';
    }
    PageTurner.refetchLinks();

    const icon = PageTurner.getIcon();
    equal(PageTurner.getState().back_link, '', 'Back link should be blank');
    equal(icon, 'next.png', 'Next icon should be used');

    const back_arrow = document.getElementById('pt_back_page');
    equal(back_arrow, null, 'Back arrow DOM node should no longer exist');
});


test('Button/form pagination uses form-submit mode', function () {
    // Neutralise existing pagination links so getLinks() does not find usable hrefs
    const anchors = document.querySelectorAll('a');
    for (let i = 0; i < anchors.length; i++) {
        anchors[i].setAttribute('href', '#');
    }

    // Inject a pagination nav + form + Next button into the QUnit fixture
    // (form-submit mode only applies inside pagination containers)
    const fixture = document.getElementById('qunit-fixture');
    fixture.innerHTML = '';

    const nav = document.createElement('nav');
    nav.id = 'pagination';
    nav.setAttribute('role', 'navigation');

    const form = document.createElement('form');
    form.action = 'next.html';
    form.method = 'get';

    const btn = document.createElement('button');
    btn.type = 'submit';
    btn.setAttribute('role', 'link');
    btn.textContent = 'Next page';

    form.appendChild(btn);
    nav.appendChild(form);
    fixture.appendChild(nav);

    // Spy on requestSubmit (preferred) to ensure submit-path is used
    let submitted = false;
    let submittedWith = null;
    form.requestSubmit = function (submitter) {
        submitted = true;
        submittedWith = submitter || null;
    };

    // Refresh detection
    PageTurner.refetchLinks();

    equal(PageTurner.getState().next_link, '', 'Next link should be blank (button mode)');
    ok(PageTurner.getState().next_form === form, 'Next form should be detected');
    ok(PageTurner.getState().next_submitter === btn, 'Next submitter button should be detected');
    equal(PageTurner.getIcon(), 'next.png', 'Next icon should be used when only next button exists');

    // Simulate ArrowRight keydown and ensure form submission is triggered
    const ev = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    document.dispatchEvent(ev);

    ok(submitted, 'ArrowRight should submit the detected next form');
    ok(submittedWith === btn || submittedWith === null, 'requestSubmit should be called with the detected button when possible');
});

test('Pagination container forms are preferred over outside forms', function () {
    // Neutralise existing pagination links so getLinks() does not find usable hrefs
    const anchors = document.querySelectorAll('a');
    for (let i = 0; i < anchors.length; i++) {
        anchors[i].setAttribute('href', '#');
    }

    const fixture = document.getElementById('qunit-fixture');
    fixture.innerHTML = '';

    // A checkout-style form outside any pagination container, first in the DOM
    const wrapper = document.createElement('div');
    wrapper.className = 'checkout-step';
    const outside_form = document.createElement('form');
    outside_form.action = 'checkout.html';
    const outside_btn = document.createElement('button');
    outside_btn.type = 'submit';
    outside_btn.textContent = 'Next';
    outside_form.appendChild(outside_btn);
    wrapper.appendChild(outside_form);

    // A pagination nav with its own next form, later in the DOM
    const nav = document.createElement('nav');
    const nav_form = document.createElement('form');
    nav_form.action = 'next.html';
    const nav_btn = document.createElement('button');
    nav_btn.type = 'submit';
    nav_btn.textContent = 'Next page';
    nav_form.appendChild(nav_btn);
    nav.appendChild(nav_form);

    fixture.appendChild(wrapper);
    fixture.appendChild(nav);

    PageTurner.refetchLinks();

    ok(PageTurner.getState().next_form === nav_form, 'Container form should win even when the outside form comes first in the DOM');
    ok(PageTurner.getState().next_submitter === nav_btn, 'Container button should be the submitter');
});

test('Forms outside pagination containers are used as a fallback', function () {
    // Neutralise existing pagination links
    const anchors = document.querySelectorAll('a');
    for (let i = 0; i < anchors.length; i++) {
        anchors[i].setAttribute('href', '#');
    }

    // Only a "Next" form outside any pagination container exists: the
    // broadened fallback scan should still find it.
    const fixture = document.getElementById('qunit-fixture');
    fixture.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'results';

    const form = document.createElement('form');
    form.action = 'results-next.html';

    const btn = document.createElement('button');
    btn.type = 'submit';
    btn.textContent = 'Next';

    form.appendChild(btn);
    wrapper.appendChild(form);
    fixture.appendChild(wrapper);

    PageTurner.refetchLinks();

    ok(PageTurner.getState().next_form === form, 'Outside form should be found by the fallback scan');
    equal(PageTurner.getIcon(), 'next.png', 'Next icon should be used');
});

test('javascript: links are ignored and real links still found', function () {
    // Neutralise existing pagination links
    const anchors = document.querySelectorAll('a');
    for (let i = 0; i < anchors.length; i++) {
        anchors[i].setAttribute('href', '#');
    }

    const fixture = document.getElementById('qunit-fixture');
    fixture.innerHTML = '';

    // Real link first in DOM, javascript: link after it. The reverse scan
    // hits the javascript: one first and must skip it, not stop on it.
    const good = document.createElement('a');
    good.setAttribute('href', 'real-next.html');
    good.textContent = 'Next';

    const bad = document.createElement('a');
    bad.setAttribute('href', 'javascript:void(0)');
    bad.textContent = 'Next';

    fixture.appendChild(good);
    fixture.appendChild(bad);

    PageTurner.refetchLinks();

    equal(PageTurner.getState().next_link, 'real-next.html', 'javascript: link should be skipped in favour of the real one');
    equal(PageTurner.getState().back_link, '', 'No back link should be found');

    // Only the javascript: link remains: nothing should be detected at all
    fixture.removeChild(good);
    PageTurner.refetchLinks();

    equal(PageTurner.getState().next_link, '', 'javascript: link alone should never be set');
    equal(PageTurner.getIcon(), 'inactive.png', 'Icon should be inactive');
});

test('Oddly-cased names like NeXT are not treated as pagination', function () {
    // Neutralise existing pagination links
    const anchors = document.querySelectorAll('a');
    for (let i = 0; i < anchors.length; i++) {
        anchors[i].setAttribute('href', '#');
    }

    const fixture = document.getElementById('qunit-fixture');
    fixture.innerHTML = '';

    // Real pagination first, a "NeXT" (company name) link after it, like
    // Yahoo's knowledge panel. The reverse scan hits "NeXT" first and
    // must skip it.
    const real = document.createElement('a');
    real.setAttribute('href', 'page2.html');
    real.textContent = 'Next';

    const company = document.createElement('a');
    company.setAttribute('href', 'next-company.html');
    company.textContent = 'NeXT';

    fixture.appendChild(real);
    fixture.appendChild(company);

    PageTurner.refetchLinks();

    equal(PageTurner.getState().next_link, 'page2.html', 'Real Next link should win over the NeXT company link');

    // Only the oddly-cased link remains: nothing should be detected
    fixture.removeChild(real);
    PageTurner.refetchLinks();

    equal(PageTurner.getState().next_link, '', 'NeXT alone should not be detected');

    // Normal casings still work
    company.textContent = 'NEXT';
    PageTurner.refetchLinks();

    equal(PageTurner.getState().next_link, 'next-company.html', 'All-caps NEXT is still valid pagination');
});

test('rel="next"/"prev" links are preferred over the text scan', function () {
    // Neutralise existing pagination links
    const anchors = document.querySelectorAll('a');
    for (let i = 0; i < anchors.length; i++) {
        anchors[i].setAttribute('href', '#');
    }

    const fixture = document.getElementById('qunit-fixture');
    fixture.innerHTML = '';

    // A text match that would normally win...
    const text_link = document.createElement('a');
    text_link.setAttribute('href', 'text-next.html');
    text_link.textContent = 'Next';

    // ...an explicit rel=next elsewhere with unrelated text...
    const rel_link = document.createElement('a');
    rel_link.setAttribute('href', 'rel-next.html');
    rel_link.setAttribute('rel', 'nofollow next');
    rel_link.textContent = 'More results';

    // ...and an explicit <link rel="prev"> element
    const head_link = document.createElement('link');
    head_link.setAttribute('rel', 'prev');
    head_link.setAttribute('href', 'rel-prev.html');

    fixture.appendChild(text_link);
    fixture.appendChild(rel_link);
    fixture.appendChild(head_link);

    PageTurner.refetchLinks();

    equal(PageTurner.getState().next_link, 'rel-next.html', 'rel="next" should beat the text scan');
    equal(PageTurner.getState().back_link, 'rel-prev.html', '<link rel="prev"> should set the back target');
});

test('Multi-line link text still matches (whitespace splitting)', function () {
    // Neutralise existing pagination links
    const anchors = document.querySelectorAll('a');
    for (let i = 0; i < anchors.length; i++) {
        anchors[i].setAttribute('href', '#');
    }

    const fixture = document.getElementById('qunit-fixture');
    fixture.innerHTML = '';

    // Pretty-printed markup puts newlines + indentation inside the label
    const link = document.createElement('a');
    link.setAttribute('href', 'page2.html');
    link.textContent = 'Next\n        page';

    fixture.appendChild(link);
    PageTurner.refetchLinks();

    equal(PageTurner.getState().next_link, 'page2.html', 'Inner whitespace should not defeat the two-word cap');
});

test('Uppercase rel attributes are matched (rel="Next")', function () {
    const anchors = document.querySelectorAll('a');
    for (let i = 0; i < anchors.length; i++) {
        anchors[i].setAttribute('href', '#');
    }

    const fixture = document.getElementById('qunit-fixture');
    fixture.innerHTML = '';

    const rel_link = document.createElement('a');
    rel_link.setAttribute('href', 'rel-next-upper.html');
    rel_link.setAttribute('rel', 'Next');
    rel_link.textContent = 'More results';

    fixture.appendChild(rel_link);
    PageTurner.refetchLinks();

    equal(PageTurner.getState().next_link, 'rel-next-upper.html', 'rel matching should be case-insensitive');
});

test('Oddly-cased button labels are not treated as pagination', function () {
    const anchors = document.querySelectorAll('a');
    for (let i = 0; i < anchors.length; i++) {
        anchors[i].setAttribute('href', '#');
    }

    const fixture = document.getElementById('qunit-fixture');
    fixture.innerHTML = '';

    // A "NeXT" (company name) submit button must not become a pagination target
    const nav = document.createElement('nav');
    const form = document.createElement('form');
    form.action = 'next-company.html';
    const btn = document.createElement('button');
    btn.type = 'submit';
    btn.textContent = 'NeXT';
    form.appendChild(btn);
    nav.appendChild(form);
    fixture.appendChild(nav);

    PageTurner.refetchLinks();

    equal(PageTurner.getState().next_form, null, 'NeXT button should not be stored as a next form');
    equal(PageTurner.getIcon(), 'inactive.png', 'Icon should stay inactive');
});

test('Submitter fallback prefers the button whose label matches the direction', function () {
    const anchors = document.querySelectorAll('a');
    for (let i = 0; i < anchors.length; i++) {
        anchors[i].setAttribute('href', '#');
    }

    const fixture = document.getElementById('qunit-fixture');
    fixture.innerHTML = '';

    // Form matched via its aria-label; contains a Search submit FIRST and
    // the real Next submit later. The Next button must win.
    const nav = document.createElement('nav');
    const form = document.createElement('form');
    form.action = '/search';
    form.setAttribute('aria-label', 'go to page Next');

    const search_btn = document.createElement('button');
    search_btn.type = 'submit';
    search_btn.textContent = 'Search';

    const next_btn = document.createElement('button');
    next_btn.type = 'submit';
    next_btn.setAttribute('formaction', '/page2');
    next_btn.textContent = 'Next';

    form.appendChild(search_btn);
    form.appendChild(next_btn);
    nav.appendChild(form);
    fixture.appendChild(nav);

    PageTurner.refetchLinks();

    ok(PageTurner.getState().next_form === form, 'Next form should be detected');
    ok(PageTurner.getState().next_submitter === next_btn, 'Direction-matching submit button should win over the first one');
});

test('Form matched via aria-label uses its submit button as submitter (Startpage)', function () {
    // Neutralise existing pagination links
    const anchors = document.querySelectorAll('a');
    for (let i = 0; i < anchors.length; i++) {
        anchors[i].setAttribute('href', '#');
    }

    const fixture = document.getElementById('qunit-fixture');
    fixture.innerHTML = '';

    // Startpage-style pagination: the FORM carries aria-label="go to page
    // Next" (so the candidate scan matches the form before its button)
    // and the submit button inside is the real submitter.
    const nav = document.createElement('div');
    nav.className = 'pagination';
    nav.setAttribute('role', 'navigation');

    const form = document.createElement('form');
    form.action = '/sp/search';
    form.method = 'post';
    form.setAttribute('aria-label', 'go to page Next');

    const hidden = document.createElement('input');
    hidden.type = 'hidden';
    hidden.name = 'page';
    hidden.value = '2';

    const btn = document.createElement('button');
    btn.type = 'submit';
    btn.setAttribute('role', 'link');
    btn.textContent = 'Next';

    form.appendChild(hidden);
    form.appendChild(btn);
    nav.appendChild(form);
    fixture.appendChild(nav);

    let submittedWith;
    form.requestSubmit = function (submitter) {
        submittedWith = submitter;
    };

    PageTurner.refetchLinks();

    ok(PageTurner.getState().next_form === form, 'Next form should be detected');
    ok(PageTurner.getState().next_submitter === btn, 'Submitter must be the submit button, not the form');

    // ArrowRight must not throw and must submit with the button
    const ev = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    document.dispatchEvent(ev);

    ok(submittedWith === btn, 'requestSubmit should be called with the submit button');
});

test('Submit inputs are matched by their value label (DuckDuckGo HTML)', function () {
    // Neutralise existing pagination links
    const anchors = document.querySelectorAll('a');
    for (let i = 0; i < anchors.length; i++) {
        anchors[i].setAttribute('href', '#');
    }

    const fixture = document.getElementById('qunit-fixture');
    fixture.innerHTML = '';

    // DuckDuckGo HTML paginates with <input type="submit" value="Next">
    // inside plain divs (no pagination container), so the label lives in the
    // value attribute and only the whole-page fallback scan reaches it.
    function navForm(value) {
        const wrapper = document.createElement('div');
        wrapper.className = 'nav-link';
        const form = document.createElement('form');
        form.action = '/html/';
        form.method = 'post';
        const submit = document.createElement('input');
        submit.type = 'submit';
        submit.value = value;
        const hidden = document.createElement('input');
        hidden.type = 'hidden';
        hidden.name = 'q';
        hidden.value = 'test';
        form.appendChild(submit);
        form.appendChild(hidden);
        wrapper.appendChild(form);
        return { wrapper: wrapper, form: form, submit: submit };
    }

    const prev = navForm('Previous');
    const next = navForm('Next');
    fixture.appendChild(prev.wrapper);
    fixture.appendChild(next.wrapper);

    let submittedWith;
    next.form.requestSubmit = function (submitter) {
        submittedWith = submitter;
    };

    PageTurner.refetchLinks();

    ok(PageTurner.getState().back_form === prev.form, 'Previous form should be detected');
    ok(PageTurner.getState().next_form === next.form, 'Next form should be detected');
    ok(PageTurner.getState().next_submitter === next.submit, 'Submitter must be the submit input');

    // ArrowRight must submit the Next form with its submit input
    const ev = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    document.dispatchEvent(ev);

    ok(submittedWith === next.submit, 'requestSubmit should be called with the submit input');
});

test('Icon-only anchor labelled via aria-label is stored as a link (eBay)', function () {
    // Neutralise existing pagination links
    const anchors = document.querySelectorAll('a');
    for (let i = 0; i < anchors.length; i++) {
        anchors[i].setAttribute('href', '#');
    }

    const fixture = document.getElementById('qunit-fixture');
    fixture.innerHTML = '';

    // eBay-style pagination: an icon-only <a> with no text and no rel="next",
    // labelled only by aria-label, inside a nav.pagination container. The
    // numbered page links carry no pagination words.
    const nav = document.createElement('nav');
    nav.className = 'pagination';
    nav.setAttribute('role', 'navigation');

    const ol = document.createElement('ol');
    for (let p = 1; p <= 3; p++) {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = 'https://example.com/sch?_pgn=' + p;
        a.textContent = String(p);
        li.appendChild(a);
        ol.appendChild(li);
    }
    nav.appendChild(ol);

    // On pages after the first, Previous is the same icon-only, aria-labelled
    // anchor (on page 1 it is a disabled button instead).
    const prev = document.createElement('a');
    prev.href = 'https://example.com/sch?_pgn=1';
    prev.setAttribute('type', 'previous');
    prev.setAttribute('aria-label', 'Go to previous search page');
    prev.innerHTML = '<svg aria-hidden="true"></svg>';
    nav.appendChild(prev);

    const next = document.createElement('a');
    next.href = 'https://example.com/sch?_pgn=3';
    next.setAttribute('type', 'next');
    next.setAttribute('aria-label', 'Go to next search page');
    next.innerHTML = '<svg aria-hidden="true"></svg>';
    nav.appendChild(next);

    fixture.appendChild(nav);

    PageTurner.refetchLinks();

    equal(PageTurner.getState().next_link, 'https://example.com/sch?_pgn=3', 'Next link should come from the aria-labelled anchor');
    equal(PageTurner.getState().back_link, 'https://example.com/sch?_pgn=1', 'Previous link should come from the aria-labelled anchor');
    ok(PageTurner.getState().next_form === null, 'No form fallback should be used for an anchor');
    equal(PageTurner.getIcon(), 'both.png', 'Both-directions icon should be used');
});

