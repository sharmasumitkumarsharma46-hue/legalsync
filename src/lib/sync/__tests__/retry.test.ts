import { RetryHandler, RetryResult } from '../retry';

describe('RetryHandler', () => {
  let retryHandler: RetryHandler;

  beforeEach(() => {
    retryHandler = new RetryHandler({
      maxAttempts: 3,
      initialDelay: 100,
      maxDelay: 1000,
      backoffMultiplier: 2,
    });
  });

  describe('execute', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const result: RetryResult<string> = await retryHandler.execute(operation);

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(1);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');

      const result: RetryResult<string> = await retryHandler.execute(operation);

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(3);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should fail after max attempts', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('fail'));

      const result: RetryResult<string> = await retryHandler.execute(operation);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.attempts).toBe(3);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should not retry on 401 errors', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('401 Unauthorized'));

      const result: RetryResult<string> = await retryHandler.execute(operation);

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should not retry on 403 errors', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('403 Forbidden'));

      const result: RetryResult<string> = await retryHandler.execute(operation);

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should not retry on 404 errors', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('404 Not Found'));

      const result: RetryResult<string> = await retryHandler.execute(operation);

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should call onError callback on each failure', async () => {
      const onError = jest.fn();
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');

      await retryHandler.execute(operation, onError);

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(expect.any(Error), 1);
    });

    it('should use exponential backoff', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');

      const startTime = Date.now();
      await retryHandler.execute(operation);
      const endTime = Date.now();

      const elapsed = endTime - startTime;
      // With initialDelay=100 and backoffMultiplier=2:
      // Attempt 1: immediate
      // Wait: 100ms
      // Attempt 2: after 100ms
      // Wait: 200ms
      // Attempt 3: after 200ms
      // Total minimum delay: 300ms
      expect(elapsed).toBeGreaterThanOrEqual(300);
    });
  });
});
