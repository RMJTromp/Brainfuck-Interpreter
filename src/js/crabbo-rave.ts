// https://github.com/crabbo-rave/CompressedBF

const charRange: [number, number][] = [
    [32, 126], // English, numbers, symbols (Basic ASCII Printable)
    [160, 255], // Western European (Latin-1 Supplement)
    [256, 383], // Central/Eastern European (Latin Extended-A)
    [384, 591], // More European languages (Latin Extended-B)
    [592, 687], // Phonetic symbols (IPA Extensions)
    [688, 767], // Spacing Modifier Letters
    [880, 1023], // Greek (Greek and Coptic)
    [1024, 1279], // Cyrillic
    [1280, 1327], // Cyrillic Supplement
    [1328, 1423], // Armenian
    [1424, 1535], // Hebrew
    [1536, 1791], // Arabic
    [1792, 1871], // Syriac
    [1920, 1983], // Thaana (Maldivian)
    [2304, 2431], // Devanagari (Hindi, Sanskrit, Marathi, etc.)
    [2432, 2559], // Bengali
    [2560, 2687], // Gurmukhi (Punjabi)
    [2688, 2815], // Gujarati
    [2816, 2943], // Oriya
    [2944, 3071], // Tamil
    [3072, 3199], // Telugu
    [3200, 3327], // Kannada
    [3328, 3455], // Malayalam
    [3456, 3583], // Sinhala (Sri Lankan)
    [3584, 3711], // Thai
    [3712, 3839], // Lao
    [3840, 4095], // Tibetan
    [4096, 4255], // Myanmar (Burmese)
    [4256, 4351], // Georgian
    [4352, 4607], // Hangul Jamo (Korean components)
    [4608, 4991], // Ethiopic
    [5024, 5119], // Cherokee
    [5120, 5759], // Canadian Aboriginal Syllabics
    [5760, 5791], // Ogham (Ancient Irish)
    [5792, 5887], // Runic (Ancient Germanic)
    [5888, 5919], // Tagalog (Baybayin)
    [5920, 5951], // Hanunoo (Filipino)
    [5952, 5983], // Buhid (Filipino)
    [5984, 6015], // Tagbanwa (Filipino)
    [6016, 6143], // Khmer (Cambodian)
    [6144, 6319], // Mongolian
    [7680, 7935], // Latin Extended Additional
    [7936, 8191], // Greek Extended
    [8192, 8303], // General Punctuation
    [8352, 8399], // Currency Symbols
    [8448, 8527], // Letterlike Symbols
    [8528, 8591], // Number Forms
    [8592, 8703], // Arrows
    [8704, 8959], // Mathematical Operators
    [9472, 9599], // Box Drawing
    [9600, 9631], // Block Elements
    [9632, 9727], // Geometric Shapes
    [9728, 9983], // Miscellaneous Symbols
    [9984, 10175], // Dingbats
    [12352, 12447], // Hiragana (Japanese)
    [12448, 12543], // Katakana (Japanese)
    [12544, 12591], // Bopomofo (Chinese phonetic)
    [12592, 12687], // Hangul Compatibility Jamo (Korean)
    [19968, 20991], // CJK Unified Ideographs (sample subset)
    [44032, 45055], // Hangul Syllables (sample subset)
];

const operators = ['+', '-', '<', '>', '[', ']', '.', ',']

const chars = charRange.flatMap(([start, end]) => Array.from({length: end - start + 1}, (_, i) => String.fromCharCode(start + i)));

const combinations = [
    ...operators.flatMap(a => operators.map(b => a + b)),
    ...operators.flatMap(a => operators.flatMap(b => operators.map(c => a + b + c))),
    ...operators.flatMap(a => operators.flatMap(b => operators.flatMap(c => operators.map(d => a + b + c + d))))
];

if(combinations.length > chars.length) throw new Error('Not enough characters to encode all combinations');

const $ : {[key: string]: string} = Object.fromEntries(combinations.map((combo, index) => [combo, chars[index]]));
const $$ : {[key: string]: string} = Object.fromEntries(Object.entries($).map(([k, v]) => [v, k]));

export function compress(input: string) : string {
    let result = '';
    let i = 0;

    while (i < input.length) {
        let matched = false;

        for (let len = 4; len >= 2; len--) {
            if (i + len - 1 < input.length) {
                const key = input.substring(i, i + len);
                if ($[key]) {
                    result += $[key];
                    i += len;
                    matched = true;
                    break;
                }
            }
        }

        if (!matched) {
            result += input[i];
            i++;
        }
    }

    return result;
}

export function decompress(input: string): string {
    let result = '';

    for (let i = 0; i < input.length; i++) {
        const char = input[i];
        let found = false;

        if ($$[char]) {
            result += $$[char];
            found = true;
        }

        if (!found) {
            result += char;
        }
    }

    return result;
}