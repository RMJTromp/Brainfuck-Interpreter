import Brainfuck from "./Brainfuck";
import {h} from "dom-chef";
import {saveSelection, restoreSelection} from "./Selection.js";
import ModalElement from "./ModalElement";

window.customElements.define('x-modal', ModalElement);

const   textarea : HTMLTextAreaElement = document.querySelector("div.textarea"),
        runButton : HTMLButtonElement = document.querySelector('div.input button[data-action="run"]'),
        debugButton : HTMLButtonElement = document.querySelector('div.input button[data-action="debug"]');

let debug = null;

let inp = <textarea onInput={() => do_generate()}>Hello World</textarea>,
    out = <textarea disabled={true}></textarea>;

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
        .replaceAll(/\n/g, `<br>`)
}

textarea.oninput = () => {
    if(debug !== null) exitDebug();
    update();
}
update();

if(window.location.hash.length > 1) {
    try {
        const code = decodeURIComponent(window.location.hash.substring(1));
        if(code.trim().length > 0) {
            textarea.innerText = code;
            update();
        }
    } catch(e) {}
}

const requestInput = () : Promise<number> => {
    return new Promise((resolve) => {
        const modal = new ModalElement(true);
        modal.setCloseable(false);

        let inputField = <input type="text" maxLength={1} placeholder="Type a character" className="input-field"/> as HTMLInputElement;

        let submitButton = <button className="success" style={{marginTop: "10px"}}>Submit</button> as HTMLButtonElement;

        const submit = () => {
            const char = inputField.value;
            if(char.length === 0) return;
            modal.setCloseable(true);
            modal.close();
            resolve(char.charCodeAt(0) & 255);
        };

        submitButton.onclick = submit;
        inputField.onkeydown = (e) => {
            if(e.key === "Enter") {
                e.preventDefault();
                if(inputField.value.length === 0) {
                    // Enter with empty field = newline character (ASCII 10)
                    modal.setCloseable(true);
                    modal.close();
                    resolve(10);
                } else {
                    submit();
                }
            }
        };

        modal.append(
            <div className="container" style={{maxWidth: "400px"}}>
                <main>
                    <h3>Input Requested</h3>
                    <p>The program is requesting a character input.</p>
                    {inputField}
                    {submitButton}
                </main>
            </div> as HTMLDivElement
        );

        modal.open();
        inputField.focus();
    });
}

runButton.onclick = async (e) => {
    if(textarea.innerText.trim().length) {
        runButton.disabled = true;
        debugButton.disabled = true;
        let bf = new Brainfuck(textarea.innerText);
        bf.onInputRequest(requestInput);
        await bf.run();

        (document.querySelector("div.output > div.textarea") as HTMLTextAreaElement).innerText = bf.result;
        runButton.disabled = false;
        debugButton.disabled = false;
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

debugButton.onclick = async (e) => {
    if(textarea.innerText.trim().length) {
        if(debug === null) {
            runButton.disabled = true;
            debugButton.classList.remove("info");
            debugButton.classList.add("danger");
            debugButton.querySelector("i").classList.remove("codicon-debug-alt");
            debugButton.querySelector("i").classList.add("codicon-debug-disconnect");

            const bf = new Brainfuck(textarea.innerText);
            bf.onInputRequest(requestInput);

            const steps = [bf.snapshot()];
            let stepIndex = 0;
            let finished = false;
            let stepping = false;

            debug = { bf, steps, stepIndex };

            // init debug elements
            const debuggerElement = <div className="debugger"/>
            const cellsWrapper = <div className="cells-wrapper"/>
            const cellsElement = <div className="cells"/>

            let debugPreviousButton, debugNextButton;
            let pointer = <i className="pointer codicon codicon-debug-breakpoint-function-unverified"/>

            const rebuild = () => {
                const step = steps[stepIndex];
                const maxCells = Math.max(15, step.cells.length);

                cellsElement.innerHTML = "";
                for(let i = 0; i < maxCells; i++) {
                    const val = (step.cells)[i] ?? 0;
                    cellsElement.append(
                        <div className="cell">
                            <span>{i}</span>
                            <p>{val}</p>
                            <small>{String.fromCharCode(val)}</small>
                        </div>
                    );
                }

                pointer.style.transform = `translate(calc(54px * ${step.pointer ?? 0} + 26px - 50%), 30px)`;
                debugPreviousButton.disabled = stepIndex === 0;
                debugNextButton.disabled = stepIndex === steps.length - 1 && finished;

                (document.querySelector("div.output div.textarea") as HTMLTextAreaElement).innerText = step.result;

                let prefix = bf.input.substring(0, step.index - 1);
                let emphasized = bf.input.substring(step.index - 1, step.index);
                let suffix = bf.input.substring(step.index);

                textarea.innerHTML = `${colorizeBF(prefix)}${colorizeBF(emphasized, true)}${colorizeBF(suffix)}`;
                cellsElement.append(pointer);
            }

            const stepForward = async () => {
                if(stepping || (stepIndex === steps.length - 1 && finished)) return;
                stepping = true;
                debugNextButton.disabled = true;
                debugPreviousButton.disabled = true;

                if(stepIndex < steps.length - 1) {
                    stepIndex++;
                } else {
                    const cont = await bf.nextStep();
                    if(cont) {
                        steps.push(bf.snapshot());
                        stepIndex++;
                    } else {
                        finished = true;
                    }
                }

                stepping = false;
                rebuild();
            }

            cellsWrapper.append(cellsElement);

            const controlsElement = <div className="controls"/>
            {
                let playing = false, playTimerId = NaN;
                const playPauseButton = <button/>
                const playPauseButtonIcon = <i className="codicon codicon-debug-start"/>
                playPauseButton.append(playPauseButtonIcon);

                debugNextButton = (
                    <button>
                        <i className="codicon codicon-debug-continue"></i>
                    </button>
                )

                debugPreviousButton = (
                    <button disabled={true}>
                        <i className="codicon codicon-debug-reverse-continue"></i>
                    </button>
                )

                controlsElement.append(debugPreviousButton, playPauseButton, debugNextButton);

                debugNextButton.onclick = () => stepForward();

                debugPreviousButton.onclick = () => {
                    stepIndex--;
                    rebuild();
                }

                const stopPlaying = () => {
                    playing = false;
                    if(!isNaN(playTimerId)) {
                        clearTimeout(playTimerId);
                        playTimerId = NaN;
                    }
                }

                const autoPlayTick = async () => {
                    if(!playing || debug === null) {
                        stopPlaying();
                        playPauseButtonIcon.classList.remove("codicon-debug-pause");
                        playPauseButtonIcon.classList.add("codicon-debug-rerun");
                        return;
                    }

                    if(stepIndex === steps.length - 1 && finished) {
                        stopPlaying();
                        playPauseButtonIcon.classList.remove("codicon-debug-pause");
                        playPauseButtonIcon.classList.add("codicon-debug-rerun");
                        return;
                    }

                    await stepForward();

                    if(playing) {
                        playTimerId = setTimeout(autoPlayTick, 100);
                    }
                }

                playPauseButton.onclick = () => {
                    if(playing) {
                        stopPlaying();
                        playPauseButtonIcon.classList.remove("codicon-debug-pause");
                        playPauseButtonIcon.classList.add("codicon-debug-start");
                    } else {
                        if(stepIndex === steps.length - 1 && finished) stepIndex = 0;
                        playPauseButtonIcon.classList.remove("codicon-debug-rerun");
                        playPauseButtonIcon.classList.remove("codicon-debug-start");
                        playPauseButtonIcon.classList.add("codicon-debug-pause");
                        playing = true;
                        playTimerId = setTimeout(autoPlayTick, 100);
                    }
                }
            }
            rebuild();

            debuggerElement.append(cellsWrapper, controlsElement);
            document.querySelector("div.input").after(debuggerElement);
        } else exitDebug()
    }
}

(document.querySelector('button[data-action="ascii-table"]') as HTMLButtonElement).onclick = (e) => {
    const modal = new ModalElement(true);

    modal.append(
        <div className="container" style={{maxWidth: "800px"}}>
            <main>
                <h3>ASCII Table</h3>
                <div className="ascii-table">
                    {Array(256).fill(0).map((_, i) => (
                        <div>
                            <span>{i}</span>
                            <span>{String.fromCharCode(i)}</span>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );

    modal.open();
}

(document.querySelector('button[data-action="encode"]') as HTMLButtonElement).onclick = (e) => {
    const modal = new ModalElement(true);

    modal.append(
        <div className="container" style={{maxWidth: "800px"}}>
            <main>
                <h3>Text Encoder</h3>
                {inp}
                {out}
            </main>
        </div>
    )

    modal.open();
}

window.onmouseover = (e) => {
    [...document.querySelectorAll("div.tooltip")].forEach(el => el.remove());
    if(e.target.matches("span[operator]")) {
        const operator = e.target.getAttribute("operator");
        let p = <p/>;
        const tooltip = <div className="tooltip">{p}</div>

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

let info = <p/>, info_head = <p/>;

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
            for (var f = inverse_mod(a, 256) & 255, d : any = 1; 40 > d; d++)
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
    --repeat ? (info_head.textContent += ".", setTimeout(next, 0)) : (info_head.textContent += ". done (" + ((Date.now() - start) / 1E3).toFixed(2) + " seconds).", do_generate())
}

function generate(c) {
    for (var a : any = 0, f = c.length, d = "", b = 0; b < f; b++) {
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
