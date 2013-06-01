(function() {

	document.addEventListener('DOMContentLoaded', function() {

		var spa_yes = document.getElementById('spa_yes'),
			spa_no = document.getElementById('spa_no'),
			pr_yes = document.getElementById('pr_yes'),
			pr_no = document.getElementById('pr_no');

		chrome.storage.local.get('arrows', function(items) {
			updateArrowRadios(items.arrows);
		});
		chrome.storage.local.get('prerender', function(items) {
			updatePrerenderRadios(items.prerender);
		});

		function saveOptions() 
		{
			var arrow_pref = (spa_yes.checked) ? 1 : 0,
				prerender_pref = (pr_yes.checked) ? 1 : 0;
			// remove or show arrows immediately
			chrome.tabs.executeScript(null, {file: "content_script.js"});
			chrome.storage.local.set({
				'arrows':arrow_pref, 
				'prerender':prerender_pref
			}, function() {});
		}

		function updateArrowRadios(arrow)
		{
			if (arrow == 1 || arrow == undefined) {
				spa_yes.checked = true;
			} else {
				spa_no.checked = true;
			}
		}

		function updatePrerenderRadios(prerender)
		{
			if (prerender == 1 || prerender == undefined) {
				pr_yes.checked = true;
			} else {
				pr_no.checked = true;
			}
		}

		spa_yes.onclick = function() { saveOptions(); }
		spa_no.onclick = function() { saveOptions(); }
		pr_yes.onclick = function() { saveOptions(); }
		pr_no.onclick = function() { saveOptions(); }

	});

})();
