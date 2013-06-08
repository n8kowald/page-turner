test('Search bottom to top', function(){
	equal(next_link, 'next.html', 'expects next_link to be next.html');
	equal(back_link, 'back.html', 'expects back_link to be back.html');
});

test('Should not overwrite keydown events bound to document', function() {
	var num_args = document.onkeydown.length;
	equal(num_args, 5, 'should have five arguments if not overwritten');
});

test('Should not overwrite onresize event bound to window', function() {
	var num_args = window.onresize.length;
	equal(num_args, 6, 'should have five arguments if not overwritten');
});

test('arrow dom node insertions', function() {
	var next = document.getElementById('pt_next_page');
	ok(next, true, 'Next div should exist');
	var back = document.getElementById('pt_back_page');
	ok(back, true, 'Next div should exist');
});

// Test page contains two found links by default
test('Correct icons', function() {
	var icon = getIcon();
	equal(icon, 'both.png', 'Both icon should be used');

	// Remove back link
	back_link = '';
	icon = getIcon();
	equal(icon, 'next.png', 'Next icon should be used');

	// Remove next link
	next_link = '';
	icon = getIcon();
	equal(icon, 'inactive.png', 'Inactive icon should be used');

	// Restore back/next links
	next_link = 'next.html';
	back_link = 'back.html';
});

test('getTypeFromWord tests', function() {
	var word = 'back';
	equal(getTypeFromWord(word), 'back', 'Should detect back');
	word = 'previous';
	equal(getTypeFromWord(word), 'back', 'Should detect back');
	word = 'prev';
	equal(getTypeFromWord(word), 'back', 'Should detect back');
	word = 'next';
	equal(getTypeFromWord(word), 'next', 'Should detect next');
	word = 'forward';
	equal(getTypeFromWord(word), 'next', 'Should detect next');
});

// Change links - test that
test('Refetching links should update link values, icon and arrows', function() {
	// First delete all back links to simulate only finding next links
	var back_lis = document.querySelectorAll('li.back');
	for (i=0; i<back_lis.length; i++) {
		back_lis[i].firstChild.href='#';
	}
	refetchLinks();
	icon = getIcon();
	equal(back_link, '', 'Back link should be blank');
	equal(icon, 'next.png', 'Next icon should be used');

	var back_arrow = document.getElementById('pt_back_page');
	equal(back_arrow, null, 'Back arrow DOM node should no longer exist');
});
