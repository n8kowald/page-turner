$(document).ready(function() {

    /*
    // TODO Get urls of external .js files
    var req = new XMLHttpRequest();
    req.open(
        "GET",
        url, 
        true);
    req.send(null);
    */

    /*
    function detectOS() {
        var OS = "";
        if (navigator.appVersion.indexOf("Win") != -1) OS = "Windows";
        if (navigator.appVersion.indexOf("Mac") != -1) OS = "MacOS";
        if (navigator.appVersion.indexOf("X11") != -1) OS = "UNIX";
        if (navigator.appVersion.indexOf("Linux") != -1) OS = "Linux";

        return OS;
    }
    */

    // Search inline JavaScript for keyCodes
    var refs = $('script:contains("keyCode")');

    // If keyCode found in code
    if ($(refs).length) {

        // Get <script> code as html to regex
        var refs_html = $(refs).html();

        var regex = /keyCode.?={1,3}.?\d{2}|KEY_LEFT|KEY_RIGHT/gi;

        var keycodes = Array(); // found keyCodes
        $.each(refs_html.match(regex), function(index, value) {
            if (value.search(/KEY_/) == -1) {
                // If numeric keyCode: strip everything but numbers so only the keyCode remains.
                keycodes[index] = value.replace(/[^0-9.]/g, "");
            } else {
                keycodes[index] = value;
            }
        });

        function sortNumbers(one, two) {
            return (one - two);
        }

        // Sort char codes array by key
        keycodes.sort(sortNumbers);

        var mappings = Array();
        // Long list of supported KB shortcut mappings
        mappings[8] = 'Backspace';
        mappings[9] = 'Tab';
        mappings[13] = 'Enter';
        mappings[16] = 'Shift';
        mappings[17] = 'Ctrl';
        mappings[18] = 'Alt';
        mappings[19] = 'Pause/Break';
        mappings[20] = 'Caps Lock';
        mappings[27] = 'Esc';
        mappings[33] = 'Page Up';
        mappings[34] = 'Page Down';
        mappings[35] = 'End';
        mappings[36] = 'Home';
        mappings[37] = "&larr;";
        mappings[38] = "&uarr;";
        mappings[39] = "&rarr;";
        mappings[40] = "&darr;";
        // Numbers
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
        // Alphabet
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
        // Another way of specifying left/right arrow - used by last.fm
        mappings['KEY_LEFT'] = "&larr;";
        mappings['KEY_RIGHT'] = "&rarr;";
        
        var ks_available = '';

        $.each(keycodes, function(index, value) {
           if (index > 0) {
               ks_available += ','; 
           }
           ks_available += (mappings[value] !== undefined) ? ' ' + mappings[value] : '';
        });

        $('<div />').html('Keyboard shortcuts found: <span>' + ks_available + '</span>').addClass('modal').appendTo('body');

    } else {
        // No KB shortcuts found: do nothing
    }

});
