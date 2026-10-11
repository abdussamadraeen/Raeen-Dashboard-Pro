import { Logger } from './logger';
import { safeCall } from './safeCall';

/**
 * Universal Agent-Native Command Types
 * Enterprise clean-room command architecture.
 */
export type CommandCategory =
  | 'workspace'
  | 'widget'
  | 'security'
  | 'studio'
  | 'notes'
  | 'timer'
  | 'system';

export interface CommandPayloadMap {
  'workspace:setMode': { mode: 'pro' | 'focus' | 'security' | 'creator' | 'minimal' };
  'workspace:resetLayout': Record<string, never>;
  'widget:setPosition': { widgetId: string; left: string; top: string };
  'widget:setSize': { widgetId: string; width: string; height: string };
  'widget:toggleVisibility': { widgetId: string; visible: boolean };
  'security:connectVpn': { nodeId: string };
  'security:disconnectVpn': Record<string, never>;
  'security:setWebRTCShield': { enabled: boolean };
  'security:setKillSwitch': { enabled: boolean };
  'security:clearTraces': Record<string, never>;
  'notes:create': { title: string; content: string; color?: string };
  'notes:delete': { id: string };
  'notes:update': { id: string; content: string };
  'timer:start': { durationMinutes?: number; mode?: 'work' | 'shortBreak' | 'longBreak' };
  'timer:pause': Record<string, never>;
  'timer:reset': Record<string, never>;
  'studio:loadImage': { sourceUrl: string; name?: string };
  'studio:applyFilter': { filter: 'grayscale' | 'invert' | 'sepia' | 'blur' | 'brightness' | 'contrast' | 'sharpen' | 'vignette' | 'remove_bg'; value?: number };
  'studio:clearCanvas': Record<string, never>;
  'studio:exportCanvas': { format?: 'png' | 'jpeg' | 'webp'; quality?: number };
  'photocraft:setTool': { tool: string };
  'photocraft:applyFilter': { filter: string; value?: number };
  'photocraft:removeBackground': { tolerance?: number };
  'vectorcraft:generateSquircle': { size?: number; n?: number; fill?: string };
  'pdfcraft:compress': { quality?: number; scale?: number };
  'system:ping': { timestamp: number };
}

export type CommandType = keyof CommandPayloadMap;

export interface AgentCommand<T extends CommandType = CommandType> {
  id: string;
  type: T;
  payload: CommandPayloadMap[T];
  timestamp: number;
  source: 'user' | 'agent' | 'script' | 'mcp';
  undoable?: boolean;
}

export type CommandHandler<T extends CommandType = CommandType> = (
  payload: CommandPayloadMap[T],
  command: AgentCommand<T>
) => Promise<unknown> | unknown;

export interface CommandSnapshot {
  command: AgentCommand;
  inversePayload?: unknown;
}

/**
 * AgentCommandBus
 * The single, decoupled, agent-native control plane for Raeen Workspace.
 * Enables both humans and AI agents (Claude, Gemini, MCP) to drive every capability.
 */
export class AgentCommandBus {
  private handlers = new Map<CommandType, CommandHandler<any>>();
  private history: CommandSnapshot[] = [];
  private undoStack: CommandSnapshot[] = [];
  private redoStack: CommandSnapshot[] = [];
  private maxHistorySize = 100;
  private listeners: Array<(cmd: AgentCommand, result: unknown) => void> = [];

  constructor(maxHistorySize = 100) {
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * Register a handler for a specific command type.
   */
  register<T extends CommandType>(type: T, handler: CommandHandler<T>): () => void {
    this.handlers.set(type, handler);
    return () => {
      if (this.handlers.get(type) === handler) {
        this.handlers.delete(type);
      }
    };
  }

  /**
   * Execute an atomic command through the command bus.
   */
  async execute<T extends CommandType>(
    type: T,
    payload: CommandPayloadMap[T],
    options: {
      source?: 'user' | 'agent' | 'script' | 'mcp';
      undoable?: boolean;
      inversePayload?: unknown;
    } = {}
  ): Promise<{ success: boolean; result?: unknown; error?: string; commandId: string }> {
    const handler = this.handlers.get(type);
    const commandId = `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const cmd: AgentCommand<T> = {
      id: commandId,
      type,
      payload,
      timestamp: Date.now(),
      source: options.source ?? 'agent',
      undoable: options.undoable ?? false,
    };

    if (!handler) {
      const err = `No handler registered for command: ${type}`;
      Logger.warn(`[AgentCommandBus] ${err}`, cmd);
      return { success: false, error: err, commandId };
    }

    try {
      const result = await handler(payload, cmd);

      // Record in history
      const snapshot: CommandSnapshot = {
        command: cmd,
        inversePayload: options.inversePayload,
      };

      this.history.push(snapshot);
      if (this.history.length > this.maxHistorySize) {
        this.history.shift();
      }

      if (cmd.undoable && options.inversePayload !== undefined) {
        this.undoStack.push(snapshot);
        this.redoStack = []; // Clear redo stack on new action
        if (this.undoStack.length > this.maxHistorySize) {
          this.undoStack.shift();
        }
      }

      // Notify telemetry and external agent listeners
      for (const listener of this.listeners) {
        safeCall(() => listener(cmd, result), 'commandBusListener');
      }

      Logger.info(`[AgentCommandBus] Executed: ${type} (${cmd.source})`, { commandId, payload });
      return { success: true, result, commandId };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      Logger.error(`[AgentCommandBus] Command failed: ${type}`, err);
      return { success: false, error: errorMsg, commandId };
    }
  }

  /**
   * Subscribe to all command executions (for UI sync, logging, MCP broadcasting).
   */
  subscribe(listener: (cmd: AgentCommand, result: unknown) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Undo the last reversible command.
   */
  async undo(): Promise<boolean> {
    const snapshot = this.undoStack.pop();
    if (!snapshot || snapshot.inversePayload === undefined) {
      return false;
    }

    const { command, inversePayload } = snapshot;
    const res = await this.execute(
      command.type,
      inversePayload as any,
      { source: 'agent', undoable: false }
    );

    if (res.success) {
      this.redoStack.push({ command, inversePayload: command.payload });
      return true;
    }
    return false;
  }

  /**
   * Redo the last undone command.
   */
  async redo(): Promise<boolean> {
    const snapshot = this.redoStack.pop();
    if (!snapshot) return false;

    const { command } = snapshot;
    const res = await this.execute(
      command.type,
      command.payload as any,
      { source: 'agent', undoable: true, inversePayload: snapshot.inversePayload }
    );

    return res.success;
  }

  /**
   * Export execution history as a structured JSON recipe for AI reasoning.
   */
  exportHistoryJSON(): string {
    return JSON.stringify(
      this.history.map((h) => ({
        id: h.command.id,
        type: h.command.type,
        payload: h.command.payload,
        timestamp: h.command.timestamp,
        source: h.command.source,
      })),
      null,
      2
    );
  }

  /**
   * Clear all command history and undo stacks.
   */
  clear(): void {
    this.history = [];
    this.undoStack = [];
    this.redoStack = [];
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  get historyCount(): number {
    return this.history.length;
  }
}

// Global Singleton for Workspace Instance
export const GlobalCommandBus = new AgentCommandBus();
