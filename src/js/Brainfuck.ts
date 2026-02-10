export interface Steps {
    /** Input */
    input: string,
    /** Max cells */
    max_cells: number,
    /** Steps */
    steps: Step[]
}

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
    _steps = null;
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
        } else if(operator === "[") this.loopAnchors.push(this.index);
        else if(operator === "]") {
            if(this.cells[this.at] !== 0)
                // go back to the last set anchor
                this.index = this.loopAnchors[this.loopAnchors.length - 1];
            else
                // remove the last anchor
                this.loopAnchors.splice(this.loopAnchors.length - 1, 1);
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

    async getSteps() : Promise<Steps> {
        if(this._steps === null) {
            this._steps = {
                input: this.input,
                max_cells: 15,
                steps: []
            };

            let bf = new Brainfuck(this.input);
            if(this._onInputRequest) bf.onInputRequest(this._onInputRequest);

            this._steps.steps.push({
                index: bf.index,
                pointer: bf.at,
                cells: [...bf.cells],
                result: bf.result
            });

            while(await bf.nextStep()) {
                this._steps.steps.push({
                    index: bf.index,
                    pointer: bf.at,
                    cells: [...bf.cells],
                    result: bf.result
                });
            }

            this._steps.max_cells = Math.max(15, Math.max(...this._steps.steps.map(step => step.cells.length)));
        }
        return this._steps;
    }

}
