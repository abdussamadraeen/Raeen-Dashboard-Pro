import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentCommandBus } from '../../lib/agentCommandBus';

describe('AgentCommandBus', () => {
  let bus: AgentCommandBus;

  beforeEach(() => {
    bus = new AgentCommandBus(50);
  });

  it('registers and executes a command successfully', async () => {
    const handler = vi.fn().mockReturnValue({ switched: true });
    bus.register('workspace:setMode', handler);

    const result = await bus.execute('workspace:setMode', { mode: 'focus' });

    expect(result.success).toBe(true);
    expect(result.result).toEqual({ switched: true });
    expect(handler).toHaveBeenCalledWith(
      { mode: 'focus' },
      expect.objectContaining({ type: 'workspace:setMode' })
    );
  });

  it('returns failure when no handler is registered', async () => {
    const result = await bus.execute('security:clearTraces', {});

    expect(result.success).toBe(false);
    expect(result.error).toContain('No handler registered');
  });

  it('notifies subscribers on command execution', async () => {
    const listener = vi.fn();
    bus.subscribe(listener);

    bus.register('timer:start', vi.fn());
    await bus.execute('timer:start', { durationMinutes: 25 });

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'timer:start' }),
      undefined
    );
  });

  it('handles undo and redo correctly', async () => {
    let currentMode: string = 'pro';

    bus.register('workspace:setMode', (payload) => {
      currentMode = payload.mode;
      return currentMode;
    });

    // Execute undoable command
    await bus.execute(
      'workspace:setMode',
      { mode: 'focus' },
      { undoable: true, inversePayload: { mode: 'pro' } }
    );
    expect(currentMode).toBe('focus');
    expect(bus.canUndo).toBe(true);

    // Undo back to pro
    const undone = await bus.undo();
    expect(undone).toBe(true);
    expect(currentMode).toBe('pro');
    expect(bus.canRedo).toBe(true);

    // Redo back to focus
    const redone = await bus.redo();
    expect(redone).toBe(true);
    expect(currentMode).toBe('focus');
  });

  it('exports execution history to JSON', async () => {
    bus.register('notes:create', vi.fn());
    await bus.execute('notes:create', { title: 'Test Note', content: 'Hello World' });

    const json = bus.exportHistoryJSON();
    const parsed = JSON.parse(json);

    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(1);
    expect(parsed[0].type).toBe('notes:create');
    expect(parsed[0].payload.title).toBe('Test Note');
  });
});
