# NeuralLog Auth Architecture Overview

This document provides a high-level overview of the NeuralLog Auth architecture, explaining how the different components work together to provide a robust authorization system.

## System Architecture

NeuralLog Auth follows a microservice architecture pattern, with clear separation of concerns and well-defined interfaces between components.

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          NeuralLog Auth Service                         │
│                                                                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌───────────┐ │
│  │ API Layer   │    │ Service     │    │ OpenFGA     │    │PostgreSQL │ │
│  │             │───▶│ Layer       │───▶│ Client      │───▶│Database   │ │
│  │ • Auth API  │    │             │    │             │    │           │ │
│  │ • Tenant API│◀───│ • Auth      │◀───│ • Auth      │◀───│ • Auth    │ │
│  │ • Middleware│    │   Service   │    │   Models    │    │   Data    │ │
│  └─────────────┘    └─────────────┘    └─────────────┘    └───────────┘ │
│                                                                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                  │
│  │ Client      │    │ Caching     │    │ Logging     │                  │
│  │ SDKs        │    │ Layer       │    │ Layer       │                  │
│  │             │    │             │    │             │                  │
│  │ • TypeScript│    │ • Node      │    │ • Winston   │                  │
│  │ • Python    │    │   Cache     │    │ • Morgan    │                  │
│  │ • Unity     │    │ • TTL       │    │             │                  │
│  └─────────────┘    └─────────────┘    └─────────────┘                  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Components

#### 1. API Layer

The API layer exposes RESTful endpoints for authorization operations:

- **Auth API**: Endpoints for checking, granting, and revoking permissions
- **Tenant API**: Endpoints for managing tenants
- **Middleware**: Express middleware for request processing and error handling

#### 2. Service Layer

The service layer contains the core business logic:

- **Auth Service**: Implements authorization operations
- **Tenant Service**: Manages tenant lifecycle
- **Caching Service**: Optimizes performance through caching

#### 3. OpenFGA Client

The OpenFGA client communicates with the OpenFGA service:

- **Authorization Model**: Defines types and relations
- **Tuple Management**: Creates, reads, and deletes authorization tuples
- **Authorization Checks**: Performs permission checks

#### 4. PostgreSQL Database

PostgreSQL provides durable storage for OpenFGA:

- **Authorization Data**: Stores authorization tuples
- **Authorization Models**: Stores authorization model definitions
- **Tenant Data**: Stores tenant information

#### 5. Client SDKs

Client SDKs provide easy integration with other services:

- **TypeScript SDK**: For Node.js and web applications
- **Python SDK**: For data processing and scripting
- **Unity SDK**: For game and simulation integration

#### 6. Caching Layer

The caching layer improves performance:

- **Node Cache**: In-memory caching for authorization decisions
- **TTL-based Invalidation**: Cache entries expire after a configurable time

#### 7. Logging Layer

The logging layer provides observability:

- **Winston**: Structured logging for application events
- **Morgan**: HTTP request logging

## Request Flow

Here's how a typical authorization check flows through the system:

1. **Client Request**: A client sends a request to check if a user has permission
2. **API Layer**: The request is received by the Auth API
3. **Service Layer**: The Auth Service processes the request
4. **Cache Check**: The system checks if the result is cached
5. **OpenFGA Check**: If not cached, the system queries OpenFGA
6. **Response**: The result is returned to the client and cached for future requests

## Deployment Architecture

NeuralLog Auth can be deployed in various configurations:

### Docker Compose Deployment

```
┌─────────────────┐    ┌─────────────┐    ┌─────────────┐
│ NeuralLog Auth  │    │ OpenFGA     │    │ PostgreSQL  │
│ Container       │───▶│ Container   │───▶│ Container   │
└─────────────────┘    └─────────────┘    └─────────────┘
```

### Kubernetes Deployment

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Kubernetes Cluster                             │
│                                                                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌───────────┐ │
│  │ NeuralLog   │    │ NeuralLog   │    │ OpenFGA     │    │PostgreSQL │ │
│  │ Server Pod  │───▶│ Auth Pod    │───▶│ Pod         │───▶│Pod        │ │
│  │             │    │             │    │             │    │           │ │
│  │ • API       │◀───│ • Auth      │◀───│ • Auth      │◀───│ • Auth    │ │
│  │ • Storage   │    │   Service   │    │   Engine    │    │   Data    │ │
│  └─────────────┘    └─────────────┘    └─────────────┘    └───────────┘ │
│                                                                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                  │
│  │ NeuralLog   │    │ Redis       │    │ Monitoring  │                  │
│  │ Web Pod     │    │ Pod         │    │ Stack       │                  │
│  │             │    │             │    │             │                  │
│  │ • Frontend  │    │ • Cache     │    │ • Prometheus│                  │
│  │ • UI        │    │ • Storage   │    │ • Grafana   │                  │
│  └─────────────┘    └─────────────┘    └─────────────┘                  │
└─────────────────────────────────────────────────────────────────────────┘
```

## Integration with NeuralLog Ecosystem

NeuralLog Auth integrates with other NeuralLog components:

- **NeuralLog Server**: Uses the TypeScript SDK to check permissions for API requests
- **NeuralLog Web**: Uses the TypeScript SDK for client-side permission checks
- **NeuralLog Clients**: Use the appropriate SDK for their platform

## Security Considerations

The architecture includes several security features:

- **Tenant Isolation**: Authorization checks include tenant context
- **JWT Authentication**: Secure token-based authentication
- **HTTPS**: All communication is encrypted
- **Input Validation**: All API inputs are validated
- **Error Handling**: Secure error handling that doesn't leak sensitive information

## Performance Considerations

The architecture is designed for high performance:

- **Caching**: Multi-level caching reduces latency
- **Connection Pooling**: Efficient database connections
- **Horizontal Scaling**: Components can be scaled independently
- **Asynchronous Processing**: Non-blocking I/O for high throughput

## Next Steps

- [Authorization Model](./authorization-model.md): Detailed explanation of the authorization model
- [Multi-tenant Design](./multi-tenant-design.md): In-depth look at multi-tenancy
- [Security Considerations](./security.md): Detailed security information
