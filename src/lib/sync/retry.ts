export interface RetryOptions {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalDelay: number;
}

export class RetryHandler {
  private options: RetryOptions;

  constructor(options: Partial<RetryOptions> = {}) {
    this.options = {
      maxAttempts: options.maxAttempts || 5,
      initialDelay: options.initialDelay || 1000, // 1 second
      maxDelay: options.maxDelay || 60000, // 1 minute
      backoffMultiplier: options.backoffMultiplier || 2,
    };
  }

  async execute<T>(
    operation: () => Promise<T>,
    onError?: (error: Error, attempt: number) => void
  ): Promise<RetryResult<T>> {
    let lastError: Error | undefined;
    let totalDelay = 0;
    let actualAttempts = 0;

    for (let attempt = 1; attempt <= this.options.maxAttempts; attempt++) {
      actualAttempts = attempt;
      try {
        const data = await operation();
        return {
          success: true,
          data,
          attempts: attempt,
          totalDelay,
        };
      } catch (error) {
        lastError = error as Error;
        
        if (onError) {
          onError(lastError, attempt);
        }

        // Don't retry on certain errors
        if (this.shouldNotRetry(lastError)) {
          break;
        }

        // Don't wait after the last attempt
        if (attempt < this.options.maxAttempts) {
          const delay = this.calculateDelay(attempt);
          totalDelay += delay;
          await this.sleep(delay);
        }
      }
    }

    return {
      success: false,
      error: lastError,
      attempts: actualAttempts,
      totalDelay,
    };
  }

  private calculateDelay(attempt: number): number {
    const delay = this.options.initialDelay * Math.pow(this.options.backoffMultiplier, attempt - 1);
    return Math.min(delay, this.options.maxDelay);
  }

  private shouldNotRetry(error: Error): boolean {
    // Don't retry on authentication errors
    if (error.message.includes('401') || error.message.includes('403')) {
      return true;
    }

    // Don't retry on not found errors
    if (error.message.includes('404')) {
      return true;
    }

    // Don't retry on validation errors
    if (error.message.includes('400') || error.message.includes('validation')) {
      return true;
    }

    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const defaultRetryHandler = new RetryHandler({
  maxAttempts: 5,
  initialDelay: 1000,
  maxDelay: 60000,
  backoffMultiplier: 2,
});
