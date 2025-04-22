import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Automatically clean up after each test
afterEach(() => {
  cleanup();
});

// Add custom matchers
expect.extend({
  toHaveBeenCalledWith(received, ...expected) {
    const pass = this.equals(received.mock.calls[0], expected);
    if (pass) {
      return {
        message: () => `expected ${received} not to have been called with ${expected}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to have been called with ${expected}`,
        pass: false,
      };
    }
  },
});
