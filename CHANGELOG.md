# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- **docker**: install prisma globally in runner to fix effect module not found during migration deploy.
- **docker**: fix prisma binary access in Docker environment.

### Added
- **UI**: group destructive actions, add Clear Row functionality.
- **docker**: add docker-containerization skill and assets.
- **core**: add sample resource files and CSV to resource conversion tool.
- **design**: add dark monochrome design system and various UI tweaks.

### Changed
- **core**: migrate to server actions, add toolbar & pagination to project views.
- **docker**: switch Dockerfile to Alpine and optimize layer caching.
- **auth**: rename email field to username and update authentication flow.
- **refactor**: overhaul service layer and simplify auth logic.

### Removed
- obsolete test and utility scripts.
- legacy documentation and VSCode settings.

## [0.1.0] - 2025-09-26

### Added
- Initial scaffold: Next.js, Prisma, Docker, and base project structure.
