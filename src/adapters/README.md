# OpenFGA Adapters

This directory contains adapters for connecting to different OpenFGA instances.

## Overview

The adapter pattern allows the auth service to connect to different OpenFGA instances based on the environment:

- **Local OpenFGA Adapter**: For development and self-hosted deployments
- **Kubernetes OpenFGA Adapter**: For production multi-tenant deployments

## Usage

### Local OpenFGA Adapter

The local adapter connects to a single OpenFGA instance, typically running locally or in a self-hosted environment.

```typescript
import { OpenFGAAdapterFactory } from '@neurallog/auth';

// Create a local adapter
const adapter = OpenFGAAdapterFactory.createAdapter({
  adapterType: 'local',
  localOptions: {
    apiUrl: 'http://localhost:8080',
    tenantId: 'default'
  }
});

// Initialize the adapter
await adapter.initialize();
```

### Kubernetes OpenFGA Adapter

The Kubernetes adapter can connect to either:

1. A global OpenFGA instance shared by all tenants
2. Tenant-specific OpenFGA instances running in each tenant's namespace

```typescript
import { OpenFGAAdapterFactory } from '@neurallog/auth';

// Create a Kubernetes adapter
const adapter = OpenFGAAdapterFactory.createAdapter({
  adapterType: 'kubernetes',
  kubernetesOptions: {
    globalApiUrl: 'http://openfga.openfga-system.svc.cluster.local:8080',
    tenantId: 'default',
    useTenantSpecificInstances: true,
    tenantNamespaceFormat: 'tenant-{tenantId}',
    openfgaServiceName: 'openfga',
    openfgaServicePort: 8080
  }
});

// Initialize the adapter
await adapter.initialize();
```

## Configuration

### Local OpenFGA Adapter Options

| Option | Description | Default |
|--------|-------------|---------|
| `apiUrl` | OpenFGA API URL | `http://localhost:8080` |
| `tenantId` | Default tenant ID | `default` |

### Kubernetes OpenFGA Adapter Options

| Option | Description | Default |
|--------|-------------|---------|
| `globalApiUrl` | Global OpenFGA API URL | `http://openfga.openfga-system.svc.cluster.local:8080` |
| `tenantId` | Default tenant ID | `default` |
| `useTenantSpecificInstances` | Whether to use tenant-specific OpenFGA instances | `true` |
| `tenantNamespaceFormat` | Format for tenant namespaces | `tenant-{tenantId}` |
| `openfgaServiceName` | OpenFGA service name in tenant namespace | `openfga` |
| `openfgaServicePort` | OpenFGA service port in tenant namespace | `8080` |

## Environment Variables

The adapter factory uses the following environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENFGA_ADAPTER_TYPE` | Adapter type (`local` or `kubernetes`) | `local` in development, `kubernetes` in production |
| `OPENFGA_API_URL` | OpenFGA API URL for local adapter | `http://localhost:8080` |
| `OPENFGA_GLOBAL_API_URL` | Global OpenFGA API URL for Kubernetes adapter | `http://openfga.openfga-system.svc.cluster.local:8080` |
| `DEFAULT_TENANT_ID` | Default tenant ID | `default` |
| `USE_TENANT_SPECIFIC_INSTANCES` | Whether to use tenant-specific OpenFGA instances | `true` |
| `TENANT_NAMESPACE_FORMAT` | Format for tenant namespaces | `tenant-{tenantId}` |
| `OPENFGA_SERVICE_NAME` | OpenFGA service name in tenant namespace | `openfga` |
| `OPENFGA_SERVICE_PORT` | OpenFGA service port in tenant namespace | `8080` |
