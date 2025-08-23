export declare const config: {
    conflux: {
        rpcUrl: string;
        wsUrl: string;
        chainId: number;
    };
    server: {
        port: number;
        nodeEnv: string;
    };
    cache: {
        ttl: number;
        checkPeriod: number;
    };
    rateLimit: {
        windowMs: number;
        maxRequests: number;
    };
    tokens: {
        USDC: string;
        USDT: string;
        WCFX: string;
    };
    contracts: {
        factory: string;
        quoter: string;
        router: string;
        multicall: string;
    };
};
//# sourceMappingURL=config.d.ts.map