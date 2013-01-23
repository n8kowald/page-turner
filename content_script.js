chrome.storage.local.get('arrows', function(items) {
	if (items.arrows == 0) {
		$('.pt_indicator').hide();
	} else {
		$('.pt_indicator').show();
	}
})
