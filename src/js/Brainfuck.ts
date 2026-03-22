export interface Step {
    /** Step index */
    index: number,
    /** Pointer position */
    pointer: number,
    /** Cell values */
    cells: number[],
    /** Current output */
    result: string
}

export default class Brainfuck {

    cells : number[] = [];
    at = 0;
    index = 0;
    input = "";
    loopAnchors : number[] = [];
    result = "";
    private _onInputRequest : (() => Promise<number>) | null = null;

    constructor(input) {
        this.input = input;
    }

    onInputRequest(handler: () => Promise<number>) {
        this._onInputRequest = handler;
        return this;
    }

    async run() {
        while(await this.nextStep()) {}
        return this.result;
    }

    async nextStep() {
        if(this.index >= this.input.length) return false;

        const operator = this.input[this.index];

        if(operator === "+") {
            const currentValue = this.cells[this.at] ?? 0;
            if(currentValue === 255) this.cells[this.at] = 0;
            else this.cells[this.at] = currentValue + 1;
        } else if(operator === "-") {
            const currentValue = this.cells[this.at] ?? 0;
            if(currentValue === 0) this.cells[this.at] = 255;
            else this.cells[this.at] = currentValue - 1;
        } else if(operator === ">") {
            if(this.at < 30000) this.at++;
        } else if(operator === "<") {
            if(this.at > 0) this.at--;
        } else if(operator === "[") {
            const currentValue = this.cells[this.at] ?? 0;
            if(currentValue === 0) {
                let depth = 1;
                while(depth > 0) {
                    this.index++;
                    if(this.index >= this.input.length) throw new Error("Unmatched '[' in program");

                    if(this.input[this.index] === "[") depth++;
                    else if(this.input[this.index] === "]") depth--;
                }
            } else this.loopAnchors.push(this.index);
        } else if(operator === "]") {
            const currentValue = this.cells[this.at] ?? 0;
            if(currentValue !== 0) {
                if(this.loopAnchors.length === 0) throw new Error("Unmatched ']' in program");
                this.index = this.loopAnchors[this.loopAnchors.length - 1];
            } else {
                if(this.loopAnchors.length === 0) throw new Error("Unmatched ']' in program");
                this.loopAnchors.splice(this.loopAnchors.length - 1, 1);
            }
        } else if(operator === ".") this.result += String.fromCharCode(this.cells[this.at]);
        else if(operator === ",") {
            if(this._onInputRequest) {
                const value = await this._onInputRequest();
                this.cells[this.at] = value & 255;
            } else {
                this.cells[this.at] = 0;
            }
        }

        this.index++;

        return true;
    }

    snapshot() : Step {
        return {
            index: this.index,
            pointer: this.at,
            cells: [...this.cells],
            result: this.result
        };
    }

}
