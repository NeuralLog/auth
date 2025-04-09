# Introduction to NeuralLog Auth

NeuralLog Auth is a centralized authentication and authorization service for the NeuralLog ecosystem. It provides a robust, scalable, and secure way to manage access control across all NeuralLog services.

## What is NeuralLog Auth?

NeuralLog Auth is a dedicated service that handles all authentication and authorization concerns for NeuralLog applications. It uses OpenFGA (Fine-Grained Authorization) to implement a flexible and powerful authorization system that supports multi-tenancy with proper namespacing.

### Key Features

- **Fine-grained Access Control**: Control access at the resource level with different permission types
- **Multi-tenant Support**: Secure isolation between tenants with proper namespacing
- **Centralized Authorization**: Single source of truth for authorization decisions
- **Scalable Architecture**: Designed for high performance and reliability
- **Easy Integration**: Client SDKs for different platforms and languages

## Why a Dedicated Auth Service?

Authentication and authorization are critical cross-cutting concerns in any distributed system. By implementing these concerns as a dedicated service, we achieve several benefits:

1. **Separation of Concerns**: Auth logic is isolated from application logic
2. **Consistent Implementation**: Authorization rules are applied consistently across services
3. **Simplified Maintenance**: Updates to auth logic can be made in one place
4. **Enhanced Security**: Security experts can focus on hardening a single service
5. **Scalability**: Auth services can be scaled independently based on demand

## OpenFGA: Fine-Grained Authorization

NeuralLog Auth uses OpenFGA, an open-source authorization system that implements Google's Zanzibar model. OpenFGA provides:

- **Relationship-based Authorization**: Model complex relationships between users and resources
- **High Performance**: Designed for low-latency authorization checks
- **Scalability**: Horizontally scalable to handle large workloads
- **Flexibility**: Adapt to complex authorization requirements

## Multi-tenant Architecture

NeuralLog Auth is designed from the ground up to support multi-tenancy:

- **Tenant Isolation**: Each tenant's data is isolated through the authorization model
- **Shared Infrastructure**: Single OpenFGA instance with proper namespacing
- **Efficient Resource Usage**: Optimized resource utilization across tenants
- **Tenant Migration**: Simplified tenant migration through the authorization model

## How NeuralLog Auth Fits in the Ecosystem

NeuralLog Auth serves as the central authorization service for all NeuralLog components:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          NeuralLog System                               │
│                                                                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌───────────┐ │
│  │ NeuralLog   │    │ NeuralLog   │    │ OpenFGA     │    │PostgreSQL │ │
│  │ Server      │───▶│ Auth Service│───▶│ Service     │───▶│Database   │ │
│  │             │    │             │    │             │    │           │ │
│  │ • API       │◀───│ • Auth      │◀───│ • Auth      │◀───│ • Auth    │ │
│  │ • Storage   │    │   Service   │    │   Engine    │    │   Data    │ │
│  └─────────────┘    └─────────────┘    └─────────────┘    └───────────┘ │
│                                                                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                  │
│  │ NeuralLog   │    │ Redis       │    │ Monitoring  │                  │
│  │ Web         │    │ Service     │    │ Stack       │                  │
│  │             │    │             │    │             │                  │
│  │ • Frontend  │    │ • Cache     │    │ • Prometheus│                  │
│  │ • UI        │    │ • Storage   │    │ • Grafana   │                  │
│  └─────────────┘    └─────────────┘    └─────────────┘                  │
└─────────────────────────────────────────────────────────────────────────┘
```

## Next Steps

- [Quick Start Guide](./quick-start.md): Get up and running with NeuralLog Auth
- [Key Concepts](./key-concepts.md): Learn the fundamental concepts of NeuralLog Auth
- [Installation](./installation.md): Detailed installation instructions
