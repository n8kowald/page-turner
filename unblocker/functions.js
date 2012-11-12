var jQ = jQuery.noConflict();
jQ(document).ready(function() {

    var page_url = document.URL;
    if (page_url.indexOf('http://172.16.200.14:15871/cgi-bin/') != -1) {
        var block_url = jQ('iframe[name="ws_blockoption"]').contents().find('#URL').val();
        if (block_url != undefined) {
            var load_url = 'http://www.nathankowald.com/showme/' + block_url;
            window.location = load_url;
        }
    }

});
