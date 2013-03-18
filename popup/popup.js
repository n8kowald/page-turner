(function() {

	document.addEventListener('DOMContentLoaded', function() {

		var spa_yes = document.getElementById('spa_yes'),
			spa_no = document.getElementById('spa_no');

		chrome.storage.local.get('arrows', function(items) {
			updateRadios(items.arrows);
		});

		function saveOptions() 
		{
			var arrow_pref = (spa_yes.checked) ? 1 : 0;
			// remove or show arrows immediately
			chrome.tabs.executeScript(null, {file: "content_script.js"});
			chrome.storage.local.set({'arrows':arrow_pref}, function() {});
		}

		function updateRadios(arrow)
		{
			if (arrow == 1 || arrow == undefined) {
				spa_yes.checked = true;
			} else {
				spa_no.checked = true;
			}
		}

		spa_yes.onclick = function() {
			saveOptions();
		}
		spa_no.onclick = function() {
			saveOptions();
		}

	});

})();
