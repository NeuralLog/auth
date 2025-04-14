# Tenant API Reference

This document provides a detailed reference for the NeuralLog Auth API endpoints related to tenant management.

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
| Authorization   | Bearer token for authentication        | Yes      |

Note: Unlike the Auth API, the Tenant API does not require the `X-Tenant-ID` header, as these operations are typically performed by system administrators.

## Endpoints

### Create Tenant

Creates a new tenant.

**Endpoint:** `POST /api/tenants`

**Request Body:**

```json
{
  "tenantId": "acme",
  "adminUserId": "user:alice"
}
```

**Parameters:**

| Parameter   | Type   | Description                                | Required |
|-------------|--------|--------------------------------------------|----------|
| tenantId    | string | The ID of the tenant to create             | Yes      |
| adminUserId | string | The user ID to assign as the tenant admin  | Yes      |

**Response:**

```json
{
  "status": "success",
  "message": "Tenant created successfully",
  "tenantId": "acme",
  "adminUserId": "user:alice"
}
```

**Status Codes:**

| Status Code | Description                                                  |
|-------------|--------------------------------------------------------------|
| 201         | The tenant was created successfully                          |
| 400         | Bad request (e.g., missing required parameters)              |
| 401         | Unauthorized (e.g., invalid or missing authentication token) |
| 403         | Forbidden (e.g., insufficient permissions to create tenants) |
| 409         | Conflict (e.g., tenant ID already exists)                    |
| 500         | Internal server error                                        |

**Example:**

```bash
curl -X POST http://localhost:3040/api/tenants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token-here" \
  -d '{
    "tenantId": "acme",
    "adminUserId": "user:alice"
  }'
```

### List Tenants

Lists all tenants.

**Endpoint:** `GET /api/tenants`

**Query Parameters:**

| Parameter | Type   | Description                                | Required |
|-----------|--------|--------------------------------------------|----------|
| limit     | number | Maximum number of tenants to return        | No       |
| offset    | number | Number of tenants to skip                  | No       |

**Response:**

```json
{
  "status": "success",
  "tenants": [
    "acme",
    "beta",
    "gamma"
  ]
}
```

**Status Codes:**

| Status Code | Description                                                  |
|-------------|--------------------------------------------------------------|
| 200         | The request was successful                                   |
| 401         | Unauthorized (e.g., invalid or missing authentication token) |
| 403         | Forbidden (e.g., insufficient permissions to list tenants)   |
| 500         | Internal server error                                        |

**Example:**

```bash
curl -X GET http://localhost:3040/api/tenants \
  -H "Authorization: Bearer your-token-here"
```

### Get Tenant

Gets information about a specific tenant.

**Endpoint:** `GET /api/tenants/:tenantId`

**Path Parameters:**

| Parameter | Type   | Description                | Required |
|-----------|--------|----------------------------|----------|
| tenantId  | string | The ID of the tenant       | Yes      |

**Response:**

```json
{
  "status": "success",
  "tenant": {
    "tenantId": "acme",
    "adminUserId": "user:alice",
    "created": "2023-04-01T12:00:00Z"
  }
}
```

**Status Codes:**

| Status Code | Description                                                  |
|-------------|--------------------------------------------------------------|
| 200         | The request was successful                                   |
| 401         | Unauthorized (e.g., invalid or missing authentication token) |
| 403         | Forbidden (e.g., insufficient permissions to view tenant)    |
| 404         | Not found (e.g., tenant does not exist)                      |
| 500         | Internal server error                                        |

**Example:**

```bash
curl -X GET http://localhost:3040/api/tenants/acme \
  -H "Authorization: Bearer your-token-here"
```

### Delete Tenant

Deletes a tenant.

**Endpoint:** `DELETE /api/tenants/:tenantId`

**Path Parameters:**

| Parameter | Type   | Description                | Required |
|-----------|--------|----------------------------|----------|
| tenantId  | string | The ID of the tenant       | Yes      |

**Response:**

```json
{
  "status": "success",
  "message": "Tenant deleted successfully",
  "tenantId": "acme"
}
```

**Status Codes:**

| Status Code | Description                                                  |
|-------------|--------------------------------------------------------------|
| 200         | The request was successful                                   |
| 401         | Unauthorized (e.g., invalid or missing authentication token) |
| 403         | Forbidden (e.g., insufficient permissions to delete tenant)  |
| 404         | Not found (e.g., tenant does not exist)                      |
| 500         | Internal server error                                        |

**Example:**

```bash
curl -X DELETE http://localhost:3040/api/tenants/acme \
  -H "Authorization: Bearer your-token-here"
```

## Common Patterns

### Creating Multiple Tenants

```bash
# Create first tenant
curl -X POST http://localhost:3040/api/tenants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token-here" \
  -d '{
    "tenantId": "acme",
    "adminUserId": "user:alice"
  }'

# Create second tenant
curl -X POST http://localhost:3040/api/tenants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token-here" \
  -d '{
    "tenantId": "beta",
    "adminUserId": "user:bob"
  }'
```

### Listing and Filtering Tenants

```bash
# List all tenants
curl -X GET http://localhost:3040/api/tenants \
  -H "Authorization: Bearer your-token-here"

# List tenants with pagination
curl -X GET "http://localhost:3040/api/tenants?limit=10&offset=0" \
  -H "Authorization: Bearer your-token-here"
```

### Tenant Migration

To migrate data between tenants, you would typically:

1. Create the destination tenant
2. Copy the data to the destination tenant
3. Update permissions in the destination tenant
4. Delete the source tenant when ready

```bash
# Create destination tenant
curl -X POST http://localhost:3040/api/tenants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token-here" \
  -d '{
    "tenantId": "acme-new",
    "adminUserId": "user:alice"
  }'

# Delete source tenant when migration is complete
curl -X DELETE http://localhost:3040/api/tenants/acme-old \
  -H "Authorization: Bearer your-token-here"
```

## Error Handling

The API returns structured error responses:

```json
{
  "status": "error",
  "message": "Tenant already exists: acme"
}
```

Common error messages include:

- "Missing required parameter: tenantId"
- "Missing required parameter: adminUserId"
- "Tenant already exists: {tenantId}"
- "Tenant not found: {tenantId}"
- "Unauthorized"
- "Forbidden"
- "Internal server error"

## Rate Limiting

The API implements rate limiting to prevent abuse:

- 10 tenant creation/deletion requests per minute per IP address
- 100 tenant listing requests per minute per IP address

When rate limits are exceeded, the API returns a 429 Too Many Requests response.

## Next Steps

- [Auth API](./auth-api.md): API endpoints for authorization
- [Error Handling](./error-handling.md): Detailed error handling information
- [SDK Documentation](../sdk/typescript.md): Client SDK usage
