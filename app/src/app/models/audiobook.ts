export interface Audiobook {
  id: string;
  title?: string;
  genre?: string;
  style?: string;  // Assuming "style" refers to the author or writing style
  plot?: string;
  pov?: string;  // Point of View
  voice?: string;  // Reference to a voice type (potentially a key in a map)
  starring?: string;
  chapters?: Chapter[];  // A list of chapters with URLs to the audio files
  createdDate?: Date;
  status?: 'progress' | 'error' | 'completed';  // To represent the status of the audiobook
}

export interface AudiobookRequest {
  title?: string;
  genre?: string;
  style?: string;  // Assuming "style" refers to the author or writing style
  plot?: string;
  pov?: string;  // Point of View
  voice?: string;  // Reference to a voice type (potentially a key in a map)
  starring?: string;
  image?: string | ArrayBuffer | null;
}

export interface Chapter {
  chapterId: number;
  chapterUrl: string;  // URL to the audio file for each chapter
}

export const narrationTypes = new Map([
  ['first', 'First Person'],
  ['third-limited', 'Third Person Limited'],
  ['third-omni', 'Third Person Omniscient'],
  ['third-object', 'Third Person Objective (Dramatic)'],
  ['second', 'Second Person'],
  ['multiple', 'Multiple Points of View'],
  ['consciousness', 'Stream of Consciousness'],
  ['unreliable', 'Unreliable Narrator'],
  ['plural', 'First Person Plural'],
  ['detached', 'Detached Narrator']
]);

export const voices = new Map([
    ['onyx', 'Paul'],
    ['alloy', 'Sophia'],
    ['nova', 'Kate'],
    ['shimmer', 'Eve'],
    ['fable', 'Orion'],
]);