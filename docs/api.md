# API Reference

This document provides detailed information about the API for NeuralLog Auth.

## Table of Contents

- [REST API](#rest-api)
  - [Base URL](#base-url)
  - [Headers](#headers)
  - [Authentication Endpoints](#authentication-endpoints)
  - [Authorization Endpoints](#authorization-endpoints)
  - [API Key Endpoints](#api-key-endpoints)
  - [User Management Endpoints](#user-management-endpoints)
  - [Role Management Endpoints](#role-management-endpoints)
  - [Tenant Management Endpoints](#tenant-management-endpoints)
  - [KEK Management Endpoints](#kek-management-endpoints)
  - [Public Key Endpoints](#public-key-endpoints)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

## REST API

### Base URL

All API endpoints are relative to the base URL:

```
http://localhost:3040
```

In production environments, this would typically be:

```
https://auth.{tenantId}.neurallog.app
```

### Headers

All requests should include the following headers:

| Header          | Description                            | Required |
|-----------------|----------------------------------------|----------|
| Content-Type    | Should be set to `application/json`    | Yes      |
| X-Tenant-ID     | The ID of the tenant                   | Yes      |
| Authorization   | Bearer token for authenticated requests | For protected endpoints |

### Authentication Endpoints

#### Authenticate User

```
POST /api/auth/login
```

Authenticates a user with username and password.

**Request Body:**

```json
{
  "username": "user@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600,
  "user": {
    "id": "user123",
    "email": "user@example.com",
    "name": "John Doe",
    "tenantId": "tenant123"
  }
}
```

#### Machine-to-Machine Authentication

```
POST /api/auth/m2m
```

Authenticates a machine-to-machine client.

**Request Body:**

```json
{
  "clientId": "client123",
  "clientSecret": "secret456"
}
```

**Response:**

```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```

#### Validate Token

```
POST /api/auth/validate
```

Validates a token and returns user information.

**Request Body:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**

```json
{
  "status": "success",
  "valid": true,
  "user": {
    "id": "user123",
    "email": "user@example.com",
    "name": "John Doe",
    "tenantId": "tenant123"
  }
}
```

#### Exchange Token

```
POST /api/auth/exchange-token
```

Exchanges an Auth0 token for a server access token.

**Request Body:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Register User

```
POST /api/auth/register
```

Registers a new user.

**Request Body:**

```json
{
  "email": "newuser@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "status": "success",
  "message": "User registered successfully"
}
```

### Authorization Endpoints

#### Check Permission

```
POST /api/auth/check
```

Checks if a user has permission to access a resource.

**Request Body:**

```json
{
  "user": "user:123",
  "relation": "can_read",
  "object": "document:456",
  "contextualTuples": [
    {
      "user": "user:123",
      "relation": "owner",
      "object": "document:456"
    }
  ]
}
```

**Response:**

```json
{
  "status": "success",
  "allowed": true
}
```

### API Key Endpoints

#### Create API Key

```
POST /api/apikeys
```

Creates a new API key for the authenticated user.

**Request Body:**

```json
{
  "name": "My API Key",
  "expiresIn": 30 // days
}
```

**Response:**

```json
{
  "status": "success",
  "apiKey": {
    "id": "key123",
    "name": "My API Key",
    "key": "nl_abc123.xyz789", // Only shown once
    "createdAt": "2023-06-01T12:00:00Z",
    "expiresAt": "2023-07-01T12:00:00Z"
  }
}
```

#### List API Keys

```
GET /api/apikeys
```

Lists all API keys for the authenticated user.

**Response:**

```json
{
  "status": "success",
  "apiKeys": [
    {
      "id": "key123",
      "name": "My API Key",
      "createdAt": "2023-06-01T12:00:00Z",
      "expiresAt": "2023-07-01T12:00:00Z",
      "revoked": false
    }
  ]
}
```

#### Revoke API Key

```
DELETE /api/apikeys/:id
```

Revokes an API key.

**Response:**

```json
{
  "status": "success",
  "message": "API key revoked successfully"
}
```

#### Generate Zero-Knowledge Verification Data

```
POST /api/apikeys/generate-zk-verification
```

Generates zero-knowledge verification data for an API key.

**Request Body:**

```json
{
  "apiKey": "nl_abc123.xyz789"
}
```

**Response:**

```json
{
  "status": "success",
  "keyId": "key123",
  "verificationHash": "0x1234..."
}
```

### User Management Endpoints

```
GET /api/users
```

Lists all users in the tenant.

```
GET /api/users/:id
```

Gets a specific user by ID.

```
PUT /api/users/:id
```

Updates a user.

```
DELETE /api/users/:id
```

Deletes a user.

### Role Management Endpoints

```
GET /api/roles
```

Lists all roles in the tenant.

```
POST /api/roles
```

Creates a new role.

```
GET /api/roles/:id
```

Gets a specific role by ID.

```
PUT /api/roles/:id
```

Updates a role.

```
DELETE /api/roles/:id
```

Deletes a role.

### Tenant Management Endpoints

```
POST /api/tenants
```

Creates a new tenant.

**Request Body:**

```json
{
  "tenantId": "tenant123",
  "adminUserId": "user123"
}
```

**Response:**

```json
{
  "status": "success",
  "message": "Tenant created successfully",
  "tenantId": "tenant123",
  "adminUserId": "user123"
}
```

### KEK Management Endpoints

```
GET /api/kek/versions
```

Gets all KEK versions for the tenant.

```
GET /api/kek/versions/active
```

Gets the active KEK version for the tenant.

```
POST /api/kek/versions
```

Creates a new KEK version.

```
PUT /api/kek/versions/:id/status
```

Updates the status of a KEK version.

```
POST /api/kek/rotate
```

Rotates the KEK, creating a new version and optionally removing users.

```
GET /api/kek/blobs/users/:userId/versions/:versionId
```

Gets a KEK blob for a user and version.

```
GET /api/kek/blobs/users/:userId
```

Gets all KEK blobs for a user.

```
GET /api/kek/blobs/me
```

Gets all KEK blobs for the current user.

```
POST /api/kek/blobs
```

Provisions a KEK blob for a user.

```
DELETE /api/kek/blobs/users/:userId/versions/:versionId
```

Deletes a KEK blob.

### Public Key Endpoints

```
POST /api/public-keys
```

Uploads a public key.

```
GET /api/public-keys/:userId
```

Gets a public key for a user.

## OpenAPI/Swagger Documentation

The API is documented using OpenAPI (formerly known as Swagger). The OpenAPI schema is located at `src/openapi.yaml` in the auth service repository.

### Modular OpenAPI Schema Structure

The OpenAPI schema is organized in a modular way:

- `src/openapi.yaml`: The main OpenAPI schema file
- `src/openapi/components/`: Directory containing schema definitions for various components
- `src/openapi/paths/`: Directory containing API path definitions

This modular structure makes it easier to maintain and extend the API documentation.

### OpenAPI Schema as Single Source of Truth

The OpenAPI schema serves as the single source of truth for the API. It defines all endpoints, request/response structures, and validation rules.

### TypeScript Type Generation

TypeScript types for the API are automatically generated from the OpenAPI schema during the build process. These types are used by the client SDK to ensure type safety and consistency between the server and client.

The generated types are located in the `typescript-client-sdk/src/types/api.ts` file and are used by both the auth service and client applications.

### Updating the API

When making changes to the API:

1. Update the component schemas in `src/openapi/components/`
2. Update the API paths in `src/openapi/paths/`
3. Run `npm run generate-openapi` to generate the complete OpenAPI schema
4. Run `npm run generate-api-types` to generate updated TypeScript types
5. Update the implementation to match the new schema

This ensures that the documentation, types, and implementation stay in sync.

## Error Handling

The API returns standard HTTP status codes to indicate the success or failure of a request:

- 200 OK: The request was successful
- 201 Created: The resource was successfully created
- 400 Bad Request: The request was invalid or malformed
- 401 Unauthorized: Authentication failed or token is invalid
- 403 Forbidden: The authenticated user does not have permission to access the resource
- 404 Not Found: The requested resource was not found
- 500 Internal Server Error: An error occurred on the server

Error responses have the following format:

```json
{
  "status": "error",
  "message": "Error message",
  "code": "ERROR_CODE"
}
```

Common error messages include:

- "Missing required parameter: [parameter]"
- "Invalid tenant ID"
- "Unauthorized"
- "Forbidden"
- "Resource not found"
- "Internal server error"

## Rate Limiting

The API implements rate limiting to prevent abuse:

- 100 requests per minute per IP address
- 1000 requests per minute per tenant

When rate limits are exceeded, the API returns a 429 Too Many Requests response.
