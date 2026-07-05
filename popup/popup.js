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

(function() {

	document.addEventListener('DOMContentLoaded', function() {

		var arrows_toggle = document.getElementById('arrows_toggle'),
			prerender_toggle = document.getElementById('prerender_toggle');

		// Grey out the prerender option in browsers that don't support the
		// Speculation Rules API (e.g. Brave and Firefox disable it)
		var prerender_supported = typeof HTMLScriptElement.supports === 'function' &&
			HTMLScriptElement.supports('speculationrules');
		if (!prerender_supported) {
			prerender_toggle.disabled = true;
			setToggle(prerender_toggle, false);
			document.getElementById('prerender_row').classList.add('unsupported');
			document.getElementById('pr_unsupported').hidden = false;
			document.getElementById('pr_info').hidden = true;
		}

		// Unset preferences default to on (1) - page-turner.js encodes the
		// same rule (and persists the defaults); keep them in sync.
		chrome.storage.local.get(['arrows', 'prerender'], function(items) {
			items = items || {};
			setToggle(arrows_toggle, items.arrows == 1 || items.arrows == undefined);
			if (prerender_supported) {
				setToggle(prerender_toggle, items.prerender == 1 || items.prerender == undefined);
			}
		});

		function setToggle(button, on)
		{
			button.setAttribute('aria-pressed', on ? 'true' : 'false');
		}

		function toggleIsOn(button)
		{
			return button.getAttribute('aria-pressed') === 'true';
		}

		// page-turner.js listens for storage changes and applies the new
		// preference to open tabs immediately
		arrows_toggle.onclick = function() {
			setToggle(arrows_toggle, !toggleIsOn(arrows_toggle));
			chrome.storage.local.set({'arrows': toggleIsOn(arrows_toggle) ? 1 : 0}, function() {});
		}

		prerender_toggle.onclick = function() {
			setToggle(prerender_toggle, !toggleIsOn(prerender_toggle));
			chrome.storage.local.set({'prerender': toggleIsOn(prerender_toggle) ? 1 : 0}, function() {});
		}

	});

})();
