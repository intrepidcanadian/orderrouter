import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import NodeCache from 'node-cache';
import { config } from './config';
import { ConfluxRouter, QuoteRequest } from './services/conflux-router';
import { AdvancedRouter, AdvancedQuoteRequest } from './services/advanced-router';

const app = express();
const router = new ConfluxRouter();
const advancedRouter = new AdvancedRouter();
const cache = new NodeCache({
  stdTTL: config.cache.ttl,
  checkperiod: config.cache.checkPeriod,
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const blockNumber = await router.getBlockNumber();
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      blockNumber,
      chainId: config.conflux.chainId,
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get quote endpoint
app.post('/quote', async (req, res) => {
  try {
    const {
      tokenIn,
      tokenOut,
      amount,
      fee = 3000, // Default to 0.3% fee
      recipient,
      slippageTolerance = 0.5, // Default to 0.5%
      deadline,
    } = req.body;

    // Validate required fields
    if (!tokenIn || !tokenOut || !amount) {
      return res.status(400).json({
        error: 'Missing required fields: tokenIn, tokenOut, amount',
      });
    }

    // Create cache key
    const cacheKey = `quote:${tokenIn}:${tokenOut}:${amount}:${fee}:${slippageTolerance}`;
    
    // Check cache first
    const cachedQuote = cache.get(cacheKey);
    if (cachedQuote) {
      return res.json({
        ...cachedQuote,
        cached: true,
      });
    }

    // Prepare request
    const quoteRequest: QuoteRequest = {
      tokenIn,
      tokenOut,
      amount,
      fee,
      recipient: recipient || '0x0000000000000000000000000000000000000000',
      slippageTolerance,
      deadline: deadline || Math.floor(Date.now() / 1000 + 1800), // 30 minutes
    };

    // Get quote
    const quote = await router.getQuote(quoteRequest);

    // Cache the result
    cache.set(cacheKey, quote);

    res.json({
      ...quote,
      cached: false,
    });

  } catch (error) {
    console.error('Error in /quote endpoint:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// Get pool data endpoint
app.get('/pool/:tokenA/:tokenB/:fee', async (req, res) => {
  try {
    const { tokenA, tokenB, fee } = req.params;
    const poolAddress = await router.getPoolData(tokenA, tokenB, parseInt(fee));
    
    res.json({
      tokenA,
      tokenB,
      fee: parseInt(fee),
      poolAddress,
      exists: poolAddress !== '0x0000000000000000000000000000000000000000',
    });
  } catch (error) {
    console.error('Error in /pool endpoint:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// Get supported tokens endpoint
app.get('/tokens', (req, res) => {
  res.json({
    tokens: config.tokens,
    chainId: config.conflux.chainId,
  });
});

// Get supported fees endpoint
app.get('/fees', (req, res) => {
  res.json({
    fees: [
      { value: 100, label: '0.01%' },
      { value: 500, label: '0.05%' },
      { value: 3000, label: '0.3%' },
      { value: 10000, label: '1%' },
    ],
  });
});

// Advanced routing - find best route with multi-hop support
app.post('/route', async (req, res) => {
  try {
    const {
      tokenIn,
      tokenOut,
      amount,
      maxHops = 2,
      recipient,
      slippageTolerance = 0.5,
      deadline,
    } = req.body;

    // Validate required fields
    if (!tokenIn || !tokenOut || !amount) {
      return res.status(400).json({
        error: 'Missing required fields: tokenIn, tokenOut, amount',
      });
    }

    // Create cache key
    const cacheKey = `route:${tokenIn}:${tokenOut}:${amount}:${maxHops}:${slippageTolerance}`;
    
    // Temporarily disable cache to get fresh results
    // const cachedRoute = cache.get(cacheKey);
    // if (cachedRoute) {
    //   return res.json({
    //     ...cachedRoute,
    //     cached: true,
    //   });
    // }

    // Prepare request
    const routeRequest: AdvancedQuoteRequest = {
      tokenIn,
      tokenOut,
      amount,
      maxHops,
      recipient: recipient || '0x0000000000000000000000000000000000000000',
      slippageTolerance,
      deadline: deadline || Math.floor(Date.now() / 1000 + 1800), // 30 minutes
    };

    // Find best route
    const route = await advancedRouter.findBestRoute(routeRequest);

    // Temporarily disable cache to get fresh results
    // cache.set(cacheKey, route);

    res.json({
      ...route,
      cached: false,
    });

  } catch (error) {
    console.error('Error in /route endpoint:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// Route analysis - get detailed analysis of all possible routes
app.post('/route-analysis', async (req, res) => {
  try {
    const { tokenIn, tokenOut, amount } = req.body;

    // Validate required fields
    if (!tokenIn || !tokenOut || !amount) {
      return res.status(400).json({
        error: 'Missing required fields: tokenIn, tokenOut, amount',
      });
    }

    const analysis = await advancedRouter.getRouteAnalysis(tokenIn, tokenOut, amount);
    
    res.json({
      ...analysis,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error in /route-analysis endpoint:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// Get supported intermediate tokens
app.get('/intermediate-tokens', (req, res) => {
  res.json({
    intermediateTokens: [
      { address: config.tokens.USDC, symbol: 'USDC', name: 'USD Coin' },
      { address: config.tokens.USDT, symbol: 'USDT', name: 'Tether USD' },
      { address: config.tokens.WCFX, symbol: 'WCFX', name: 'Wrapped CFX' },
    ],
    chainId: config.conflux.chainId,
  });
});



// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /health',
      'POST /quote',
      'POST /route',
      'POST /route-analysis',
      'GET /pool/:tokenA/:tokenB/:fee',
      'GET /tokens',
      'GET /fees',
      'GET /intermediate-tokens',
    ],
  });
});

// Start server
const PORT = config.server.port;
app.listen(PORT, () => {
  console.log(`🚀 Conflux eSpace Router API running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Chain ID: ${config.conflux.chainId}`);
  console.log(`🌐 RPC Provider: ${config.conflux.rpcUrl.includes('validationcloud') ? 'ValidationCloud' : 'Public Conflux RPC'}`);
});

export default app;
