Task: Create components/PianoRollGrid.tsx (TypeScript React) for MFZ MIDI.

Requirements:
- Export default PianoRollGrid React component (client-side 'use client').
- Props:
  - initialNotes?: NoteEvent[]
  - onNotesChange?: (notes: NoteEvent[]) => void
  - pitches?: number[] (defaults to one octave C4..B4)
  - quantize?: number (seconds per column, default 0.25)
- Render a simple grid: rows = pitches, columns = time slots (e.g., 32 columns).
- Clicking a grid cell should add a note at that time/pitch with default duration=quantize and velocity=100. If clicking an existing note, remove it.
- Notes stored in local state; call onNotesChange on change.
- Render notes as absolutely positioned Tailwind-styled divs over the grid.
- Keep code simple and well-commented for a beginner to understand.
- Use TypeScript and Tailwind classes for styling.
- Provide a short usage snippet in comments.
