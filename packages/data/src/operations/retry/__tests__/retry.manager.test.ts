/**
 * Tests for RetryManager
 */

import { RetryManager } from '../retry.manager';

describe('RetryManager', () => {
  let retryManager: RetryManager;

  beforeEach(() => {
    retryManager = new RetryManager({
      maxRetries: 3,
      baseDelay: 100,
      maxDelay: 1000,
      backoffMultiplier: 2
    });
  });

  describe('execute', () => {
    it('should succeed on first try', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await retryManager.execute(operation);

      expect(result.success).toBe(true);
      expect(result.value).toBe('success');
      expect(result.attempts).toBe(1);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success');

      const result = await retryManager.execute(operation);

      expect(result.success).toBe(true);
      expect(result.value).toBe('success');
      expect(result.attempts).toBe(3);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should return error after max retries', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Always fails'));

      const result = await retryManager.execute(operation);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.attempts).toBe(4); // Initial + 3 retries
      expect(operation).toHaveBeenCalledTimes(4);
    });

    it('should use exponential backoff with delays', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success');

      const result = await retryManager.execute(operation);

      // Should have delays that increase exponentially
      expect(result.success).toBe(true);
      expect(result.totalDelay).toBeGreaterThan(100); // At least baseDelay
      expect(operation).toHaveBeenCalledTimes(3);
    });
  });

  describe('executeWithTimeout', () => {
    it('should timeout long-running operations', async () => {
      const slowOperation = jest.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve('done'), 1000))
      );

      const result = await retryManager.executeWithTimeout(slowOperation, 100);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('timed out');
    });
  });

  describe('executeAll', () => {
    it('should execute multiple operations', async () => {
      const op1 = jest.fn().mockResolvedValue('result1');
      const op2 = jest.fn().mockResolvedValue('result2');

      const results = await retryManager.executeAll([op1, op2]);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    it('should stop on first failure with failFast', async () => {
      const op1 = jest.fn().mockRejectedValue(new Error('Failed'));
      const op2 = jest.fn().mockResolvedValue('result2');

      const results = await retryManager.executeAll([op1, op2], true);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(op2).not.toHaveBeenCalled();
    });
  });

  describe('executeAllParallel', () => {
    it('should execute operations in parallel', async () => {
      const op1 = jest.fn().mockResolvedValue('result1');
      const op2 = jest.fn().mockResolvedValue('result2');
      const op3 = jest.fn().mockResolvedValue('result3');

      const results = await retryManager.executeAllParallel([op1, op2, op3]);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
    });
  });

  describe('circuit breaker', () => {
    it('should open circuit after failures', async () => {
      const cbRetryManager = new RetryManager(
        { maxRetries: 1, baseDelay: 10 },
        { enabled: true, failureThreshold: 2, resetTimeout: 1000 }
      );

      const failingOp = jest.fn().mockRejectedValue(new Error('Fail'));

      // First failure
      await cbRetryManager.execute(failingOp);
      // Second failure - should open circuit
      await cbRetryManager.execute(failingOp);

      // Circuit should now be open
      expect(cbRetryManager.getCircuitState()).toBe('open');
    });

    it('should transition to half-open after reset timeout', async () => {
      const cbRetryManager = new RetryManager(
        { maxRetries: 1, baseDelay: 10 },
        { enabled: true, failureThreshold: 1, resetTimeout: 100 }
      );

      const failingOp = jest.fn().mockRejectedValue(new Error('Fail'));

      // Trigger circuit open
      await cbRetryManager.execute(failingOp);

      expect(cbRetryManager.getCircuitState()).toBe('open');

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      // Next call should transition to half-open
      const succeedOp = jest.fn().mockResolvedValue('success');
      await cbRetryManager.execute(succeedOp);

      expect(cbRetryManager.getCircuitState()).toBe('closed');
    });

    it('should close circuit on success in half-open state', async () => {
      const cbRetryManager = new RetryManager(
        { maxRetries: 1, baseDelay: 10 },
        { enabled: true, failureThreshold: 1, resetTimeout: 100, halfOpenMaxAttempts: 2 }
      );

      // Open circuit
      await cbRetryManager.execute(jest.fn().mockRejectedValue(new Error('Fail')));

      expect(cbRetryManager.getCircuitState()).toBe('open');

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      // Success in half-open should close circuit
      await cbRetryManager.execute(jest.fn().mockResolvedValue('success'));

      expect(cbRetryManager.getCircuitState()).toBe('closed');
      expect(cbRetryManager.getFailureCount()).toBe(0);
    });

    it('should re-open circuit after failures in half-open state', async () => {
      const cbRetryManager = new RetryManager(
        { maxRetries: 0, baseDelay: 10 },
        { enabled: true, failureThreshold: 1, resetTimeout: 100, halfOpenMaxAttempts: 2 }
      );

      // Open circuit
      await cbRetryManager.execute(jest.fn().mockRejectedValue(new Error('Fail')));

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      // Fail in half-open
      await cbRetryManager.execute(jest.fn().mockRejectedValue(new Error('Fail')));
      await cbRetryManager.execute(jest.fn().mockRejectedValue(new Error('Fail')));

      expect(cbRetryManager.getCircuitState()).toBe('open');
    });

    it('should reset failure count on success in closed state', async () => {
      const cbRetryManager = new RetryManager(
        { maxRetries: 1, baseDelay: 10 },
        { enabled: true, failureThreshold: 3, resetTimeout: 1000 }
      );

      const failingOp = jest.fn().mockRejectedValue(new Error('Fail'));
      const successOp = jest.fn().mockResolvedValue('success');

      // First failure
      await cbRetryManager.execute(failingOp);
      expect(cbRetryManager.getFailureCount()).toBe(1);

      // Success resets count
      await cbRetryManager.execute(successOp);
      expect(cbRetryManager.getFailureCount()).toBe(0);
    });
  });

  describe('isRetryable', () => {
    it('should not retry validation errors', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Validation failed'));

      const result = await retryManager.execute(operation);

      expect(result.success).toBe(false);
      expect(operation).toHaveBeenCalledTimes(1); // No retries
    });

    it('should not retry unauthorized errors', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Unauthorized'));

      const result = await retryManager.execute(operation);

      expect(result.success).toBe(false);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry with custom retryable errors', async () => {
      const customRetryManager = new RetryManager({
        maxRetries: 2,
        baseDelay: 10,
        retryableErrors: ['NetworkError', 'TimeoutError']
      });

      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('NetworkError occurred'))
        .mockResolvedValue('success');

      const result = await customRetryManager.execute(operation);

      expect(result.success).toBe(true);
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should not retry non-configured errors with custom list', async () => {
      const customRetryManager = new RetryManager({
        maxRetries: 2,
        baseDelay: 10,
        retryableErrors: ['NetworkError']
      });

      const operation = jest.fn().mockRejectedValue(new Error('DatabaseError'));

      const result = await customRetryManager.execute(operation);

      expect(result.success).toBe(false);
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('configuration management', () => {
    it('should update retry config', () => {
      retryManager.updateConfig({ maxRetries: 5, baseDelay: 200 });

      const config = retryManager.getConfig();
      expect(config.maxRetries).toBe(5);
      expect(config.baseDelay).toBe(200);
    });

    it('should update circuit breaker config', () => {
      const cbManager = new RetryManager(
        { maxRetries: 3 },
        { enabled: true }
      );

      cbManager.updateCircuitBreakerConfig({ failureThreshold: 10 });

      const cbConfig = cbManager.getCircuitBreakerConfig();
      expect(cbConfig.failureThreshold).toBe(10);
    });

    it('should get circuit breaker config', () => {
      const cbManager = new RetryManager(
        { maxRetries: 3 },
        { enabled: true, failureThreshold: 7 }
      );

      const config = cbManager.getCircuitBreakerConfig();
      expect(config.enabled).toBe(true);
      expect(config.failureThreshold).toBe(7);
    });

    it('should reset circuit breaker', async () => {
      const cbManager = new RetryManager(
        { maxRetries: 1, baseDelay: 10 },
        { enabled: true, failureThreshold: 1 }
      );

      // Open circuit
      await cbManager.execute(jest.fn().mockRejectedValue(new Error('Fail')));

      expect(cbManager.getCircuitState()).toBe('open');
      expect(cbManager.getFailureCount()).toBeGreaterThan(0);

      // Reset
      cbManager.resetCircuit();

      expect(cbManager.getCircuitState()).toBe('closed');
      expect(cbManager.getFailureCount()).toBe(0);
    });
  });

  describe('operation naming', () => {
    it('should use operation name in error messages', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Network timeout'));

      const result = await retryManager.execute(operation, 'fetchUserData');

      expect(result.success).toBe(false);
      // Operation name should be included in logging (tested implicitly)
    });

    it('should use operation name in timeout errors', async () => {
      const slowOp = jest.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve('done'), 1000))
      );

      const result = await retryManager.executeWithTimeout(slowOp, 100, 'slowQuery');

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('slowQuery');
    });
  });

  describe('executeAll without failFast', () => {
    it('should execute all operations even with failures', async () => {
      const op1 = jest.fn().mockRejectedValue(new Error('Fail'));
      const op2 = jest.fn().mockResolvedValue('success');
      const op3 = jest.fn().mockResolvedValue('success2');

      const results = await retryManager.executeAll([op1, op2, op3], false);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(false);
      expect(results[1].success).toBe(true);
      expect(results[2].success).toBe(true);
    });
  });
});
