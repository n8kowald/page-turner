var jQ = jQuery.noConflict();
jQ(document).ready(function() {

    var back_names = new Array('back', 'previous', 'prev'); 
    var next_names = new Array('next', 'forward'); 
    var back_link = '';
    var next_link = '';

    function inArray(needle, haystack) {
        for(var i = 0; i < haystack.length; i++) {
            if (haystack[i] == needle) return true;
        }
        return false;
    }

    // If link starts with #, append this to current url
    function sanitiseLink(link) {
        var cur_url = document.URL;
        if (typeof link != 'undefined' && link.charAt(0) == '#') {
            // strip existing anchors
            if (cur_url.indexOf('#') != -1) {
                var stripped = cur_url.substr(0, cur_url.indexOf('#'));
                link = stripped + link;
            } else {
                link = cur_url + link;
            }
        }
        return link;
    }

    function getIcon() {
        var icon = 'icon-inactive.png';
        if (back_link != '') {
            if (next_link != '') {
                icon = 'icon-both.png';   
            } else {
                icon = 'icon-back.png';    
            }
        } else if (next_link != '') {
            icon = 'icon-next.png';
        }
        return icon;
    }

    function setClickIcon(icon, direction) {
        var click_icon = '';
        if (direction == 'next') {
            if (icon == 'icon-both.png') {
               click_icon = 'icon-both-click-next.png'; 
            } else if (icon == 'icon-next.png') {
                click_icon = 'icon-next-click.png';    
            }
        } else if (direction == 'back') {
            if (icon == 'icon-both.png') {
               click_icon = 'icon-both-click-back.png'; 
            } else if (icon == 'icon-back.png') {
                click_icon = 'icon-back-click.png';    
            }
        }
        return click_icon;
    }


    function getTypeFromWord(word) {
        if (inArray(word, back_names)) {
            return 'back';
        } else if (inArray(word, next_names)) {
            return 'next';   
        }
    }

    function setLink(type, link) {
        if (typeof link != 'undefined' && type == 'back') {
            if (back_link != '') return;
            back_link = sanitiseLink(link);
        } else if (typeof link != 'undefined' && type == 'next') {
            if (next_link != '') return;
            next_link = sanitiseLink(link);
        }
    }

    function linkFound(type) {
        if (type == 'back') {
            return back_link != '';    
        } else if (type == 'next') {
           return next_link != ''; 
        }
    }

    function searchForLinks() {
        // combine back and next words
        var all_words = back_names.concat(next_names); 

        // Search last links first
        jQ(jQ('a').get().reverse()).each(function(){
            var link_text = jQ(this).text();
            link_text = jQ.trim(link_text.replace(/[^a-z ]/i, ''));
            if (link_text == '') return true; // continue
            var words = link_text.split(' ');
            // Links with more than two words are probably not pagination 
            // could even change to one word: requires moar testing
            if (words.length > 2) return true; // continue
            // match on first word
            var word = words[0].toLowerCase();
            if (!inArray(word, all_words)) return true; // continue

            // Found!
            var type = getTypeFromWord(word);
            // Highlight and set found link (if not set already)
            if (!linkFound(type)) {
                jQ(this).css({'background-color':'yellow'});
                setLink(type, jQ(this).attr('href'));
            }

            // if back AND next links found: exit loop, we're done here
            if (back_link != '' && next_link != '') { 
                return false; // break
            }
        });
    }

    // send icon to background.js
    function updateIcon(icon) {
        chrome.extension.sendRequest({icon: icon});
    }

    // find links
    searchForLinks();

    // determine icon
    icon = getIcon();

    // update extension icon
    updateIcon(icon);

    //console.log('Back: ' + back_link);
    //console.log('Next: ' + next_link);

    var click_icon = '';

    // set keyboard shortcuts for back/next links
    jQ(document).keydown(function(e) {
        // left arrow
        if (back_link != '' && e.keyCode == 37) {
            click_icon = setClickIcon(icon, 'back');
            updateIcon(click_icon);
            document.location = back_link;
        }
        // right arrow
        if (next_link != '' && e.keyCode == 39) {
            click_icon = setClickIcon(icon, 'next');
            updateIcon(click_icon);
            document.location = next_link;
        }
    });

});
