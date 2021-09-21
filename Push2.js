// This file is a Atom Paino Roll 2 script for the Push 2.
// Documentation on Atom scripting: https://github.com/victorporof/atom

/* VERSION 1 */
/* global atom, midi */

/* import "Shared/Constants.js" */
/* global Constants */

/* import "Shared/Helpers.js" */
/* global Util */

//-----------------------------------------------------------------------------
// Some basic Scale and note stuff
//-----------------------------------------------------------------------------

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
const dorianModeIntervals = "MmMMMmM";

const majorPentatonicIntervals = 'MMAMA';
const minorPentatonicIntervals = 'AMMAM';



/**
 * A representation of a scale built on a tonic.
 */
class Scale {
  /**
   * Constructs a scale instance.
   * @param {String} tonic
   */
  constructor(tonic, mode) {
    this.tonic = tonic;
    this.mode = mode;

    this.pads = new Map();
    this.gridColors = new Array(8).fill(0).map(() => new Array(8).fill(0));

    this.sharp = false;
    this.tonicToIndex(tonic);
    this.resetPads();
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

  getIntervals() {
    switch (this.mode) {
      case 0:
        return majorIntervals;
      case 1:
        return minorIntervals;
      case 2:
        return dorianModeIntervals;
    }
  }

  tonicToIndex(tonic) {
    const t = tonic[0];
    if (tonic.length == 2) {
      this.sharp = true;
    }
    this.index = tonic.charCodeAt(0) - 'C'.charCodeAt(0);
  }

  indexToTonic(index) {
    const n = String.fromCharCode(index + 'C'.charCodeAt(0));

    if (this.sharp) {
      return n + "#";
    }

    return n;
  }

  /**
   * Calculates the midi note for the tonic
   * @return {Number}
   */
  offset() {
    return notes2MIDI[this.tonic];
  }

  /**
   * Is MIDI note the tonic
   */
  isTonic(note) {
    return (note % 12) == this.offset();
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

  inKey() {
    const intervals = this.getIntervals();

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

      // TODO: better way to do this that is generic for layout and number of notes :-)
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

  resetPads() {
    for (var row = 0; row < Layout.rows; row++) {
      for (var col = 0; col < Layout.cols; col++) {
        const pad = new RowColPad(row, col);
        this.pads.set(pad.id, new Style(Color.off, Lighting.static));
        this.gridColors[row][col] = new Style(Color.off, Lighting.static);
      }
    }
    // in key or chomatic
    this.inKeyStyle();

    // row 2 is for sharps
    var pad = new RowColPad(2, 1);
    this.pads.set(pad.id, new Style(Color.lightYellow, Lighting.static));
    this.gridColors[2][1] = new Style(Color.lightYellow, Lighting.static);
    pad = new RowColPad(2, 2);
    this.pads.set(pad.id, new Style(Color.lightYellow, Lighting.static));
    this.gridColors[2][2] = new Style(Color.lightYellow, Lighting.static);

    pad = new RowColPad(2, 4);
    this.pads.set(pad.id, new Style(Color.lightYellow, Lighting.static));
    this.gridColors[2][4] = new Style(Color.lightYellow, Lighting.static);
    pad = new RowColPad(2, 5);
    this.pads.set(pad.id, new Style(Color.lightYellow, Lighting.static));
    this.gridColors[2][5] = new Style(Color.lightYellow, Lighting.static);
    pad = new RowColPad(2, 6);
    this.pads.set(pad.id, new Style(Color.lightYellow, Lighting.static));
    this.gridColors[2][6] = new Style(Color.lightYellow, Lighting.static);

    // if current tonic is a sharp, then set that pad to highlight it
    if (this.sharp) {
      const pad = new RowColPad(2, this.index);
      this.pads.set(pad.id, new Style(Color.red, Lighting.static));
      this.gridColors[2][this.index] = new Style(Color.red, Lighting.static);
    }

    for (var col = 0; col < 7; col++) {
      const pad = new RowColPad(3, col);
      if (!this.sharp && col == this.index) {
        this.pads.set(pad.id, new Style(Color.red, Lighting.static));
        this.gridColors[3][this.index] = new Style(Color.red, Lighting.static);
      }
      else {
        this.pads.set(pad.id, new Style(Color.blue, Lighting.static));
        this.gridColors[3][col] = new Style(Color.blue, Lighting.static);
      }
    }

    pad = new RowColPad(4, 0);
    if (this.mode == 0) {
      this.pads.set(pad.id, new Style(Color.darkGreen, Lighting.static));
      this.gridColors[4][0] = new Style(Color.darkGreen, Lighting.static);
    }
    else {
      this.pads.set(pad.id, new Style(Color.lightOrange, Lighting.static));
      this.gridColors[4][0] = new Style(Color.lightOrange, Lighting.static);
    }

    pad = new RowColPad(4, 1);
    if (this.mode == 1) {
      this.pads.set(pad.id, new Style(Color.darkGreen, Lighting.static));
      this.gridColors[4][1] = new Style(Color.darkGreen, Lighting.static);
    }
    else {
      this.pads.set(pad.id, new Style(Color.lightOrange, Lighting.static));
      this.gridColors[4][1] = new Style(Color.lightOrange, Lighting.static);
    }

    pad = new RowColPad(4, 2);
    if (this.mode == 2) {
      this.pads.set(pad.id, new Style(Color.darkGreen, Lighting.static));
      this.gridColors[4][2] = new Style(Color.darkGreen, Lighting.static);
    }
    else {
      this.pads.set(pad.id, new Style(Color.lightOrange, Lighting.static));
      this.gridColors[4][2] = new Style(Color.lightOrange, Lighting.static);
    }
  }

  inKeyStyle() {
    var pad = new RowColPad(0, 7);
    this.pads.set(pad.id, new Style(Color.green, Lighting.static));
    this.gridColors[0][7] = new Style(Color.green, Lighting.static);
  }

  chromaticStyle() {
    var pad = new RowColPad(0, 7);
    this.pads.set(pad.id, new Style(Color.lightRed, Lighting.static));
    this.gridColors[0][7] = new Style(Color.lightRed, Lighting.static);
  }

  getStyle(row, col) {
    return this.gridColors[row][col];
  }

  press(row, col) {
    // black keys, select tonic
    if (row == 2) {
      switch (col) {
        case 1:
          this.sharp = true;
          this.index = 1;
          this.tonic = "C#";
          break;
        case 2:
          this.sharp = true;
          this.index = 2;
          this.tonic = "D#";
          break;
        case 4:
          this.sharp = true;
          this.index = 4;
          this.tonic = "F#";
          break;
        case 5:
          this.sharp = true;
          this.index = 5;
          this.tonic = "G#";
          break;
        case 6:
          this.sharp = true;
          this.index = 6;
          this.tonic = "A#";
          break;
      }
    }
    // white keys, select tonic
    else if (row == 3 && col < 7) {
      this.sharp = false;
      this.index = col;
      this.tonic = String.fromCharCode(col + 'C'.charCodeAt(0));
    }
    // select mode
    else if (row == 4 && col < 3) {
      this.mode = col;
    }

    this.resetPads();
  }
}

//-----------------------------------------------------------------------------

/**
 * Device-specific constants describing button/pad colors.
 */
const Color = {
  off: 0,
  gray: 54,
  lightGray: 53,
  white: 120,
  lightRed: 1,
  red: 127,
  darkRed: 2,
  lightOrange: 5,
  orange: 69,
  darkOrange: 3,
  lightYellow: 30,
  yellow: 29,
  darkYellow: 8,
  lightGreen: 10,
  green: 126,
  darkGreen: 11,
  lightBlue: 95,
  blue: 99,
  darkBlue: 126,
  accent01: 33,
  accent02: 22,
  accent03: 79,
  accent04: 93,
  accent05: 111,
  accent06: 35,
  accent07: 44,
  accent08: 87,
  accent09: 115,
};

/**
 * Device-specific constants describing button/pad layout.
 */
const Layout = {
  topLeftPad: 92,
  bottomLeftPad: 36,
  rowSkip: 8,
  cols: 8,
  rows: 8,
};


/**
 * Implementation-specific constants describing the current view mode.
 */
const ViewMode = {
  koala: 1,   // Push being used for Koala control
  aum: 2,     // Push being used for AUM control
  note: 3,    // Push being used as Keyboard into Atom
  segments: 4, // Push being used as pad player into Atom for Segments
  session: 5, // Push being used as clip launcher
  scale: 6,   // Push being used to set scale for note mode
};

/**
 * Implementation-specific constants describing the current input mode.
 */
const InputMode = {
  normal: 1,
  stop: 2,
  solo: 3,
  mute: 4,
  record: 5,
};

/**
 * Implementation-specific constants describing the current pattern input mode.
 */
const MomentaryInputMode = {
  none: 1,
  clear: 2,
  duplicate: 3,
  quantize: 4,
  shift: 5,
};

const ButtonPads = {
  TAP_TEMPO: 3,
  METRONOME: 9,

  ABOVE_PAD1: 102,
  ABOVE_PAD2: 103,
  ABOVE_PAD3: 104,
  ABOVE_PAD4: 105,
  ABOVE_PAD5: 106,
  ABOVE_PAD6: 107,
  ABOVE_PAD7: 108,
  ABOVE_PAD8: 109,

  SETUP: 30,
  USER: 59,

  DELETE: 118,
  UNDO: 119,

  ADD_DEVICE: 52,
  DEVICE: 110,
  MIX: 112,
  ADD_TRACK: 53,
  BROWSE: 111,
  CLIP: 113,

  MUTE: 60,
  SOLO: 61,
  STOP: 29,

  BELOW_PAD1: 20,
  BELOW_PAD2: 21,
  BELOW_PAD3: 22,
  BELOW_PAD4: 23,
  BELOW_PAD5: 24,
  BELOW_PAD6: 25,
  BELOW_PAD7: 26,
  BELOW_PAD8: 27,

  MASTER: 28,
  UP_ARROW: 46,
  DOWN_ARROW: 47,
  LEFT_ARROW: 44,
  RIGHT_ARROW: 45,

  CONVERT: 35,
  DOUBLE_LOOP: 117,
  QUANTIZE: 116,
  DUPLICATE: 88,
  NEW: 87,
  FIXED_LENGTH: 90,
  AUTOMATE: 89,
  RECORD: 86,
  PLAY: 85,

  OCTAVE_UP: 55,
  OCTAVE_DOWN: 54,
  NOTE: 50,
  SCALE: 58,
  SHIFT: 49,
  SESSION: 51,

  // (cc) buttons for launching row of clips
  row0: 43,
  row1: 42,
  row2: 41,
  row3: 40,
  row4: 39,
  row5: 38,
  row6: 37,
  row7: 36,
};

/**
 * Additional device-specific constants identifying buttons on the bottom row.
 */
const BottomButton = {
  col0_above: 102,
  col1_above: 103,
  col2_above: 104,
  col3_above: 105,
  col4_above: 106,
  col5_above: 107,
  col6_above: 108,
  col7_above: 109,
  col0_below: 20,
  col1_below: 21,
  col2_below: 22,
  col3_below: 23,
  col4_below: 24,
  col5_below: 25,
  col6_below: 26,
  col7_below: 27,
};

const Knob = {
  ONE: 14,
  TWO: 15,
  THREE: 71,
  FOUR: 72,
  FIVE: 73,
  SIX: 74,
  SEVEN: 75,
  EIGHT: 76,
  NINE: 77,
  TEN: 78,
  ELEVEN: 79,
};

/**
 * Device-specific constants describing button/pad lighting.
 * Push 2 uses the midi channel to specify the mode and frequency
 */
const Lighting = {
  static: 0,
  flashing: 14, // blinking 1/4 note
  pulsing: 9,   // pulsing 1/4 note
};

/**
 * A full representation of the current internal controller state. This is used
 * for responding appropriately to button and pad presses.
 */
class ControllerState {
  /**
   * Constructs a controller state instance.
   */
  constructor() {
    // we assume that Koala Push 2 is also loaded, or will be, and so start in 
    // shared known state
    //this.viewMode = ViewMode.koala;
    this.viewMode = ViewMode.session;  
    this.inputMode = InputMode.normal;
    this.stopping = new Set(); // Set<TrackSlotPad>
    this.highlighting = new Set(); // Set<TrackSlotPad>
    this.momentaryInputMode = MomentaryInputMode.none;
  }
}

/**
 * Device-specific constants aliasing buttons.
 */
const ButtonAlias = {
  session: ButtonPads.SESSION,
};

/**
 * A pad that is represented by absolute row/column pairs.
 * Navigating up/down/left/right doesn't affect this pad's coords.
 */
class RowColPad {
  /**
   * Constructs a pad instance for a row and column.
   * @param {Number} row
   * @param {Number} col
   */
  constructor(row, col) {
    this.row = row;
    this.col = col;
  }

  /**
   * Gets a hashable id for this pad.
   * @return {String}
   */
  get id() {
    return `${this.row},${this.col}`;
  }

  /**
   * Constructs this pad using its hashable id.
   * @param {String} id
   * @return {RowColPad}
   */
  static fromId(id) {
    const [row, col] = id.split(",").map(Number);
    return new RowColPad(row, col);
  }
}

/**
 * A pad that is represented by a clip's track and slot indices.
 * Navigating up/down/left/right will offset this pad's coords.
 */
class TrackSlotPad {
  /**
   * Constructs a pad instance for a track and slot pair.
   * @param {Number} track
   * @param {Number} slot
   */
  constructor(track, slot) {
    this.track = track;
    this.slot = slot;
  }

  /**
   * Gets a hashable id for this pad.
   * @return {String}
   */
  get id() {
    return `${this.track},${this.slot}`;
  }

  /**
   * Constructs this pad using its hashable id.
   * @param {String} id
   * @return {TrackSlotPad}
   */
  static fromId(id) {
    const [track, slot] = id.split(",").map(Number);
    return new TrackSlotPad(track, slot);
  }
}

/**
 * A `Color` and `Lighting` pair describing the style of a pad or button.
 */
class Style {
  /**
   * Constructs a style instance for a color and lighting pair.
   * @param {Color} color
   * @param {Lighting} lighting
   */
  constructor(color, lighting = Lighting.static) {
    this.color = color;
    this.lighting = lighting;
  }

  /**
   * Checks if this style is equal to another style.
   * @param {Style} other
   * @return {Boolean}
   */
  equals(other) {
    return this.color == other.color && this.lighting == other.lighting;
  }
}

/**
 * A pad that is represented by absolute row/column pairs.
 * Navigating up/down/left/right doesn't affect this pad's coords.
 */
class TimestampStyle {
  /**
   * Constructs a pad instance for a row and column.
   * @param {Number} timestamp
   * @param {Style} style
   */
  constructor(timestamp, style) {
    this.timestamp = timestamp;
    this.style = style;
  }
}


/**
 * A full representation of all the buttons and pads on the controller. This is
 * used for comparing old and new state and then sending appropriate commands.
 */
class ViewState {
  /**
   * Constructs a view state instance.
   * @param {Boolean} clear Whether no previous state should be assumed.
   */
  constructor(clear = false) {
    this.clear = clear;
    this.buttons = new Map(); // Map<Button, Style>
    this.pads = new Map(); // Map<RowColPad, Style>
  }
}
/**
 * Mapping mode for Elliott Garage's Segments
 * Currently it is very strightforward, supporting only pads to play slices, with more features to come.
 * Segments supports only a max of 32 slices so only the bottom 32 pads on the Push are used. 
 *    - The top 32 pads are switched off
 *    - 4x4 bottom left pads are mapped to the first 16 slices (yellow)
 *    - 4x4 bottom right pads are mapped to 2nd 16 slices (orange)
 */
class Segments {
  constructor() {
    this.pads = new Map();
    this.gridColors = new Array(8).fill(0).map(() => new Array(8).fill(0));
  }

  /**
   * Compute note for pad 
   * @param {Number} row
   * @param {Number} col
   * @return {Number}
   */
  note(row, col) {
    if (row < 4) {
      return 0;
    }

    if (col < 4) {
      return 60 + col + (4 * (7 - row));
    }
    else {
      return 68 + col + (4 * (7 - row));
    }
  }

  resetPads() {
    for (var row = 0; row < Layout.rows; row++) {
      for (var col = 0; col < Layout.cols; col++) {
        const pad = new RowColPad(row, col);
        if (row < 4) {
          this.pads.set(pad.id, new Style(Color.off, Lighting.static));
          this.gridColors[row][col] = new Style(Color.off, Lighting.static);
        }
        else {
          if (col < 4) {
            this.pads.set(pad.id, new Style(Color.lightYellow, Lighting.static));
            this.gridColors[row][col] = new Style(Color.lightYellow, Lighting.static);
          }
          else {
            this.pads.set(pad.id, new Style(Color.orange, Lighting.static));
            this.gridColors[row][col] = new Style(Color.orange, Lighting.static);
          }
        }
      }
    }
  }

  getColor(row, col) {
    return this.gridColors[row][col];
  }

  pressed(row, col) {
    return (new Style(Color.green, Lighting.static));
  }

  unPressed(row, col) {
    if (col < 4) {
      return (new Style(Color.lightYellow, Lighting.static));
    }
    else {
      return (new Style(Color.orange, Lighting.static));
    }
  }

  clearPads() {
    this.pads.clear();
  }

  getPads() {
    return this.pads;
  }

  getStyle(row, col) {
    return this.gridColors[row][col];
  }

  /**
   * Find notes that match a given note and pairs with a style
   * @param {Number} row
   * @param {Number} col
   * @param {Style} style
   */
  press(row, col, style) {
    this.gridColors[row][col] = style;
  }

  release(row, col, timestamp) {
    const pad = new RowColPad(row, col);
    const entry = this.pressedI.get(pad.id);
    //this.pressedI.set(pad.id, new TimestampStyle(timestamp, this.unPressed()));
    if (entry != undefined) {
      //console.log(`${entry.timestamp} - ${timestamp}`);
      if (entry.timestamp <= timestamp) {
        this.pressedI.set(pad.id, new TimestampStyle(timestamp, this.unPressed(row, col)));
      }
    }
    else {
      this.pressedI.set(pad.id, new TimestampStyle(timestamp, this.unPressed(row, col)));
    }
    //this.pressedI.delete(pad.id);
  }
}

class InKey {
  constructor(tonic, mode) {
    this.scale = new Scale(tonic, mode);
    this.grid = this.scale.inKey();
    this.octave = 0;
    this.pads = new Map();
    this.gridColors = new Array(8).fill(0).map(() => new Array(8).fill(0));
    this.resetPads();

    this.pressedI = new Map(); // Map<RowColPad, Timestamp>
  }

  refresh() {
    this.grid = this.scale.inKey();
    this.octave = 0;
    this.pads = new Map();
    this.gridColors = new Array(8).fill(0).map(() => new Array(8).fill(0));
    this.resetPads();
  }

  changeScale(tonic) {
    this.scale = new Scale(tonic);
    this.grid = this.scale.inKey(mode);
    this.octave = 0;
    this.pads = this.pads.clear();
  }

  /**
   * Compute note for pad in current scale and octave
   * @param {Number} row
   * @param {Number} col
   * @return {Number}
   */
  note(row, col) {
    return this.grid[row][col] + 12 * this.octave;
  }

  upOctave() {
    if (this.octave >= 4) {
      this.octave = 4;
      return false;
    }
    this.octave = this.octave + 1;
    return true;
  }

  downOctave() {
    if (this.octave <= 0) {
      this.octave = 0;
      return false;
    }
    this.octave = this.octave - 1;
    return true;
  }

  resetPads() {
    for (var row = 0; row < Layout.rows; row++) {
      for (var col = 0; col < Layout.cols; col++) {
        const pad = new RowColPad(row, col);
        if (this.isTonic(row, col)) {
          this.pads.set(pad.id, new Style(Color.lightBlue, Lighting.static));
          this.gridColors[row][col] = new Style(Color.lightBlue, Lighting.static);
        }
        else {
          this.pads.set(pad.id, new Style(Color.lightYellow, Lighting.static));
          this.gridColors[row][col] = new Style(Color.lightYellow, Lighting.static);
        }
      }
    }
  }

  getColor(row, col) {
    return this.gridColors[row][col];
  }

  /**
   * Find notes that match a given note and pairs with a style
   * @param {Number} row
   * @param {Number} col
   * @param {Style} style
   */
  press(row, col, style) {
    // const pad = new RowColPad(row, col);
    // const entry = this.pressedI.get(pad.id);
    // if (entry != undefined) {
    //   if (entry.timestamp < timestamp) {
    //     this.pressedI.set(pad.id, new TimestampStyle(timestamp, this.pressed()));
    //   }
    // }
    // else {
    //   this.pressedI.set(pad.id, new TimestampStyle(timestamp, this.pressed()));
    // }
    // console.log("p");
    const n = this.grid[row][col];
    //console.log(`press: ${n}`);
    for (var r = 0; r < Layout.rows; r++) {
      for (var c = 0; c < Layout.cols; c++) {
        if (n == this.grid[r][c]) {
          // const pad = new RowColPad(r, c);
          // this.pads.set(pad.id, style);
          this.gridColors[r][c] = style;
          //console.log(`color: ${style.color}`);
        }
      }
    }
  }

  release(row, col, timestamp) {
    const pad = new RowColPad(row, col);
    const entry = this.pressedI.get(pad.id);
    //this.pressedI.set(pad.id, new TimestampStyle(timestamp, this.unPressed()));
    if (entry != undefined) {
      //console.log(`${entry.timestamp} - ${timestamp}`);
      if (entry.timestamp <= timestamp) {
        this.pressedI.set(pad.id, new TimestampStyle(timestamp, this.unPressed(row, col)));
      }
    }
    else {
      this.pressedI.set(pad.id, new TimestampStyle(timestamp, this.unPressed(row, col)));
    }
    //this.pressedI.delete(pad.id);
  }

  getStyle(row, col) {
    return this.gridColors[row][col];
    // const pad = new RowColPad(row, col);
    // const entry = this.pressedI.get(pad.id);
    // if (entry != undefined) {
    //   return entry.style;
    // }

    // // if (this.pressedI.has(pad.id)) {
    // //   return (new Style(Color.green, Lighting.static));
    // // }
    // else {
    //   if (this.isTonic(row, col)) {
    //     return (new Style(Color.lightBlue, Lighting.static));
    //   }
    //   else {
    //     return (new Style(Color.lightYellow, Lighting.static));
    //   }
    // }
  }

  pressed(row, col) {
    return (new Style(Color.green, Lighting.static));
  }

  unPressed(row, col) {
    if (this.isTonic(row, col)) {
      return (new Style(Color.lightBlue, Lighting.static));
    }
    else {
      return (new Style(Color.lightYellow, Lighting.static));
    }
  }

  isTonic(row, col) {
    return this.scale.isTonic(this.grid[row][col]);
  }

  clearPads() {
    this.pads.clear();
  }

  getPads() {
    return this.pads;
  }
}

/**
 * Push 2 controller.
 */
class Push2 {
  /**
   * Constructs a Push 2 controller instance.
   */
  constructor() {
    this.viewState = new ViewState();
    this.trackOffset = 0;
    this.slotOffset = 0;
    this.controllerState = new ControllerState();
    this.isFirstConnection = true;

    // this.inKey = new InKey('C', dorianModeIntervals);
    this.inKey = new InKey('C', 0);
    this.segments = new Segments();
  }

  // Custom device callbacks

  clearAll() {
    const messages = [];

    // Clear all pads.
    for (let i = 0; i < Layout.rows; i++) {
      for (let j = 0; j < Layout.cols; j++) {
        const pad = new RowColPad(i, j);
        messages.push(...this.setPadMessage(pad.row, pad.col, Color.off));
      }
    }

    // clear buttons above and below LCD
    for (const button of Object.values(BottomButton)) {
      messages.push(...this.setButtonMessage(button, Color.off));
    }

    return messages;
  }

  /**
   * Invoked when a Session button pressed specifying that the device has
   * entered the session layout.
   */
  didSwitchToSessionLayout(clear) {
    this.controllerState.viewMode = ViewMode.session;
    this.didSwitchLayout(clear);
  }

  /**
   * Invoked when a Koala button pressed specifying that the device has
   * entered the Koala mode.
   */
  didSwitchToKoalaLayout() {
    this.controllerState.viewMode = ViewMode.koala;
    this.didSwitchLayout();
  }

  /**
   * Invoked when a Scale button pressed specifying that the device has
   * entered the scale layout.
   */
  didSwitchToScaleLayout(clear) {
    this.controllerState.viewMode = ViewMode.scale;
    this.didSwitchLayout(clear);
  }

  /**
   * Invoked when a Note button was received specifying that the device has
   * entered the note layout.
   */
  didSwitchToNoteLayout() {
    this.controllerState.viewMode = ViewMode.note;
    this.didSwitchLayout();
  }

  /**
   * Invoked when a Note button was received specifying that the device has
   * entered the note layout.
   */
  didSwitchToSegmentsLayout() {
    this.controllerState.viewMode = ViewMode.segments;
    this.didSwitchLayout();
  }

  /**
     * Invoked when a Note button was received specifying that the device has
     * entered the note layout.
     */
  didSwitchToScaleLayout() {
    this.controllerState.viewMode = ViewMode.scale;
    this.didSwitchLayout();
  }

  /**
     * Invoked when a CC message was received (note, session, AUM, Koala)  
     * specifying that we are to switch layout (such as from 
     * 'session' to 'note' or vice-versa).
     */
  didSwitchLayout(clear) {
    this.render(clear);
  }

  /**
    * Invoked when a pad is pressed.
    * @param {Number} pitch
    * @param {Number} velocity
    * @param {Number} channel
    * @param {Number} timestamp
    */
  didPressPad(pitch, velocity, channel, timestamp) {
    // if (!this.isInBounds(this.getRowAndCol(pitch))) {
    //   // this does not rule out knob presses on the switch which are note messages too
    //   return;
    // }

    const { viewMode, inputMode, stopping, momentaryInputMode } = this.controllerState;
    const [row, col] = this.getRowAndCol(pitch);

    const [track, slot] = this.getTrackAndSlot(pitch);
    const clip = atom.getClipOnTrackAndSlot(track, slot);

    const isKoalaView = viewMode == ViewMode.koala;
    const isAUMView = viewMode == ViewMode.aum;
    const isNoteView = viewMode == ViewMode.note;
    const isScaleView = viewMode == ViewMode.scale;
    const isSegmentsView = viewMode == ViewMode.segments;
    const isSessionView = viewMode == ViewMode.session;
    const isRecordInputMode = inputMode == InputMode.record;
    const isNormalInputMode = inputMode == InputMode.normal;
    const isStopInputMode = inputMode == InputMode.stop;
    const isSoloInputMode = inputMode == InputMode.solo;
    const isMuteInputMode = inputMode == InputMode.mute;
    const isMomentaryClearInputMode = momentaryInputMode == MomentaryInputMode.clear;
    const isMomentaryDuplicateInputMode = momentaryInputMode == MomentaryInputMode.duplicate;
    const isMomentaryQuantizeInputMode = momentaryInputMode == MomentaryInputMode.quantize;
    const isBottomRow = row == Layout.rows - 1;

    // in Koala or AUM view we simply disregard all incoming input
    if (isKoalaView || isAUMView) {
      return;
    }

    if (isNoteView) {
      const note = this.inKey.note(row, col);
      atom.receiveNoteOn(note, velocity, channel, timestamp);
      //console.log(`note on: ${note}`);
      //console.log(`note on: ${note} - ${timestamp}`);
      //this.inKey.press(row, col, timestamp);
      this.inKey.press(row, col, this.inKey.pressed(row, col));
      this.render();
      return;
    }

    if (isSegmentsView) {
      // top 32 pads are not currently used in this mode
      if (row < 4) {
        return;
      }

      const note = this.segments.note(row, col);
      atom.receiveNoteOn(note, velocity, channel, timestamp);
      //console.log(`note on: ${note}`);
      //console.log(`note on: ${note} - ${timestamp}`);
      //this.inKey.press(row, col, timestamp);
      this.segments.press(row, col, this.segments.pressed(row, col));
      this.render();
      return;
    }

    if (isScaleView) {
      this.inKey.scale.press(row, col);
      this.render();
      return;
    }

    if (isMomentaryClearInputMode || isMomentaryDuplicateInputMode || isMomentaryQuantizeInputMode) {
      const pad = new TrackSlotPad(track, slot);
      highlighting.add(pad.id);
      this.render();
      return;
    }

    if (isSessionView) {
      if (isRecordInputMode) {
        if (clip != null && !clip.isRecording()) {
          atom.armClip(track, slot);
        } else if (clip != null && clip.isRecording()) {
          atom.disarmClip(track, slot);
        } else if (atom.isAnyPlayingOnTrack(track)) {
          const pad = new TrackSlotPad(track, slot);
          stopping.add(pad.id);
          atom.stopTrack(track);
        } else if (atom.isAnyTriggeringOnTrack(track)) {
          atom.stopTrack(track);
        }
        this.render();
        return;
      }

      if (clip != null && !clip.isLaunched()) {
        switch (clip.getNoteOnLaunchBehavior()) {
          case "noop":
          case "unlaunched:noop, launched:retrigger":
          case "unlaunched:noop, launched:release":
            break; // noop
          case "unlaunched:trigger, launched:noop":
          case "unlaunched:trigger, launched:retrigger":
          case "unlaunched:trigger, launched:release":
            atom.launchClip(track, slot);
            break;
        }
      } else if (clip != null && clip.isLaunched()) {
        switch (clip.getNoteOnLaunchBehavior()) {
          case "noop":
          case "unlaunched:trigger, launched:noop":
            break; // noop
          case "unlaunched:noop, launched:retrigger":
          case "unlaunched:trigger, launched:retrigger":
            atom.stopClip(track, slot);
            atom.launchClip(track, slot);
            break;
          case "unlaunched:noop, launched:release":
          case "unlaunched:trigger, launched:release":
            atom.stopClip(track, slot);
            break;
        }
      } else if (atom.isAnyPlayingOnTrack(track)) {
        const pad = new TrackSlotPad(track, slot);
        stopping.add(pad.id);
        atom.stopTrack(track);
      } else if (atom.isAnyTriggeringOnTrack(track)) {
        atom.stopTrack(track);
      }
      this.render();
      return;
    }


  }

  /**
   * Invoked when a pad is depressed.
   * @param {Number} pitch
   * @param {Number} velocity
   * @param {Number} channel
   * @param {Number} timestamp
   */
  didUnpressPad(pitch, velocity, channel, timestamp) {
    // if (!this.isInBounds(this.getRowAndCol(pitch))) {
    //   // this does not rule out knob presses on the switch which are note messages too
    //   return;
    // }

    const { viewMode, inputMode, momentaryInputMode, highlighting } = this.controllerState;
    const [row, col] = this.getRowAndCol(pitch);
    const [track, slot] = this.getTrackAndSlot(pitch);
    const clip = atom.getClipOnTrackAndSlot(track, slot);

    const isKoalaView = viewMode == ViewMode.koala;
    const isAUMView = viewMode == ViewMode.aum;
    const isNoteView = viewMode == ViewMode.note;
    const isSegmentsView = viewMode == ViewMode.segments;
    const isSessionView = viewMode == ViewMode.session;
    const isNormalInputMode = inputMode == InputMode.normal;
    const isBottomRow = row == Layout.rows - 1;
    const isMomentaryClearInputMode = momentaryInputMode == MomentaryInputMode.clear;
    const isMomentaryDuplicateInputMode = momentaryInputMode == MomentaryInputMode.duplicate;
    const isMomentaryQuantizeInputMode = momentaryInputMode == MomentaryInputMode.quantize;

    // in Koala or AUM view we simply disregard all incoming input
    if (isKoalaView || isAUMView) {
      return;
    }

    if (isNoteView) {
      const note = this.inKey.note(row, col);
      atom.receiveNoteOff(note, velocity, channel, timestamp);
      //console.log(`note off: ${note} - ${timestamp}`);
      //this.inKey.release(row, col, timestamp);
      this.inKey.press(row, col, this.inKey.unPressed(row, col));
      this.render();
      return;
    }

    if (isSegmentsView) {
      if (row < 4) {
        return;
      }
      const note = this.segments.note(row, col);
      atom.receiveNoteOff(note, velocity, channel, timestamp);
      //console.log(`note off: ${note} - ${timestamp}`);
      //this.inKey.release(row, col, timestamp);
      this.segments.press(row, col, this.segments.unPressed(row, col));
      this.render();
      return;
    }

    if (isMomentaryClearInputMode) {
      const pad = new TrackSlotPad(track, slot);
      highlighting.delete(pad.id);
      atom.clearActivePattern(track, slot);
      this.render();
      return;
    }

    if (isMomentaryDuplicateInputMode) {
      const pad = new TrackSlotPad(track, slot);
      highlighting.delete(pad.id);
      atom.duplicateActivePattern(track, slot);
      this.render();
      return;
    }

    if (isMomentaryQuantizeInputMode) {
      const pad = new TrackSlotPad(track, slot);
      highlighting.delete(pad.id);
      atom.toggleQuantization(track, slot);
      this.render();
      return;
    }

    if (isSessionView) {
      if (clip != null && !clip.isLaunched()) {
        switch (clip.getNoteOffLaunchBehavior()) {
          case "noop":
          case "unlaunched:noop, launched:retrigger":
          case "unlaunched:noop, launched:release":
            break; // noop
          case "unlaunched:trigger, launched:noop":
          case "unlaunched:trigger, launched:retrigger":
          case "unlaunched:trigger, launched:release":
            atom.launchClip(track, slot);
            break;
        }
      } else if (clip != null && clip.isLaunched()) {
        switch (clip.getNoteOffLaunchBehavior()) {
          case "noop":
          case "unlaunched:trigger, launched:noop":
            break; // noop
          case "unlaunched:noop, launched:retrigger":
          case "unlaunched:trigger, launched:retrigger":
            atom.stopClip(track, slot);
            atom.launchClip(track, slot);
            break;
          case "unlaunched:noop, launched:release":
          case "unlaunched:trigger, launched:release":
            atom.stopClip(track, slot);
            break;
        }
      }
      this.render();
      return;
    }
  }

  /**
   * Invoked when a button is pressed.
   * @param {Button} button
   * @param {Number} value
   * @param {Number} channel
   * @param {Number} timestamp
   */
  didPressButton(button, value, channel, timestamp) {

    const { viewMode, inputMode, stopping } = this.controllerState;
    const [maxTrack, maxSlot] = atom.getMaxTrackAndSlot();
    const track = this.getTrackForButton(button);

    const isSessionView = viewMode == ViewMode.session;
    const isNoteView = viewMode == ViewMode.note;
    const isKoalaView = viewMode == ViewMode.koala;
    const isSegmentsView = viewMode == ViewMode.segments;
    const isScaleView = viewMode == ViewMode.scale;
    const isStopInputMode = inputMode == InputMode.stop;
    const isSoloInputMode = inputMode == InputMode.solo;
    const isMuteInputMode = inputMode == InputMode.mute;
    const isRecordInputMode = inputMode == InputMode.record;

    // CHECKME: not 100% sure if this is always the right thing to do
    if (value == 0) {
      return;
    }

    if (isKoalaView) {
      // switch out of Koala view
      if (button == ButtonPads.ABOVE_PAD2) {
        this.didSwitchToSessionLayout(true);
      }
      return;
    }

    // switch to AUM mode
    if (button == ButtonPads.ABOVE_PAD1) {
      // pad updates will now be handled by Koala Push 2 app
      this.didSwitchToKoalaLayout();
      return;
    }

    if (button == ButtonPads.SCALE) {
      this.didSwitchToScaleLayout(true);
      return;
    }

    if (button == ButtonPads.NOTE && (isSessionView || isSegmentsView || isScaleView)) {
      if (isScaleView) {
        this.inKey.refresh();
      }
      this.inKey.resetPads();
      this.didSwitchToNoteLayout();
      return;
    }

    if (button == ButtonPads.NOTE && isNoteView) {
      if (isScaleView) {
        this.inKey.refresh();
      }

      this.segments.resetPads();
      this.didSwitchToSegmentsLayout();
      return;
    }

    if (button == ButtonPads.SESSION) {
      if (isScaleView) {
        this.inKey.refresh();
      }
      this.didSwitchToSessionLayout();
      return;
    }

    if (button == ButtonPads.SCALE) {
      this.didSwitchToScaleLayout();
      return;
    }

    if (isNoteView) {
      if (button == ButtonPads.OCTAVE_UP) {
        this.inKey.upOctave();
        return;
      }
      if (button == ButtonPads.OCTAVE_DOWN) {
        this.inKey.downOctave();
        return;
      }
    }

    if (isSessionView) {
      if (button == ButtonPads.row0) {
        const tracks = atom.getAllPlayingTracks();
        const pads = tracks.map((e) => new TrackSlotPad(e, this.slotOffset + 0));
        Util.formUnion(stopping, new Set(pads.map((e) => e.id)));
        atom.launchScene(this.slotOffset + 0);
        this.render();
        return;
      }

      if (button == ButtonPads.row1) {
        const tracks = atom.getAllPlayingTracks();
        const pads = tracks.map((e) => new TrackSlotPad(e, this.slotOffset + 1));
        Util.formUnion(stopping, new Set(pads.map((e) => e.id)));
        atom.launchScene(this.slotOffset + 1);
        this.render();
        return;
      }

      if (button == ButtonPads.row2) {
        const tracks = atom.getAllPlayingTracks();
        const pads = tracks.map((e) => new TrackSlotPad(e, this.slotOffset + 2));
        Util.formUnion(stopping, new Set(pads.map((e) => e.id)));
        atom.launchScene(this.slotOffset + 2);
        this.render();
        return;
      }

      if (button == ButtonPads.row3) {
        const tracks = atom.getAllPlayingTracks();
        const pads = tracks.map((e) => new TrackSlotPad(e, this.slotOffset + 3));
        Util.formUnion(stopping, new Set(pads.map((e) => e.id)));
        atom.launchScene(this.slotOffset + 3);
        this.render();
        return;
      }

      if (button == ButtonPads.row4) {
        const tracks = atom.getAllPlayingTracks();
        const pads = tracks.map((e) => new TrackSlotPad(e, this.slotOffset + 4));
        Util.formUnion(stopping, new Set(pads.map((e) => e.id)));
        atom.launchScene(this.slotOffset + 4);
        this.render();
        return;
      }

      if (button == ButtonPads.row5) {
        const tracks = atom.getAllPlayingTracks();
        const pads = tracks.map((e) => new TrackSlotPad(e, this.slotOffset + 5));
        Util.formUnion(stopping, new Set(pads.map((e) => e.id)));
        atom.launchScene(this.slotOffset + 5);
        this.render();
        return;
      }

      if (button == ButtonPads.row6) {
        const tracks = atom.getAllPlayingTracks();
        const pads = tracks.map((e) => new TrackSlotPad(e, this.slotOffset + 6));
        Util.formUnion(stopping, new Set(pads.map((e) => e.id)));
        atom.launchScene(this.slotOffset + 6);
        this.render();
        return;
      }

      if (button == ButtonPads.row7) {
        const tracks = atom.getAllPlayingTracks();
        const pads = tracks.map((e) => new TrackSlotPad(e, this.slotOffset + 7));
        Util.formUnion(stopping, new Set(pads.map((e) => e.id)));
        atom.launchScene(this.slotOffset + 7);
        this.render();
        return;
      }

      if (button == ButtonPads.STOP) {
        if (isStopInputMode) {
          this.controllerState.inputMode = InputMode.none;
        } else {
          this.controllerState.inputMode = InputMode.stop;
        }
        this.render();
        return;
      }

      if (button == ButtonPads.SOLO) {
        if (isSoloInputMode) {
          this.controllerState.inputMode = InputMode.none;
        } else {
          this.controllerState.inputMode = InputMode.solo;
        }
        this.render();
        return;
      }

      if (button == ButtonPads.MUTE) {
        if (isMuteInputMode) {
          this.controllerState.inputMode = InputMode.none;
        } else {
          this.controllerState.inputMode = InputMode.mute;
        }
        this.render();
        return;
      }

      if (button == ButtonPads.RECORD) {
        if (isRecordInputMode) {
          this.controllerState.inputMode = InputMode.none;
        } else {
          this.controllerState.inputMode = InputMode.record;
        }
        this.render();
        return;
      }

      if (isRecordInputMode && atom.hasClipOnTrack(track)) {
        if (atom.isAnyRecordingOnTrack(track)) {
          atom.disarmTrack(track);
        } else {
          const launchedClip = atom.getLaunchedClipWithLowestSlotOnTrack(track);
          const lowestClip = atom.getClipWithLowestSlotOnTrack(track);
          if (launchedClip != null) {
            atom.armClip(track, launchedClip.getSlot());
          } else if (lowestClip != null) {
            atom.armClip(track, lowestClip.getSlot());
          }
        }
        return;
      }

      if (isStopInputMode && atom.hasClipOnTrack(track)) {
        atom.stopTrack(track);
        return;
      }

      if (isSoloInputMode && atom.hasClipOnTrack(track)) {
        if (atom.isAllSoloingOnTrack(track)) {
          atom.unsoloTrack(track);
        } else {
          atom.soloTrack(track);
        }
        return;
      }

      if (isMuteInputMode && atom.hasClipOnTrack(track)) {
        if (atom.isAllMutedOnTrack(track)) {
          atom.unmuteTrack(track);
        } else {
          atom.muteTrack(track);
        }
        return;
      }

      // if (button == ButtonAlias.clear) {
      //   this.controllerState.momentaryInputMode = MomentaryInputMode.clear;
      //   this.render();
      //   return;
      // }

      if (button == ButtonPads.DUPLICATE) {
        this.controllerState.momentaryInputMode = MomentaryInputMode.duplicate;
        this.render();
        return;
      }

      if (button == ButtonPads.QUANTIZE) {
        this.controllerState.momentaryInputMode = MomentaryInputMode.quantize;
        this.render();
        return;
      }
    }
  }

  /**
   * Invoked when a button is depressed.
   * @param {Button} button
   * @param {Number} value
   * @param {Number} channel
   * @param {Number} timestamp
   */
  didUnpressButton(button, value, channel, timestamp) {
    const { viewMode, highlighting } = this.controllerState;

    const isSessionView = viewMode == ViewMode.session;

    // if (isSessionView && button == ButtonAlias.clear) {
    //   this.controllerState.momentaryInputMode = MomentaryInputMode.none;
    //   highlighting.clear();
    //   this.render();
    //   return;
    // }

    if (isSessionView && button == ButtonPads.DUPLICATE) {
      this.controllerState.momentaryInputMode = MomentaryInputMode.none;
      highlighting.clear();
      this.render();
      return;
    }

    if (isSessionView && button == ButtonPads.QUANTIZE) {
      this.controllerState.momentaryInputMode = MomentaryInputMode.none;
      highlighting.clear();
      this.render();
      return;
    }
  }

  /**
   * Invoked on any polyphonic aftertouch message.
   * @param {Number} pitch
   * @param {Number} pressure
   * @param {Number} channel
   * @param {Number} timestamp
   */
  didPolyphonicAftertouch(pitch, pressure, channel, timestamp) {
    const { viewMode } = this.controllerState;

    const isNoteView = viewMode == ViewMode.note;

    if (isNoteView) {
      atom.receivePolyphonicAftertouch(pitch, pressure, channel, timestamp);
      return;
    }
  }

  /**
   * Invoked on any channel aftertouch message.
   * @param {Number} pressure
   * @param {Number} channel
   * @param {Number} timestamp
   */
  didChannelAftertouch(pressure, channel, timestamp) {
    const { viewMode } = this.controllerState;

    const isNoteView = viewMode == ViewMode.note;

    if (isNoteView) {
      atom.receiveChannelAftertouch(pressure, channel, timestamp);
      return;
    }
  }

  /**
   * Invoked on any polyphonic aftertouch message.
   * @param {Number} pitch
   * @param {Number} pressure
   * @param {Number} channel
   * @param {Number} timestamp
   */
  didPitchbend(value, channel, timestamp) {
    const { viewMode } = this.controllerState;

    const isNoteView = viewMode == ViewMode.note;

    if (isNoteView) {
      atom.receivePitchBend(value, channel, timestamp);
      return;
    }
  }

  // Custom lifecycle callbacks

  /**
   * Invoked when the play state of a clip has been updated.
   * @param {Number} track
   * @param {Number} slot
   */
  update(track, slot) {
    const { viewMode, stopping } = this.controllerState;

    const isSessionView = viewMode == ViewMode.session;
    const isNoteView = viewMode == ViewMode.note;

    if (isSessionView) {
      const isStopping = atom.isAnyReleasingOnTrack(track);

      const pads = Array.from(stopping, TrackSlotPad.fromId);
      const padsOnOtherTracks = pads.filter((e) => e.track != track);
      const padsOnGivenTrackIfStopping = pads.filter((e) => e.track == track && isStopping);
      const padsToKeep = [...padsOnOtherTracks, ...padsOnGivenTrackIfStopping];
      Util.formIntersection(stopping, new Set(padsToKeep.map((e) => e.id)));
    }
  }

  /**
     * Invoked when the controller must be updated.
     * @param {Boolean} clear Whether no previous state should be assumed.
     */
  render(clear) {
    const { viewMode, inputMode, momentaryInputMode, stopping, highlighting } = this.controllerState;
    const [maxTrack, maxSlot] = atom.getMaxTrackAndSlot();

    const nextState = new ViewState(clear);

    const isSessionView = viewMode == ViewMode.session;
    const isNoteView = viewMode == ViewMode.note;
    const isKoalaView = viewMode == ViewMode.koala;
    const isSegmentsView = viewMode == ViewMode.segments;
    const isScaleView = viewMode == ViewMode.scale;

    const isMomentaryClearInputMode = momentaryInputMode == MomentaryInputMode.clear;
    const isMomentaryDuplicateInputMode = momentaryInputMode == MomentaryInputMode.duplicate;
    const isMomentaryQuantizeInputMode = momentaryInputMode == MomentaryInputMode.quantize;
    const isWaiting = isMomentaryClearInputMode || isMomentaryDuplicateInputMode || isMomentaryQuantizeInputMode;

    if (isKoalaView) {
      nextState.buttons.set(ButtonPads.ABOVE_PAD1, new Style(Color.blue));
      nextState.buttons.set(ButtonPads.ABOVE_PAD2, new Style(Color.white));
    }
    else {
      nextState.buttons.set(ButtonPads.ABOVE_PAD1, new Style(Color.white));
      nextState.buttons.set(ButtonPads.ABOVE_PAD2, new Style(Color.blue));
    }

    if (isNoteView) {
      // for (const [id, style] of this.inKey.getPads()) {
      //   nextState.pads.set(id, style);
      // }
      //  cv  c.,this.inKey.clearPads(); // reset on mode switch
      for (var r = 0; r < 8; r++) {
        for (var c = 0; c < 8; c++) {
          //const style = this.inKey.getColor(r, c);
          const pad = new RowColPad(r, c);
          const style = this.inKey.getStyle(r, c);
          nextState.pads.set(pad.id, style);
        }
      }

      // for (const id of inKeyPads) {
      //   const { pad, style } = RowColPadStyle.fromId(id);
      //   nextState.pads.set(pad.id, style);
      // }

    }
    else if (isSegmentsView) {
      for (var r = 0; r < 8; r++) {
        for (var c = 0; c < 8; c++) {
          //const style = this.inKey.getColor(r, c);
          const pad = new RowColPad(r, c);
          const style = this.segments.getStyle(r, c);
          nextState.pads.set(pad.id, style);
        }
      }
    }
    else if (isScaleView) {
      for (var r = 0; r < 8; r++) {
        for (var c = 0; c < 8; c++) {
          //const style = this.inKey.getColor(r, c);
          const pad = new RowColPad(r, c);
          const style = this.inKey.scale.getStyle(r, c);
          nextState.pads.set(pad.id, style);
        }
      }
    }
    else if (isSessionView) {
      // for (const clip of atom.getAllFocusedClips()) {
      //   const color = this.getRawColor(clip);
      //   const lighting = this.getLighting(clip);
      //   nextState.buttons.set(Button.logo, new Style(color, lighting));
      // }

      for (const id of stopping) {
        const { track, slot } = TrackSlotPad.fromId(id);
        const [row, col] = this.getPadCoords(track, slot);
        const pad = new RowColPad(row, col);
        nextState.pads.set(pad.id, new Style(Color.darkGreen, Lighting.flashing));
      }

      for (const clip of atom.getClips()) {
        const isLaunched = clip.isLaunched();
        const track = clip.getTrack();
        const slot = clip.getSlot();
        const [row, col] = this.getPadCoords(track, slot);
        const pad = new RowColPad(row, col);
        const color = isWaiting ? (isLaunched ? this.getRawColor(clip) : Color.lightGray) : this.getColor(clip);
        const lighting = this.getLighting(clip);
        nextState.pads.set(pad.id, new Style(color, lighting));
      }

      for (const id of highlighting) {
        const { track, slot } = TrackSlotPad.fromId(id);
        const [row, col] = this.getPadCoords(track, slot);
        const pad = new RowColPad(row, col);
        nextState.pads.set(pad.id, new Style(Color.white));
      }

      if (isMomentaryDuplicateInputMode) {
        nextState.buttons.set(ButtonPads.DUPLICATE, new Style(Color.white));
      } else {
        nextState.buttons.set(ButtonPads.DUPLICATE, new Style(Color.gray));
      }
      if (isMomentaryQuantizeInputMode) {
        nextState.buttons.set(ButtonPads.QUANTIZE, new Style(Color.white));
      } else {
        nextState.buttons.set(ButtonPads.QUANTIZE, new Style(Color.gray));
      }
    }

    if (atom.hasFocusedClips()) {
      if (atom.hasRecordingTracks()) {
        nextState.buttons.set(ButtonPads.RECORD, new Style(Color.red));
      } else {
        nextState.buttons.set(ButtonPads.RECORD, new Style(Color.darkRed));
      }
    } else {
      if (atom.hasRecordingTracks()) {
        nextState.buttons.set(ButtonPads.RECORD, new Style(Color.red, Lighting.flashing));
      } else {
        // noop
      }
    }

    // if (this.trackOffset > 0) {
    //   nextState.buttons.set(ButtonAlias.left, new Style(Color.lightGray));
    // }
    // if (this.trackOffset < maxTrack) {
    //   nextState.buttons.set(ButtonAlias.right, new Style(Color.lightGray));
    // }
    // if (this.slotOffset > 0) {
    //   nextState.buttons.set(ButtonAlias.up, new Style(Color.lightGray));
    // }
    // if (this.slotOffset < maxSlot) {
    //   nextState.buttons.set(ButtonAlias.down, new Style(Color.lightGray));
    // }

    if (atom.isBulkTriggeringOnSlot(this.slotOffset + 0)) {
      nextState.buttons.set(ButtonPads.row0, new Style(Color.green, Lighting.flashing));
    }
    else {
      nextState.buttons.set(ButtonPads.row0, new Style(Color.lightGray, Lighting.static));
    }
    if (atom.isBulkTriggeringOnSlot(this.slotOffset + 1)) {
      nextState.buttons.set(ButtonPads.row1, new Style(Color.green, Lighting.flashing));
    }
    else {
      nextState.buttons.set(ButtonPads.row1, new Style(Color.lightGray, Lighting.static));
    }
    if (atom.isBulkTriggeringOnSlot(this.slotOffset + 2)) {
      nextState.buttons.set(ButtonPads.row2, new Style(Color.green, Lighting.flashing));
    }
    else {
      nextState.buttons.set(ButtonPads.row2, new Style(Color.lightGray, Lighting.static));
    }
    if (atom.isBulkTriggeringOnSlot(this.slotOffset + 3)) {
      nextState.buttons.set(ButtonPads.row3, new Style(Color.green, Lighting.flashing));
    }
    else {
      nextState.buttons.set(ButtonPads.row3, new Style(Color.lightGray, Lighting.static));
    }
    if (atom.isBulkTriggeringOnSlot(this.slotOffset + 4)) {
      nextState.buttons.set(ButtonPads.row4, new Style(Color.green, Lighting.flashing));
    }
    else {
      nextState.buttons.set(ButtonPads.row4, new Style(Color.lightGray, Lighting.static));
    }
    if (atom.isBulkTriggeringOnSlot(this.slotOffset + 5)) {
      nextState.buttons.set(ButtonPads.row5, new Style(Color.green, Lighting.flashing));
    }
    else {
      nextState.buttons.set(ButtonPads.row5, new Style(Color.lightGray, Lighting.static));
    }

    if (atom.isBulkTriggeringOnSlot(this.slotOffset + 6)) {
      nextState.buttons.set(ButtonPads.row6, new Style(Color.green, Lighting.flashing));
    }
    else {
      nextState.buttons.set(ButtonPads.row6, new Style(Color.lightGray, Lighting.static));
    }

    switch (inputMode) {
      case InputMode.none:
        this.setNormalMode(nextState);
        break;
      case InputMode.stop:
        this.setStopMode(nextState);
        break;
      case InputMode.solo:
        this.setSoloMode(nextState);
        break;
      case InputMode.mute:
        this.setMuteMode(nextState);
        break;
      case InputMode.record:
        this.setRecordMode(nextState);
        break;
    }

    midi.emit(this.diff(this.viewState, nextState));
    this.viewState = nextState;
  }

  /**
   * Builds a note On message for customizing a pad.
   * @param {Number} row
   * @param {Number} col
   * @param {Color} color
   * @param {Lighting} lighting
   * @return {Array<Number>}
   */
  setPadMessage(row, col, color, lighting = Lighting.static) {
    const index = (Layout.rows - row - 1) * Layout.rowSkip + col;
    return [Constants.kNoteOn + lighting, Layout.bottomLeftPad + index, color];
  }


  /**
   * Builds a SysEx message for customizing a button.
   * Does not actually send any message, only builds an array of numbers.
   * @param {Button} button
   * @param {Color} color
   * @param {Lighting} lighting
   * @return {Array<Number>}
   */
  setButtonMessage(button, color, lighting = Lighting.static) {
    // if (button == ButtonAlias.session && color == Color.off) {
    //   return this.resetSessionButtonMessage();
    // }
    // if (button == ButtonAlias.session && color != Color.off) {
    //   return this.setSessionButtonMessage(color);
    // }
    return [Constants.kControlChange + lighting, button, color];
  }

  /**
     * Whenever something needs to visually change on the controller (e.g. pads
     * lighting up, buttons blinking etc.), a full new description of it is built,
     * representing the next desired state. This method compares this next state
     * to the previous existing state. The differences are then converted into an
     * array of SysEx messages which represent the most efficient set of changes
     * that need to be made to update the controller.
     * @param {ViewState} prev
     * @param {ViewState} next
     * @return {Array<Number>}
     */
  diff(prev, next) {
    const messages = [];

    // Clear the controller if no previous state is assumed.
    if (next.clear) {
      messages.push(...this.clearAll());
    }

    //Turn off all buttons that aren't used in the next state.
    for (const button of prev.buttons.keys()) {
      // If the button is explicity styled in the next state, don't turn it off.
      if (next.buttons.has(button)) {
        continue;
      }
      messages.push(...this.setButtonMessage(button, Color.off));
    }

    // Turn off all pads that aren't used in the next state.
    for (const id of prev.pads.keys()) {
      // When the pad is offset out of bounds, no changes are necessary.
      const pad = RowColPad.fromId(id);
      if (!this.isInBounds(pad)) {
        continue;
      }
      // If the pad is explicity styled in the next state, don't turn it off.
      if (next.pads.has(id)) {
        continue;
      }
      messages.push(...this.setPadMessage(pad.row, pad.col, Color.off));
    }

    // Update all buttons in the next state that differ from the previous state.
    for (const [button, style] of next.buttons) {
      // When the color and lighting are the same, no changes are necessary.
      const prevStyle = prev.buttons.get(button);
      if (prevStyle != null && prevStyle.equals(style)) {
        continue;
      }
      // When the lighting changes, need to prepend an 'off' message.
      if (prevStyle != null && prevStyle.lighting != style.lighting) {
        messages.push(...this.setButtonMessage(button, Color.off));
      }
      messages.push(...this.setButtonMessage(button, style.color, style.lighting));
    }

    // Update all pads in the next state that differ from the previous state.
    for (const [id, style] of next.pads) {
      // When the pad is offset out of bounds, no changes are necessary.
      const pad = RowColPad.fromId(id);
      if (!this.isInBounds(pad)) {
        continue;
      }
      // When the color and lighting are the same, no changes are necessary.
      const prevStyle = prev.pads.get(id);
      if (prevStyle != null && prevStyle.equals(style)) {
        continue;
      }
      // When the lighting changes, need to prepend an 'off' message.
      // if (prevStyle != null && prevStyle.lighting != style.lighting) {
      //   messages.push(...this.setPadMessage(pad.row, pad.col, Color.off));
      // }
      messages.push(...this.setPadMessage(pad.row, pad.col, style.color, style.lighting));
    }

    return messages;
  }

  // Common helpers

  /**
   * Checks if a pad is inside the visible bounds.
   * @param {RowColPad} pad
   * @return {Boolean}
   */
  isInBounds(pad) {
    const { row, col } = pad;
    return row >= 0 && row < Layout.rows && col >= 0 && col < Layout.cols;
  }

  /**
   * Gets the absolute row and column coordinates for a track and slot pair,
   * that can be offset when pressing the arrow buttons.
   * @param {Number} track
   * @param {Number} slot
   * @return {Array<Number>}
   */
  getPadCoords(track, slot) {
    const row = slot - this.slotOffset;
    const col = track - this.trackOffset;
    return [row, col];
  }

  /**
  * Gets the absolute row and column coordinates for a MIDI note.
  * @param {Number} pitch
  * @param {Number} slot
  * @return {Array<Number>}
  */
  getRowAndCol(pitch) {
    const tmpPitch = pitch - Layout.bottomLeftPad
    const row = Layout.rows - Math.floor(tmpPitch / Layout.rowSkip) - 1;
    const col = tmpPitch % Layout.rowSkip;
    return [row, col];
  }

  /**
   * Gets the track and slot coordinates for a MIDI note.
   * @param {Number} pitch
   * @param {Number} slot
   * @return {Array<Number>}
   */
  getTrackAndSlot(pitch) {
    const [row, col] = this.getRowAndCol(pitch);
    const track = col + this.trackOffset;
    const slot = row + this.slotOffset;
    return [track, slot];
  }

  /**
   * Gets the controller color for a clip depending on the selected color index.
   * @param {atom.Clip} clip
   * @return {Color}
   */
  getRawColor(clip) {
    switch (clip.getColor() % 9) {
      case 0:
        return Color.accent01;
      case 1:
        return Color.accent02;
      case 2:
        return Color.accent03;
      case 3:
        return Color.accent04;
      case 4:
        return Color.accent05;
      case 5:
        return Color.accent06;
      case 6:
        return Color.accent07;
      case 7:
        return Color.accent08;
      case 8:
        return Color.accent09;
      default:
        return Color.off;
    }
  }

  /**
   * Gets the desired color for a clip depending on the play state.
   * @param {atom.Clip} clip
   * @return {Color}
   */
  getColor(clip) {
    if (clip.isRecording()) {
      return Color.red;
    }
    if (clip.willStart() || clip.isPlaying()) {
      return Color.green;
    }
    return this.getRawColor(clip);
  }

  /**
   * Gets the desired lighting for a clip depending on the play state.
   * @param {atom.Clip} clip
   * @return {Color}
   */
  getLighting(clip) {
    if (clip.willStart() || clip.willStop()) {
      return Lighting.flashing;
    }
    if (clip.isPlaying()) {
      return Lighting.pulsing;
    }
    return Lighting.static;
  }

  /**
   * Invoked when the view state needs to be populated in 'normal mode'.
   * @param {ViewState} nextState
   */
  setNormalMode(nextState) {
    for (let i = 0; i < Layout.cols; i++) {
      const track = this.trackOffset + i;
      if (!atom.hasClipOnTrack(track)) {
        continue;
      }
      const button = BottomButton.col0_below + i;
      nextState.buttons.set(button, new Style(Color.lightGray));
    }

    nextState.buttons.set(ButtonPads.STOP, new Style(Color.lightGray));
    nextState.buttons.set(ButtonPads.SOLO, new Style(Color.lightGray));
    nextState.buttons.set(ButtonPads.MUTE, new Style(Color.lightGray));
    nextState.buttons.set(ButtonPads.RECORD, new Style(Color.lightGray));
  }

  /**
   * Invoked when the view state needs to be populated in 'stop mode'.
   * @param {ViewState} nextState
   */
  setStopMode(nextState) {
    for (let i = 0; i < Layout.cols; i++) {
      const track = this.trackOffset + i;
      if (!atom.hasClipOnTrack(track)) {
        continue;
      }
      const button = BottomButton.col0_below + i;
      const color = atom.isAnyNotStoppedOnTrack(track) ? Color.red : Color.darkRed;
      const lighting = atom.isBulkReleasingOnTrack(track) ? Lighting.flashing : Lighting.static;
      nextState.buttons.set(button, new Style(color, lighting));
    }

    nextState.buttons.set(ButtonPads.STOP, new Style(Color.red));
    nextState.buttons.set(ButtonPads.SOLO, new Style(Color.lightGray));
    nextState.buttons.set(ButtonPads.MUTE, new Style(Color.lightGray));
    nextState.buttons.set(ButtonPads.RECORD, new Style(Color.lightGray));
  }

  /**
   * Invoked when the view state needs to be populated in 'solo mode'.
   * @param {ViewState} nextState
   */
  setSoloMode(nextState) {
    for (let i = 0; i < Layout.cols; i++) {
      const track = this.trackOffset + i;
      if (!atom.hasClipOnTrack(track)) {
        continue;
      }
      const button = BottomButton.col0_below + i;
      const color = atom.isAllSoloingOnTrack(track) ? Color.blue : Color.darkBlue;
      nextState.buttons.set(button, new Style(color));
    }

    nextState.buttons.set(ButtonPads.STOP, new Style(Color.lightGray));
    nextState.buttons.set(ButtonPads.SOLO, new Style(Color.blue));
    nextState.buttons.set(ButtonPads.MUTE, new Style(Color.lightGray));
    nextState.buttons.set(ButtonPads.RECORD, new Style(Color.lightGray));
  }

  /**
   * Invoked when the view state needs to be populated in 'mute mode'.
   * @param {ViewState} nextState
   */
  setMuteMode(nextState) {
    for (let i = 0; i < Layout.cols; i++) {
      const track = this.trackOffset + i;
      if (!atom.hasClipOnTrack(track)) {
        continue;
      }
      const button = BottomButton.col0_below + i;
      const color = atom.isAllMutedOnTrack(track) ? Color.darkYellow : Color.yellow;
      nextState.buttons.set(button, new Style(color));
    }

    nextState.buttons.set(ButtonPads.STOP, new Style(Color.lightGray));
    nextState.buttons.set(ButtonPads.SOLO, new Style(Color.lightGray));
    nextState.buttons.set(ButtonPads.MUTE, new Style(Color.yellow));
    nextState.buttons.set(ButtonPads.RECORD, new Style(Color.lightGray));
  }

  /**
   * Invoked when the view state needs to be populated in 'record mode'.
   * @param {ViewState} nextState
   */
  setRecordMode(nextState) {
    for (let i = 0; i < Layout.cols; i++) {
      const track = this.trackOffset + i;
      if (!atom.hasClipOnTrack(track)) {
        continue;
      }
      const button = BottomButton.col0_below + i;
      const color = atom.isAnyRecordingOnTrack(track) ? Color.red : Color.darkRed;
      nextState.buttons.set(button, new Style(color));
    }

    nextState.buttons.set(ButtonPads.STOP, new Style(Color.lightGray));
    nextState.buttons.set(ButtonPads.SOLO, new Style(Color.lightGray));
    nextState.buttons.set(ButtonPads.MUTE, new Style(Color.lightGray));
    nextState.buttons.set(ButtonPads.RECORD, new Style(Color.red));
  }

  // Other helpers

  /**
   * Gets the track coordinate for a track button.
   * Returns -1 if not the right type of button.
   * @param {BottomButton} button
   * @return {Number}
   */
  getTrackForButton(button) {
    if (button > BottomButton.col7) {
      return -1;
    }
    if (button < ButtonPads.col0) {
      return -1;
    }
    const col = button - BottomButton.col0_below;
    return col + this.trackOffset;
  }

  /**
   * Resets pads and  buttons to start up state.
   * @return {Array<Number>}
   */
  reset() {
    return [
      ...controller.setButtonMessage(ButtonPads.MUTE, Color.lightGray),
      ...controller.setButtonMessage(ButtonPads.SOLO, Color.lightGray),
      ...controller.setButtonMessage(ButtonPads.STOP, Color.lightGray),

      ...controller.setButtonMessage(ButtonPads.OCTAVE_UP, Color.lightGray),
      ...controller.setButtonMessage(ButtonPads.OCTAVE_DOWN, Color.lightGray),
      ...controller.setButtonMessage(ButtonPads.NOTE, Color.lightGray),
      ...controller.setButtonMessage(ButtonPads.SCALE, Color.lightGray),
      ...controller.setButtonMessage(ButtonPads.SESSION, Color.lightGray),

      ...controller.setButtonMessage(ButtonPads.UP_ARROW, Color.lightGray),
      ...controller.setButtonMessage(ButtonPads.DOWN_ARROW, Color.lightGray),
      ...controller.setButtonMessage(ButtonPads.LEFT_ARROW, Color.lightGray),
      ...controller.setButtonMessage(ButtonPads.RIGHT_ARROW, Color.lightGray),

      ...controller.setButtonMessage(ButtonPads.DUPLICATE, Color.lightGray),
      ...controller.setButtonMessage(ButtonPads.QUANTIZE, Color.lightGray),
      ...controller.setButtonMessage(ButtonPads.SHIFT, Color.lightGray),

      ...controller.setButtonMessage(ButtonPads.ABOVE_PAD1, Color.blue),
      ...controller.setButtonMessage(ButtonPads.ABOVE_PAD2, Color.lightGray),
    ]
  }

  setPadSensitivity() {
    return [
      ...[0xF0, 0x00, 0x21, 0x1D, 0x01, 0x01, 0x20, 0x00,
        0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x10, 0x18,
        0x1E, 0x23, 0x28, 0x2C, 0x2F, 0x33, 0x36, 0x39, 0xF7],
      ...[0xF0, 0x00, 0x21, 0x1D, 0x01, 0x01, 0x20, 0x10,
        0x3C, 0x3E, 0x41, 0x44, 0x46, 0x49, 0x4B, 0x4E,
        0x50, 0x52, 0x55, 0x57, 0x59, 0x5C, 0x5E, 0x61, 0xF7],
      ...[0xF0, 0x00, 0x21, 0x1D, 0x01, 0x01, 0x20, 0x20, 0x63,
        0x66, 0x68, 0x6B, 0x6E, 0x71, 0x74, 0x77, 0x7C,
        0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0xF7],
      ...[0xF0, 0x00, 0x21, 0x1D, 0x01, 0x01, 0x20, 0x30, 0x7F,
        0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F,
        0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0xF7],
      ...[0xF0, 0x00, 0x21, 0x1D, 0x01, 0x01, 0x20, 0x40, 0x7F,
        0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F,
        0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0xF7],
      ...[0xF0, 0x00, 0x21, 0x1D, 0x01, 0x01, 0x20, 0x50, 0x7F, 0x7F,
        0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F,
        0x7F, 0x7F, 0x7F, 0x7F, 0xF7],
      ...[0xF0, 0x00, 0x21, 0x1D, 0x01, 0x01, 0x20, 0x60, 0x7F, 0x7F,
        0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F,
        0x7F, 0x7F, 0x7F, 0x7F, 0xF7],
      ...[0xF0, 0x00, 0x21, 0x1D, 0x01, 0x01, 0x20, 0x70, 0x7F, 0x7F,
        0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F,
        0x7F, 0x7F, 0x7F, 0x7F, 0xF7],
      ...[0xF0, 0x00, 0x21, 0x1D, 0x01, 0x01, 0x1B, 0x21, 0x00, 0x1F,
        0x00, 0x44, 0x09, 0x22, 0x0C, 0xF7],
    ];

  }

  setPadGain() {
    return [
      ...[
        0xF0, 0x00, 0x21, 0x1D, 0x01, 0x01, 0x20, 0x00, 0x01, 0x01, 0x01, 0x01,
        0x01, 0x01, 0x10, 0x18, 0x1E, 0x23, 0x28, 0x2C, 0x2F, 0x33, 0x36, 0x39, 0xF7],
      ...[
        0xF0, 0x00, 0x21, 0x1D, 0x01, 0x01, 0x20, 0x10, 0x3C, 0x3E, 0x41, 0x44, 0x46,
        0x49, 0x4B, 0x4E, 0x50, 0x52, 0x55, 0x57, 0x59, 0x5C, 0x5E, 0x61, 0xF7],
      ...[
        0xF0, 0x00, 0x21, 0x1D, 0x01, 0x01, 0x20, 0x20, 0x63, 0x66, 0x68, 0x6B, 0x6E,
        0x71, 0x74, 0x77, 0x7C, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0xF7],
      ...[
        0xF0, 0x00, 0x21, 0x1D, 0x01, 0x01, 0x20, 0x30, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F,
        0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0xF7],
      ...[
        0xF0, 0x00, 0x21, 0x1D, 0x01, 0x01, 0x20, 0x40, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F,
        0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0xF7],
      ...[
        0xF0, 0x00, 0x21, 0x1D, 0x01, 0x01, 0x20, 0x50, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F,
        0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0xF7],
      ...[
        0xF0, 0x00, 0x21, 0x1D, 0x01, 0x01, 0x20, 0x60, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F,
        0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0xF7],
      ...[
        0xF0, 0x00, 0x21, 0x1D, 0x01, 0x01, 0x20, 0x70, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F,
        0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0xF7],
      ...[
        0xF0, 0x00, 0x21, 0x1D, 0x01, 0x01, 0x1B, 0x21, 0x00, 0x1F, 0x00, 0x44, 0x09,
        0x22, 0x0C, 0xF7],
    ]
  }

  setPadDynamics() {
    return [
      ...[0xF0, 0x00, 0x21, 0x1D, 0x01, 0x01, 0x20, 0x00, 0x01, 0x01, 0x01, 0x01,
        0x01, 0x01, 0x10, 0x18, 0x1E, 0x23, 0x28, 0x2C, 0x2F, 0x33, 0x36, 0x39, 0xF7],
      ...[0xF0, 0x00, 0x21, 0x1D, 0x01, 0x01, 0x20, 0x10, 0x3C, 0x3E, 0x41, 0x44,
        0x46, 0x49, 0x4B, 0x4E, 0x50, 0x52, 0x55, 0x57, 0x59, 0x5C, 0x5E, 0x61, 0xF7],
      ...[0xF0, 0x00, 0x21, 0x1D, 0x01, 0x01, 0x20, 0x20, 0x63, 0x66, 0x68, 0x6B,
        0x6E, 0x71, 0x74, 0x77, 0x7C, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0xF7],
      ...[0xF0, 0x00, 0x21, 0x1D, 0x01, 0x01, 0x20, 0x30, 0x7F, 0x7F, 0x7F, 0x7F,
        0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0xF7],
      ...[0xF0, 0x00, 0x21, 0x1D, 0x01, 0x01, 0x20, 0x40, 0x7F, 0x7F, 0x7F, 0x7F,
        0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0xF7],
      ...[0xF0, 0x00, 0x21, 0x1D, 0x01, 0x01, 0x20, 0x50, 0x7F, 0x7F, 0x7F, 0x7F,
        0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0xF7],
      ...[0xF0, 0x00, 0x21, 0x1D, 0x01, 0x01, 0x20, 0x60, 0x7F, 0x7F, 0x7F, 0x7F,
        0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0xF7],
      ...[0xF0, 0x00, 0x21, 0x1D, 0x01, 0x01, 0x20, 0x70, 0x7F, 0x7F, 0x7F, 0x7F,
        0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0xF7],
      ...[0xF0, 0x00, 0x21, 0x1D, 0x01, 0x01, 0x1B, 0x21, 0x00, 0x1F, 0x00, 0x44,
        0x09, 0x22, 0x0C, 0xF7],
    ];
  }

  setLedBrightness(brightness) {
    return [0xF0, 0x00, 0x21, 0x1D, 0x01, 0x01, 0x06, brightness, 0xF7];
  }

  // 18: 16: 52.275	To Live Port	SysEx		Ableton 9 bytes	F0 00 21 1D 01 01 06 3A F7
  //18: 17: 46.214	To Live Port	SysEx		Ableton 9 bytes	F0 00 21 1D 01 01 06 3C F7

}

const controller = new Push2();

// Atom: MIDI device configuration
// These constants are used by Atom for automatically connecting to this device.

/**
 * The ports on the device to listen for MIDI on.
 */
const INPUTS = [
  // Example:
  "Ableton Push 2 Live Port"
];

/**
 * The ports on the device to send MIDI to.
 */
const OUTPUTS = [
  // Example:
  "Ableton Push 2 Live Port"
];

/**
 * Messages to send to the device when connecting.
 */
const CONNECT_MESSAGES = [
  ...controller.setPadSensitivity(),
  ...controller.setPadGain(),
  ...controller.setPadDynamics(),
  ...controller.setLedBrightness(0x3C),
  ...controller.reset()
];

/**
 * Messages to send to the device when disconnecting.
 */
const DISCONNECT_MESSAGES = [];

// Atom: MIDI device callbacks
// These functions are called by Atom when various MIDI events occur.

/**
 * A MIDI Note ON message was received from the device.
 * @param {Number} pitch
 * @param {Number} velocity
 * @param {Number} channel
 * @param {Number} timestamp
 */
function onNoteOn(pitch, velocity, channel, timestamp) {
  if (velocity != 0) {
    controller.didPressPad(pitch, velocity, channel, timestamp);
  } else {
    //controller.didUnpressPad(pitch, velocity, channel, timestamp);
  }
}

/**
 * A MIDI Note OFF message was received from the device.
 * @param {Number} pitch
 * @param {Number} velocity
 * @param {Number} channel
 * @param {Number} timestamp
 */
function onNoteOff(pitch, velocity, channel, timestamp) {
  controller.didUnpressPad(pitch, velocity, channel, timestamp);
}

/**
 * A MIDI CC message was received from the device.
 * @param {Number} cc
 * @param {Number} value
 * @param {Number} channel
 * @param {Number} timestamp
 */
function onCc(cc, value, channel, timestamp) {
  if (value == 127) {
    controller.didPressButton(cc, value, channel, timestamp);
  } else if (value == 0) {
    controller.didUnpressButton(cc, value, channel, timestamp);
  }
}

/**
 * A MIDI Polyphonic Aftertouch message was received from the device.
 * @param {Number} pitch
 * @param {Number} pressure
 * @param {Number} channel
 * @param {Number} timestamp
 * @param {String} port
 */
function onPolyphonicAftertouch(pitch, pressure, channel, timestamp, port) {
  controller.didPolyphonicAftertouch(pitch, pressure, channel, timestamp);
}

/**
 * A MIDI Channel Aftertouch message was received from the device.
 * @param {Number} pressure
 * @param {Number} channel
 * @param {Number} timestamp
 * @param {String} port
 */
function onChannelAftertouch(pressure, channel, timestamp, port) {
  controller.didChannelAftertouch(pressure, channel, timestamp);
}

/**
 * A MIDI Pitch Bend message was received from the device.
 * @param {Number} value
 * @param {Number} channel
 * @param {Number} timestamp
 */
function onPitchBend(value, channel, timestamp) {
  controller.didPitchbend(value, channel, timestamp);
}

/**
 * A MIDI Program Change message was received from the device.
 * @param {Number} program
 * @param {Number} channel
 * @param {Number} timestamp
 */
function onProgramChange(program, channel, timestamp) {
  // TODO
}

/**
 * A MIDI SysEx message was received from the device.
 * @param {Array<Number>} message
 * @param {Number} timestamp
 */
function onSysEx(message, timestamp) {
  // TODO
}

// Atom: lifecycle callbacks
// These functions are called by Atom when various internal events occur.

/**
 * The play state of a clip has been updated.
 * @param {Number} track
 * @param {Number} slot
 */
function onUpdate(track, slot) {
  controller.update(track, slot);
}

/**
 * The controller must be updated.
 * @param {Boolean} clear Whether no previous state should be assumed.
 */
function onRender(clear) {
  controller.render(clear);
}
