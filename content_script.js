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
})
