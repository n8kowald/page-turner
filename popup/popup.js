$(document).ready(function(){
	
	chrome.storage.local.get('arrows', function(items) {
		updateRadios(items.arrows);
	});

	function saveOptions() 
	{
		arrow = ($('#spa_yes').is(':checked')) ? 1 : 0;
		// remove or show arrows immediately
		chrome.tabs.executeScript(null, {file: "content_script.js"});
		chrome.storage.local.set({'arrows':arrow}, function() {});
	}

	function updateRadios(arrow)
	{
		if (arrow == 1 || arrow == 'undefined') {
			$('#spa_yes').attr('checked', 'checked');
		} else {
			$('#spa_no').attr('checked', 'checked');
		}
	}

	$('input').on('click', function() {
		saveOptions();
	});

});
