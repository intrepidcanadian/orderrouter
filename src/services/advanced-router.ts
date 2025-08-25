import { JsonRpcProvider } from '@ethersproject/providers';
import { Contract } from '@ethersproject/contracts';
import { Token, CurrencyAmount, TradeType, Percent } from '@uniswap/sdk-core';
import { config } from '../config';
import { ConfluxRouter, QuoteRequest, QuoteResponse } from './conflux-router';

// GinsengSwap V3 Pool ABI (simplified)
const POOL_ABI = [
  {
    inputs: [],
    name: 'slot0',
    outputs: [
      { internalType: 'uint160', name: 'sqrtPriceX96', type: 'uint160' },
      { internalType: 'int24', name: 'tick', type: 'int24' },
      { internalType: 'uint16', name: 'observationIndex', type: 'uint16' },
      { internalType: 'uint16', name: 'observationCardinality', type: 'uint16' },
      { internalType: 'uint16', name: 'observationCardinalityNext', type: 'uint16' },
      { internalType: 'uint8', name: 'feeProtocol', type: 'uint8' },
      { internalType: 'bool', name: 'unlocked', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
];

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
  priceImpact: number;
  currentPrice: string;
  marketRates: { [key: string]: string };
  routeHops: Array<{
    tokenIn: string;
    tokenOut: string;
    fee: number;
    marketRate: string;
    poolAddress: string;
  }>;
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
  // Helper method to calculate price impact
  private calculatePriceImpact(amountIn: string, amountOut: string, decimalsIn: number, decimalsOut: number, currentPrice: string): number {
    const inputAmount = parseFloat(amountIn);
    const outputAmount = parseFloat(amountOut);
    
    if (inputAmount === 0 || outputAmount === 0) return 0;
    
    // Calculate the execution price (what price you actually got)
    const executionPrice = outputAmount / inputAmount;
    
    // Current market price from the pool
    const marketPrice = parseFloat(currentPrice);
    
    if (marketPrice === 0) return 0;
    
    // Price impact = (market price - execution price) / market price * 100
    // This shows how much the trade moved the price away from the current market price
    const priceImpact = ((marketPrice - executionPrice) / marketPrice) * 100;
    
    return Math.abs(priceImpact);
  }

  // Helper method to get current price from pool
  private async getCurrentPrice(poolAddress: string): Promise<string> {
    try {
      const poolContract = new Contract(poolAddress, POOL_ABI, this.provider);
      const slot0 = await poolContract.slot0();
      const sqrtPriceX96 = slot0[0];
      
      // Calculate price from sqrtPriceX96
      const Q96 = BigInt(2) ** BigInt(96);
      const sqrtPrice = Number(sqrtPriceX96) / Number(Q96);
      const price = sqrtPrice * sqrtPrice;
      
      return price.toFixed(6);
    } catch (error) {
      console.error('Error getting current price:', error);
      return '0';
    }
  }

  // Helper method to create market rates
  private createMarketRates(routeHops: Array<{ tokenIn: string; tokenOut: string; fee: number; marketRate: string; poolAddress: string }>): { [key: string]: string } {
    const marketRates: { [key: string]: string } = {};
    
    for (const hop of routeHops) {
      const key = `${hop.tokenIn}-${hop.tokenOut}`;
      marketRates[key] = hop.marketRate;
    }
    
    return marketRates;
  }

  // Helper method to get token decimals
  private getTokenDecimals(tokenAddress: string): number {
    // All tokens on Conflux eSpace use 18 decimals
    return 18;
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
            
            // Get current price from pool
            const currentPrice = await this.getCurrentPrice(poolAddress);
            
            // Convert input amount to human-readable format, quote.quote is already human-readable
            const inputAmountHuman = parseFloat(request.amount) / Math.pow(10, this.getTokenDecimals(request.tokenIn));
            const outputAmountHuman = parseFloat(quote.quote); // Already in human-readable format
            
            // Calculate price impact
            const priceImpact = this.calculatePriceImpact(
              inputAmountHuman.toString(),
              outputAmountHuman.toString(),
              0, // No need to convert decimals since we already converted
              0, // No need to convert decimals since we already converted
              currentPrice
            );

            // Create route hops
            const routeHops = [{
              tokenIn: request.tokenIn,
              tokenOut: request.tokenOut,
              fee: fee,
              marketRate: `1 ${request.tokenIn} = ${currentPrice} ${request.tokenOut}`,
              poolAddress: poolAddress
            }];

            // Create market rates
            const marketRates = this.createMarketRates(routeHops);

            directRoutes.push({
              path: [request.tokenIn, request.tokenOut],
              fees: [fee],
              poolAddresses: [poolAddress],
              quote: quote.quote,
              gasEstimate: quote.estimatedGasUsed,
              priceImpact: priceImpact,
              currentPrice: currentPrice,
              marketRates: marketRates,
              routeHops: routeHops,
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
      console.log(`Finding 2-hop route: ${tokenIn} -> ${intermediateToken} -> ${tokenOut}`);
      console.log(`Input amount: ${amount}`);
      
      // Find first hop: tokenIn -> intermediateToken
      const firstHop = await this.findBestDirectRoute(tokenIn, intermediateToken, amount);
      console.log(`First hop result:`, firstHop ? `SUCCESS - Quote: ${firstHop.quote}` : 'FAILED');
      if (!firstHop) return null;

      // Find second hop: intermediateToken -> tokenOut
      // Convert firstHop.quote (human-readable) to wei format for the second hop
      const secondHopAmountWei = Math.floor(parseFloat(firstHop.quote) * Math.pow(10, this.getTokenDecimals(intermediateToken))).toString();
      console.log(`Second hop amount (wei): ${secondHopAmountWei}`);
      
      const secondHop = await this.findBestDirectRoute(
        intermediateToken,
        tokenOut,
        secondHopAmountWei
      );
      console.log(`Second hop result:`, secondHop ? `SUCCESS - Quote: ${secondHop.quote}` : 'FAILED');
      if (!secondHop) return null;

      // Get current prices from pools
      const currentPrice1 = await this.getCurrentPrice(firstHop.poolAddress);
      const currentPrice2 = await this.getCurrentPrice(secondHop.poolAddress);
      
      // Calculate effective current price (simplified)
      const effectiveCurrentPrice = (parseFloat(currentPrice1) * parseFloat(currentPrice2)).toFixed(6);
      
      // Convert input amount to human-readable format, secondHop.quote is already human-readable
      const inputAmountHuman = parseFloat(amount) / Math.pow(10, this.getTokenDecimals(tokenIn));
      const outputAmountHuman = parseFloat(secondHop.quote); // Already in human-readable format
      
      // Calculate overall price impact
      const priceImpact = this.calculatePriceImpact(
        inputAmountHuman.toString(),
        outputAmountHuman.toString(),
        0, // No need to convert decimals since we already converted
        0, // No need to convert decimals since we already converted
        effectiveCurrentPrice
      );

      // Create route hops
      const routeHops = [
        {
          tokenIn: tokenIn,
          tokenOut: intermediateToken,
          fee: firstHop.fee,
          marketRate: `1 ${tokenIn} = ${currentPrice1} ${intermediateToken}`,
          poolAddress: firstHop.poolAddress
        },
        {
          tokenIn: intermediateToken,
          tokenOut: tokenOut,
          fee: secondHop.fee,
          marketRate: `1 ${intermediateToken} = ${currentPrice2} ${tokenOut}`,
          poolAddress: secondHop.poolAddress
        }
      ];

      // Create market rates
      const marketRates = this.createMarketRates(routeHops);

      return {
        path: [tokenIn, intermediateToken, tokenOut],
        fees: [firstHop.fee, secondHop.fee],
        poolAddresses: [firstHop.poolAddress, secondHop.poolAddress],
        quote: secondHop.quote,
        gasEstimate: (parseInt(firstHop.gasEstimate) + parseInt(secondHop.gasEstimate)).toString(),
        priceImpact: priceImpact,
        currentPrice: effectiveCurrentPrice,
        marketRates: marketRates,
        routeHops: routeHops,
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
