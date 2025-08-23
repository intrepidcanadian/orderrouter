# Environment Setup Guide

## Setting Up Environment Variables

### 1. Create a `.env` file

Create a `.env` file in the root directory of the project:

```bash
# Conflux eSpace Configuration
# Replace with your actual ValidationCloud API key
CONFLUX_ESPACE_RPC_URL=https://mainnet.conflux.validationcloud.io/v1/YOUR_API_KEY_HERE
CONFLUX_ESPACE_WS_URL=wss://mainnet.conflux.validationcloud.io/v1/YOUR_API_KEY_HERE

# Server Configuration
PORT=3002
NODE_ENV=development

# Cache Configuration
CACHE_TTL=300
CACHE_CHECK_PERIOD=600

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 2. Environment Variables Explained

| Variable | Description | Default Value |
|----------|-------------|---------------|
| `CONFLUX_ESPACE_RPC_URL` | HTTP RPC endpoint for Conflux eSpace | ValidationCloud URL |
| `CONFLUX_ESPACE_WS_URL` | WebSocket endpoint for Conflux eSpace | ValidationCloud WebSocket URL |
| `PORT` | Server port | 3002 |
| `NODE_ENV` | Environment (development/production) | development |
| `CACHE_TTL` | Cache time-to-live in seconds | 300 (5 minutes) |
| `CACHE_CHECK_PERIOD` | Cache cleanup interval in seconds | 600 (10 minutes) |
| `RATE_LIMIT_WINDOW_MS` | Rate limiting window in milliseconds | 900000 (15 minutes) |
| `RATE_LIMIT_MAX_REQUESTS` | Maximum requests per window | 100 |

### 3. Using Different RPC Providers

#### ValidationCloud (Recommended)
```bash
CONFLUX_ESPACE_RPC_URL=https://mainnet.conflux.validationcloud.io/v1/YOUR_API_KEY
CONFLUX_ESPACE_WS_URL=wss://mainnet.conflux.validationcloud.io/v1/YOUR_API_KEY
```

#### Public Conflux RPC
```bash
CONFLUX_ESPACE_RPC_URL=https://evm.confluxrpc.com
CONFLUX_ESPACE_WS_URL=wss://evm.confluxrpc.com/ws
```

#### Your Own Node
```bash
CONFLUX_ESPACE_RPC_URL=http://your-node:8545
CONFLUX_ESPACE_WS_URL=ws://your-node:8546
```

### 4. Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use different API keys** for development and production
3. **Rotate API keys** regularly
4. **Use environment-specific configurations**

### 5. Production Deployment

For production, set environment variables in your deployment platform:

#### Heroku
```bash
heroku config:set CONFLUX_ESPACE_RPC_URL=https://mainnet.conflux.validationcloud.io/v1/YOUR_API_KEY
heroku config:set CONFLUX_ESPACE_WS_URL=wss://mainnet.conflux.validationcloud.io/v1/YOUR_API_KEY
```

#### Docker
```bash
docker run -e CONFLUX_ESPACE_RPC_URL=https://mainnet.conflux.validationcloud.io/v1/YOUR_API_KEY gswap-router-api
```

#### Kubernetes
```yaml
env:
- name: CONFLUX_ESPACE_RPC_URL
  value: "https://mainnet.conflux.validationcloud.io/v1/YOUR_API_KEY"
```

### 6. Testing Your Configuration

After setting up your `.env` file, test the configuration:

```bash
# Build the project
npm run build

# Start the server
npm start

# Test the health endpoint
curl http://localhost:3002/health
```

You should see the RPC URL in the server startup logs and the health check should return a successful response.
