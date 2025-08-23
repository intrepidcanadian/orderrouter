import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Conflux eSpace Configuration
  conflux: {
    rpcUrl: process.env.CONFLUX_ESPACE_RPC_URL || 'https://evm.confluxrpc.com',
    wsUrl: process.env.CONFLUX_ESPACE_WS_URL || 'wss://evm.confluxrpc.com/ws',
    chainId: 1030,
  },

  // Server Configuration
  server: {
    port: parseInt(process.env.PORT || '3002'),
    nodeEnv: process.env.NODE_ENV || 'development',
  },

  // Cache Configuration
  cache: {
    ttl: parseInt(process.env.CACHE_TTL || '300'), // 5 minutes
    checkPeriod: parseInt(process.env.CACHE_CHECK_PERIOD || '600'), // 10 minutes
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  },

  // Token Addresses for Conflux eSpace
  tokens: {
    USDC: '0x6963efed0ab40f6c3d7bda44a05dcf1437c44372',
    USDT: '0xfe97E85d13ABD9c1c33384E796F10B73905637cE',
    WCFX: '0x14b2d3bc65e74dae1030eafd8ac30c533c976a9b',
  },

  // Contract Addresses
  contracts: {
    factory: '0x62Aa0294cB42Aae39b7772313eAdfa5d489146eC', // GinsengSwap V3 Factory
    quoter: '0x2503C6ff25a3C25A949Dc82a5599a58561189b54', // GinsengSwap Quoter
    quoterV2: '0xEEDbDea29E8e44E9428407eA2A5De724318E923F', // GinsengSwap Quoter V2
    router: '0xD3b8e9086a32535f888e93F84aDe9E7dE9ef5001', // GinsengSwap SwapRouter
    positionManager: '0x820A73ba72A21f0AEF985dB6FB3E923b343b7Dbe', // GinsengSwap Position Manager
    multicall: '0xcA11bde05977b3631167028862bE2a173976CA11', // Multicall3
  },
};
