export interface Audiobook {
  id: string;
  title?: string;
  genre?: string;
  style?: string;  // Assuming "style" refers to the author or writing style
  plot?: string;
  pov?: string;  // Point of View
  voice?: string;  // Reference to a voice type (potentially a key in a map)
  starring?: string;
  location?: string;  // Description of story location
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
  location?: string;  // Description of story location
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

export interface Voice {
  name: string;
  subscriberOnly: boolean;
}

export const voices = new Map<string, Voice>([
    ['onyx', { name: 'Paul', subscriberOnly: false }],
    ['alloy', { name: 'Sophia', subscriberOnly: false }],
    ['nova', { name: 'Kate', subscriberOnly: false }],
    ['shimmer', { name: 'Eve', subscriberOnly: false }],
    ['fable', { name: 'Orion', subscriberOnly: false }],
    ['Roger', { name: 'Roger', subscriberOnly: true }],
    ['Sarah', { name: 'Sarah', subscriberOnly: true }],
    ['Laura', { name: 'Laura', subscriberOnly: true }], 
    ['Charlie', { name: 'Charlie', subscriberOnly: true }], 
    ['Callum', { name: 'Callum', subscriberOnly: true }], 
]);
