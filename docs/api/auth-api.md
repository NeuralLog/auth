# Auth API Reference

This document provides a detailed reference for the NeuralLog Auth API endpoints related to authorization.

## Base URL

All API endpoints are relative to the base URL:

```
http://localhost:3040
```

## Headers

All requests should include the following headers:

| Header          | Description                            | Required |
|-----------------|----------------------------------------|----------|
| Content-Type    | Should be set to `application/json`    | Yes      |
| X-Tenant-ID     | The ID of the tenant                   | Yes      |
| Authorization   | Bearer token for authentication        | Optional |

## Endpoints

### Check Permission

Checks if a user has permission to access a resource.

**Endpoint:** `POST /api/auth/check`

**Request Body:**

```json
{
  "user": "user:alice",
  "relation": "reader",
  "object": "log:system-logs",
  "contextualTuples": [
    {
      "user": "user:alice",
      "relation": "member",
      "object": "tenant:acme"
    }
  ]
}
```

**Parameters:**

| Parameter        | Type     | Description                                      | Required |
|------------------|----------|--------------------------------------------------|----------|
| user             | string   | The user identifier                              | Yes      |
| relation         | string   | The relation to check                            | Yes      |
| object           | string   | The object identifier                            | Yes      |
| contextualTuples | array    | Additional tuples to consider for this check     | No       |

**Response:**

```json
{
  "status": "success",
  "allowed": true
}
```

**Status Codes:**

| Status Code | Description                                                  |
|-------------|--------------------------------------------------------------|
| 200         | The request was successful                                   |
| 400         | Bad request (e.g., missing required parameters)              |
| 401         | Unauthorized (e.g., invalid or missing authentication token) |
| 500         | Internal server error                                        |

**Example:**

```bash
curl -X POST http://localhost:3040/api/auth/check \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: acme" \
  -d '{
    "user": "user:alice",
    "relation": "reader",
    "object": "log:system-logs"
  }'
```

### Grant Permission

Grants a permission to a user.

**Endpoint:** `POST /api/auth/grant`

**Request Body:**

```json
{
  "user": "user:alice",
  "relation": "reader",
  "object": "log:system-logs"
}
```

**Parameters:**

| Parameter | Type   | Description         | Required |
|-----------|--------|---------------------|----------|
| user      | string | The user identifier | Yes      |
| relation  | string | The relation to grant | Yes    |
| object    | string | The object identifier | Yes    |

**Response:**

```json
{
  "status": "success",
  "message": "Permission granted"
}
```

**Status Codes:**

| Status Code | Description                                                  |
|-------------|--------------------------------------------------------------|
| 200         | The request was successful                                   |
| 400         | Bad request (e.g., missing required parameters)              |
| 401         | Unauthorized (e.g., invalid or missing authentication token) |
| 403         | Forbidden (e.g., insufficient permissions to grant)          |
| 500         | Internal server error                                        |

**Example:**

```bash
curl -X POST http://localhost:3040/api/auth/grant \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: acme" \
  -d '{
    "user": "user:alice",
    "relation": "reader",
    "object": "log:system-logs"
  }'
```

### Revoke Permission

Revokes a permission from a user.

**Endpoint:** `POST /api/auth/revoke`

**Request Body:**

```json
{
  "user": "user:alice",
  "relation": "reader",
  "object": "log:system-logs"
}
```

**Parameters:**

| Parameter | Type   | Description         | Required |
|-----------|--------|---------------------|----------|
| user      | string | The user identifier | Yes      |
| relation  | string | The relation to revoke | Yes   |
| object    | string | The object identifier | Yes    |

**Response:**

```json
{
  "status": "success",
  "message": "Permission revoked"
}
```

**Status Codes:**

| Status Code | Description                                                  |
|-------------|--------------------------------------------------------------|
| 200         | The request was successful                                   |
| 400         | Bad request (e.g., missing required parameters)              |
| 401         | Unauthorized (e.g., invalid or missing authentication token) |
| 403         | Forbidden (e.g., insufficient permissions to revoke)         |
| 500         | Internal server error                                        |

**Example:**

```bash
curl -X POST http://localhost:3040/api/auth/revoke \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: acme" \
  -d '{
    "user": "user:alice",
    "relation": "reader",
    "object": "log:system-logs"
  }'
```

## Common Patterns

### Checking Read Permission

```bash
curl -X POST http://localhost:3040/api/auth/check \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: acme" \
  -d '{
    "user": "user:alice",
    "relation": "reader",
    "object": "log:system-logs"
  }'
```

### Checking Write Permission

```bash
curl -X POST http://localhost:3040/api/auth/check \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: acme" \
  -d '{
    "user": "user:alice",
    "relation": "writer",
    "object": "log:system-logs"
  }'
```

### Checking Admin Permission

```bash
curl -X POST http://localhost:3040/api/auth/check \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: acme" \
  -d '{
    "user": "user:alice",
    "relation": "admin",
    "object": "tenant:acme"
  }'
```

### Granting Multiple Permissions

To grant multiple permissions, make multiple API calls:

```bash
# Grant read permission
curl -X POST http://localhost:3040/api/auth/grant \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: acme" \
  -d '{
    "user": "user:alice",
    "relation": "reader",
    "object": "log:system-logs"
  }'

# Grant write permission
curl -X POST http://localhost:3040/api/auth/grant \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: acme" \
  -d '{
    "user": "user:alice",
    "relation": "writer",
    "object": "log:system-logs"
  }'
```

## Error Handling

The API returns structured error responses:

```json
{
  "status": "error",
  "message": "Missing required parameter: user"
}
```

Common error messages include:

- "Missing required parameter: user"
- "Missing required parameter: relation"
- "Missing required parameter: object"
- "Invalid tenant ID"
- "Unauthorized"
- "Forbidden"
- "Internal server error"

## Rate Limiting

The API implements rate limiting to prevent abuse:

- 100 requests per minute per IP address
- 1000 requests per minute per tenant

When rate limits are exceeded, the API returns a 429 Too Many Requests response.

## Next Steps

- [Tenant API](./tenant-api.md): API endpoints for tenant management
- [Error Handling](./error-handling.md): Detailed error handling information
- [SDK Documentation](../sdk/typescript.md): Client SDK usage
