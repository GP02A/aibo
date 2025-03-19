/**
 * Throttle function to limit the rate at which a function can fire.
 * @param fn The function to throttle
 * @param wait The time in milliseconds to wait between function calls
 * @returns A throttled version of the function
 */
export function throttle<T extends (...args: any[]) => any>(fn: T, wait: number): (...args: Parameters<T>) => void {
  let lastCall = 0;
  return function(...args: Parameters<T>) {
    const now = Date.now();
    if (now - lastCall >= wait) {
      lastCall = now;
      fn(...args);
    }
  };
}