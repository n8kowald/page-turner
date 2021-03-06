var page_icon = [];
chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
	// Don't change extension icon when pages are prerendered
	if (sender.tab.active === true) {
		chrome.browserAction.setIcon({path: 'icons/' + request.icon});
	}
	// Save icon state for prerendered requests
	page_icon[sender.tab.id] = request.icon;
});
chrome.tabs.onActivated.addListener(function(tab) {
	if (typeof page_icon[tab.tabId] !== 'undefined') {
		chrome.browserAction.setIcon({path: 'icons/' + page_icon[tab.tabId]});
	} else {
		chrome.browserAction.setIcon({path: 'icons/inactive.png'});
	}
});
// Avoid storing icon data for closed tabs
chrome.tabs.onRemoved.addListener(function(tab){
	delete page_icon[tab.tabId];
});
