---
title: Roadmap
description: Project roadmap and future plans for SvelteKit Auto OpenAPI
---

# Roadmap

SvelteKit Auto OpenAPI is currently in **v0 - experimental** status. This page outlines the roadmap for reaching v1.0.0 and beyond.

## Current Status: v0 (Experimental)

This library is in early development and **not recommended for production use**. APIs may change, and there may be undiscovered bugs. Use at your own risk.

## Roadmap for Version 0

The following goals must be achieved before publishing v1.0.0:

### 1. Explore Edge Cases and Find Errors

- [ ] Test with complex TypeScript types
- [ ] Test with nested route structures
- [ ] Test with various SvelteKit configurations
- [ ] Identify and fix edge cases in AST parsing
- [ ] Validate schema generation accuracy

### 2. Optimize Vite Plugin

- [ ] Improve build performance
- [ ] Reduce memory usage during development
- [ ] Optimize virtual module generation
- [ ] Implement smarter caching strategies
- [ ] Reduce hot reload latency

### 3. Expand Documentation and Create Documentation Website

- [x] Create comprehensive documentation website
- [x] Document all configuration options
- [x] Provide usage examples
- [ ] Create example repositories
- [ ] Add video tutorials
- [ ] Write migration guides

### 4. Add Proper Tests

- [ ] Unit tests for AST parsing
- [ ] Integration tests for schema generation
- [ ] End-to-end tests for validation hook
- [ ] Test coverage > 80%
- [ ] Automated testing in CI/CD

### 5. Publish V1

- [ ] Stable API (no breaking changes)
- [ ] Production-ready performance
- [ ] Complete documentation
- [ ] Migration guide from v0
- [ ] Official release announcement

## Future Enhancements (Post-v1)

Ideas for future versions:

- **OpenAPI 3.1 Support** - Upgrade to the latest OpenAPI specification
- **Additional Schema Libraries** - Support for more StandardSchema implementations
- **Custom Validation Messages** - User-defined error messages
- **Request/Response Transformers** - Transform data before validation
- **Auto-generated Client SDKs** - Generate TypeScript/JavaScript clients
- **GraphQL Support** - Extend to GraphQL schema generation
- **Enhanced Type Inference** - Support for more complex TypeScript patterns
- **Performance Monitoring** - Built-in metrics for validation overhead

## Contributing

We welcome contributions! Here's how you can help:

### Report Issues

Found a bug or edge case? [Open an issue](https://github.com/SaaSTEMLY/sveltekit-auto-openapi/issues) with:

- A clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Your environment (Node/Bun version, SvelteKit version, etc.)

### Submit Pull Requests

Want to contribute code?

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

### Improve Documentation

Help improve the docs:

- Fix typos or unclear explanations
- Add more examples
- Create tutorial content
- Translate documentation

### Share Feedback

- Star the repo if you find it useful
- Share your use cases and experiences
- Suggest new features
- Provide feedback on the API design

## Communication

- **GitHub Issues** - Bug reports and feature requests
- **GitHub Discussions** - Questions and community discussions
- **Pull Requests** - Code contributions

## License

SvelteKit Auto OpenAPI is [MIT licensed](https://github.com/SaaSTEMLY/sveltekit-auto-openapi/blob/main/LICENSE).

## Acknowledgments

This project builds on top of:

- [SvelteKit](https://kit.svelte.dev/) - The web framework
- [Scalar](https://scalar.com/) - API documentation UI
- [ts-morph](https://ts-morph.com/) - TypeScript AST manipulation
- [@cfworker/json-schema](https://github.com/cfworker/cfworker) - JSON Schema validation

Thank you to all contributors and the open-source community!
