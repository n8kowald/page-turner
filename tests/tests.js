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

    // Inject a form + Next button into the QUnit fixture
    const fixture = document.getElementById('qunit-fixture');
    fixture.innerHTML = '';

    const form = document.createElement('form');
    form.action = 'next.html';
    form.method = 'get';

    const btn = document.createElement('button');
    btn.type = 'submit';
    btn.setAttribute('role', 'link');
    btn.textContent = 'Next page';

    form.appendChild(btn);
    fixture.appendChild(form);

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

