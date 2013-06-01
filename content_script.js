chrome.storage.local.get('arrows', function(items) {
	var back_arrow = document.getElementById('pt_back_page'),
		next_arrow = document.getElementById('pt_next_page');

	if (items.arrows == 0) {
		if (back_arrow !== null) back_arrow.style.display = 'none';
		if (next_arrow !== null) next_arrow.style.display = 'none';
	} else {
		if (back_arrow !== null && back_arrow.classList.contains('visible')) {
			back_arrow.style.display = 'block';
		}
		if (next_arrow !== null && next_arrow.classList.contains('visible')) {
			next_arrow.style.display = 'block';
		}
	}
	// Reload prerender if found
	// Next page must be reloaded after a settings change
	var pre_link = document.getElementById('ptpr');
	if (pre_link !== null) {
		var pre_href = pre_link.getAttributeNode('href').nodeValue;
		if (pre_href.slice(-1) !== '#') pre_href += '#';
		pre_link.href = pre_href;
	}
});

// TODO add or delete prerender link on settings change
/*
chrome.storage.local.get('prerender', function(items) {
	// Prerender links exist already?
	var pre_link = document.getElementById('ptpr');
	// If we're turning prerendering on: add the prerender link
	if (items.prerender == 1) {
	} else {
	}
});
*/
