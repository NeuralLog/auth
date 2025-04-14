# Authorization Model

This document provides a detailed explanation of the authorization model used in NeuralLog Auth.

## OpenFGA Authorization Model

NeuralLog Auth uses OpenFGA's relationship-based authorization model, which is based on Google's Zanzibar paper. This model is particularly well-suited for fine-grained authorization in multi-tenant systems.

### Model Definition

The authorization model is defined in JSON format:

```json
{
  "type_definitions": [
    {
      "type": "tenant",
      "relations": {
        "admin": { "this": {} },
        "member": { "this": {} },
        "exists": { "this": {} }
      }
    },
    {
      "type": "user",
      "relations": {
        "identity": { "this": {} }
      }
    },
    {
      "type": "log",
      "relations": {
        "owner": { "this": {} },
        "reader": { "this": {} },
        "writer": { "this": {} },
        "parent": {
          "type": "tenant"
        }
      },
      "metadata": {
        "relations": {
          "parent": { "directly_related_user_types": [{ "type": "tenant" }] }
        }
      }
    },
    {
      "type": "log_entry",
      "relations": {
        "owner": { "this": {} },
        "reader": { "this": {} },
        "writer": { "this": {} },
        "parent": {
          "type": "log"
        }
      },
      "metadata": {
        "relations": {
          "parent": { "directly_related_user_types": [{ "type": "log" }] }
        }
      }
    },
    {
      "type": "system",
      "relations": {
        "admin": { "this": {} }
      }
    }
  ]
}
```

### Types

The model defines several types:

#### Tenant

The `tenant` type represents a customer or organization in the system:

- **admin**: Users who have administrative access to the tenant
- **member**: Users who are members of the tenant
- **exists**: Special relation used for tenant listing

#### User

The `user` type represents a user in the system:

- **identity**: Relation used for self-referential permissions

#### Log

The `log` type represents a log in the system:

- **owner**: Users who own the log
- **reader**: Users who can read the log
- **writer**: Users who can write to the log
- **parent**: The tenant that the log belongs to

#### Log Entry

The `log_entry` type represents an entry in a log:

- **owner**: Users who own the log entry
- **reader**: Users who can read the log entry
- **writer**: Users who can write to the log entry
- **parent**: The log that the entry belongs to

#### System

The `system` type represents system-wide resources:

- **admin**: Users who have system-wide administrative access

### Relations

Relations define the relationships between users and objects:

#### Direct Relations

Direct relations are explicitly defined:

```
(user:alice, owner, log:system-logs)
```

This tuple states that Alice is an owner of the system-logs log.

#### Computed Relations

Computed relations are derived from other relations:

```
(user:alice, admin, tenant:acme)
(log:system-logs, parent, tenant:acme)
```

These tuples might imply that Alice has access to the system-logs log because she's an admin of the tenant that the log belongs to.

### Authorization Rules

The authorization model defines rules for how permissions are computed:

#### Tenant Membership

A user must be a member of a tenant to access resources in that tenant:

```
(user:alice, member, tenant:acme)
```

#### Resource Ownership

Owners of a resource have full control over it:

```
(user:alice, owner, log:system-logs)
```

#### Parent-Child Relationships

Permissions can flow from parent to child:

```
(user:alice, admin, tenant:acme)
(log:system-logs, parent, tenant:acme)
```

This might imply that Alice has admin access to all logs in the acme tenant.

## Multi-tenant Authorization

The authorization model is designed to support multi-tenancy:

### Tenant Isolation

Each tenant's data is isolated through the authorization model:

```
(log:system-logs, parent, tenant:acme)
(log:app-logs, parent, tenant:beta)
```

Even if the same user exists in both tenants, they can only access resources in the tenants they're a member of.

### Cross-tenant Access

In some cases, you might want to allow cross-tenant access:

```
(user:alice@acme, reader, log:app-logs)
(log:app-logs, parent, tenant:beta)
```

This would allow Alice from the acme tenant to read the app-logs log in the beta tenant.

## Authorization Checks

Authorization checks verify if a user has a specific relation to an object:

```
check(user:alice, reader, log:system-logs)
```

This checks if Alice has reader access to the system-logs log.

### Contextual Tuples

Authorization checks can include contextual tuples that are only considered for that specific check:

```
check(user:alice, reader, log:system-logs, [
  (user:alice, member, tenant:acme),
  (log:system-logs, parent, tenant:acme)
])
```

This is useful for including dynamic context in authorization decisions.

## Authorization Patterns

The authorization model supports several common patterns:

### Role-Based Access Control (RBAC)

RBAC can be implemented using tenant roles:

```
(user:alice, admin, tenant:acme)
(user:bob, member, tenant:acme)
```

### Attribute-Based Access Control (ABAC)

ABAC can be implemented using contextual tuples:

```
check(user:alice, reader, log:system-logs, [
  (user:alice, department, department:it),
  (log:system-logs, accessible_by, department:it)
])
```

### Relationship-Based Access Control (ReBAC)

ReBAC is the native model of OpenFGA:

```
(user:alice, owner, log:system-logs)
(user:bob, team_member, team:engineering)
(team:engineering, reader, log:system-logs)
```

## Next Steps

- [Multi-tenant Design](./multi-tenant-design.md): In-depth look at multi-tenancy
- [Security Considerations](./security.md): Detailed security information
- [API Reference](../api/auth-api.md): Complete API documentation
