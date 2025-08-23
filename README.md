# Conflux eSpace Router API

A backend API service that provides smart order routing for Conflux eSpace (GinsengSwap), handling the multicall interface differences between Uniswap's router and Conflux eSpace.

## Features

- ✅ **Conflux eSpace Integration** - Native support for Chain ID 1030
- ✅ **Multicall Compatibility** - Handles Conflux's Multicall3 interface
- ✅ **Quote Generation** - Get swap quotes with gas estimates
- ✅ **Pool Discovery** - Find and query liquidity pools
- ✅ **Caching** - Redis-like caching for better performance
- ✅ **Rate Limiting** - Built-in request throttling
- ✅ **Health Monitoring** - Real-time health checks

## Quick Start

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

## API Endpoints

### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "blockNumber": 129179941,
  "chainId": 1030
}
```

### Get Quote
```http
POST /quote
Content-Type: application/json

{
  "tokenIn": "0x6963efed0ab40f6c3d7bda44a05dcf1437c44372",
  "tokenOut": "0xfe97E85d13ABD9c1c33384E796F10B73905637cE",
  "amount": "1000000",
  "fee": 3000,
  "recipient": "0x0000000000000000000000000000000000000000",
  "slippageTolerance": 0.5,
  "deadline": 1705312200
}
```

**Response:**
```json
{
  "quote": "0.9995",
  "quoteGasAdjusted": "0.9990",
  "estimatedGasUsed": "150000",
  "estimatedGasUsedQuoteToken": "0",
  "estimatedGasUsedUSD": "0",
  "route": [
    {
      "type": "v3",
      "input": "0x6963efed0ab40f6c3d7bda44a05dcf1437c44372",
      "output": "0xfe97E85d13ABD9c1c33384E796F10B73905637cE",
      "fee": 3000,
      "poolAddress": "0x..."
    }
  ],
  "blockNumber": 129179941,
  "cached": false
}
```

### Get Pool Data
```http
GET /pool/0x6963efed0ab40f6c3d7bda44a05dcf1437c44372/0xfe97E85d13ABD9c1c33384E796F10B73905637cE/3000
```

**Response:**
```json
{
  "tokenA": "0x6963efed0ab40f6c3d7bda44a05dcf1437c44372",
  "tokenB": "0xfe97E85d13ABD9c1c33384E796F10B73905637cE",
  "fee": 3000,
  "poolAddress": "0x...",
  "exists": true
}
```

### Get Supported Tokens
```http
GET /tokens
```

**Response:**
```json
{
  "tokens": {
    "USDC": "0x6963efed0ab40f6c3d7bda44a05dcf1437c44372",
    "USDT": "0xfe97E85d13ABD9c1c33384E796F10B73905637cE",
    "WCFX": "0x14b2d3bc65e74dae1030eafd8ac30c533c976a9b"
  },
  "chainId": 1030
}
```

### Get Supported Fees
```http
GET /fees
```

**Response:**
```json
{
  "fees": [
    { "value": 100, "label": "0.01%" },
    { "value": 500, "label": "0.05%" },
    { "value": 3000, "label": "0.3%" },
    { "value": 10000, "label": "1%" }
  ]
}
```

## Configuration

Create a `.env` file in the root directory:

```env
# Conflux eSpace Configuration
CONFLUX_ESPACE_RPC_URL=https://mainnet.conflux.validationcloud.io/v1/YOUR_API_KEY
CONFLUX_ESPACE_WS_URL=wss://mainnet.conflux.validationcloud.io/v1/YOUR_API_KEY

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

## Frontend Integration

### JavaScript/TypeScript

```typescript
const API_BASE = 'http://localhost:3002';

// Get a quote
async function getQuote(tokenIn: string, tokenOut: string, amount: string) {
  const response = await fetch(`${API_BASE}/quote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tokenIn,
      tokenOut,
      amount,
      fee: 3000,
      slippageTolerance: 0.5,
    }),
  });
  
  return response.json();
}

// Check health
async function checkHealth() {
  const response = await fetch(`${API_BASE}/health`);
  return response.json();
}
```

### React Hook Example

```typescript
import { useState, useEffect } from 'react';

export function useConfluxQuote(tokenIn: string, tokenOut: string, amount: string) {
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!tokenIn || !tokenOut || !amount) return;

    setLoading(true);
    setError(null);

    fetch('http://localhost:3002/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokenIn, tokenOut, amount, fee: 3000 }),
    })
      .then(res => res.json())
      .then(data => {
        setQuote(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [tokenIn, tokenOut, amount]);

  return { quote, loading, error };
}
```

## Architecture

```
Frontend (GinsengSwap) → Router API → Conflux eSpace
                              ↓
                        Multicall3 Handler
                              ↓
                        Pool Data & Quotes
```

### Key Components

1. **ConfluxRouter Service** - Handles Conflux-specific multicall and pool interactions
2. **Express API Server** - RESTful endpoints with caching and rate limiting
3. **Configuration Management** - Environment-based configuration
4. **Error Handling** - Comprehensive error handling and logging

## Token Addresses

### Conflux eSpace Mainnet (Chain ID: 1030)

- **USDC**: `0x6963efed0ab40f6c3d7bda44a05dcf1437c44372`
- **USDT**: `0xfe97E85d13ABD9c1c33384E796F10B73905637cE`
- **WCFX**: `0x14b2d3bc65e74dae1030eafd8ac30c533c976a9b`

### Contract Addresses

- **Factory**: `0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f`
- **Quoter**: `0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6`
- **Router**: `0xE592427A0AEce92De3Edee1F18E0157C05861564`
- **Multicall3**: `0xcA11bde05977b3631167028862bE2a173976CA11`

## Deployment

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3002
CMD ["node", "dist/index.js"]
```

### Environment Variables

Set these environment variables in your deployment:

- `CONFLUX_ESPACE_RPC_URL` - Your Conflux RPC endpoint
- `PORT` - Server port (default: 3002)
- `NODE_ENV` - Environment (development/production)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
