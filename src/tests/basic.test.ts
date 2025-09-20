import { describe, it, expect } from 'vitest';

describe('Basic Test Setup', () => {
  it('should run a simple test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should have global mocks available', () => {
    expect(globalThis.process).toBeDefined();
    expect(globalThis.performance).toBeDefined();
  });
});