/*
 * Content script for Copy Better Extension
 */

(function() {
    /* Local configuration */
    var config = {};

    /* An empty debug function */
    var _emptyFunc = function(msg) {};
    /* A simple debug function */
    var _debug = function(msg) { console.log(msg); };
    /* Real debug function */
    var debug = _emptyFunc;

    /*
     * Update config to new one
     */
    function updateConfig(newConfig)
    {
        config = newConfig;

        if (config.enableDebug) {
            debug = _debug;
            debug('Update config successfully');
        }
    }

    /*
     * Get selected html content.
     */
    function html(sel) 
    {
        var div = document.createElement('div');
        var range = sel.getRangeAt(0);

        while(range.startContainer.nodeType == document.TEXT_NODE
              || range.startContainer.childNodes.length == 1)
            range.setStartBefore(range.startContainer);

        while(range.endContainer.nodeType == document.TEXT_NODE
              || range.endContainer.childNodes.length == 1)
            range.setEndAfter(range.endContainer);

        div.appendChild(range.cloneContents());

        return div.innerHTML;
    }

    /* 
     * Get selected text content
     */
    function text(sel) { return sel.toString(); }

    /*
     * Check whether any text is selected
     */
    function isSelected(sel) { return !sel.isCollapsed; }

    /*
     * Check whether the element is a edit box, like textarea or text input
     */
    function isEditBox(elem) 
    {
        return (elem.tagName == 'INPUT' && elem.type == "text")
            || elem.tagName == 'TEXTAREA';
    }

    /*
     * Copy non-empty value to clipboard
     */
    function copy(value, mode)
    {
        if (value.match(/^(\s|\n)*$/) != null)
            return;

        mode = mode || 'normal';

        chrome.extension.sendMessage({
            command: 'copy',
            data: value,
            mode: mode
        });
        
        debug('Copyied string: ' + value + ', copy mode: ' + mode);
    }

    /*
     * Click event handler
     */
    function onclick(event)
    {
        if (isEditBox(event.target))
            return;

        var raw = true;
        var value = "";
        var sel = window.getSelection();

        if (event.shiftKey && event.keyCode == 67) /* Shift + c */
            raw = false;
        else if (event.ctrlKey && event.keyCode == 67) /* Ctrl + c */
            raw = true;
        else
            return;

        if (!isSelected(sel)) {
            if (raw) {
                value = config.copyTitleRawFmt.replace('%TITLE%', document.title)
                    .replace('%URL%', location.href);
            } else {
                value = config.copyTitleFmt.replace('%TITLE%', document.title)
                    .replace('%URL%', location.href);
            }

            copy(value);
        } else {
            value = raw ? text(sel) : html(sel);
            copy(value, config.copyOnSelect === true ? 'override' : 'normal');
            sel.removeAllRanges();
        }
    }

    /*
     * Mouseup event handler
     */
    function onmouseup(event)
    {
        if (!config.copyOnSelect)
            return;

        var value = "";
        var sel = window.getSelection();

        if (config.copyOnSelectInBox && isEditBox(event.target)) {
            value = event.target.value;
            value = value.substring(event.target.selectionStart,
                    event.target.selectionEnd);
            copy(value);
        } else if (isSelected(sel)) {
            value = text(sel);
            copy(value);
        }
    }

    /*
     * Load configure from background page
     */
    chrome.extension.sendMessage({command: 'load'}, function(response) {
        updateConfig(response);
    });

    /*
     * Copy from cache list
     */
    function copyFromCache(str)
    {
        var target = document.activeElement;

        debug('Active element is ' + target.tagName);

        if (isEditBox(target)) {
            target.value = target.value.substring(0, target.selectionStart) + 
                str + target.value.substring(target.selectionEnd);
            debug('Paste string: ' + str);
        } else {
            debug('Copy string: ' + str);
        }
    }

    /*
     * Proceess paste message from extension
     */
    chrome.extension.onMessage.addListener(
        function(request, sender, sendResponse) 
        {
            switch (request.command) {
                case 'paste':
                    copyFromCache(request.data);
                    break;
                case 'update':
                    updateConfig(request.data);
                    break;
                default:
                    break;
            }
       }
    );

    window.addEventListener('keydown', onclick, false);
    window.addEventListener('mouseup', onmouseup, false);
})();
