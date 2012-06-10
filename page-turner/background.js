var page_icon = new Array();
chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
        var tab_id = sender.tab.id;
        chrome.browserAction.setIcon({path: 'icons/' + request.icon, tabId: tab_id});
        page_icon[tab_id] = request.icon;
});
chrome.tabs.onActivated.addListener(function(tab) {
    if (typeof page_icon[tab.tabId] != 'undefined') {
        chrome.browserAction.setIcon({path: 'icons/' + page_icon[tab.tabId]});
    }
});
