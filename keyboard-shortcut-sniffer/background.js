chrome.extension.onRequest.addListener(
    function(request, sender, sendResponse) {

        var notification = window.webkitNotifications.createNotification(
            'icon32.png', // The image.
            'Shortcuts found - ' + request.url, // The title.
             request.msg // The body.
        );
        notification.show();

        setTimeout(function(){ notification.cancel(); },5000);
    }
);
