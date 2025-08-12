export interface Steps {
    /** Input program */
    input: string;
    /** User input for the program */
    userInput: string;
    /** Max cells to display */
    max_cells: number;
    /** Execution steps */
    steps: Step[];
    /** Final execution statistics */
    stats: ExecutionStats;
}

export interface Step {
    /** Step index in program */
    index: number;
    /** Pointer position */
    pointer: number;
    /** Cell values */
    cells: number[];
    /** Current output */
    result: string;
    /** Current instruction */
    instruction: string;
    /** Input position */
    inputPosition: number;
}

export interface ExecutionStats {
    /** Total steps executed */
    totalSteps: number;
    /** Execution time in milliseconds */
    executionTime: number;
    /** Maximum memory used */
    maxMemoryUsed: number;
    /** Whether execution completed normally */
    completed: boolean;
    /** Reason for termination */
    terminationReason: 'completed' | 'timeout' | 'error' | 'max_steps' | 'user_stopped';
    /** Error message if any */
    error?: string;
}

export interface BrainfuckOptions {
    /** Maximum execution time in milliseconds (default: 5000) */
    timeout?: number;
    /** Maximum number of steps (default: 1000000) */
    maxSteps?: number;
    /** Maximum memory cells (default: 30000) */
    maxMemory?: number;
    /** User input for the program */
    userInput?: string;
    /** Whether to enable step-by-step debugging */
    debug?: boolean;
}

export default class Brainfuck {
    private cells: number[] = [];
    private pointer = 0;
    private programCounter = 0;
    private readonly program: string;
    private loopStack: number[] = [];
    private output = "";
    private userInput: string;
    private inputPosition = 0;
    private _steps: Steps | null = null;
    private readonly options: Required<BrainfuckOptions>;
    private startTime = 0;
    private stepCount = 0;
    private isRunning = false;
    private shouldStop = false;

    constructor(program: string, options: BrainfuckOptions = {}) {
        this.program = this.sanitizeProgram(program);
        this.userInput = options.userInput || "";
        this.options = {
            timeout: options.timeout ?? 5000,
            maxSteps: options.maxSteps ?? 1000000,
            maxMemory: options.maxMemory ?? 30000,
            userInput: options.userInput ?? "",
            debug: options.debug ?? false
        };
        this.reset();
    }

    /**
     * Execute the Brainfuck program
     * @returns The output string or throws an error
     */
    execute(): string {
        this.reset();
        this.isRunning = true;
        this.shouldStop = false;
        this.startTime = Date.now();

        try {
            while (this.nextStep()) {
                if (this.shouldStop) {
                    throw new Error("Execution stopped by user");
                }

                // Check timeout
                if (Date.now() - this.startTime > this.options.timeout) {
                    throw new Error(`Execution timed out after ${this.options.timeout}ms`);
                }

                // Check max steps
                if (this.stepCount >= this.options.maxSteps) {
                    throw new Error(`Maximum steps exceeded (${this.options.maxSteps})`);
                }
            }
            return this.output;
        } catch (error) {
            throw new Error(`Brainfuck execution error: ${error instanceof Error ? error.message : error!.toString()}`);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Execute the program asynchronously with yielding control
     * @returns Promise resolving to the output string
     */
    async executeAsync(): Promise<string> {
        this.reset();
        this.isRunning = true;
        this.shouldStop = false;
        this.startTime = Date.now();

        try {
            let yieldCounter = 0;
            const yieldEvery = 1000; // Yield control every 1000 steps

            while (this.nextStep()) {
                if (this.shouldStop) {
                    throw new Error("Execution stopped by user");
                }

                // Check timeout
                if (Date.now() - this.startTime > this.options.timeout) {
                    throw new Error(`Execution timed out after ${this.options.timeout}ms`);
                }

                // Check max steps
                if (this.stepCount >= this.options.maxSteps) {
                    throw new Error(`Maximum steps exceeded (${this.options.maxSteps})`);
                }

                // Yield control periodically to prevent blocking
                if (++yieldCounter >= yieldEvery) {
                    yieldCounter = 0;
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
            }
            return this.output;
        } catch (error) {
            throw new Error(`Brainfuck execution error: ${error instanceof Error ? error.message : error!.toString()}`);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Stop execution if currently running
     */
    stop(): void {
        this.shouldStop = true;
    }

    /**
     * Execute a single step of the program
     * @returns true if execution should continue, false if finished
     */
    nextStep(): boolean {
        if (this.programCounter >= this.program.length) {
            return false;
        }

        const instruction = this.program[this.programCounter];
        this.stepCount++;

        try {
            switch (instruction) {
                case '+':
                    this.ensureCell();
                    this.cells[this.pointer] = (this.cells[this.pointer] + 1) % 256;
                    break;

                case '-':
                    this.ensureCell();
                    this.cells[this.pointer] = (this.cells[this.pointer] - 1 + 256) % 256;
                    break;

                case '>':
                    this.pointer++;
                    if (this.pointer >= this.options.maxMemory) {
                        throw new Error(`Memory limit exceeded (${this.options.maxMemory} cells)`);
                    }
                    break;

                case '<':
                    if (this.pointer > 0) {
                        this.pointer--;
                    }
                    break;

                case '[':
                    this.ensureCell();
                    if (this.cells[this.pointer] !== 0) {
                        this.loopStack.push(this.programCounter);
                    } else {
                        // Jump to matching ']'
                        this.programCounter = this.findMatchingBracket(this.programCounter, '[', ']');
                    }
                    break;

                case ']':
                    if (this.loopStack.length === 0) {
                        throw new Error(`Unmatched ']' at position ${this.programCounter}`);
                    }
                    this.ensureCell();
                    if (this.cells[this.pointer] !== 0) {
                        this.programCounter = this.loopStack[this.loopStack.length - 1];
                    } else {
                        this.loopStack.pop();
                    }
                    break;

                case '.':
                    this.ensureCell();
                    this.output += String.fromCharCode(this.cells[this.pointer]);
                    break;

                case ',':
                    throw new Error("Input operation not supported in this context.");
                    this.ensureCell();
                    if (this.inputPosition < this.userInput.length) {
                        this.cells[this.pointer] = this.userInput.charCodeAt(this.inputPosition);
                        this.inputPosition++;
                    } else {
                        this.cells[this.pointer] = 0; // EOF
                    }
                    break;
            }

            this.programCounter++;
            return true;
        } catch (error) {
            throw new Error(`Error at position ${this.programCounter}: ${error instanceof Error ? error.message : error!.toString()}`);
        }
    }

    /**
     * Get detailed execution steps for debugging
     */
    get steps(): Steps {
        if (this._steps === null) {
            this._steps = this.generateSteps();
        }
        return this._steps;
    }

    /**
     * Reset the interpreter to initial state
     */
    reset(): void {
        this.cells = [];
        this.pointer = 0;
        this.programCounter = 0;
        this.loopStack = [];
        this.output = "";
        this.inputPosition = 0;
        this._steps = null;
        this.stepCount = 0;
        this.shouldStop = false;
    }

    /**
     * Get current state of the interpreter
     */
    getState() {
        return {
            programCounter: this.programCounter,
            pointer: this.pointer,
            cells: [...this.cells],
            output: this.output,
            inputPosition: this.inputPosition,
            loopStack: [...this.loopStack],
            stepCount: this.stepCount,
            isRunning: this.isRunning
        };
    }

    /**
     * Validate the Brainfuck program syntax
     */
    validate(): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        const stack: number[] = [];

        for (let i = 0; i < this.program.length; i++) {
            const char = this.program[i];
            if (char === '[') {
                stack.push(i);
            } else if (char === ']') {
                if (stack.length === 0) {
                    errors.push(`Unmatched ']' at position ${i}`);
                } else {
                    stack.pop();
                }
            }
        }

        while (stack.length > 0) {
            const pos = stack.pop()!;
            errors.push(`Unmatched '[' at position ${pos}`);
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    private sanitizeProgram(program: string): string {
        return program.replace(/[^+\-><\[\].,]/g, '');
    }

    private ensureCell(): void {
        if (this.cells[this.pointer] === undefined)
            this.cells[this.pointer] = 0;
    }

    private findMatchingBracket(start: number, open: string, close: string): number {
        let depth = 1;
        let pos = start + 1;

        while (pos < this.program.length && depth > 0) {
            if (this.program[pos] === open) {
                depth++;
            } else if (this.program[pos] === close) {
                depth--;
            }
            pos++;
        }

        if (depth !== 0) {
            throw new Error(`Unmatched '${open}' at position ${start}`);
        }

        return pos - 1;
    }

    private generateSteps(): Steps {
        const bf = new Brainfuck(this.program, { ...this.options, debug: true });
        const steps: Step[] = [];

        // Add initial state
        steps.push({
            index: bf.programCounter,
            pointer: bf.pointer,
            cells: [...bf.cells],
            result: bf.output,
            instruction: bf.program[bf.programCounter] || '',
            inputPosition: bf.inputPosition
        });

        const startTime = Date.now();

        try {
            while (bf.nextStep() && steps.length < 10000) { // Limit steps for performance
                steps.push({
                    index: bf.programCounter,
                    pointer: bf.pointer,
                    cells: [...bf.cells],
                    result: bf.output,
                    instruction: bf.program[bf.programCounter] || '',
                    inputPosition: bf.inputPosition
                });
            }
        } catch (ignore) {}

        const maxCells = Math.max(15, Math.max(...steps.map(step =>
            step.cells.length > 0 ? step.cells.length : 0
        )));

        return {
            input: this.program,
            userInput: this.userInput,
            max_cells: maxCells,
            steps,
            stats: {
                totalSteps: steps.length - 1,
                executionTime: Date.now() - startTime,
                maxMemoryUsed: maxCells,
                completed: bf.programCounter >= bf.program.length,
                terminationReason: bf.programCounter >= bf.program.length ? 'completed' : 'max_steps'
            }
        };
    }
}