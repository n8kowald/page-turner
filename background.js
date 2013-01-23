var page_icon = new Array();
chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
	chrome.browserAction.setIcon({path: 'icons/' + request.icon});
	page_icon[sender.tab.id] = request.icon;
});
chrome.tabs.onActivated.addListener(function(tab) {
	if (typeof page_icon[tab.tabId] !== 'undefined') {
		chrome.browserAction.setIcon({path: 'icons/' + page_icon[tab.tabId]});
	} else {
		chrome.browserAction.setIcon({path: 'icons/icon-inactive.png'});
	}
});
function hideArrows() {
	document.getElementById('pt_next_page').display='none';
	document.getElementById('pt_back_page').display='none';
}
