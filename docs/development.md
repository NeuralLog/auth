# Development Guide

This document provides information for developers working on the NeuralLog Auth service.

## Development Environment Setup

### Prerequisites

- Node.js 22 or later
- npm 10 or later
- Git
- PostgreSQL 14 or later
- Redis 7 or later
- OpenFGA

### Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/NeuralLog/auth.git
   cd auth
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Start the required services:
   ```bash
   # Using Docker
   docker-compose up -d postgres redis openfga
   ```

5. Run the service in development mode:
   ```bash
   npm run dev
   ```

## Project Structure

```
auth/
├── src/                  # Source code
│   ├── index.ts          # Main entry point
│   ├── app.ts            # Express application setup
│   ├── api/              # API endpoints
│   │   ├── authRouter.ts # Authentication routes
│   │   └── ...           # Other API routers
│   ├── controllers/      # Controller implementations
│   ├── services/         # Service implementations
│   │   ├── authService.ts # Authentication service
│   │   └── ...           # Other services
│   ├── models/           # Data models
│   ├── adapters/         # External service adapters
│   │   ├── OpenFGAAdapter.ts # OpenFGA adapter
│   │   └── ...           # Other adapters
│   ├── middleware/       # Express middleware
│   └── utils/            # Utility functions
├── tests/                # Test files
│   ├── unit/             # Unit tests
│   └── integration/      # Integration tests
├── docs/                 # Documentation
├── scripts/              # Build and utility scripts
└── docker/               # Docker configuration
```

## Build Process

The build process uses TypeScript and follows these steps:

1. Clean the output directory:
   ```bash
   npm run clean
   ```

2. Compile TypeScript:
   ```bash
   npm run build
   ```

3. Run tests:
   ```bash
   npm test
   ```

## Development Workflow

### Running in Development Mode

To run the service in development mode with hot reloading:

```bash
npm run dev
```

This will start the service using `ts-node-dev` which automatically restarts the service when files are changed.

### Debugging

To debug the service using Node.js inspector:

```bash
npm run dev:debug
```

Then connect to the debugger using your IDE or Chrome DevTools.

## Testing

### Unit Tests

Unit tests are located in the `tests/unit` directory and use Jest as the test framework.

To run unit tests:

```bash
npm run test:unit
```

### Integration Tests

Integration tests are located in the `tests/integration` directory and test the service's interaction with other components.

To run integration tests:

```bash
npm run test:integration
```

### Code Coverage

To generate a code coverage report:

```bash
npm run test:coverage
```

The report will be available in the `coverage` directory.

## Working with OpenFGA

### OpenFGA Model

The auth service uses OpenFGA for fine-grained authorization. The authorization model is defined in `src/models/authorizationModel.ts`.

To update the authorization model:

1. Edit the model definition in `src/models/authorizationModel.ts`
2. Restart the service

### Testing Authorization Rules

You can test authorization rules using the OpenFGA Playground:

1. Start the OpenFGA service:
   ```bash
   docker-compose up -d openfga
   ```

2. Open the OpenFGA Playground at http://localhost:8080

3. Create a new store and model using the model definition from `src/models/authorizationModel.ts`

4. Test your authorization rules using the Playground

## Working with Auth0 (Optional)

If you're using Auth0 for authentication, you'll need to set up an Auth0 tenant and configure the auth service to use it.

### Auth0 Setup

1. Create an Auth0 tenant at https://auth0.com

2. Create an API:
   - Name: NeuralLog API
   - Identifier: https://api.neurallog.app

3. Create applications:
   - NeuralLog Web (SPA)
   - NeuralLog Auth Service (Machine-to-Machine)

4. Configure environment variables:
   ```
   AUTH0_DOMAIN=your-domain.auth0.com
   AUTH0_CLIENT_ID=your-client-id
   AUTH0_CLIENT_SECRET=your-client-secret
   AUTH0_AUDIENCE=https://api.neurallog.app
   ```

## Working with KEK Management

The auth service includes a Key Encryption Key (KEK) management system for the zero-knowledge architecture.

### KEK Versions

KEK versions are managed through the `/api/kek/versions` endpoints. Each tenant has its own set of KEK versions, with one active version at a time.

### KEK Blobs

KEK blobs are encrypted key material that is stored for each user. They are managed through the `/api/kek/blobs` endpoints.

## Coding Standards

### TypeScript Guidelines

- Use TypeScript for all new code
- Follow the [TypeScript Style Guide](https://github.com/basarat/typescript-book/blob/master/docs/styleguide/styleguide.md)
- Use strict mode (`"strict": true` in tsconfig.json)
- Document all public APIs with JSDoc comments

### Testing Guidelines

- Write tests for all new features and bug fixes
- Aim for at least 80% code coverage
- Use descriptive test names that explain what is being tested
- Follow the AAA pattern (Arrange, Act, Assert)

### Git Workflow

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and commit them:
   ```bash
   git add .
   git commit -m "feat: add your feature"
   ```

3. Push your branch to GitHub:
   ```bash
   git push origin feature/your-feature-name
   ```

4. Create a pull request on GitHub

### Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

Types:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: Code changes that neither fix a bug nor add a feature
- `perf`: Performance improvements
- `test`: Adding or correcting tests
- `chore`: Changes to the build process or auxiliary tools

## Troubleshooting

Common development issues and solutions:

### OpenFGA Connection Issues

**Problem**: Cannot connect to OpenFGA.

**Solution**:
- Ensure OpenFGA is running: `docker ps | grep openfga`
- Check OpenFGA logs: `docker logs neurallog-openfga`
- Verify the OpenFGA API URL in your `.env` file

### PostgreSQL Connection Issues

**Problem**: Cannot connect to PostgreSQL.

**Solution**:
- Ensure PostgreSQL is running: `docker ps | grep postgres`
- Check PostgreSQL logs: `docker logs neurallog-postgres`
- Verify the PostgreSQL connection details in your `.env` file

### Redis Connection Issues

**Problem**: Cannot connect to Redis.

**Solution**:
- Ensure Redis is running: `docker ps | grep redis`
- Check Redis logs: `docker logs neurallog-redis`
- Verify the Redis connection details in your `.env` file

### TypeScript Compilation Errors

**Problem**: TypeScript compilation fails.

**Solution**:
- Check your TypeScript version: `npm list typescript`
- Ensure your code follows the TypeScript configuration
- Try cleaning the build: `npm run clean && npm run build`

## Deployment

### Docker Deployment

To build and deploy the service using Docker:

1. Build the Docker image:
   ```bash
   docker build -t neurallog-auth .
   ```

2. Run the container:
   ```bash
   docker run -p 3040:3040 --env-file .env neurallog-auth
   ```

### Docker Compose Deployment

To deploy the service using Docker Compose:

```bash
docker-compose up -d
```

This will start the auth service along with PostgreSQL, Redis, and OpenFGA.

## Additional Resources

- [OpenFGA Documentation](https://openfga.dev/docs)
- [Auth0 Documentation](https://auth0.com/docs)
- [Express.js Documentation](https://expressjs.com/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [NeuralLog Architecture](https://neurallog.github.io/docs/architecture/overview)
