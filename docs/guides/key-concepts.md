# Key Concepts in NeuralLog Auth

This document explains the fundamental concepts and terminology used in NeuralLog Auth.

## Authorization Model

NeuralLog Auth uses a relationship-based authorization model powered by OpenFGA. Understanding this model is key to effectively using the system.

### Types and Relations

The authorization model consists of **types** and **relations**:

- **Types**: Represent entities in the system (e.g., tenant, log, log_entry)
- **Relations**: Define relationships between entities (e.g., owner, reader, writer)

For example, a user can be an "owner" of a log, or a "reader" of a log entry.

### Authorization Tuples

Authorization is defined using **tuples** that connect users, relations, and objects:

```
(user, relation, object)
```

For example:
- `(user:alice, owner, log:system-logs)`
- `(user:bob, reader, log_entry:12345)`

These tuples define who can do what with which resources.

### Hierarchical Relationships

Resources can have parent-child relationships:

```
log_entry → log → tenant
```

This hierarchy allows permissions to flow from parent to child. For example, if a user is an admin of a tenant, they might automatically have access to all logs in that tenant.

## Multi-tenancy

NeuralLog Auth is designed for multi-tenant environments where multiple customers (tenants) share the same infrastructure.

### Tenant Isolation

Each tenant's data is isolated through the authorization model:

- Every resource belongs to a tenant
- Users are associated with specific tenants
- Authorization checks include tenant context

### Tenant Context

All authorization operations include tenant context:

- API requests include a tenant ID header
- Authorization checks verify tenant membership
- Resources are linked to their parent tenant

### Tenant Migration

The authorization model makes tenant migration straightforward:

- Authorization data is structured by tenant
- Moving resources between tenants is a matter of updating parent relationships
- No need to duplicate or restructure data

## Permission Types

NeuralLog Auth defines several standard permission types:

### Basic Permissions

- **read**: Ability to view a resource
- **write**: Ability to modify a resource
- **admin**: Full control over a resource
- **owner**: Ownership of a resource (typically includes admin rights plus the ability to transfer ownership)

### Permission Mapping

These permissions map to relations in the authorization model:

| Permission | Relation |
|------------|----------|
| read       | reader   |
| write      | writer   |
| admin      | admin    |
| owner      | owner    |

## Authentication vs. Authorization

It's important to understand the distinction between these two concepts:

### Authentication

**Authentication** is the process of verifying who a user is. This typically involves:

- Validating credentials (username/password)
- Issuing tokens (JWT)
- Managing sessions

### Authorization

**Authorization** is the process of determining what a user can do. This involves:

- Checking permissions
- Enforcing access control
- Managing roles and relationships

NeuralLog Auth primarily focuses on authorization, though it works closely with authentication systems.

## Client SDKs

NeuralLog Auth provides client SDKs for different platforms:

- **TypeScript SDK**: For server and web applications
- **Python SDK**: For data processing and scripting
- **Unity SDK**: For game and simulation integration

These SDKs provide a consistent interface for authorization checks across different platforms.

## Caching

Authorization checks can be expensive, so NeuralLog Auth implements caching at multiple levels:

- **Client-side Caching**: SDKs cache authorization decisions
- **Server-side Caching**: The auth service caches OpenFGA responses
- **TTL-based Invalidation**: Cache entries expire after a configurable time

## Next Steps

- [Quick Start Guide](./quick-start.md): Get up and running with NeuralLog Auth
- [Authorization Model](../architecture/authorization-model.md): Detailed explanation of the authorization model
- [Multi-tenant Design](../architecture/multi-tenant-design.md): In-depth look at multi-tenancy
