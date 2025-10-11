/**
 * Retry Manager
 *
 * Provides resilient operation execution with:
 * - Exponential backoff
 * - Configurable retry policies
 * - Error classification
 * - Circuit breaker pattern
 */

import { RetryConfig } from '../../layer/data.types';

export interface RetryResult<T> {
  success: boolean;
  value?: T;
  error?: Error;
  attempts: number;
  totalDelay: number;
}

export interface CircuitBreakerConfig {
  enabled: boolean;
  failureThreshold: number; // Number of failures before opening circuit
  resetTimeout: number; // Time before attempting to close circuit (ms)
  halfOpenMaxAttempts: number; // Max attempts in half-open state
}

export enum CircuitState {
  CLOSED = 'closed', // Normal operation
  OPEN = 'open', // Failing, reject immediately
  HALF_OPEN = 'half-open' // Testing if service recovered
}

/**
 * Retry Manager for resilient operations
 */
export class RetryManager {
  private config: RetryConfig;
  private circuitBreakerConfig: CircuitBreakerConfig;
  private circuitState: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private halfOpenAttempts: number = 0;

  constructor(
    config: Partial<RetryConfig> = {},
    circuitBreakerConfig: Partial<CircuitBreakerConfig> = {}
  ) {
    this.config = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      retryableErrors: [],
      ...config
    };

    this.circuitBreakerConfig = {
      enabled: false,
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      halfOpenMaxAttempts: 3,
      ...circuitBreakerConfig
    };
  }

  /**
   * Execute operation with retry logic
   */
  async execute<T>(
    operation: () => Promise<T>,
    operationName: string = 'operation'
  ): Promise<RetryResult<T>> {
    // Check circuit breaker
    if (this.circuitBreakerConfig.enabled && !this.canAttempt()) {
      return {
        success: false,
        error: new Error(`Circuit breaker is ${this.circuitState} for ${operationName}`),
        attempts: 0,
        totalDelay: 0
      };
    }

    let lastError: Error | undefined;
    let totalDelay = 0;

    for (let attempt = 1; attempt <= this.config.maxRetries + 1; attempt++) {
      try {
        const value = await operation();

        // Success - reset circuit breaker
        this.onSuccess();

        return {
          success: true,
          value,
          attempts: attempt,
          totalDelay
        };
      } catch (error) {
        lastError = error as Error;

        // Check if error is retryable
        if (!this.isRetryable(lastError)) {
          this.onFailure();
          break;
        }

        // Don't retry if max attempts reached
        if (attempt > this.config.maxRetries) {
          this.onFailure();
          break;
        }

        // Calculate delay with exponential backoff
        const delay = this.calculateDelay(attempt);
        totalDelay += delay;

        // Log retry attempt
        console.warn(
          `Retry attempt ${attempt}/${this.config.maxRetries} for ${operationName} after ${delay}ms. Error: ${lastError.message}`
        );

        // Wait before retry
        await this.sleep(delay);
      }
    }

    return {
      success: false,
      error: lastError,
      attempts: this.config.maxRetries + 1,
      totalDelay
    };
  }

  /**
   * Execute with timeout
   */
  async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    operationName: string = 'operation'
  ): Promise<RetryResult<T>> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Operation ${operationName} timed out after ${timeoutMs}ms`)), timeoutMs);
    });

    const wrappedOperation = () => Promise.race([operation(), timeoutPromise]);

    return this.execute(wrappedOperation, operationName);
  }

  /**
   * Execute multiple operations with retry
   */
  async executeAll<T>(
    operations: Array<() => Promise<T>>,
    failFast: boolean = false
  ): Promise<RetryResult<T>[]> {
    const results: RetryResult<T>[] = [];

    for (const operation of operations) {
      const result = await this.execute(operation);
      results.push(result);

      if (failFast && !result.success) {
        break;
      }
    }

    return results;
  }

  /**
   * Execute operations in parallel with retry
   */
  async executeAllParallel<T>(
    operations: Array<() => Promise<T>>
  ): Promise<RetryResult<T>[]> {
    return Promise.all(operations.map(op => this.execute(op)));
  }

  /**
   * Check if operation can be attempted (circuit breaker check)
   */
  private canAttempt(): boolean {
    if (!this.circuitBreakerConfig.enabled) {
      return true;
    }

    const now = Date.now();

    switch (this.circuitState) {
      case CircuitState.CLOSED:
        return true;

      case CircuitState.OPEN:
        // Check if reset timeout has passed
        if (now - this.lastFailureTime >= this.circuitBreakerConfig.resetTimeout) {
          this.circuitState = CircuitState.HALF_OPEN;
          this.halfOpenAttempts = 0;
          return true;
        }
        return false;

      case CircuitState.HALF_OPEN:
        return this.halfOpenAttempts < this.circuitBreakerConfig.halfOpenMaxAttempts;

      default:
        return true;
    }
  }

  /**
   * Handle successful operation
   */
  private onSuccess(): void {
    if (!this.circuitBreakerConfig.enabled) {
      return;
    }

    if (this.circuitState === CircuitState.HALF_OPEN) {
      // Close circuit after successful attempt in half-open state
      this.circuitState = CircuitState.CLOSED;
      this.failureCount = 0;
      this.halfOpenAttempts = 0;
    } else if (this.circuitState === CircuitState.CLOSED) {
      // Reset failure count on success
      this.failureCount = 0;
    }
  }

  /**
   * Handle failed operation
   */
  private onFailure(): void {
    if (!this.circuitBreakerConfig.enabled) {
      return;
    }

    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.circuitState === CircuitState.HALF_OPEN) {
      this.halfOpenAttempts++;

      if (this.halfOpenAttempts >= this.circuitBreakerConfig.halfOpenMaxAttempts) {
        // Re-open circuit
        this.circuitState = CircuitState.OPEN;
      }
    } else if (this.circuitState === CircuitState.CLOSED) {
      if (this.failureCount >= this.circuitBreakerConfig.failureThreshold) {
        // Open circuit
        this.circuitState = CircuitState.OPEN;
      }
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryable(error: Error): boolean {
    // If specific retryable errors are configured, check against them
    if (this.config.retryableErrors && this.config.retryableErrors.length > 0) {
      return this.config.retryableErrors.some(errorType =>
        error.message.includes(errorType) || error.name === errorType
      );
    }

    // Default: retry all errors except specific non-retryable ones
    const nonRetryablePatterns = [
      /validation/i,
      /invalid/i,
      /unauthorized/i,
      /forbidden/i,
      /not found/i
    ];

    return !nonRetryablePatterns.some(pattern => pattern.test(error.message));
  }

  /**
   * Calculate delay with exponential backoff
   */
  private calculateDelay(attempt: number): number {
    const delay = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt - 1);

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay; // ±10% jitter

    return Math.min(delay + jitter, this.config.maxDelay);
  }

  /**
   * Sleep for specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get circuit breaker state
   */
  getCircuitState(): CircuitState {
    return this.circuitState;
  }

  /**
   * Get failure count
   */
  getFailureCount(): number {
    return this.failureCount;
  }

  /**
   * Reset circuit breaker
   */
  resetCircuit(): void {
    this.circuitState = CircuitState.CLOSED;
    this.failureCount = 0;
    this.halfOpenAttempts = 0;
    this.lastFailureTime = 0;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Update circuit breaker configuration
   */
  updateCircuitBreakerConfig(config: Partial<CircuitBreakerConfig>): void {
    this.circuitBreakerConfig = { ...this.circuitBreakerConfig, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): RetryConfig {
    return { ...this.config };
  }

  /**
   * Get circuit breaker configuration
   */
  getCircuitBreakerConfig(): CircuitBreakerConfig {
    return { ...this.circuitBreakerConfig };
  }
}
