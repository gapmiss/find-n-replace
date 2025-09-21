# Comprehensive Vitest Testing Guide for Obsidian Plugin

## Current Test Infrastructure Overview

Your plugin has a robust Vitest testing setup with:

### **Test Configuration**
- **Vitest 2.1.0** (2025 modern standard)
- **JSDOM environment** for DOM testing
- **Coverage with V8 provider** (text, json, html reports)
- **Path aliases** (`@` for src, `@tests` for src/tests)
- **Global test utilities** and comprehensive Obsidian API mocks

### **NPM Scripts Available**
```bash
npm test              # Run all tests
npm run test:ui       # Interactive test UI in browser
npm run test:watch    # Watch mode (re-run on file changes)
npm run test:coverage # Generate coverage reports
```

### **Test Suite Structure** (61 tests across 6 suites)
```
src/tests/
├── basic.test.ts                    # Framework validation (2 tests)
├── unit/
│   ├── regexUtils.test.ts          # Pattern matching (10 tests)
│   ├── positionTracking.test.ts    # Column position accuracy (9 tests)
│   ├── bugRegression.test.ts       # Prevents second match bug (13 tests)
│   ├── performance.test.ts         # Performance limits (15 tests)
│   └── testDataGenerators.test.ts  # Property-based testing (12 tests)
├── core/
│   ├── searchEngine.test.ts        # Core search functionality
│   └── replacementEngine.test.ts   # Replacement operations
├── integration/
│   └── workflows.test.ts           # End-to-end workflows
└── fuzzing/
    └── propertyBased.test.ts       # Fast-check property testing
```

## How to Use Vitest for Testing

### **1. Running Tests**
```bash
# Basic test execution
npm test                    # Run all tests once
npm run test:watch         # Watch mode (recommended for development)
npm run test:ui            # Visual browser interface
npm run test:coverage      # Generate coverage reports

# Specific test patterns
npm test -- --grep "SearchEngine"     # Run tests matching pattern
npm test -- src/tests/unit/           # Run specific directory
npm test -- bugRegression.test.ts     # Run specific file
```

### **2. Writing New Tests**

#### **Basic Test Structure**
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { YourComponent } from '@/path/to/component';
import { createMockApp, createMockPlugin } from '@tests/mocks';

describe('YourComponent', () => {
  let component: YourComponent;
  let mockApp: any;

  beforeEach(() => {
    mockApp = createMockApp();
    component = new YourComponent(mockApp);
  });

  it('should do something specific', () => {
    // Arrange
    const input = 'test data';

    // Act
    const result = component.method(input);

    // Assert
    expect(result).toBe('expected output');
  });
});
```

#### **Testing Async Operations**
```typescript
it('should handle async operations', async () => {
  const result = await component.asyncMethod();
  expect(result).toMatchObject({ success: true });
});
```

#### **Property-Based Testing (with fast-check)**
```typescript
import fc from 'fast-check';

it('should handle arbitrary input', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.string({ minLength: 1, maxLength: 100 }),
      async (input: string) => {
        const result = await component.process(input);
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      }
    ),
    { numRuns: 50 }
  );
});
```

### **3. Mock System Usage**

#### **Available Mocks**
- **MockApp**: Complete Obsidian app simulation
- **MockVault**: File system operations
- **MockWorkspace**: UI layout management
- **MockPlugin**: Plugin lifecycle

#### **Using Mocks in Tests**
```typescript
import { createMockApp, createMockPlugin } from '@tests/mocks';

const mockApp = createMockApp();
const mockPlugin = createMockPlugin();

// Add test files
mockApp.vault.addTestFile('test.md', 'content here');

// Simulate file operations
const content = mockApp.vault.getContent('test.md');
```

### **4. Test Categories & Best Practices**

#### **Unit Tests** (`src/tests/unit/`)
- Test individual functions/classes in isolation
- Focus on edge cases and boundary conditions
- Use property-based testing for comprehensive coverage

#### **Integration Tests** (`src/tests/integration/`)
- Test component interactions
- Simulate real user workflows
- Test full search → replace → verify cycles

#### **Regression Tests** (`src/tests/unit/bugRegression.test.ts`)
- Prevent specific bugs from reoccurring
- Test exact scenarios that previously failed
- Critical for maintaining stability

#### **Performance Tests** (`src/tests/unit/performance.test.ts`)
- Ensure operations complete within time limits
- Memory usage validation
- Stress testing with large datasets

### **5. Coverage & Quality**

#### **Current Coverage Exclusions**
- `node_modules/**`
- `src/tests/**` (test files themselves)
- `**/*.d.ts` (type definitions)
- Demo/build files

#### **Coverage Commands**
```bash
npm run test:coverage              # Generate full coverage report
npm run test:coverage -- --reporter=html  # HTML report in coverage/
```

### **6. Debugging Tests**

#### **Debug Options**
```bash
# Verbose output
npm test -- --reporter=verbose

# Run single test file
npm test -- bugRegression.test.ts

# Debug specific test
npm test -- --grep "second match replacement"
```

#### **Using Test UI**
```bash
npm run test:ui
# Opens browser interface with:
# - Real-time test results
# - Code coverage visualization
# - Test filtering and search
# - File tree navigation
```

### **7. Common Testing Patterns**

#### **Error Handling Tests**
```typescript
it('should handle invalid input gracefully', () => {
  expect(() => component.process(null)).toThrow('Invalid input');
});
```

#### **State Validation**
```typescript
it('should maintain internal state correctly', () => {
  component.setState({ active: true });
  expect(component.getState()).toMatchObject({ active: true });
});
```

#### **Mock Verification**
```typescript
it('should call external dependencies', () => {
  const spy = vi.spyOn(mockApp.vault, 'modify');
  component.saveData('test');
  expect(spy).toHaveBeenCalledWith(expect.any(String), 'test');
});
```

## Advanced Testing Scenarios

### **Testing Plugin Lifecycle**
```typescript
describe('Plugin Lifecycle', () => {
  it('should initialize correctly', async () => {
    const plugin = createMockPlugin();
    await plugin.onload();
    expect(plugin.isLoaded).toBe(true);
  });

  it('should cleanup on unload', async () => {
    const plugin = createMockPlugin();
    await plugin.onload();
    await plugin.onunload();
    expect(plugin.isLoaded).toBe(false);
  });
});
```

### **Testing UI Components**
```typescript
import { fireEvent } from '@testing-library/dom';

it('should handle user interactions', () => {
  const button = component.createButton();
  const clickSpy = vi.fn();
  button.addEventListener('click', clickSpy);

  fireEvent.click(button);
  expect(clickSpy).toHaveBeenCalled();
});
```

### **Testing Search Engine**
```typescript
describe('SearchEngine', () => {
  let searchEngine: SearchEngine;
  let mockApp: any;

  beforeEach(() => {
    mockApp = createMockApp();
    mockApp.vault.addTestFile('test.md', 'Hello world\nTest content');
    searchEngine = new SearchEngine(mockApp, createMockPlugin());
  });

  it('should find matches across files', async () => {
    const results = await searchEngine.performSearch('Hello', {
      matchCase: false,
      wholeWord: false,
      useRegex: false
    });

    expect(results).toHaveLength(1);
    expect(results[0].matchText).toBe('Hello');
    expect(results[0].line).toBe(0);
  });
});
```

### **Testing Replacement Engine**
```typescript
describe('ReplacementEngine', () => {
  it('should replace matches correctly', async () => {
    const mockApp = createMockApp();
    mockApp.vault.addTestFile('test.md', 'foo bar foo');

    const replacementEngine = new ReplacementEngine(mockApp, createMockPlugin(), searchEngine);

    const result = await replacementEngine.replaceInVault(
      searchResults,
      'foo',
      'baz',
      { matchCase: false, wholeWord: false, useRegex: false },
      'vault'
    );

    expect(result.totalReplacements).toBe(2);
    expect(mockApp.vault.getContent('test.md')).toBe('baz bar baz');
  });
});
```

## Test Configuration Details

### **Vitest Config** (`vitest.config.ts`)
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'src/tests/**',
        '**/*.d.ts'
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tests': path.resolve(__dirname, './src/tests')
    }
  }
});
```

### **Setup File** (`src/tests/setup.ts`)
Provides comprehensive Obsidian API mocks including:
- Plugin class mocks
- ItemView mocks
- TFile mocks
- Vault operation mocks
- Workspace mocks
- Global utilities

## Best Practices Summary

1. **Write tests first** for new features (TDD approach)
2. **Use descriptive test names** that explain the scenario
3. **Test edge cases** and error conditions
4. **Mock external dependencies** appropriately
5. **Keep tests isolated** and independent
6. **Use property-based testing** for comprehensive coverage
7. **Write regression tests** for fixed bugs
8. **Monitor test performance** and coverage
9. **Use watch mode** during development
10. **Document complex test scenarios**

## Continuous Integration

Tests run automatically on:
- Every commit (via pre-commit hooks)
- Pull request validation
- Release builds

Current test suite completes in under 1 second with 100% pass rate.

This comprehensive test infrastructure ensures reliability, prevents regressions, and supports confident development of new features.