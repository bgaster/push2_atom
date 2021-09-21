// This file is a script for the Push 2 that builds scales and pad to note
// mapping for that scale in Ableton stule in key and choromatic mode.
//
// Scales are described by a tonic + a set of intervals

const chromaticC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const notes2MIDI = {
    'C': 0,
    'C#': 1,
    'DB': 1,
    'D': 2,
    'D#': 3,
    'EB': 3,
    'E': 4,
    'F': 5,
    'F#': 6,
    'GB': 6,
    'G': 7,
    'G#': 8,
    'AB': 8,
    'A': 9,
    'A#': 10,
    'BB': 10,
    'B': 11,
};

// M => tone
// m => half tone
// A => minor 3rd

const majorIntervals = 'MMmMMMm';
const minorIntervals = 'MmMMmMM';

const majorPentatonicIntervals = 'MMAMA';
const minorPentatonicIntervals = 'AMMAM';

const dorianModeIntervals = "MmMMMmM";
const mixolydianModeIntervals = "MMmMMmM";

/**
 * A representation of a scale built on a tonic.
 */
class Scale {
    /**
     * Constructs a scale instance.
     * @param {String} tonic
     */
    constructor(tonic) {
        this.tonic = tonic;
    }

    /**
     * Converts a symbolic note to its MIDI number.
     * @param {String} note
     * @param {Number} octave
     * @param {Number} offset
     * @return {Number}
     */
    note2MIDI(note, octave, offset) {
        let n = notes2MIDI[note.toUpperCase()];
        if (n < offset) {
            octave = octave + 1;
        }
        return notes2MIDI[note.toUpperCase()] + 12 * octave;
    }

    /**
     * Calculates the midi note for the tonic
     * @return {Number}
     */
    offset() {
        return notes2MIDI[this.tonic];
    }

    chromatic() {
        let flats = ["F", "Bb", "Eb", "Ab", "Db", "Gb", "d", "g", "c", "f", "bb", "eb"];
        if (flats.includes(this.tonic)) {
            let scale = this.flatten(chromaticC);
            return this.reorder(scale);
        }
        else {
            return this.reorder(chromaticC);
        }
    }

    interval(intervals) {
        let scale = this.chromatic();
        let next = intervals.split("").map(i => {
            let res = this.step(i, scale);
            this.tonic = res
            scale = this.reorder(scale)
            return res
        });
        next.pop()
        return [this.tonic, ...next]
    }

    inKey(intervals) {
        let notes = this.interval(intervals).map(n => this.note2MIDI(n, 0, this.offset()));

        // grid[row][col]
        var grid = new Array(8).fill(0).map(() => new Array(8).fill(0));

        var start = 0;
        // layout is in 4ths
        const layout = 3;
        var octave = 0;
        var numberOfNotes = notes.length;

        var octaveUp = 0;

        for (var row = 7; row >= 0; row--) {
            var octaveRow = octave;
            for (var col = 0; col < 8; col++) {
                var offset = (col + start) % numberOfNotes;

                // is root note
                if (offset == 0 && !(row == 7 && col == 0)) {
                    octaveRow = octaveRow + 1;
                }

                grid[row][col] = notes[offset] + 12 * octaveRow;
            }

            if (row == 5 || row == 3) {
                octaveUp = 0;
                octave = octave + 1;
            }

            start = (start + layout) % numberOfNotes;
        }

        return grid;
    }

    reorder(scale) {
        let tonic = this.tonic.replace(/^\w/, (c) => c.toUpperCase())
        let [head, ...tail] = scale
        if (scale.includes(tonic)) {
            if (head === tonic) {
                return scale
            }
            else {
                return this.reorder([...tail, head]);
            }
        }
        else {
            throw new Error(`tonic: ${tonic}, scale: ${scale}, message: tonic not included in scale`);
        }
    }

    flatten(scale) {
        return scale.map(n => {
            if (n === "G#") {
                return "Ab"
            }
            else if (n.includes("#")) {
                const nextChar = String.fromCharCode(n[0].charCodeAt(0) + 1)
                return nextChar + "b"
            }
            else {
                return n
            }
        })
    }

    step(s, scale) {
        let [w, x, y, z, ...rest] = scale
        if (s === "m") {
            return x
        }
        else if (s === "M") {
            return y
        }
        else if (s === "A") {
            return z
        }
        else {
            throw new Error("Unidentified step")
        }
    }
}

function arrDiff(a1, a2) {

    var a = [], diff = [];

    for (var i = 0; i < a1.length; i++) {
        a[a1[i]] = true;
    }

    for (var i = 0; i < a2.length; i++) {
        if (a[a2[i]]) {
            delete a[a2[i]];
        } else {
            a[a2[i]] = true;
        }
    }

    for (var k in a) {
        diff.push(k);
    }

    return diff;
}

const scale = new Scale('D');

// console.log(scale.interval(minorIntervals));
// console.log(scale.chromatic())

// console.log(arrDiff(scale.chromatic(), scale.interval(minorIntervals)))

// console.log(scale.interval(minorIntervals).map(n => note2MIDI(n, 5, scale.offset())));

const scaleC = new Scale('C#');

// const scaleA = new Scale('A');

// // console.log(scaleA.interval(majorPentatonicIntervals));
// // console.log(scaleA.interval(minorPentatonicIntervals));


// const scaleG = new Scale('G');
// console.log(scaleG.interval(mixolydianModeIntervals));

// const scaleE = new Scale('G');
// console.log(scaleE.interval(dorianModeIntervals));
//let notes = scaleC.interval(majorIntervals).map(n => note2MIDI(n, 0, scaleC.offset()));

//console.log(notes)

//const grid = scaleC.inKey(majorIntervals);
const grid = scaleC.inKey(dorianModeIntervals);

console.log(grid)

function note(row, col) {
    if (row < 5) {
        return 0;
    }
    return 60 + col + (8 * (7 - row));
}

// console.log(note(7, 0));
// console.log(note(7, 1));
// console.log(note(7, 2));
// console.log(note(7, 3));
// console.log(note(6, 0));
