# YC API Gateway Deploy Action - Design Document

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture and Design Patterns](#architecture-and-design-patterns)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Core Components](#core-components)
6. [Testing Strategy](#testing-strategy)
7. [Build and Distribution](#build-and-distribution)
8. [CI/CD Pipeline](#cicd-pipeline)
9. [Development Workflow](#development-workflow)
10. [Security Considerations](#security-considerations)
11. [Best Practices and Recommendations](#best-practices-and-recommendations)

## Project Overview

This project implements a GitHub Action for deploying API Gateways to Yandex Cloud. It provides an automated way to create or update API Gateway specifications as part of CI/CD pipelines.

### Key Features

- **Automated API Gateway Management**: Creates new gateways or updates existing ones based on OpenAPI specifications
- **Multiple Authentication Methods**: Supports service account JSON, IAM tokens, and GitHub OIDC token exchange
- **Idempotent Operations**: Safely handles both creation and updates without duplicating resources
- **TypeScript Implementation**: Provides type safety and modern JavaScript features
- **Comprehensive Testing**: Includes unit tests with mocked dependencies

## Architecture and Design Patterns

### Design Patterns Used

1. **Dependency Injection Pattern**
   - The main logic accepts configuration through GitHub Action inputs
   - SDK sessions are created with injected credentials
   - Facilitates testing through mock injection

2. **Repository Pattern**
   - API Gateway operations are abstracted through service clients
   - Consistent interface for CRUD operations

3. **Command Pattern**
   - Each operation (create, update, find) is encapsulated in its own function
   - Clear separation of concerns

4. **Factory Pattern**
   - Service account credentials are created through factory functions
   - Flexible credential creation based on input type

### Architectural Principles

- **Single Responsibility**: Each function has a specific purpose
- **DRY (Don't Repeat Yourself)**: Common logic is extracted into reusable functions
- **SOLID Principles**: Evident in the modular structure and interface design
- **Fail-Fast**: Early validation and clear error messages

## Technology Stack

### Runtime Dependencies

```json
{
  "@actions/core": "^1.11.1",          // GitHub Actions SDK core functionality
  "@actions/github": "^6.0.1",          // GitHub context and utilities
  "@grpc/grpc-js": "^1.13.4",          // gRPC client for Yandex Cloud
  "@yandex-cloud/nodejs-sdk": "^2.8.0", // Yandex Cloud SDK
  "axios": "1.11.0",                    // HTTP client for token exchange
  "yaml": "^2.8.1"                      // YAML parsing (for spec files)
}
```

### Development Dependencies

- **TypeScript** (`^5.9.2`): Primary development language
- **Jest** (`^30.0.5`): Testing framework
- **ts-jest** (`^29.4.1`): TypeScript support for Jest
- **ESLint** (`^9.32.0`): Code linting with TypeScript support
- **Prettier** (`3.6.2`): Code formatting
- **@vercel/ncc** (`^0.38.3`): Bundler for creating single-file distribution

### Node.js Version

- Requires Node.js 20 or higher
- Uses ES2022 features and NodeNext module resolution

## Project Structure

```text
yc-api-gateway-deploy/
├── __tests__/                    # Test files
│   ├── __mocks__/               # Mock implementations
│   │   └── @yandex-cloud/       # Yandex Cloud SDK mocks
│   │       └── nodejs-sdk.ts
│   ├── main.test.ts             # Main functionality tests
│   └── spec.yaml                # Test OpenAPI specification
├── .github/                     # GitHub-specific files
│   ├── dependabot.yml           # Dependency update configuration
│   ├── linters/                 # Linter configurations
│   └── workflows/               # CI/CD workflows
│       ├── check-dist.yml       # Verify distribution files
│       └── test.yml            # Build and test workflow
├── badges/                      # Status badges
├── coverage/                    # Test coverage reports
├── dist/                        # Compiled distribution files
├── node_modules/                # Dependencies (git-ignored)
├── src/                         # Source code
│   ├── index.ts                # Entry point
│   ├── main.ts                 # Core business logic
│   └── service-account-json.ts # Service account handling
├── action.yml                   # GitHub Action metadata
├── eslint.config.mjs           # ESLint configuration
├── package.json                # Project configuration
├── tsconfig.json               # TypeScript configuration
├── LICENSE                     # MIT license
└── README.md                   # User documentation
```

## Core Components

### 1. Entry Point (`src/index.ts`)

```typescript
import { run } from './main'
run()
```

Simple entry point that imports and executes the main function.

### 2. Main Logic (`src/main.ts`)

**Key Functions:**

- **`run()`**: Main orchestrator function
  - Handles credential parsing and session creation
  - Validates inputs
  - Coordinates gateway operations
  - Sets action outputs

- **`findGatewayByName()`**: Searches for existing gateways
  - Uses filter syntax for name matching
  - Returns list of matching gateways

- **`createGateway()`**: Creates new API Gateway
  - Includes metadata from GitHub context
  - Waits for operation completion
  - Returns created gateway details

- **`updateGatewaySpec()`**: Updates existing gateway
  - Uses field masks for partial updates
  - Maintains idempotency

- **`exchangeToken()`**: GitHub OIDC to Yandex Cloud token exchange
  - Implements OAuth 2.0 token exchange flow
  - Supports workload identity

### 3. Service Account Handler (`src/service-account-json.ts`)

Converts service account JSON format to SDK-compatible credentials:

```typescript
interface ServiceAccountJsonFileContents {
  id: string
  created_at: string
  key_algorithm: string
  service_account_id: string
  private_key: string
  public_key: string
}
```

## Testing Strategy

### Test Framework Configuration

```javascript
{
  "preset": "ts-jest",
  "testEnvironment": "node",
  "coverageReporters": ["json-summary", "text", "lcov"],
  "collectCoverageFrom": ["./src/**", "!./src/index.ts"]
}
```

### Mock Strategy

1. **Complete SDK Mock** (`__mocks__/@yandex-cloud/nodejs-sdk.ts`)
   - Mocks all Yandex Cloud SDK interactions
   - Provides test control functions (`__setApiGatewayList`, etc.)
   - Simulates both success and failure scenarios

2. **GitHub Actions Core Mock**
   - Mocks input/output functions
   - Captures calls for verification

3. **Test Scenarios**
   - Gateway creation when none exists
   - Gateway update when one exists
   - Error handling for failed operations
   - Input validation
   - Credential handling variations

### Coverage Requirements

- All source files except entry point
- Coverage badges generated automatically
- Reports in multiple formats (JSON, HTML, lcov)

## Build and Distribution

### Build Process

1. **Development Build**: `npm run package`
   - Transpiles TypeScript to JavaScript
   - Bundles all dependencies into single file
   - Generates source maps

2. **Production Build**: `npm run bundle`
   - Formats code before packaging
   - Creates optimized distribution

3. **Bundle Tool**: @vercel/ncc
   - Creates single `dist/index.js` file
   - Includes all dependencies
   - Optimizes for GitHub Action runtime

### Distribution Structure

```text
dist/
├── index.js          # Main bundled file
├── index.js.map      # Source map
├── licenses.txt      # Dependency licenses
└── proto/           # Protocol buffer definitions
```

## CI/CD Pipeline

### Workflow: `test.yml`

Triggered on:

- Pull requests
- Pushes to main branch
- Release branches

Steps:

1. Checkout code
2. Install dependencies
3. Run all checks (`npm run all`):
   - Format checking
   - Linting
   - Testing
   - Coverage generation
   - Distribution building

### Workflow: `check-dist.yml`

Ensures distribution files are up-to-date:

1. Builds distribution files
2. Compares with committed files
3. Fails if differences detected
4. Uploads artifacts on failure

## Development Workflow

### Initial Setup

```bash
# Clone repository
git clone https://github.com/yc-actions/yc-api-gateway-deploy.git
cd yc-api-gateway-deploy

# Install dependencies
npm install

# Run tests
npm test
```

### Development Commands

```bash
# Format code
npm run format:write

# Run linter
npm run lint

# Run tests
npm test

# Run tests with coverage
npm run ci-test

# Build distribution
npm run package

# Run all checks
npm run all

# Watch mode for development
npm run package:watch
```

### Git Tag Management

```bash
# Create version tags
npm run git-tag
```

Creates both major version tag (v3) and full version tag (v3.0.0).

## Security Considerations

### Credential Handling

1. **Service Account JSON**: Should be stored in GitHub Secrets
2. **IAM Tokens**: Short-lived, should be generated in workflow
3. **OIDC Token Exchange**: Preferred for GitHub-Yandex Cloud integration

### Permissions Required

**Deploy Time**:

- `api-gateway.editor`: Core permission for gateway management
- `iam.serviceAccounts.user`: Optional, for service account access
- `vpc.user`: Optional, for VPC deployments

**Runtime** (for API Gateway service account):

- Various permissions based on gateway extensions used
- Documented in README.md

## Best Practices and Recommendations

### For Similar Projects

1. **Project Structure**
   - Keep source files in `src/`
   - Separate tests in `__tests__/`
   - Use TypeScript for type safety
   - Bundle for distribution

2. **Testing**
   - Mock external dependencies completely
   - Test both success and failure paths
   - Maintain high code coverage
   - Use Jest for consistency with GitHub ecosystem

3. **CI/CD**
   - Automate all quality checks
   - Verify distribution files in CI
   - Use GitHub workflows for automation
   - Fail fast on errors

4. **Code Quality**
   - Use ESLint with strict rules
   - Format with Prettier
   - Follow GitHub's TypeScript conventions
   - Document all public interfaces

5. **Distribution**
   - Use @vercel/ncc for bundling
   - Include source maps for debugging
   - Commit distribution files
   - Verify in CI

6. **Documentation**
   - Comprehensive README for users
   - Inline code comments for complex logic
   - Action.yml with detailed descriptions
   - Examples in documentation

### Development Tips

1. **Local Testing**
   - Set environment variables to simulate GitHub Action inputs
   - Use the mock system to test edge cases
   - Run `npm run all` before committing

2. **Debugging**
   - Use source maps in dist/
   - Enable verbose logging with `core.info()`
   - Check x-request-id for API errors

3. **Versioning**
   - Follow semantic versioning
   - Update both package.json and tags
   - Document breaking changes

### Extension Points

This architecture can be extended for:

- Other Yandex Cloud services
- Additional authentication methods
- More complex deployment scenarios
- Integration with other CI/CD systems

The modular design makes it easy to:

- Add new operations
- Support additional resource types
- Implement new authentication flows
- Enhance error handling

## Conclusion

This project demonstrates a well-structured GitHub Action with:

- Clean architecture and separation of concerns
- Comprehensive testing strategy
- Modern TypeScript development practices
- Robust CI/CD pipeline
- Clear documentation

The design can serve as a template for similar GitHub Actions targeting cloud service deployments.
