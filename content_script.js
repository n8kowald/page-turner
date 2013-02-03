chrome.storage.local.get('arrows', function(items) {
	if (items.arrows == 0) {
		$('.pt_indicator').hide();
	} else {
		$('.pt_indicator.visible').show();
	}
	// Reload prerender if found
	// Next page must be reloaded after a settings change
	if ($('link[rel="prerender"]').length > 0) {
		var pre_href = $('link[rel="prerender"]').attr('href') + '#';
		$('link[rel="prerender"]').attr('href', pre_href);
	}
})
