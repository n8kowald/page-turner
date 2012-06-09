var jQ = jQuery.noConflict();
jQ(document).ready(function() {

    var back_names = new Array('back', 'previous', 'prev'); 
    var next_names = new Array('next', 'forward'); 
    var back_link = '';
    var next_link = '';

    // If link starts with #, append this to current url
    function sanitise_link(link) {
        var cur_url = document.URL;
        if (link.charAt(0) == '#') {
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

    function setIcon() {
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

    function search_for_links(type) {
        if (type == 'back') {
           names = back_names; 
        } else if (type == 'next') {
           names = next_names; 
        }
        // Search last links first
        jQ(jQ('a').get().reverse()).each(function(){
            var link_text = jQ(this).text();
            link_text = jQ.trim(link_text.replace(/[^a-z ]/i, ''));
            // only use first word
            var word = link_text.split(' ')[0];
            for (i=0; i < names.length; i++) {
                var regex = new RegExp('^' + names[i] + '$', 'i');
                if (word.match(regex)) {
                    jQ(this).css('border', '2px solid red');
                    jQ(this).css('background-color', 'yellow');
                    // we've found: exit
                    if (type == 'back') {
                        back_link = sanitise_link(jQ(this).attr('href'));
                    } else if (type == 'next') {
                        next_link = sanitise_link(jQ(this).attr('href'));
                    }
                    return false;
                }
            }
        });
    }

    // send icon to background.js
    function updateIcon(icon) {
        chrome.extension.sendRequest({icon: icon});
    }

    search_for_links('back');
    search_for_links('next');

    icon = setIcon();
    updateIcon(icon);

    //console.log('Back: ' + back_link);
    //console.log('Next: ' + next_link);

    jQ(document).keydown(function(e) {

        if (back_link != '') {
            if(e.keyCode == 37) {
                var click_icon = setClickIcon(icon, 'back');
                updateIcon(click_icon);
                document.location = back_link;
            }
        }

        if (next_link != '') {
            if (e.keyCode == 39) {
                var click_icon = setClickIcon(icon, 'next');
                updateIcon(click_icon);
                document.location = next_link;
            }	   
        }

	});

});
