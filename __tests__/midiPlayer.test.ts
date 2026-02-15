import { buildScheduledEvents, type NoteEvent } from '@/lib/midiPlayer';

describe('buildScheduledEvents', () => {
  it('sorts notes and maps beat positions to seconds', () => {
    const notes: NoteEvent[] = [
      {
        duration: 0.5,
        id: 'n2',
        midi: 64,
        pitch: 'E4',
        time: 1,
        velocity: 0.8
      },
      {
        duration: 0.25,
        id: 'n1',
        midi: 60,
        pitch: 'C4',
        time: 0,
        velocity: 0.9
      }
    ];

    const scheduled = buildScheduledEvents(notes, 120);

    expect(scheduled).toHaveLength(2);
    expect(scheduled[0].id).toBe('n1');
    expect(scheduled[0].timeSeconds).toBeCloseTo(0);
    expect(scheduled[1].id).toBe('n2');
    expect(scheduled[1].timeSeconds).toBeCloseTo(0.5);
    expect(scheduled[1].durationSeconds).toBeCloseTo(0.25);
  });

  it('normalizes invalid note values', () => {
    const notes: NoteEvent[] = [
      {
        duration: 0,
        id: 'bad',
        midi: 200,
        pitch: '',
        time: -1,
        velocity: 3
      }
    ];

    const [scheduled] = buildScheduledEvents(notes, 100);

    expect(scheduled.timeSeconds).toBe(0);
    expect(scheduled.durationSeconds).toBeGreaterThan(0);
    expect(scheduled.velocity).toBe(1);
  });
});
