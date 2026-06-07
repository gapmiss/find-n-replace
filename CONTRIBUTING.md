# Contributing to Find-n-Replace

Thank you for your interest in contributing to Find-n-Replace!

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/find-n-replace.git`
3. Install dependencies: `npm install`
4. Create a feature branch: `git checkout -b feature/your-feature-name`

## Development

```bash
# Development build with watching
npm run dev

# Production build
npm run build

# Run tests
npm test

# Watch mode testing
npm run test:watch

# Coverage reports
npm run test:coverage
```

## Code Standards

- Follow existing TypeScript conventions and code style
- Use strict typing - avoid `any`
- Include error handling for all async operations
- Add logging for debugging where appropriate

## Testing

- **Run the test suite before submitting:** `npm test` (all tests must pass)
- **Add tests for new features:** Follow existing patterns in `src/tests/unit/`
- Test with large vaults to ensure performance

## Pull Request Process

1. Ensure all tests pass
2. Update documentation for any API changes
3. Keep commits focused and well-described
4. Submit a pull request with a clear description of changes

## Questions

Open an issue for questions or discussion about potential contributions.
