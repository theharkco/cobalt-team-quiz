/**
 * Retry an async function once after a 1s delay on failure.
 */
export async function retryOnce<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return await fn();
  }
}
