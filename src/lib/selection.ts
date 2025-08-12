"use client";

interface Selection {
    element: HTMLElement;
    start: number;
    end: number;
}

let saveSelectionImpl : (element: HTMLElement) => Selection = (element) => ({ start: 0, end: 0, element }),
    restoreSelectionImpl : (selection: Selection) => void = () => {};

if (typeof window === 'undefined') {}
else if (window.getSelection && document.createRange) {
    saveSelectionImpl = containerEl => {
        const selection = window.getSelection();
        if (selection === null || !selection.rangeCount)
            return { start: 0, end: 0, element: containerEl };

        let range = selection.getRangeAt(0);
        let preSelectionRange = range.cloneRange();
        preSelectionRange.selectNodeContents(containerEl);
        preSelectionRange.setEnd(range.startContainer, range.startOffset);
        let start = preSelectionRange.toString().length;

        return {
            start: start,
            end: start + range.toString().length,
            element: containerEl,
        };
    };

    restoreSelectionImpl = selection => {
        let charIndex = 0, range = document.createRange();
        range.setStart(selection.element, 0);
        range.collapse(true);
        let nodeStack : Node[] = [selection.element], node, foundStart = false, stop = false;

        while (!stop && (node = nodeStack.pop())) {
            if (node.nodeType === 3) {
                let nextCharIndex = charIndex + (node as Text).length;
                if (!foundStart && selection.start >= charIndex && selection.start <= nextCharIndex) {
                    range.setStart(node, selection.start - charIndex);
                    foundStart = true;
                }
                if (foundStart && selection.end >= charIndex && selection.end <= nextCharIndex) {
                    range.setEnd(node, selection.end - charIndex);
                    stop = true;
                }
                charIndex = nextCharIndex;
            } else {
                let i = node.childNodes.length;
                while (i--) {
                    nodeStack.push(node.childNodes[i]);
                }
            }
        }

        let sel = window.getSelection();
        if(sel !== null) {
            sel.removeAllRanges();
            sel.addRange(range);
        }
    }
} else if ((document as any).selection) {
    saveSelectionImpl = containerEl => {
        let selectedTextRange = (document as any).selection.createRange();
        let preSelectionTextRange = (document.body as any).createTextRange();
        preSelectionTextRange.moveToElementText(containerEl);
        preSelectionTextRange.setEndPoint("EndToStart", selectedTextRange);
        let start = preSelectionTextRange.text.length;

        return {
            start: start,
            end: start + selectedTextRange.text.length,
            element: containerEl
        }
    };

    restoreSelectionImpl = selection => {
        let textRange = (document.body as any).createTextRange();
        textRange.moveToElementText(selection.element);
        textRange.collapse(true);
        textRange.moveEnd("character", selection.end);
        textRange.moveStart("character", selection.start);
        textRange.select();
    };
}


export const saveSelection = Object.freeze(saveSelectionImpl);
export const restoreSelection = Object.freeze(restoreSelectionImpl);