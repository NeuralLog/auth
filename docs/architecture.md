# Architecture

This document describes the architecture of the NeuralLog Auth service.

## Overview

The NeuralLog Auth service is a central component of the NeuralLog ecosystem, responsible for authentication, authorization, and key management. It implements a zero-knowledge architecture where sensitive cryptographic operations happen client-side, ensuring that sensitive data never leaves the client unencrypted.

The service is built on a multi-tenant architecture, allowing multiple organizations to use the same service instance while maintaining strict isolation between tenants. It integrates with OpenFGA for fine-grained authorization and supports various authentication methods, including username/password, API keys, and machine-to-machine authentication.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     NeuralLog Auth Service                   │
│                                                             │
│  ┌─────────────┐  ┌─────────────────────┐  ┌─────────────┐  │
│  │ HTTP API    │  │ Service Layer       │  │ Storage     │  │
│  │             │  │                     │  │             │  │
│  │ • Auth API  │◄─┤ • Auth Service      │◄─┤ • Redis     │  │
│  │ • User API  │  │ • User Service      │  │ • Postgres  │  │
│  │ • Role API  │  │ • Role Service      │  │             │  │
│  │ • Tenant API│  │ • Tenant Service    │  └─────────────┘  │
│  │ • KEK API   │  │ • KEK Service       │         ▲         │
│  └─────────────┘  │ • API Key Service   │         │         │
│         ▲         └─────────────────────┘         │         │
│         │                    ▲                    │         │
│         │                    │                    │         │
└─────────┼────────────────────┼────────────────────┼─────────┘
          │                    │                    │
          │                    │                    │
┌─────────┼────────────────────┼────────────────────┼─────────┐
│         │                    │                    │         │
│         ▼                    │                    │         │
│  ┌─────────────┐             │                    │         │
│  │ Clients     │             │                    │         │
│  │             │             │                    │         │
│  │ • Web App   │             │                    │         │
│  │ • SDKs      │             │                    │         │
│  │ • MCP Client│             │                    │         │
│  └─────────────┘             │                    │         │
│                              │                    │         │
│                              ▼                    │         │
│                     ┌─────────────────┐           │         │
│                     │ OpenFGA         │           │         │
│                     │                 │           │         │
│                     │ • Authorization │           │         │
│                     │ • Permissions   │           │         │
│                     └─────────────────┘           │         │
│                                                   │         │
│                                                   ▼         │
│                                          ┌─────────────────┐│
│                                          │ Auth0           ││
│                                          │                 ││
│                                          │ • Identity      ││
│                                          │ • Authentication││
│                                          └─────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Components

### HTTP API Layer

The HTTP API layer exposes RESTful endpoints for authentication, authorization, user management, role management, tenant management, and key management. It handles request validation, authentication, and routing to the appropriate service.

Key responsibilities:
- Authentication endpoint handling
- Request validation
- Rate limiting
- CORS handling
- Response formatting

### Service Layer

The service layer contains the core business logic for the auth service. It implements the various services needed for authentication, authorization, and key management.

#### Auth Service

The Auth Service is responsible for authenticating users and managing authentication sessions. It supports multiple authentication methods, including username/password, API keys, and machine-to-machine authentication.

Key responsibilities:
- User authentication
- Token generation and validation
- Permission checking
- Integration with OpenFGA

#### User Service

The User Service manages user accounts and profiles.

Key responsibilities:
- User creation, retrieval, update, and deletion
- User profile management
- User search

#### Role Service

The Role Service manages roles and permissions.

Key responsibilities:
- Role creation, retrieval, update, and deletion
- Role assignment
- Permission management

#### Tenant Service

The Tenant Service manages tenants and tenant-specific configurations.

Key responsibilities:
- Tenant creation, retrieval, update, and deletion
- Tenant configuration management
- Tenant isolation

#### KEK Service

The KEK (Key Encryption Key) Service manages encryption keys for the zero-knowledge architecture.

Key responsibilities:
- KEK version management
- KEK rotation
- KEK blob provisioning

#### API Key Service

The API Key Service manages API keys for programmatic access to the NeuralLog API.

Key responsibilities:
- API key creation, retrieval, update, and deletion
- API key validation
- API key revocation

### Storage Layer

The storage layer is responsible for persisting data used by the auth service.

#### Redis

Redis is used for caching and storing ephemeral data such as:
- Authentication tokens
- Session data
- Rate limiting counters

#### PostgreSQL

PostgreSQL is used for storing persistent data such as:
- User accounts
- Roles and permissions
- Tenants
- API keys
- KEK versions and blobs

### External Services

#### OpenFGA

OpenFGA is used for fine-grained authorization. It stores and evaluates authorization models and relationships.

Key responsibilities:
- Authorization model management
- Relationship management
- Authorization checks

#### Auth0 (Optional)

Auth0 can be used as an external identity provider for authentication.

Key responsibilities:
- Identity management
- Authentication
- Social login integration

## Data Flow

### Authentication Flow

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│         │     │         │     │         │     │         │
│ Client  │────▶│ Auth API│────▶│ Auth    │────▶│ Redis/  │
│         │     │         │     │ Service │     │ Postgres│
└─────────┘     └─────────┘     └─────────┘     └─────────┘
     │                               │
     │                               │
     │                               ▼
     │                         ┌─────────┐
     │                         │         │
     │                         │ Auth0   │
     │                         │         │
     │                         └─────────┘
     │                               │
     ▼                               │
┌─────────┐                          │
│         │                          │
│ JWT     │◀─────────────────────────┘
│ Token   │
└─────────┘
```

1. Client sends authentication request to Auth API
2. Auth API validates request and forwards to Auth Service
3. Auth Service authenticates user (directly or via Auth0)
4. Auth Service generates JWT token
5. JWT token is returned to client

### Authorization Flow

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│         │     │         │     │         │     │         │
│ Client  │────▶│ Auth API│────▶│ Auth    │────▶│ OpenFGA │
│         │     │         │     │ Service │     │         │
└─────────┘     └─────────┘     └─────────┘     └─────────┘
     ▲                               │
     │                               │
     └───────────────────────────────┘
           Authorization Result
```

1. Client sends authorization check request to Auth API
2. Auth API validates request and forwards to Auth Service
3. Auth Service checks authorization with OpenFGA
4. Authorization result is returned to client

### KEK Management Flow

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│         │     │         │     │         │     │         │
│ Client  │────▶│ KEK API │────▶│ KEK     │────▶│ Postgres│
│         │     │         │     │ Service │     │         │
└─────────┘     └─────────┘     └─────────┘     └─────────┘
     ▲                               │
     │                               │
     └───────────────────────────────┘
              KEK Data
```

1. Client sends KEK management request to KEK API
2. KEK API validates request and forwards to KEK Service
3. KEK Service performs operation and updates database
4. Result is returned to client

## Design Patterns

### Repository Pattern

The repository pattern is used to abstract the data access layer from the service layer. Each service has a corresponding repository that handles data access operations.

### Dependency Injection

Dependency injection is used to provide services with their dependencies, making the code more modular and testable.

### Adapter Pattern

The adapter pattern is used to integrate with external services like OpenFGA and Auth0, providing a consistent interface to these services.

### Factory Pattern

The factory pattern is used to create instances of services and repositories, allowing for different implementations to be used in different environments.

## Integration Points

### NeuralLog Server Integration

NeuralLog Auth integrates with NeuralLog Server to provide authentication and authorization for API requests.

Integration points:
- JWT token validation
- Permission checks
- User information retrieval

### NeuralLog Web Integration

NeuralLog Auth integrates with NeuralLog Web to provide authentication and authorization for web applications.

Integration points:
- Login and registration forms
- User profile management
- Role and permission management
- KEK management

### NeuralLog SDK Integration

NeuralLog Auth integrates with NeuralLog SDKs to provide authentication and authorization for client applications.

Integration points:
- API key management
- Token exchange
- Permission checks

## Performance Considerations

- **Caching**: Redis is used to cache frequently accessed data like tokens and user information
- **Connection Pooling**: Database connections are pooled to reduce connection overhead
- **Rate Limiting**: API endpoints are rate-limited to prevent abuse
- **Asynchronous Processing**: Long-running operations are processed asynchronously

## Security Considerations

- **Zero-Knowledge Architecture**: Sensitive cryptographic operations happen client-side
- **JWT Security**: JWTs are signed and have short expiration times
- **API Key Security**: API keys are securely generated and stored
- **Password Security**: Passwords are hashed using bcrypt
- **HTTPS**: All API endpoints are served over HTTPS
- **CORS**: CORS is configured to restrict access to trusted domains
- **Rate Limiting**: API endpoints are rate-limited to prevent brute force attacks
- **Input Validation**: All input is validated to prevent injection attacks

## Future Improvements

- **Enhanced Multi-Factor Authentication**: Support for additional MFA methods
- **Audit Logging**: Comprehensive audit logging for security events
- **Advanced Rate Limiting**: More sophisticated rate limiting based on user behavior
- **Improved Key Rotation**: Automated key rotation for enhanced security
- **Enhanced Monitoring**: Better monitoring and alerting for security events
- **Distributed Tracing**: Implementation of distributed tracing for better debugging
- **GraphQL API**: Addition of a GraphQL API for more flexible data access
