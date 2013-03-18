(function($) {

	var back_names = ['back', 'previous', 'prev'],
		next_names = ['next', 'forward'],
		all_words = back_names.concat(next_names),
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
		var icon = 'inactive.png';

		if (back_link !== '' && next_link !== '') {
			icon = 'both.png';
		} else if (back_link !== '' && next_link == '') {
			icon = 'back.png';
		} else if (back_link == '' && next_link !== '') {
			icon = 'next.png';
		}

		return icon;
	}

	function getClickIcon(icon, direction) 
	{
		var click_icon = '';

		if (direction == 'next' && icon == 'both.png') {
			click_icon = 'both-c-next.png';
		} else if (direction == 'next' && icon == 'next.png') {
			click_icon = 'next-c.png';
		} else if (direction == 'back' && icon == 'both.png') {
			click_icon = 'both-c-back.png';
		} else if (direction == 'back' && icon == 'back.png') {
			click_icon = 'back-c.png';
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
		if (link.charAt(0) == '#') {
			// strip existing anchors
			if (document.URL.indexOf('#') !== -1) {
				link = document.URL.substr(0, document.URL.indexOf('#')) + link;
			} else {
				link = document.URL + link;
			}
		}

		return link;
	}

	function setLink(type, link) 
	{
		if (link == '#') return false; // A single hash is not a valid link (requires JavaScript)
		if (type == 'back') {
			back_link = sanitiseLink(link);
		} else if (type == 'next') {
			next_link = sanitiseLink(link);
		}
	}

	function linkOfTypeExists(type) 
	{
		if (type == 'back') {
			return back_link !== '';
		} else if (type == 'next') {
			return next_link !== '';
		}
	}

	// send icon to background.js
	function updateIcon(icon) 
	{
		chrome.extension.sendRequest({icon: icon});
	}

	$(document).ready(function() {

		// Create arrows
		$('<div class="pt_indicator" id="pt_next_page"/>').html('&nbsp;').appendTo(document.body);
		$('<div class="pt_indicator" id="pt_back_page"/>').html('&nbsp;').appendTo(document.body);
		//$('<div/>', { 'id': 'pt_next_page', 'class': 'pt_indicator' }).html('&nbsp;').appendTo('body');	
		//$('<div/>', { 'id': 'pt_back_page', 'class': 'pt_indicator' }).html('&nbsp;').appendTo('body');	

		// Cache arrow elements
		var next_page_arrow = $('#pt_next_page');
		var back_page_arrow = $('#pt_back_page');

		/*
		function addPrerenderLink(next_link)
		{
			$('<link />', { 'rel': 'prerender', 'href': next_link }).appendTo('head');
		}
		*/

		function showArrows()
		{
			chrome.storage.local.get('arrows', function(items) {
				if (next_link !== '') {
					next_page_arrow.addClass('visible');
					if (items.arrows == 1 || first_run == 1) next_page_arrow.fadeIn();
				}
				if (back_link !== '') {
					back_page_arrow.addClass('visible');
					if (items.arrows == 1 || first_run == 1) back_page_arrow.fadeIn();
				}
			});

		}

		// Search last links first
		var links = document.links,
			last_link_array_num = links.length - 1;

		// Iterate over the links in reverse order
		for (i=last_link_array_num; i >= 0; i--) {
			var a = links[i];
			var link_text = a.textContent.replace(/[^a-z ]/gi, ' ').trim();
			if (link_text == '') continue;
			var words = link_text.split(' ');
			// Links with more than two words are probably not pagination
			// could even change to one word: requires MOAR testing
			if (words.length > 2) continue;
			// match on first word
			var word = words[0].toLowerCase();
			if (!all_words.inArray(word)) continue;

			// Found!
			var type = getTypeFromWord(word);
			// Set found links (if not set already)
			var link = a.href;
			if (!linkOfTypeExists(type) && typeof link !== 'undefined') {
				setLink(type, link);
			}

			// if back AND next links found: exit loop, we're done here
			if (back_link !== '' && next_link !== '') break;
		}

		// Show arrows (if preference is to show)
		showArrows();

		// Prerendering speeds up page-turning by preloading the next page
		//if (next_link !== '') addPrerenderLink(next_link);

		// determine icon
		icon = getIcon();

		// update extension icon
		updateIcon(icon);

		// Remove arrow divs if not used
		if (back_link === '') back_page_arrow.remove();
		if (next_link === '') next_page_arrow.remove();

		//console.log('Back: ' + back_link);
		//console.log('Next: ' + next_link);

		$(window).on('resize', function() { 
			back_page_arrow.css({'top':'50%'});
			next_page_arrow.css({'top':'50%'});
		});

		// set keyboard shortcuts for back/next links
		$(document).on('keydown', function(e) {

			// Detect context. Don't want left/right keys to work if we're inside a form input
			var element = document.activeElement;
			if (!element instanceof HTMLBodyElement || element.tagName == 'INPUT' || element.tagName == 'SELECT' || element.tagName == 'TEXTAREA' || (element.contentEditable && element.contentEditable == 'true')) return;

			// left arrow
			if (e.keyCode == 37 && back_link !== '') {
				back_page_arrow.addClass('clicked');
				updateIcon(getClickIcon(icon, 'back'));
				document.location = back_link;
			}
			// right arrow
			if (e.keyCode == 39 && next_link !== '') {
				next_page_arrow.addClass('clicked');
				updateIcon(getClickIcon(icon, 'next'));
				document.location = next_link;
			}

		});

	});

})(jQuery);
