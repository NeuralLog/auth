# Kubernetes Deployment Guide

This guide explains how to deploy NeuralLog Auth on Kubernetes.

## Prerequisites

Before you begin, make sure you have the following:

- A Kubernetes cluster (version 1.19 or later)
- [kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl/) configured to communicate with your cluster
- [Helm](https://helm.sh/) (version 3.0.0 or later) for optional deployment methods
- Basic understanding of Kubernetes concepts

## Deployment Options

There are several ways to deploy NeuralLog Auth on Kubernetes:

1. **Using kubectl with YAML manifests** (covered in this guide)
2. **Using Helm charts** (recommended for production)
3. **Using Kubernetes operators**

This guide focuses on the first option, which is the most straightforward.

## Deployment Architecture

The Kubernetes deployment consists of the following components:

- **NeuralLog Auth Deployment**: The main application
- **OpenFGA Deployment**: The authorization engine
- **PostgreSQL StatefulSet**: The database for OpenFGA
- **Services**: For internal and external communication
- **ConfigMaps and Secrets**: For configuration and sensitive data
- **PersistentVolumeClaims**: For data persistence

## Deployment Steps

### Step 1: Create a Namespace

First, create a dedicated namespace for NeuralLog Auth:

```bash
kubectl create namespace neurallog
```

### Step 2: Create Secrets

Create a secret for sensitive information:

```bash
kubectl create secret generic neurallog-secrets \
  --namespace neurallog \
  --from-literal=jwt-secret="your-jwt-secret-key-change-in-production" \
  --from-literal=postgres-user="postgres" \
  --from-literal=postgres-password="postgres"
```

### Step 3: Deploy PostgreSQL

Create a PersistentVolumeClaim for PostgreSQL:

```yaml
# postgres-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: neurallog-postgres-pvc
  namespace: neurallog
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: standard
```

Apply the PVC:

```bash
kubectl apply -f postgres-pvc.yaml
```

Deploy PostgreSQL:

```yaml
# postgres-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: neurallog-postgres
  namespace: neurallog
  labels:
    app: neurallog-postgres
spec:
  replicas: 1
  selector:
    matchLabels:
      app: neurallog-postgres
  template:
    metadata:
      labels:
        app: neurallog-postgres
    spec:
      containers:
      - name: postgres
        image: postgres:14-alpine
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: neurallog-secrets
              key: postgres-user
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: neurallog-secrets
              key: postgres-password
        - name: POSTGRES_DB
          value: "openfga"
        volumeMounts:
        - name: postgres-data
          mountPath: /var/lib/postgresql/data
        resources:
          limits:
            cpu: "1000m"
            memory: "1Gi"
          requests:
            cpu: "500m"
            memory: "512Mi"
        livenessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - postgres
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - postgres
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: postgres-data
        persistentVolumeClaim:
          claimName: neurallog-postgres-pvc
```

Create a service for PostgreSQL:

```yaml
# postgres-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: neurallog-postgres
  namespace: neurallog
  labels:
    app: neurallog-postgres
spec:
  selector:
    app: neurallog-postgres
  ports:
  - port: 5432
    targetPort: 5432
  type: ClusterIP
```

Apply the PostgreSQL deployment and service:

```bash
kubectl apply -f postgres-deployment.yaml
kubectl apply -f postgres-service.yaml
```

### Step 4: Deploy OpenFGA

Deploy OpenFGA:

```yaml
# openfga-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: neurallog-openfga
  namespace: neurallog
  labels:
    app: neurallog-openfga
spec:
  replicas: 1
  selector:
    matchLabels:
      app: neurallog-openfga
  template:
    metadata:
      labels:
        app: neurallog-openfga
    spec:
      containers:
      - name: openfga
        image: openfga/openfga:latest
        ports:
        - containerPort: 8080
        - containerPort: 8081
        env:
        - name: OPENFGA_DATASTORE_ENGINE
          value: "postgres"
        - name: OPENFGA_DATASTORE_URI
          value: "postgres://$(POSTGRES_USER):$(POSTGRES_PASSWORD)@neurallog-postgres:5432/openfga"
        - name: OPENFGA_AUTHN_METHOD
          value: "none"
        - name: OPENFGA_LOG_LEVEL
          value: "info"
        - name: OPENFGA_PLAYGROUND_ENABLED
          value: "true"
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: neurallog-secrets
              key: postgres-user
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: neurallog-secrets
              key: postgres-password
        resources:
          limits:
            cpu: "1000m"
            memory: "1Gi"
          requests:
            cpu: "500m"
            memory: "512Mi"
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
```

Create a service for OpenFGA:

```yaml
# openfga-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: neurallog-openfga
  namespace: neurallog
  labels:
    app: neurallog-openfga
spec:
  selector:
    app: neurallog-openfga
  ports:
  - name: http
    port: 8080
    targetPort: 8080
  - name: grpc
    port: 8081
    targetPort: 8081
  type: ClusterIP
```

Apply the OpenFGA deployment and service:

```bash
kubectl apply -f openfga-deployment.yaml
kubectl apply -f openfga-service.yaml
```

### Step 5: Deploy NeuralLog Auth

Create a ConfigMap for NeuralLog Auth:

```yaml
# auth-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: neurallog-auth-config
  namespace: neurallog
data:
  NODE_ENV: "production"
  PORT: "3040"
  OPENFGA_HOST: "neurallog-openfga"
  OPENFGA_PORT: "8080"
  POSTGRES_HOST: "neurallog-postgres"
  POSTGRES_PORT: "5432"
  POSTGRES_DB: "neurallog_auth"
  LOG_LEVEL: "info"
```

Deploy NeuralLog Auth:

```yaml
# auth-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: neurallog-auth
  namespace: neurallog
  labels:
    app: neurallog-auth
spec:
  replicas: 2
  selector:
    matchLabels:
      app: neurallog-auth
  template:
    metadata:
      labels:
        app: neurallog-auth
    spec:
      containers:
      - name: auth
        image: your-registry/neurallog-auth:latest
        ports:
        - containerPort: 3040
        envFrom:
        - configMapRef:
            name: neurallog-auth-config
        env:
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: neurallog-secrets
              key: jwt-secret
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: neurallog-secrets
              key: postgres-user
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: neurallog-secrets
              key: postgres-password
        resources:
          limits:
            cpu: "500m"
            memory: "512Mi"
          requests:
            cpu: "100m"
            memory: "256Mi"
        livenessProbe:
          httpGet:
            path: /
            port: 3040
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 3040
          initialDelaySeconds: 5
          periodSeconds: 5
```

Create a service for NeuralLog Auth:

```yaml
# auth-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: neurallog-auth
  namespace: neurallog
  labels:
    app: neurallog-auth
spec:
  selector:
    app: neurallog-auth
  ports:
  - port: 3040
    targetPort: 3040
  type: ClusterIP
```

Apply the NeuralLog Auth deployment and service:

```bash
kubectl apply -f auth-configmap.yaml
kubectl apply -f auth-deployment.yaml
kubectl apply -f auth-service.yaml
```

### Step 6: Expose the Service

For internal access within the cluster, the ClusterIP service is sufficient. For external access, you can use an Ingress or a LoadBalancer service.

#### Option 1: Using an Ingress

Create an Ingress resource:

```yaml
# auth-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: neurallog-auth-ingress
  namespace: neurallog
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
  - host: auth.neurallog.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: neurallog-auth
            port:
              number: 3040
```

Apply the Ingress:

```bash
kubectl apply -f auth-ingress.yaml
```

#### Option 2: Using a LoadBalancer Service

Update the service to use LoadBalancer type:

```yaml
# auth-service-lb.yaml
apiVersion: v1
kind: Service
metadata:
  name: neurallog-auth
  namespace: neurallog
  labels:
    app: neurallog-auth
spec:
  selector:
    app: neurallog-auth
  ports:
  - port: 3040
    targetPort: 3040
  type: LoadBalancer
```

Apply the LoadBalancer service:

```bash
kubectl apply -f auth-service-lb.yaml
```

## Scaling and High Availability

### Horizontal Pod Autoscaler

You can set up a Horizontal Pod Autoscaler (HPA) to automatically scale the NeuralLog Auth deployment:

```yaml
# auth-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: neurallog-auth-hpa
  namespace: neurallog
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: neurallog-auth
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

Apply the HPA:

```bash
kubectl apply -f auth-hpa.yaml
```

### Pod Disruption Budget

To ensure high availability during voluntary disruptions, you can set up a Pod Disruption Budget:

```yaml
# auth-pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: neurallog-auth-pdb
  namespace: neurallog
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: neurallog-auth
```

Apply the PDB:

```bash
kubectl apply -f auth-pdb.yaml
```

## Monitoring and Logging

### Prometheus Metrics

You can set up Prometheus monitoring by adding annotations to the NeuralLog Auth deployment:

```yaml
metadata:
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/path: "/metrics"
    prometheus.io/port: "3040"
```

### Logging with Fluentd

You can set up Fluentd for log collection by adding a sidecar container to the NeuralLog Auth deployment:

```yaml
containers:
- name: fluentd
  image: fluent/fluentd:v1.14
  volumeMounts:
  - name: log-volume
    mountPath: /var/log
```

## Upgrading

To upgrade NeuralLog Auth:

1. Update the image tag in the deployment:

```bash
kubectl set image deployment/neurallog-auth auth=your-registry/neurallog-auth:new-version -n neurallog
```

2. Monitor the rollout:

```bash
kubectl rollout status deployment/neurallog-auth -n neurallog
```

3. If needed, roll back:

```bash
kubectl rollout undo deployment/neurallog-auth -n neurallog
```

## Troubleshooting

### Checking Pod Status

```bash
kubectl get pods -n neurallog
```

### Viewing Pod Logs

```bash
kubectl logs -f deployment/neurallog-auth -n neurallog
```

### Checking Service Endpoints

```bash
kubectl get endpoints neurallog-auth -n neurallog
```

### Common Issues

#### Pods Stuck in Pending State

This might be due to insufficient resources:

```bash
kubectl describe pod <pod-name> -n neurallog
```

#### Connection Issues Between Services

Check if services can resolve each other:

```bash
kubectl exec -it <pod-name> -n neurallog -- nslookup neurallog-postgres
kubectl exec -it <pod-name> -n neurallog -- nslookup neurallog-openfga
```

#### Database Connection Issues

Check if the database is accessible:

```bash
kubectl exec -it <pod-name> -n neurallog -- nc -zv neurallog-postgres 5432
```

## Next Steps

- [Production Considerations](./production.md): Additional considerations for production deployments
- [Monitoring and Logging](./monitoring.md): Set up monitoring and logging
- [Helm Charts](./helm.md): Using Helm charts for deployment
