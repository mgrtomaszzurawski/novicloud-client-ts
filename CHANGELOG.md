# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- Initial SDK implementation with 18 resource clients
- OpenAPI-generated base client (typescript-fetch)
- Error hierarchy: NoviCloudError, Auth, NotFound, RateLimit, Server, Network
- RetryHandler with exponential/fixed backoff and jitter
- PagedResult with AsyncIterable, seek(), fetchFrom(), bidirectional iteration
- Typed query interfaces per endpoint (broken server params excluded per ADR-031)
- NoviCloudClient entry point with Basic Auth
- Demo app exercising all 18 endpoints
- Unit tests for errors, retry, paging, resource helpers
- Integration tests for towary endpoint (MSW)
- Architecture documentation (context/ARCHITECTURE.md)
- Session reports and confidence assessments
