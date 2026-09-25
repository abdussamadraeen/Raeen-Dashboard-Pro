export const enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export const enum ErrorCategory {
  STORAGE = 'storage',
  NETWORK = 'network',
  PROXY = 'proxy',
  RENDER = 'render',
  PERMISSION = 'permission',
  INITIALIZATION = 'initialization',
  RUNTIME = 'runtime',
}

export class AppError extends Error {
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly timestamp: number;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    category: ErrorCategory,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    this.category = category;
    this.severity = severity;
    this.timestamp = Date.now();
    this.context = context;
  }
}

export type RaeenError = AppError;
export const RaeenError = AppError;

export class StorageError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, ErrorCategory.STORAGE, ErrorSeverity.HIGH, context);
    this.name = 'StorageError';
  }
}

export class NetworkError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, ErrorCategory.NETWORK, ErrorSeverity.MEDIUM, context);
    this.name = 'NetworkError';
  }
}

export class ProxyError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, ErrorCategory.PROXY, ErrorSeverity.HIGH, context);
    this.name = 'ProxyError';
  }
}

export class PermissionError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, ErrorCategory.PERMISSION, ErrorSeverity.CRITICAL, context);
    this.name = 'PermissionError';
  }
}

export class InitializationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, ErrorCategory.INITIALIZATION, ErrorSeverity.CRITICAL, context);
    this.name = 'InitializationError';
  }
}
