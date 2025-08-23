import { JsonRpcProvider } from '@ethersproject/providers';
import { Contract } from '@ethersproject/contracts';
import { Token, CurrencyAmount, TradeType, Percent } from '@uniswap/sdk-core';
import { config } from '../config';
import { ConfluxRouter, QuoteRequest, QuoteResponse } from './conflux-router';

// GinsengSwap V3 Factory ABI (simplified)
const FACTORY_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'tokenA', type: 'address' },
      { internalType: 'address', name: 'tokenB', type: 'address' },
      { internalType: 'uint24', name: 'fee', type: 'uint24' },
    ],
    name: 'getPool',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
];

export interface Route {
  path: string[];
  fees: number[];
  poolAddresses: string[];
  quote: string;
  gasEstimate: string;
}

export interface AdvancedQuoteRequest {
  tokenIn: string;
  tokenOut: string;
  amount: string;
  maxHops?: number; // Maximum number of hops (default: 2)
  recipient: string;
  slippageTolerance: number;
  deadline: number;
}

export interface AdvancedQuoteResponse {
  bestRoute: Route;
  allRoutes: Route[];
  blockNumber: number;
  cached: boolean;
}

export class AdvancedRouter {
  private provider: JsonRpcProvider;
  private factoryContract: Contract;
  private baseRouter: ConfluxRouter;

  // Common intermediate tokens for routing
  private intermediateTokens = [
    config.tokens.USDC,
    config.tokens.USDT,
    config.tokens.WCFX,
  ];

  // Supported fee tiers
  private feeTiers = [100, 500, 3000, 10000]; // 0.01%, 0.05%, 0.3%, 1%

  constructor() {
    this.provider = new JsonRpcProvider(config.conflux.rpcUrl);
    this.factoryContract = new Contract(
      config.contracts.factory,
      FACTORY_ABI,
      this.provider
    );
    this.baseRouter = new ConfluxRouter();
  }

  async findBestRoute(request: AdvancedQuoteRequest): Promise<AdvancedQuoteResponse> {
    const maxHops = request.maxHops || 2;
    const allRoutes: Route[] = [];

    // Find direct route
    const directRoute = await this.findDirectRoute(request);
    if (directRoute) {
      allRoutes.push(directRoute);
    }

    // Find multi-hop routes if maxHops > 1
    if (maxHops > 1) {
      const multiHopRoutes = await this.findMultiHopRoutes(request, maxHops);
      allRoutes.push(...multiHopRoutes);
    }

    // Sort routes by best quote (highest output amount)
    allRoutes.sort((a, b) => parseFloat(b.quote) - parseFloat(a.quote));

    const bestRoute = allRoutes[0];
    const blockNumber = await this.provider.getBlockNumber();

    return {
      bestRoute,
      allRoutes,
      blockNumber,
      cached: false,
    };
  }

  private async findDirectRoute(request: AdvancedQuoteRequest): Promise<Route | null> {
    try {
      // Try all fee tiers for direct route
      const directRoutes: Route[] = [];

      for (const fee of this.feeTiers) {
        try {
          const poolAddress = await this.factoryContract.getPool(
            request.tokenIn,
            request.tokenOut,
            fee
          );

          if (poolAddress !== '0x0000000000000000000000000000000000000000') {
            const quoteRequest: QuoteRequest = {
              ...request,
              fee,
            };

            const quote = await this.baseRouter.getQuote(quoteRequest);
            
            directRoutes.push({
              path: [request.tokenIn, request.tokenOut],
              fees: [fee],
              poolAddresses: [poolAddress],
              quote: quote.quote,
              gasEstimate: quote.estimatedGasUsed,
            });
          }
        } catch (error) {
          // Pool doesn't exist or other error, continue to next fee tier
          continue;
        }
      }

      // Return the best direct route
      if (directRoutes.length > 0) {
        directRoutes.sort((a, b) => parseFloat(b.quote) - parseFloat(a.quote));
        return directRoutes[0];
      }

      return null;
    } catch (error) {
      console.error('Error finding direct route:', error);
      return null;
    }
  }

  private async findMultiHopRoutes(
    request: AdvancedQuoteRequest,
    maxHops: number
  ): Promise<Route[]> {
    const routes: Route[] = [];

    // For 2-hop routes: tokenIn -> intermediate -> tokenOut
    if (maxHops >= 2) {
      for (const intermediateToken of this.intermediateTokens) {
        // Skip if intermediate token is the same as input or output
        if (
          intermediateToken.toLowerCase() === request.tokenIn.toLowerCase() ||
          intermediateToken.toLowerCase() === request.tokenOut.toLowerCase()
        ) {
          continue;
        }

        try {
          const route = await this.findTwoHopRoute(
            request.tokenIn,
            intermediateToken,
            request.tokenOut,
            request.amount
          );

          if (route) {
            routes.push(route);
          }
        } catch (error) {
          console.error(`Error finding 2-hop route via ${intermediateToken}:`, error);
          continue;
        }
      }
    }

    return routes;
  }

  private async findTwoHopRoute(
    tokenIn: string,
    intermediateToken: string,
    tokenOut: string,
    amount: string
  ): Promise<Route | null> {
    try {
      // Find first hop: tokenIn -> intermediateToken
      const firstHop = await this.findBestDirectRoute(tokenIn, intermediateToken, amount);
      if (!firstHop) return null;

      // Find second hop: intermediateToken -> tokenOut
      const secondHop = await this.findBestDirectRoute(
        intermediateToken,
        tokenOut,
        firstHop.quote
      );
      if (!secondHop) return null;

      return {
        path: [tokenIn, intermediateToken, tokenOut],
        fees: [firstHop.fee, secondHop.fee],
        poolAddresses: [firstHop.poolAddress, secondHop.poolAddress],
        quote: secondHop.quote,
        gasEstimate: (parseInt(firstHop.gasEstimate) + parseInt(secondHop.gasEstimate)).toString(),
      };
    } catch (error) {
      console.error('Error finding 2-hop route:', error);
      return null;
    }
  }

  private async findBestDirectRoute(
    tokenA: string,
    tokenB: string,
    amount: string
  ): Promise<{
    quote: string;
    fee: number;
    poolAddress: string;
    gasEstimate: string;
  } | null> {
    const routes: Array<{
      quote: string;
      fee: number;
      poolAddress: string;
      gasEstimate: string;
    }> = [];

    for (const fee of this.feeTiers) {
      try {
        const poolAddress = await this.factoryContract.getPool(tokenA, tokenB, fee);
        
        if (poolAddress !== '0x0000000000000000000000000000000000000000') {
          const quoteRequest: QuoteRequest = {
            tokenIn: tokenA,
            tokenOut: tokenB,
            amount,
            fee,
            recipient: '0x0000000000000000000000000000000000000000',
            slippageTolerance: 0.5,
            deadline: Math.floor(Date.now() / 1000 + 1800),
          };

          const quote = await this.baseRouter.getQuote(quoteRequest);
          
          routes.push({
            quote: quote.quote,
            fee,
            poolAddress,
            gasEstimate: quote.estimatedGasUsed,
          });
        }
      } catch (error) {
        continue;
      }
    }

    if (routes.length > 0) {
      routes.sort((a, b) => parseFloat(b.quote) - parseFloat(a.quote));
      return routes[0];
    }

    return null;
  }

  async getSupportedTokens(): Promise<string[]> {
    return [
      config.tokens.USDC,
      config.tokens.USDT,
      config.tokens.WCFX,
      // Add more tokens as needed
    ];
  }

  async getRouteAnalysis(
    tokenIn: string,
    tokenOut: string,
    amount: string
  ): Promise<{
    directRoutes: Route[];
    multiHopRoutes: Route[];
    recommendations: string[];
  }> {
    const request: AdvancedQuoteRequest = {
      tokenIn,
      tokenOut,
      amount,
      maxHops: 2,
      recipient: '0x0000000000000000000000000000000000000000',
      slippageTolerance: 0.5,
      deadline: Math.floor(Date.now() / 1000 + 1800),
    };

    const response = await this.findBestRoute(request);
    
    const directRoutes = response.allRoutes.filter(route => route.path.length === 2);
    const multiHopRoutes = response.allRoutes.filter(route => route.path.length > 2);

    const recommendations: string[] = [];
    
    if (response.bestRoute) {
      if (response.bestRoute.path.length === 2) {
        recommendations.push('Direct route is optimal');
      } else {
        recommendations.push(`Multi-hop route via ${response.bestRoute.path[1]} is optimal`);
      }
      
      if (multiHopRoutes.length > 0) {
        const gasDiff = parseInt(multiHopRoutes[0].gasEstimate) - parseInt(directRoutes[0]?.gasEstimate || '0');
        if (gasDiff > 50000) {
          recommendations.push('Consider gas costs - multi-hop routes may be more expensive');
        }
      }
    }

    return {
      directRoutes,
      multiHopRoutes,
      recommendations,
    };
  }
}
