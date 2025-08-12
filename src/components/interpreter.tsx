"use client";

import {Button} from "@/components/ui/button";
import {useState, useEffect, useRef} from "react";
import {Bug, BugOff, MessageCircleWarning} from "lucide-react";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";
import {restoreSelection, saveSelection} from "@/lib/selection";
import Brainfuck from "@/lib/brainfuck";
import {toast} from "sonner";

const prompts = [
    {
        title: "print Hello World",
        content: "++++++++++[>+>+++>+++++++>++++++++++<<<<-]>>>++.>+.+++++++..+++.<<++.>+++++++++++++++.>.+++.------.--------.",
    }
]
const operators = new Set(['+', '-', '>', '<', '[', ']', '.', ',']);

export default function Interpreter() {
    const [input, setInput] = useState("");
    const [output, setOutput] = useState("");
    const [debugMode, setDebugMode] = useState(false);
    const textareaRef = useRef<HTMLDivElement | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (abortControllerRef.current)
            abortControllerRef.current.abort();

        const controller = new AbortController();
        abortControllerRef.current = controller;

        const signal = controller.signal;

        if(textareaRef.current) {
            try {
                const selection = saveSelection(textareaRef.current);
                if (signal.aborted) return;

                const highlightedInput = input.split("\n").map(line => {
                    return splitOperators(line).map(part => {
                        if(operators.has(part[0])) return `<span data-operator="${part[0]}">${part}</span>`;
                        return part.replaceAll(" ", "&nbsp;").replaceAll("\t", "&nbsp&nbsp;&nbsp;&nbsp;");
                    }).join("");
                }).join("<br/>");

                if (signal.aborted) return;
                textareaRef.current.innerHTML = highlightedInput;
                restoreSelection(selection);
            } catch (ignore) {}
        }

        return () => {
            controller.abort();
            abortControllerRef.current = null;
        };
    }, [input, textareaRef]);

    const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
        // When input occurs, abort any ongoing update
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        setInput(e.currentTarget.innerText);
    };


    return (
        <div className={"grid gap-2"}>
            <div className={"w-auto divide-y overflow-hidden rounded-xl border bg-background shadow-sm"}>
                <div contentEditable={true} ref={textareaRef}
                     className="block border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive field-sizing-content min-h-16 border text-base transition-[color,box-shadow] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm w-full resize-none rounded-none border-none p-3 shadow-none outline-none ring-0 bg-transparent dark:bg-transparent focus-visible:ring-0"
                     onInput={handleInput}
                >
                </div>
                <div className={"flex items-center justify-end p-1"}>
                    <div className={"flex items-center gap-1 [&_button:last-child]:rounded-br-xl"}>
                        <Tooltip delayDuration={300}>
                            <TooltipTrigger asChild>
                                <Button variant={"ghost"} size={"icon"}
                                        onClick={() => setDebugMode(s => !s)}
                                        className={debugMode ? "border focus-visible:border-ring aria-invalid:border-destructive dark:border-input" : ""}>
                                    {debugMode ? <BugOff/> : <Bug/>}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{debugMode ? "Disable Debug" : "Enable Debug"}</p>
                            </TooltipContent>
                        </Tooltip>
                        <Button disabled={busy} className={"disabled:cursor-not-allowed"} onClick={() => {
                            setBusy(true);
                            new Brainfuck(input).executeAsync()
                                .then(result => setOutput(result))
                                .catch(err => toast("An unknown error occured during execution", {
                                    description: ((err: string) => {
                                        if(err.startsWith("Brainfuck execution error: "))
                                            return err.replace("Brainfuck execution error: ", "");
                                        return err;
                                    })(err instanceof Error ? err.message : String(err)),
                                    dismissible: true,
                                    icon: <MessageCircleWarning/>,
                                    duration: 5000,
                                    position: "bottom-right"
                                }))
                                .finally(() => setBusy(false));
                        }}>Execute</Button>
                    </div>
                </div>
            </div>
            <div className={"flex w-max flex-nowrap items-center gap-2"}>
                {prompts.map((prompt, i) => <Button variant={"outline"} key={i} className={"rounded-full h-auto py-[.15rem] px-4"} onClick={() => setInput(prompt.content)}>{prompt.title}</Button>)}
            </div>
            {output && (
                <div className={"flex flex-col group w-full gap-0 overflow-hidden rounded-md border mt-6"}>
                    <div className={"flex flex-row items-center justify-between border-b bg-secondary/30 p-1 pl-4"}><p>Output</p></div>
                    <pre className={"flex-1 outline-none mt-0 bg-background p-4 text-sm truncate"}>{output}</pre>
                </div>
            )}
        </div>
    )
}

function splitOperators(input: string): string[] {
    const result: string[] = [];
    let i = 0;

    while (i < input.length) {
        const char = input[i];

        if (operators.has(char)) {
            if (char === '[' || char === ']' || char === '.' || char === ',') {
                result.push(char);
                i++;
            } else {
                let group = char;
                i++;

                while (i < input.length && input[i] === char) {
                    group += input[i];
                    i++;
                }

                result.push(group);
            }
        } else {
            let comment = char;
            i++;

            while (i < input.length && !operators.has(input[i])) {
                comment += input[i];
                i++;
            }

            result.push(comment);
        }
    }

    return result;
}