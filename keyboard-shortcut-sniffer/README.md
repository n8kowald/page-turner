# Keyboard Shortcut Sniffer

This extension looks for keyboard shortcuts in websites (found via `keyCode` declarations in JavaScript).  
If found it displays the shortcut keys available.

## Installation
1 Enable 'Developer Mode' in Chrome: 'Preferences > Extensions'.  
2 Download all files into a folder on your computer.   
3 In 'Preferences > Extensions' choose 'Load unpacked extension...', then browse to the folder you saved these files in.  

### Demo
[Flickr](http://www.flickr.com/photos/n8kowald/4174429513/in/set-72157600584323944/)  
[Last.fm](http://www.last.fm/music/Trust/+images/73492682)

## Access Keys
Also finds access keys. Displays access keys in pink. Access keys are activated differently between operating systems:

Windows:  [Alt + accesskey]  
Mac OS X: [Ctrl + Alt + accesskey]  

### Demo  
[Access Keys Wikipedia Article](http://en.wikipedia.org/wiki/Access_key - Wikipedia)

## TODO
* Order found shortcuts. Arrow keys should appear together.
* Add a function to test found shortcuts.
* Detect '?', a common keybinding containing 'shortcut -> action' mappings.
