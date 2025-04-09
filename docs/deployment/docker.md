# Docker Deployment Guide

This guide explains how to deploy NeuralLog Auth using Docker and Docker Compose.

## Prerequisites

Before you begin, make sure you have the following installed:

- [Docker](https://www.docker.com/) (version 20.10.0 or later)
- [Docker Compose](https://docs.docker.com/compose/) (version 2.0.0 or later)
- [Git](https://git-scm.com/) (optional, for cloning the repository)

## Getting the Code

You can either clone the repository or download the source code:

```bash
git clone https://github.com/your-org/neurallog-auth.git
cd neurallog-auth
```

## Configuration

### Environment Variables

Create a `.env` file based on the example:

```bash
cp .env.example .env
```

Edit the `.env` file to configure your environment:

```
# Server configuration
NODE_ENV=production
PORT=3040

# OpenFGA configuration
OPENFGA_HOST=openfga
OPENFGA_PORT=8080

# PostgreSQL configuration
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=neurallog_auth

# JWT configuration
JWT_SECRET=your-jwt-secret-key-change-in-production
JWT_EXPIRES_IN=1d

# Logging
LOG_LEVEL=info
```

### Important Security Notes

- **JWT_SECRET**: Change this to a strong, unique value in production
- **POSTGRES_PASSWORD**: Change this to a strong, unique value in production
- **NODE_ENV**: Set to `production` for production deployments

## Building the Docker Image

You can build the Docker image locally:

```bash
docker-compose build
```

This will build the NeuralLog Auth service image based on the Dockerfile.

## Deployment Options

### Basic Deployment

The simplest way to deploy NeuralLog Auth is using Docker Compose:

```bash
docker-compose up -d
```

This will start:
- NeuralLog Auth service on port 3040
- OpenFGA service on port 8080
- PostgreSQL database on port 5432

### Checking Deployment Status

Check if the containers are running:

```bash
docker-compose ps
```

View the logs:

```bash
docker-compose logs -f
```

### Stopping the Deployment

To stop the deployment:

```bash
docker-compose down
```

To stop and remove volumes (this will delete all data):

```bash
docker-compose down -v
```

## Production Considerations

For production deployments, consider the following:

### Security

1. **Environment Variables**:
   - Use a secure method to manage secrets (e.g., Docker secrets, Kubernetes secrets)
   - Never commit `.env` files with sensitive information to version control

2. **Network Security**:
   - Use a reverse proxy (e.g., Nginx, Traefik) with HTTPS
   - Restrict access to the OpenFGA and PostgreSQL services
   - Consider using a private Docker registry

3. **Container Security**:
   - Run containers as non-root users
   - Use read-only file systems where possible
   - Implement resource limits

### High Availability

1. **Database Replication**:
   - Set up PostgreSQL replication for data redundancy
   - Consider using a managed PostgreSQL service

2. **Service Redundancy**:
   - Run multiple instances of the NeuralLog Auth service
   - Use a load balancer to distribute traffic

3. **Backup and Recovery**:
   - Implement regular database backups
   - Test recovery procedures

### Monitoring

1. **Container Monitoring**:
   - Set up monitoring for container health and resource usage
   - Implement alerting for critical issues

2. **Application Monitoring**:
   - Configure logging to a centralized log management system
   - Implement application metrics and monitoring

## Docker Compose Configuration

The default `docker-compose.yml` file includes:

```yaml
version: '3.8'

services:
  # Auth service
  auth:
    build:
      context: .
      dockerfile: docker/Dockerfile
    container_name: neurallog-auth
    ports:
      - "3040:3040"
    environment:
      - NODE_ENV=production
      - PORT=3040
      - OPENFGA_HOST=openfga
      - OPENFGA_PORT=8080
      - JWT_SECRET=your-jwt-secret-key-change-in-production
      - POSTGRES_HOST=postgres
      - POSTGRES_PORT=5432
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=neurallog_auth
    depends_on:
      - openfga
      - postgres
    restart: unless-stopped

  # OpenFGA service
  openfga:
    image: openfga/openfga:latest
    container_name: neurallog-openfga
    ports:
      - "8080:8080"
      - "8081:8081"
    environment:
      - OPENFGA_DATASTORE_ENGINE=postgres
      - OPENFGA_DATASTORE_URI=postgres://postgres:postgres@postgres:5432/openfga
      - OPENFGA_AUTHN_METHOD=none
      - OPENFGA_LOG_LEVEL=info
      - OPENFGA_PLAYGROUND_ENABLED=true
    depends_on:
      - postgres
    restart: unless-stopped

  # PostgreSQL service
  postgres:
    image: postgres:14-alpine
    container_name: neurallog-postgres
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=openfga
    volumes:
      - postgres-data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres-data:
    driver: local
```

## Custom Configurations

### Using External PostgreSQL

If you want to use an external PostgreSQL database:

```yaml
version: '3.8'

services:
  # Auth service
  auth:
    build:
      context: .
      dockerfile: docker/Dockerfile
    container_name: neurallog-auth
    ports:
      - "3040:3040"
    environment:
      - NODE_ENV=production
      - PORT=3040
      - OPENFGA_HOST=openfga
      - OPENFGA_PORT=8080
      - JWT_SECRET=your-jwt-secret-key-change-in-production
      - POSTGRES_HOST=your-postgres-host
      - POSTGRES_PORT=5432
      - POSTGRES_USER=your-postgres-user
      - POSTGRES_PASSWORD=your-postgres-password
      - POSTGRES_DB=neurallog_auth
    depends_on:
      - openfga
    restart: unless-stopped

  # OpenFGA service
  openfga:
    image: openfga/openfga:latest
    container_name: neurallog-openfga
    ports:
      - "8080:8080"
      - "8081:8081"
    environment:
      - OPENFGA_DATASTORE_ENGINE=postgres
      - OPENFGA_DATASTORE_URI=postgres://your-postgres-user:your-postgres-password@your-postgres-host:5432/openfga
      - OPENFGA_AUTHN_METHOD=none
      - OPENFGA_LOG_LEVEL=info
      - OPENFGA_PLAYGROUND_ENABLED=true
    restart: unless-stopped
```

### Using Docker Swarm

For Docker Swarm deployments, you can use a similar configuration with some adjustments:

```yaml
version: '3.8'

services:
  # Auth service
  auth:
    image: your-registry/neurallog-auth:latest
    ports:
      - "3040:3040"
    environment:
      - NODE_ENV=production
      - PORT=3040
      - OPENFGA_HOST=openfga
      - OPENFGA_PORT=8080
      - JWT_SECRET=your-jwt-secret-key-change-in-production
      - POSTGRES_HOST=postgres
      - POSTGRES_PORT=5432
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=neurallog_auth
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
    depends_on:
      - openfga
      - postgres

  # OpenFGA service
  openfga:
    image: openfga/openfga:latest
    ports:
      - "8080:8080"
      - "8081:8081"
    environment:
      - OPENFGA_DATASTORE_ENGINE=postgres
      - OPENFGA_DATASTORE_URI=postgres://postgres:postgres@postgres:5432/openfga
      - OPENFGA_AUTHN_METHOD=none
      - OPENFGA_LOG_LEVEL=info
      - OPENFGA_PLAYGROUND_ENABLED=true
    deploy:
      replicas: 2
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
    depends_on:
      - postgres

  # PostgreSQL service
  postgres:
    image: postgres:14-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=openfga
    volumes:
      - postgres-data:/var/lib/postgresql/data
    deploy:
      placement:
        constraints:
          - node.role == manager
      restart_policy:
        condition: on-failure

volumes:
  postgres-data:
    driver: local
```

## Troubleshooting

### Common Issues

#### Container Fails to Start

Check the logs:

```bash
docker-compose logs auth
```

Common issues include:
- Incorrect environment variables
- Database connection issues
- Port conflicts

#### Database Connection Issues

Ensure PostgreSQL is running and accessible:

```bash
docker-compose exec auth ping postgres
docker-compose exec auth nc -zv postgres 5432
```

#### OpenFGA Connection Issues

Ensure OpenFGA is running and accessible:

```bash
docker-compose exec auth ping openfga
docker-compose exec auth nc -zv openfga 8080
```

#### Permission Issues with Volumes

If you encounter permission issues with volumes:

```bash
sudo chown -R 1000:1000 ./path/to/volume
```

## Next Steps

- [Kubernetes Deployment](./kubernetes.md): Deploy NeuralLog Auth on Kubernetes
- [Production Considerations](./production.md): Additional considerations for production deployments
- [Monitoring and Logging](./monitoring.md): Set up monitoring and logging
