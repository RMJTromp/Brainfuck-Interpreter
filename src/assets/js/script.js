import $ from "./selector.js";
import Brainfuck from "./Brainfuck.js";
import {saveSelection, restoreSelection} from "./Selection.js";
import ModalElement from "./ModalElement.js";

window.customElements.define('x-modal', ModalElement);

const   textarea = $("div.textarea"),
        runButton = $('div.input button[data-action="run"]'),
        debugButton = $('div.input button[data-action="debug"]');

let debug = null;

let inp = null,
    out = null;

const update = () => {
    const pos = document.activeElement === textarea ? saveSelection(textarea) : undefined;
    textarea.innerHTML = colorizeBF(textarea.innerText);
    if(pos) restoreSelection(textarea, pos);

    runButton.disabled = textarea.innerText.trim().length <= 0;
    debugButton.disabled = textarea.innerText.trim().length <= 0;
}

const colorizeBF = (input, emphasize = false) => {
    return input.replaceAll(/(<)(?![a\/])/g, `&lt;`)
        .replaceAll(/(?<!["a])(>)/g, `&gt;`)
        .replaceAll(/((?:&lt;)+)/g, `<span operator="<"${emphasize?" emphasis" : ""}>$1</span>`)
        .replaceAll(/((?:&gt;)+)/g, `<span operator=">"${emphasize?" emphasis" : ""}>$1</span>`)
        .replaceAll(/(\++)/g, `<span operator="+"${emphasize?" emphasis" : ""}>$1</span>`)
        .replaceAll(/(-+)/g, `<span operator="-"${emphasize?" emphasis" : ""}>$1</span>`)
        .replaceAll(/(\.+)/g, `<span operator="."${emphasize?" emphasis" : ""}>$1</span>`)
        .replaceAll(/(,+)/g, `<span operator=","${emphasize?" emphasis" : ""}>$1</span>`)
        .replaceAll(/(\[)/g, `<span operator="["${emphasize?" emphasis" : ""}>$1</span>`)
        .replaceAll(/(])/g, `<span operator="]"${emphasize?" emphasis" : ""}>$1</span>`)
}

textarea.oninput = () => {
    if(debug !== null) exitDebug();
    update();
}
update();

runButton.onclick = (e) => {
    if(textarea.innerText.trim().length) {
        e.target.disabled = true;
        let bf = new Brainfuck(textarea.innerText)
        bf.run();
        $("div.output > div.textarea").innerText = bf.result;
    }
}

const exitDebug = () => {
    debug = null;
    runButton.disabled = false;
    debugButton.classList.remove("danger");
    debugButton.classList.add("info");
    debugButton.querySelector("i").classList.remove("codicon-debug-disconnect");
    debugButton.querySelector("i").classList.add("codicon-debug-alt");
    document.querySelector("div.debugger").remove();
    update();
}

debugButton.onclick = (e) => {
    if(textarea.innerText.trim().length) {
        if(debug === null) {
            runButton.disabled = true;
            debugButton.classList.remove("info");
            debugButton.classList.add("danger");
            debugButton.querySelector("i").classList.remove("codicon-debug-alt");
            debugButton.querySelector("i").classList.add("codicon-debug-disconnect");
            debug = new Brainfuck(textarea.innerText).steps;
            debug.index = 0;

            // init debug elements
            const debuggerElement = $("<div>", {class: "debugger"});
            const cellsWrapper = $("<div>", {class: "cells-wrapper"});
            const cellsElement = $("<div>", {class: "cells"});

            let debugPreviousButton, debugNextButton;
            let pointer = $("<i>", {class: "pointer codicon codicon-debug-breakpoint-function-unverified"});

            const rebuild = () => {
                cellsElement.innerHTML = "";
                for(let i = 0; i < debug.max_cells; i++) {
                    const val = (debug.steps[debug.index]?.cells ?? [])[i] ?? 0;
                    const cell = $("<div>", {class:"cell"});
                    cell.append($("<span>", {text: i}));
                    cell.append($("<p>", {text: val}));
                    cell.append($("<small>", {text: String.fromCharCode(val)}));
                    cellsElement.append(cell);
                }

                pointer.style.transform = `translate(calc(54px * ${debug.steps[debug.index]?.pointer ?? 0} + 26px - 50%), 30px)`;
                debugPreviousButton.disabled = debug.index === 0;
                debugNextButton.disabled = debug.index === debug.steps.length - 1;

                $("div.output div.textarea").innerText = debug.steps[debug.index]?.result;

                let prefix = debug.input.substring(0, debug.steps[debug.index]?.index - 1);
                let emphasized = debug.input.substring(debug.steps[debug.index]?.index - 1, debug.steps[debug.index]?.index);
                let suffix = debug.input.substring(debug.steps[debug.index]?.index);

                textarea.innerHTML = `${colorizeBF(prefix)}${colorizeBF(emphasized, true)}${colorizeBF(suffix)}`;
                cellsElement.append(pointer);
            }

            cellsWrapper.append(cellsElement);

            const controlsElement = $("<div>", {class:"controls"});
            {
                let playing = false, playInterval = NaN;
                const playPauseButton = $("<button>");
                const playPauseButtonIcon = $("<i>", {class: "codicon codicon-debug-start"});
                playPauseButton.append(playPauseButtonIcon);

                debugNextButton = $("<button>");
                debugNextButton.append($("<i>", {class:"codicon codicon-debug-continue"}));

                debugPreviousButton = $("<button>", {disabled: ""});
                debugPreviousButton.append($("<i>", {class:"codicon codicon-debug-reverse-continue"}));

                controlsElement.append(debugPreviousButton, playPauseButton, debugNextButton);

                debugNextButton.onclick = () => {
                    debug.index++;
                    rebuild();
                }

                debugPreviousButton.onclick = () => {
                    debug.index--;
                    rebuild();
                }

                playPauseButton.onclick = () => {
                    if(playing) {
                        playPauseButtonIcon.classList.remove("codicon-debug-pause");
                        playPauseButtonIcon.classList.add("codicon-debug-start");

                        if(!isNaN(playInterval)) {
                            clearInterval(playInterval);
                            playInterval = NaN;
                        }
                    } else {
                        if(debug.index === debug.steps.length - 1) debug.index = 0;
                        playPauseButtonIcon.classList.remove("codicon-debug-rerun");

                        playPauseButtonIcon.classList.remove("codicon-debug-start");
                        playPauseButtonIcon.classList.add("codicon-debug-pause");

                        playInterval = setInterval(() => {
                            if(debug != null && debug.index < debug.steps.length-1) {
                                debug.index++;
                                rebuild();
                            } else {
                                playPauseButtonIcon.classList.remove("codicon-debug-pause");
                                playPauseButtonIcon.classList.add("codicon-debug-rerun");

                                clearInterval(playInterval);
                                playInterval = NaN;
                                playing = false;
                            }
                        }, 100);
                    }
                    playing = !playing;
                }
            }
            rebuild();

            debuggerElement.append(cellsWrapper, controlsElement);
            document.querySelector("div.input").after(debuggerElement);
        } else exitDebug()
    }
}

$('button[data-action="learn"]').onclick = (e) => {
    const modal = new ModalElement(true);

    {
        const container = $("<div>", {class:"container"});
        container.style.maxWidth = "800px";

        const main = $("<main>");
        main.append($("<h3>", {text:"Learn Brainfuck"}));
        main.append($("<p>", {text:"Brainfuck is executed on a memory array. By default, it's a 30-thousand-cell-long array of 8-bit integers, but some other implementations are more flexible. There are two registers : Instruction pointer and Memory Pointer. Finally, there are 8 instructions:"}));
        main.append($("<br>"))

        const explanation = $("<p>");
        explanation.innerHTML =
            `<i class="bf-instruction">+</i> and <i class="bf-instruction">-</i> increments or decrement the value of the element in the array which the pointer is pointing at. Once you go over 255 the value wraps back to 0, and when you go under it wraps back to 255.
<br><i class="bf-instruction">&lt;</i> and <i class="bf-instruction">&gt;</i> Moves increments or decrements the position of the pointer (moves the pointer to the left or right).
<br><i class="bf-instruction">.</i> prints out the ASCII character corresponding to the integer value stored where the pointer is currently pointing at.
<br><i class="bf-instruction">,</i> takes in a user-input and overrides the currently stored value.
<br><i class="bf-instruction">[</i> and <i class="bf-instruction">]</i> declares the start and end of a loop. The loop stops at the end of the loop when the value of where the pointer is pointing at is 0.`;
        main.append(explanation);

        container.append(main);

        modal.append(container);
    }

    modal.open();
}

$('button[data-action="ascii-table"]').onclick = (e) => {
    const modal = new ModalElement(true);

    {
        const container = $("<div>", {class:"container"});
        container.style.maxWidth = "800px";

        const main = $("<main>");
        main.append($("<h3>", {text:"ASCII Table"}));

        const asciiTable = $("<div>", {class:"ascii-table"});
        for(let i = 0; i < 256; i++) {
            const entry = $("<div>");
            entry.append($("<span>", {text:i}));
            entry.append($("<span>", {text:String.fromCharCode(i)}));
            asciiTable.append(entry);
        }
        main.append(asciiTable);

        container.append(main);

        modal.append(container);
    }

    modal.open();
}

$('button[data-action="encode"]').onclick = (e) => {
    const modal = new ModalElement(true);

    {
        const container = $("<div>", {class:"container"});
        container.style.maxWidth = "800px";

        const main = $("<main>");
        main.append($("<h3>", {text:"Text Encoder"}));

        inp = $("<textarea>", {value: "Hello World"});
        inp.oninput = () => do_generate();
        out = $("<textarea>", {disabled: ""});
        main.append(inp);
        main.append(out);

        container.append(main);

        modal.append(container);
    }

    modal.open();
}

window.onmouseover = (e) => {
    [...document.querySelectorAll("div.tooltip")].forEach(el => el.remove());
    if(e.target.matches("span[operator]")) {
        const operator = e.target.getAttribute("operator");
        const tooltip = $("<div>", {class:"tooltip"});
        const p = $("<p>");
        tooltip.append(p);
        let count = e.target.innerText.length;
        if(operator === ">") {
            p.innerHTML = `<b>Increment Data Pointer</b> - Moves the pointer to the right ${count} time${count > 1 ? "s" : ""}`;
        } else if(operator === "<") {
            p.innerHTML = `<b>Decrease Data Pointer</b> - Moves the pointer to the left ${count} time${count > 1 ? "s" : ""}`;
        } else if(operator === "+") {
            p.innerHTML = `<b>Increment Byte of Data Pointer</b> - Increases the value of the byte at the pointer's current location by ${count}`;
        } else if(operator === "-") {
            p.innerHTML = `<b>Decrement Byte of Data Pointer</b> - Decreases the value of the byte at the pointer's current location by ${count}`;
        } else if(operator === ",") {
            p.innerHTML = `<b>Accept one byte of input</b> - Takes an input and replaces the byte value at the pointer's current location`;
        } else if(operator === ".") {
            p.innerHTML = `<b>Output value of Data Pointer</b> - Prints out the character corresponding to the value at the pointer's current location`;
        } else if(operator === "[") {
            p.innerHTML = `<b>Open Loop Bracket</b> - If nonzero value, execute command in square brackets '[ ]'`;
        } else if(operator === "]") {
            p.innerHTML = `<b>Close Loop Bracket</b> - If nonzero value, execute command after corresponding '[' bracket`;
        }

        const pos = e.target.getBoundingClientRect();
        const tooltipPos = tooltip.getBoundingClientRect();

        tooltip.style.left = (pos.x + pos.width/2) + "px";
        tooltip.style.top = ((pos.y + pos.height/2) - tooltipPos.height * 4) + "px";
        document.body.append(tooltip);
    }
}

let info = $("<p>"), info_head = $("<p>");

function gcd(c, a) {
    return 0 === a ? c : gcd(a, c % a)
}

function inverse_mod(c, a) {
    for (var f = 1, d = 0, b; a;) b = f, f = d, d = b - d * (c / a | 0), b = c, c = a, a = b % a;
    return f
}

function shortest_str(c) {
    for (var a = 0, f = 1; f < c.length; f++) c[f].length < c[a].length && (a = f);
    return a
}
for (var map = [], plus_map = [""], minus_map = [""], iter = !0, repeat = 2, start, i = 1; 256 > i; i++) plus_map[i] = plus_map[i - 1] + "+", minus_map[i] = minus_map[i - 1] + "-";
for (var x = 0; 256 > x; x++) {
    map[x] = [];
    for (var y = 0; 256 > y; y++) {
        var delta = y - x;
        128 < delta && (delta -= 256); - 128 > delta && (delta += 256);
        map[x][y] = 0 <= delta ? plus_map[delta] : minus_map[-delta]
    }
}

function next() {
    iter = !1;
    for (var c = 0; 256 > c; c++)
        for (var a = 1; 40 > a; a++)
            for (var f = inverse_mod(a, 256) & 255, d = 1; 40 > d; d++)
                if (1 === gcd(a, d)) {
                    if (a & 1) {
                        var b = 0;
                        var e = c * f & 255
                    } else
                        for (b = c, e = 0; 256 > e && b; e++) b = b - a & 255;
                    0 === b && (b = d * e & 255, a + d + 5 < map[c][b].length && (map[c][b] = "[" + minus_map[a] + ">" + plus_map[d] + "<]>"));
                    if (a & 1) b = 0, e = -c * f & 255;
                    else
                        for (b = c, e = 0; 256 > e && b; e++) b = b + a & 255;
                    0 === b && (b = -d * e & 255, a + d + 5 < map[c][b].length && (map[c][b] = "[" + plus_map[a] + ">" + minus_map[d] + "<]>"))
                } for (c = 0; 256 > c; c++)
        for (a = map[c], e = 0; 256 > e; e++)
            for (f = map[e],
                     d = a[e], b = 0; 256 > b; b++) d.length + f[b].length < a[b].length && (a[b] = d + f[b]);
    --repeat ? (info_head.textContent += ".", setTimeout(next, 0)) : (info_head.textContent += ". done (" + ((new Date - start) / 1E3).toFixed(2) + " seconds).", do_generate())
}

function generate(c) {
    for (var a = 0, f = c.length, d = "", b = 0; b < f; b++) {
        var e = c.charCodeAt(b) & 255;
        a = [">" + map[0][e], map[a][e]];
        var g = shortest_str(a);
        d += a[g] + ".";
        a = e
    }
    return d
}

function do_generate() {
    if (!repeat) {
        var c = inp?.value ?? "",
            a = generate(c);
        if(out) out.value = a;
        info.textContent = "text length = " + c.length + " bytes\ncode length = " + a.length + " bytes\nratio = " + (a.length / (c.length || 1)).toFixed(2)
    }
}
window.onload = function() {
    info_head.textContent = "Generating table .";
    start = new Date;
    setTimeout(next, 0);
};