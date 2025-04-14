/**
 * Auth0 Setup Script
 *
 * This script automates the setup of Auth0 for NeuralLog.
 * It creates the necessary applications, API, and rules.
 *
 * Usage:
 * 1. Set environment variables:
 *    - AUTH0_DOMAIN
 *    - AUTH0_CLIENT_ID
 *    - AUTH0_CLIENT_SECRET
 * 2. Run the script:
 *    npx ts-node scripts/setup-auth0.ts
 */

import { ManagementClient } from 'auth0';
import * as fs from 'fs';
import * as path from 'path';

// Configuration
const config = {
  domain: process.env.AUTH0_DOMAIN,
  clientId: process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  api: {
    name: 'NeuralLog API',
    identifier: 'https://api.neurallog.app',
    scopes: [
      { value: 'logs:read', description: 'Read logs' },
      { value: 'logs:write', description: 'Write logs' }
    ]
  },
  applications: {
    web: {
      name: 'NeuralLog Web',
      type: 'spa',
      callbacks: ['https://neurallog.app/callback', 'http://localhost:3000/callback'],
      logoutUrls: ['https://neurallog.app', 'http://localhost:3000'],
      webOrigins: ['https://neurallog.app', 'http://localhost:3000']
    },
    authService: {
      name: 'NeuralLog Auth Service',
      type: 'non_interactive'
    },
    mcpClient: {
      name: 'NeuralLog MCP Client',
      type: 'non_interactive'
    }
  },
  rules: {
    addTenantToTokens: {
      name: 'Add Tenant to Tokens',
      script: `
function addTenantToTokens(user, context, callback) {
  // Get tenant ID from app_metadata or use default
  const tenantId = user.app_metadata && user.app_metadata.tenant_id
    ? user.app_metadata.tenant_id
    : 'default';

  // Add tenant ID to ID token and access token
  context.idToken['https://neurallog.app/tenant_id'] = tenantId;
  context.accessToken['https://neurallog.app/tenant_id'] = tenantId;

  callback(null, user, context);
}`
    }
  }
};

// Validate environment variables
if (!config.domain || !config.clientId || !config.clientSecret) {
  console.error('Error: Missing required environment variables.');
  console.error('Please set AUTH0_DOMAIN, AUTH0_CLIENT_ID, and AUTH0_CLIENT_SECRET.');
  process.exit(1);
}

// Initialize Auth0 Management client
const management = new ManagementClient({
  domain: config.domain,
  clientId: config.clientId,
  clientSecret: config.clientSecret,
});

// Store created resources
const resources: {
  api: any;
  applications: {
    web: any;
    authService: any;
    mcpClient: any;
  };
  rules: {
    addTenantToTokens: any;
  };
} = {
  api: null,
  applications: {
    web: null,
    authService: null,
    mcpClient: null
  },
  rules: {
    addTenantToTokens: null
  }
};

/**
 * Main function to set up Auth0
 */
async function setupAuth0() {
  console.log('Starting Auth0 setup for NeuralLog...');

  try {
    // 1. Create the NeuralLog API
    console.log('Creating NeuralLog API...');
    resources.api = await management.createResourceServer({
      name: config.api.name,
      identifier: config.api.identifier,
      scopes: config.api.scopes,
      signing_alg: 'RS256',
    });
    console.log(`✅ API created with ID: ${resources.api.id}`);

    // 2. Create the Web Application (SPA)
    console.log('Creating Web Application...');
    resources.applications.web = await management.createClient({
      name: config.applications.web.name,
      app_type: 'spa',
      callbacks: config.applications.web.callbacks,
      allowed_logout_urls: config.applications.web.logoutUrls,
      web_origins: config.applications.web.webOrigins,
      grant_types: ['authorization_code', 'implicit', 'refresh_token'],
    });
    console.log(`✅ Web Application created with ID: ${resources.applications.web.client_id}`);

    // 3. Create the Auth Service Application (M2M)
    console.log('Creating Auth Service Application...');
    resources.applications.authService = await management.createClient({
      name: config.applications.authService.name,
      app_type: 'non_interactive',
      grant_types: ['client_credentials'],
    });
    console.log(`✅ Auth Service Application created with ID: ${resources.applications.authService.client_id}`);

    // 4. Create the MCP Client Application (M2M)
    console.log('Creating MCP Client Application...');
    resources.applications.mcpClient = await management.createClient({
      name: config.applications.mcpClient.name,
      app_type: 'non_interactive',
      grant_types: ['client_credentials'],
    });
    console.log(`✅ MCP Client Application created with ID: ${resources.applications.mcpClient.client_id}`);

    // 5. Grant the Auth Service access to the Auth0 Management API
    console.log('Granting Auth Service access to Management API...');
    await management.createClientGrant({
      client_id: resources.applications.authService.client_id,
      audience: `https://${config.domain}/api/v2/`,
      scope: ['read:users', 'update:users', 'create:users', 'read:user_idp_tokens'],
    });
    console.log('✅ Granted Auth Service access to Management API');

    // 6. Grant the Auth Service and MCP Client access to the NeuralLog API
    console.log('Granting applications access to NeuralLog API...');
    await management.createClientGrant({
      client_id: resources.applications.authService.client_id,
      audience: config.api.identifier,
      scope: ['logs:read', 'logs:write'],
    });

    await management.createClientGrant({
      client_id: resources.applications.mcpClient.client_id,
      audience: config.api.identifier,
      scope: ['logs:read', 'logs:write'],
    });
    console.log('✅ Granted applications access to NeuralLog API');

    // 7. Create the tenant rule
    console.log('Creating tenant rule...');
    resources.rules.addTenantToTokens = await management.createRule({
      name: config.rules.addTenantToTokens.name,
      script: config.rules.addTenantToTokens.script,
      enabled: true,
    });
    console.log(`✅ Created rule: ${config.rules.addTenantToTokens.name}`);

    // Success!
    console.log('\n🎉 Auth0 setup completed successfully!');

    // Generate environment variables
    generateEnvFiles();

  } catch (error) {
    console.error('❌ Error setting up Auth0:', error);
    process.exit(1);
  }
}

/**
 * Generate environment variable files for each service
 */
function generateEnvFiles() {
  console.log('\nGenerating environment variable files...');

  // Auth Service .env
  const authServiceEnv = `# Auth0 Configuration
AUTH0_DOMAIN=${config.domain}
AUTH0_CLIENT_ID=${resources.applications.authService.client_id}
AUTH0_CLIENT_SECRET=${resources.applications.authService.client_secret}
AUTH0_AUDIENCE=${config.api.identifier}

# OpenFGA Configuration
OPENFGA_API_URL=your-openfga-api-url
OPENFGA_STORE_ID=your-openfga-store-id
OPENFGA_API_TOKEN=your-openfga-api-token
`;

  // Web Application .env.local
  const webAppEnv = `# Auth0 Configuration
NEXT_PUBLIC_AUTH0_DOMAIN=${config.domain}
NEXT_PUBLIC_AUTH0_CLIENT_ID=${resources.applications.web.client_id}
NEXT_PUBLIC_AUTH0_AUDIENCE=${config.api.identifier}

# Auth Service Configuration
NEXT_PUBLIC_AUTH_SERVICE_URL=https://auth.neurallog.app
NEXT_PUBLIC_DEFAULT_TENANT_ID=default
`;

  // MCP Client .env
  const mcpClientEnv = `# Auth0 Configuration
AUTH0_DOMAIN=${config.domain}
AUTH0_CLIENT_ID=${resources.applications.mcpClient.client_id}
AUTH0_CLIENT_SECRET=${resources.applications.mcpClient.client_secret}
AUTH0_AUDIENCE=${config.api.identifier}

# Auth Service Configuration
AUTH_SERVICE_URL=https://auth.neurallog.app
TENANT_ID=default
`;

  // Create output directory if it doesn't exist
  const outputDir = path.join(__dirname, 'auth0-output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  // Write files
  fs.writeFileSync(path.join(outputDir, 'auth-service.env'), authServiceEnv);
  fs.writeFileSync(path.join(outputDir, 'web-app.env.local'), webAppEnv);
  fs.writeFileSync(path.join(outputDir, 'mcp-client.env'), mcpClientEnv);

  // Write summary file
  const summary = `# Auth0 Setup Summary

## API
- Name: ${config.api.name}
- Identifier: ${config.api.identifier}
- ID: ${resources.api.id}

## Applications

### Web Application
- Name: ${config.applications.web.name}
- Client ID: ${resources.applications.web.client_id}
- Type: SPA

### Auth Service
- Name: ${config.applications.authService.name}
- Client ID: ${resources.applications.authService.client_id}
- Client Secret: ${resources.applications.authService.client_secret}
- Type: Machine-to-Machine

### MCP Client
- Name: ${config.applications.mcpClient.name}
- Client ID: ${resources.applications.mcpClient.client_id}
- Client Secret: ${resources.applications.mcpClient.client_secret}
- Type: Machine-to-Machine

## Rules
- ${config.rules.addTenantToTokens.name}

## Environment Files
Environment variable files have been generated in the 'auth0-output' directory:
- auth-service.env
- web-app.env.local
- mcp-client.env
`;

  fs.writeFileSync(path.join(outputDir, 'summary.md'), summary);

  console.log(`✅ Environment files generated in: ${outputDir}`);
  console.log('   - auth-service.env');
  console.log('   - web-app.env.local');
  console.log('   - mcp-client.env');
  console.log('   - summary.md');
}

// Run the setup
setupAuth0();
