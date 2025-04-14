# NeuralLog Auth Scripts

This directory contains utility scripts for NeuralLog Auth setup and management.

## Auth0 Setup Script

The `setup-auth0.ts` script automates the setup of Auth0 for NeuralLog. It creates the necessary applications, API, and rules.

### Prerequisites

1. Create an Auth0 account and tenant
2. Create a Machine-to-Machine application with access to the Auth0 Management API
3. Install dependencies:
   ```bash
   npm install
   ```

### Usage

1. Set environment variables:
   ```bash
   export AUTH0_DOMAIN=your-tenant.auth0.com
   export AUTH0_CLIENT_ID=your-management-api-client-id
   export AUTH0_CLIENT_SECRET=your-management-api-client-secret
   ```

2. Run the script:
   ```bash
   npm run setup-auth0
   ```

### Output

The script generates environment variable files in the `auth0-output` directory:
- `auth-service.env`: Environment variables for the auth service
- `web-app.env.local`: Environment variables for the web application
- `mcp-client.env`: Environment variables for the MCP client
- `summary.md`: Summary of the created resources

## Other Scripts

More scripts will be added here as needed.
