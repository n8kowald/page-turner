var jQ = jQuery.noConflict();
jQ(document).ready(function() {

    // Stops document.write in js ajax calls from breaking websites
    // solution by altCognito - http://stackoverflow.com/a/761190
    var no_write = '';
    jQ(function() {
        document.write = function(evil) {
            no_write += evil;
        }
        jQ('body').append(no_write);
    });
    
    // KB shortcut mappings
    var mappings = Array();

    mappings[8] = 'Backspace';
    mappings[9] = 'Tab';
    //mappings[13] = 'Enter'; // Too common
    mappings[16] = 'Shift';
    mappings[17] = 'Ctrl';
    mappings[18] = 'Alt';
    mappings[19] = 'Pause/Break';
    mappings[20] = 'Caps Lock';
    //mappings[27] = 'Esc';
    mappings[32] = 'Spacebar';
    mappings[33] = 'Page Up';
    mappings[34] = 'Page Down';
    mappings[35] = 'End';
    mappings[36] = 'Home';
    mappings[37] = "&larr;";
    mappings[38] = "&uarr;";
    mappings[39] = "&rarr;";
    mappings[40] = "&darr;";
    mappings[45] = "Insert";
    mappings[46] = "Delete";
    mappings[48] = "0";
    mappings[49] = "1";
    mappings[50] = "2";
    mappings[51] = "3";
    mappings[52] = "4";
    mappings[53] = "5";
    mappings[54] = "6";
    mappings[55] = "7";
    mappings[56] = "8";
    mappings[57] = "9";
    mappings[63] = "?";
    mappings[65] = "a";
    mappings[66] = "b";
    mappings[67] = "c";
    mappings[68] = "d";
    mappings[69] = "e";
    mappings[70] = "f";
    mappings[71] = "g";
    mappings[72] = "h";
    mappings[73] = "i";
    mappings[74] = "j";
    mappings[75] = "k";
    mappings[76] = "l";
    mappings[77] = "m";
    mappings[78] = "n";
    mappings[79] = "o";
    mappings[80] = "p";
    mappings[81] = "q";
    mappings[82] = "r";
    mappings[83] = "s";
    mappings[84] = "t";
    mappings[85] = "u";
    mappings[86] = "v";
    mappings[87] = "w";
    mappings[88] = "x";
    mappings[89] = "y";
    mappings[90] = "z";
    mappings[91] = "Windows/Command";
    mappings[93] = "Right Click";
    mappings[106] = "*";
    mappings[107] = "+";
    mappings[109] = "-";
    mappings[110] = ".";
    mappings[111] = "&#47;";
    mappings[188] = ",";
    mappings[191] = "&#47;";
    mappings[220] = "&#92;";
    // Another way of setting keyboard shortcuts
    mappings['KEY_LEFT'] = "&larr;";
    mappings['KEY_RIGHT'] = "&rarr;";
    mappings['KEY_UP'] = "&uarr;";
    mappings['KEY_DOWN'] = "&darr;";
    mappings['KEY_TAB'] = "Tab";
    mappings['KEY_DELETE'] = "Delete";
    //mappings['KEY_RETURN'] = "&darr;";
    //mappings['KEY_ESC'] = "&darr;";
    

    // Found shortcuts
    var ks_available = '';

    // Found keyCodes
    var keycodes = Array();


    function sortNumbers(one, two) {
        return (one - two);
    }

    function inArray(needle, haystack) {
        var length = haystack.length;
        for(var i = 0; i < length; i++) {
            if (haystack[i] == needle) return true;
        }
        return false;
    }

    
    function findShortcuts(source) {

        var regex = /keyCode.?={1,3}.?\d{2}|KEY_[A-Z]+/gi;
        var found = source.match(regex);
        var code = '';

        if (found == null) { return false; }

        for(var s=0; s < found.length; s++) {

            if (found[s].search(/KEY_/i) >= 0) {
                code = found[s].toUpperCase();
                if (!inArray(code, keycodes)) keycodes[s] = found[s].toUpperCase();
            } else {
                // If numeric keyCode: strip everything but numbers so only the keyCode remains.
                code = found[s].replace(/[^0-9.]/g, "");
                if (!inArray(code, keycodes)) keycodes[s] = code;
            }

        }

    }

    // Search inline JavaScript for keyCodes
    var refs = jQ('script:contains("keyCode")');

    // If keyCode found
    if (jQ(refs).length) {
        var refs_html = jQ(refs).text();
        findShortcuts(refs_html);
    }


    // Look for keyCodes inside external .js files
    var scripts = jQ('script[src*="js"]');
    var ext_js_urls = Array();
    var site_domain = location.protocol + '//' + location.hostname;
    var host = location.hostname;
    var site_keyword = '';

    var parts = host.split('.');
    if (parts.length > 0) {
        // If www. present then site_keyword = parts[1]
        if (host.indexOf('www.') >= 0) {
            site_keyword = parts[1];
        } else {
            site_keyword = parts[0];
        }
    }

    var b = 0;
    jQ.each(scripts, function(index, value) {

        js_src = jQ(value).attr('src');
        // Strip everything after .js - sometimes site_keyword may be passed as a param in the query string. No.
        js_src = js_src.substring(0, js_src.indexOf('.js') + 3);

        // If src url contains the words: jquery, prototype, scriptaculous: continue. Don't want them.
        var ignores = Array('jquery', 'prototype', 'scriptaculous');
        for (w=0; w < ignores.length; w++) {
            if (js_src.toLowerCase().indexOf(ignores[w]) >= 0) {
                return true;     
            }
        }

        // If .js contains: 
        //  - site_domain
        //  - starts from root (/) but not (//)
        //  - contains site keyword and starts with http 
        // add it to ext_js_urls array
        // Don't waste time with .js files that won't contain our precious keyCodes
        if ((js_src.indexOf(site_domain) >= 0) || 
        (js_src.charAt(0) == '/' && js_src.charAt(1) != '/') || 
        (js_src.indexOf(site_keyword) >= 0 && js_src.indexOf('http') >= 0)) {

            if (!inArray(js_src, ext_js_urls)) {
                ext_js_urls[b] = js_src;
                b++;
            }
        }
    });

    if (ext_js_urls.length > 0) {

        // After ajax calls have completed: show shortcuts
        jQ('body').ajaxStop(function() {
            showShortcuts();
        });

        for(i=0; i < ext_js_urls.length; i++) {

            jQ.ajax({
                dataType: 'text',
                url: ext_js_urls[i],
                success: function(data) {
                    // Prototype contains keyCode decs so ignore
                    // Prototype scripts usually start with var Prototype so this indexOf should be fast
                    if (data.indexOf('var Prototype') == -1 && data.indexOf('keyCode') >= 0) {
                        // Look for kb shortcuts
                        findShortcuts(data);
                    }
                }
                /*,
                error: function (xhr, ajaxOptions, thrownError){
                    console.log(xhr.status);
                    console.log(thrownError);
                } 
                */
            });

        }

    } else {
        // No external .js files
        showShortcuts();
    }

    function get_hostname(url) {
        var m = ((url||'')+'').match(/^http:\/\/[^/]+/);
        return m ? m[0] : null;
    }

    // Shows keyboard shortcuts if found
    function showShortcuts() {

        keycodes.sort();

        for(var c=0; c < keycodes.length; c++) {

            var keycode_val = keycodes[c]; 
            var mapping_val = mappings[keycode_val];

            if (mapping_val !== undefined && ks_available.indexOf(mapping_val) == -1) {
                if (ks_available != '' && c < keycodes.length) {
                    ks_available += ', '; 
                }
                ks_available += mapping_val;
            }

        }

        if (ks_available != '') {

            // Add website URL
            var url = jQ(location).attr('href');
            url = get_hostname(url).replace('http://','');

            // decode html entitites 
            var shortcuts = jQ("<div/>").html(ks_available).text();
            chrome.extension.sendRequest({msg: shortcuts, url: url});

        }
    }

});
