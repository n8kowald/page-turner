(function() {
var back_names = ['back', 'previous', 'prev'],
	next_names = ['next', 'forward'],
	all_words = back_names.concat(next_names),
	back_link = '',
	next_link = '',
	next_page_arrow = '',
	back_page_arrow = '',
	first_run = 0;

// If show arrows preference not set: default to show
chrome.storage.local.get('arrows', function(items) {
	if (items.arrows == undefined) {
		first_run = 1;
		chrome.storage.local.set({'arrows':1}, function(){});
	}
});

// If prerender preference not set: default to use
chrome.storage.local.get('prerender', function(items) {
	if (items.prerender == undefined) {
		first_run = 1;
		chrome.storage.local.set({'prerender':1}, function(){});
	}
});

if (!Array.prototype.inArray) {
	Array.prototype.inArray = function(needle) {
		for (var i = 0; i < this.length; i++) {
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
    // A single hash is not a valid link (requires JavaScript)
	if (link == '#') return false;

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
	if (!chrome.extension) return;
	chrome.extension.sendRequest({icon: icon});
}

function addPrerenderLink(next_link)
{
	var ptpr = document.getElementById('ptpr');
	if (ptpr !== null) {
		ptpr.href = next_link;
	} else {

		// If a prerender link exists: update the href
		var el = document.querySelector('link[rel=prerender]');
		if (el !== null) {
			el.href = next_link;
		} else {

			// No prerender exists: create it
			var l = document.createElement("link");
			l.rel = 'prerender';
			l.href = next_link;
			l.id = 'ptpr';
			document.getElementsByTagName("head")[0].appendChild(l);
		}
	}
}

function showArrows()
{
	chrome.storage.local.get('arrows', function(items) {
		if (next_link !== '') {
			next_page_arrow.className += ' visible';
			if (items.arrows == 1 || first_run == 1) next_page_arrow.style.display = 'block';
		}
		if (back_link !== '') {
			back_page_arrow.className += ' visible';
			if (items.arrows == 1 || first_run == 1) back_page_arrow.style.display = 'block';
		}
	});

}

// Remove arrow divs if not used
function updateArrows()
{
	if (typeof back_page_arrow === 'undefined' ||
        typeof next_page_arrow === 'undefined')
    {
        return;
    }
    if (back_link === '' && back_page_arrow.parentNode !== null) {
        back_page_arrow.parentNode.removeChild(back_page_arrow);
    }
	if (next_link === '' && next_page_arrow.parentNode !== null) {
        next_page_arrow.parentNode.removeChild(next_page_arrow);
    }
}

// Search last links first
function getLinks()
{
	var links = document.links,
		last_link_array_num = links.length - 1;

	// Iterate over the links in reverse order
	for (var i = last_link_array_num; i >= 0; i--) {
		var link_text = links[i].textContent.replace(/[^a-z ]/gi, ' ').trim();
		if (link_text == '') continue;
		var words = link_text.split(' ');

		// Links with more than two words are probably not pagination
		// could even change to one word: requires MOAR testing
		if (words.length > 2) continue;

		// Match on first word
		var word = words[0].toLowerCase();
		if (!all_words.inArray(word)) continue;

		// Found!
		var type = getTypeFromWord(word);

		// Set found links (if not set already)
        // Get unnormalised link values
		var link = links[i].getAttributeNode('href').value;
		if (!linkOfTypeExists(type) && typeof link !== 'undefined') {
			setLink(type, link);
		}

		// If back AND next links found: exit loop, we're done
		if (back_link !== '' && next_link !== '') break;
	}
}

// DOM has loaded
document.addEventListener('DOMContentLoaded', init(), false);

function init()
{
	getLinks();

	// Create arrows
	var df = document.createDocumentFragment(),
		next = document.createElement('div'),
		back = document.createElement('div');

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
	chrome.storage.local.get('prerender', function(items) {
		if (next_link !== '' && (items.prerender == 1 || first_run == 1)) {
			addPrerenderLink(next_link);
		}
	});

	// Show arrows (if preference is to show)
	showArrows();

	// Determine icon
	icon = getIcon();

	// Update extension icon
	updateIcon(icon);

	updateArrows();
}

window.addEventListener('onresize', function() {
	back_page_arrow.style.top = '50%';
	next_page_arrow.style.top = '50%';
}, false);

// Set keyboard shortcuts for back/next links
document.addEventListener('keydown', function(e) {

	// Detect context
    // Don't want left/right keys to work inside a form input
	var element = document.activeElement;

	if (!element instanceof HTMLBodyElement ||
        element.tagName == 'INPUT' ||
        element.tagName == 'SELECT' ||
        element.tagName == 'TEXTAREA' ||
        (element.contentEditable && element.contentEditable == 'true')
    ) {
        return;
    }

	// Left arrow
	if (e.keyCode === 37 && back_link !== '') {
		back_page_arrow.className += ' clicked';
		updateIcon(getClickIcon(icon, 'back'));
		document.location = back_link;
	}

	// Right arrow
	if (e.keyCode === 39 && next_link !== '') {
		next_page_arrow.className += ' clicked';
		updateIcon(getClickIcon(icon, 'next'));
		document.location = next_link;
	}
}, false);

function refetchLinks()
{
	back_link = '';
	next_link = '';
	getLinks();

	// Determine icon
	icon = getIcon();

	// Update extension icon
	updateIcon(icon);
	updateArrows();
}

// Invalidate back/nexts if a Google search changes page results
var google_search = document.querySelector('input[name=q]');
if (google_search) {
	google_search.addEventListener('change', function() {
		// Until I can detect new search result completion, a one second
        // delay before fetching new links works.
		setTimeout(refetchLinks, 1000);
	}, false);
}
})();
