"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
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
        factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f', // GinsengSwap V3 Factory
        quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6', // GinsengSwap Quoter V2
        router: '0xE592427A0AEce92De3Edee1F18E0157C05861564', // GinsengSwap SwapRouter
        multicall: '0xcA11bde05977b3631167028862bE2a173976CA11', // Multicall3
    },
};
//# sourceMappingURL=config.js.map