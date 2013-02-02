(function($) {

$(document).ready(function() {

	var back_names = ['back', 'previous', 'prev'],
	next_names = ['next', 'forward'],
	back_link = '',
	next_link = '',
	first_run = 0;

	// If show arrows preference not set: default to show
	chrome.storage.local.get('arrows', function(items) {
		if (items.arrows == undefined) {
			first_run = 1;
			chrome.storage.local.set({'arrows':1}, function(){});
		}
	});

	// Create arrows
	$('<div/>', { id: 'pt_next_page', class: 'pt_indicator' }).html('>').appendTo('body');	
	$('<div/>', { id: 'pt_back_page', class: 'pt_indicator' }).html('<').appendTo('body');	

	if (!Array.prototype.inArray) {
		Array.prototype.inArray = function(needle) {
			for(var i = 0; i < this.length; i++) {
				if (this[i] == needle) return true;
			}
			return false;
		}
	}

	function getIcon() 
	{
		var icon = 'icon-inactive.png';

		if (back_link !== '' && next_link !== '') {
			icon = 'icon-both.png';
		} else if (back_link !== '' && next_link == '') {
			icon = 'icon-back.png';
		} else if (back_link == '' && next_link !== '') {
			icon = 'icon-next.png';
		}

		return icon;
	}

	function setClickIcon(icon, direction) 
	{
		var click_icon = '';

		if (direction == 'next' && icon == 'icon-both.png') {
			click_icon = 'icon-both-click-next.png';
		} else if (direction == 'next' && icon == 'icon-next.png') {
			click_icon = 'icon-next-click.png';
		} else if (direction == 'back' && icon == 'icon-both.png') {
			click_icon = 'icon-both-click-back.png';
		} else if (direction == 'back' && icon == 'icon-back.png') {
			click_icon = 'icon-back-click.png';
		}	

		return click_icon;
	}

	function getTypeFromWord(word) 
	{
		if (back_names.inArray(word)) {
			return 'back';
		} else if (next_names.inArray(word)) {
			return 'next';
		}
	}

	// If link starts with #, append this to current url
	function sanitiseLink(link) 
	{
		var cur_url = document.URL;
		if (typeof link !== 'undefined' && link.charAt(0) == '#') {
			// strip existing anchors
			if (cur_url.indexOf('#') != -1) {
				link = cur_url.substr(0, cur_url.indexOf('#')) + link;
			} else {
				link = cur_url + link;
			}
		}

		return link;
	}

	function setLink(type, link) 
	{
		if (link == '#') return; // A single hash is not a valid link (requires JavaScript)
		if (typeof link !== 'undefined' && type == 'back') {
			if (back_link !== '') return;
			back_link = sanitiseLink(link);
		} else if (typeof link !== 'undefined' && type == 'next') {
			if (next_link !== '') return;
			next_link = sanitiseLink(link);
		}
	}

	function linkTypeExists(type) 
	{
		if (type == 'back') {
			return back_link !== '';
		} else if (type == 'next') {
			return next_link !== '';
		}
	}

	function searchForLinks() 
	{
		// combine back and next words
		var all_words = back_names.concat(next_names);

		// Search last links first
		$($('a').get().reverse()).each(function() {
			var link_text = $(this).text();
			link_text = $.trim(link_text.replace(/[^a-z ]/i, ''));
			if (link_text == '') return true; // continue
			var words = link_text.split(' ');
			// Links with more than two words are probably not pagination
			// could even change to one word: requires moar testing
			if (words.length > 2) return true; // continue
			// match on first word
			var word = words[0].toLowerCase();
			if (!all_words.inArray(word)) return true; // continue

			// Found!
			var type = getTypeFromWord(word);
			// Set found links (if not set already)
			if (!linkTypeExists(type)) {
				var link = $(this).attr('href');
				if (typeof link !== 'undefined') {
					setLink(type, link);
				}
			}

			// if back AND next links found: exit loop, we're done here
			if (back_link !== '' && next_link !== '') {
				// Add the prerender link to the page.
				// This speeds up page-turning by preloading the next page.
				if (next_link !== '') addPrerenderLink(next_link);
				return false; // break
			}
		});

	}

	function addPrerenderLink(next_link)
	{
		$("<link />", {
			rel: "prerender",
			href: next_link
		}).appendTo('head');
	}

	function showArrows()
	{
		chrome.storage.local.get('arrows', function(items) {
			if (next_link !== '') {
				$('#pt_next_page').addClass('visible');
				if (items.arrows == 1 || first_run == 1) $('#pt_next_page').fadeIn();
			}
			if (back_link !== '') {
				$('#pt_back_page').addClass('visible');
				if (items.arrows == 1 || first_run == 1) $('#pt_back_page').fadeIn();
			}
		});

	}

	$(window).resize(function(){ 
		$('#pt_back_page').css({'top':'50%'});
		$('#pt_next_page').css({'top':'50%'});
	})

	// send icon to background.js
	function updateIcon(icon) 
	{
		chrome.extension.sendRequest({icon: icon});
	}

	// find links
	searchForLinks();

	// determine icon
	icon = getIcon();

	// update extension icon
	updateIcon(icon);

	// Show arrows (if preference is to show)
	showArrows();

	//console.log('Back: ' + back_link);
	//console.log('Next: ' + next_link);

	var click_icon = '';

	// set keyboard shortcuts for back/next links
	$(document).keydown(function(e) {

		// Detect context. Don't want left/right keys to work if we're inside a form input
		var element = document.activeElement;
		if (!element instanceof HTMLBodyElement || element.tagName == 'INPUT' || element.tagName == 'SELECT' || element.tagName == 'TEXTAREA' || (element.contentEditable && element.contentEditable == 'true')) return;

		// left arrow
		if (back_link !== '' && e.keyCode == 37) {
			$('#pt_back_page').addClass('clicked');
			click_icon = setClickIcon(icon, 'back');
			updateIcon(click_icon);
			document.location = back_link;
		}
		// right arrow
		if (next_link !== '' && e.keyCode == 39) {
			$('#pt_next_page').addClass('clicked');
			click_icon = setClickIcon(icon, 'next');
			updateIcon(click_icon);
			document.location = next_link;
		}

	});

});

})(jQuery);
