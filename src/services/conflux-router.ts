import { JsonRpcProvider } from '@ethersproject/providers';
import { Contract } from '@ethersproject/contracts';
import { Token, CurrencyAmount, TradeType, Percent } from '@uniswap/sdk-core';
import { config } from '../config';

// Conflux Multicall3 ABI (simplified for our needs)
const CONFLUX_MULTICALL_ABI = [
  {
    inputs: [
      {
        components: [
          { internalType: 'address', name: 'target', type: 'address' },
          { internalType: 'bool', name: 'allowFailure', type: 'bool' },
          { internalType: 'bytes', name: 'callData', type: 'bytes' },
        ],
        internalType: 'struct Multicall3.Call3[]',
        name: 'calls',
        type: 'tuple[]',
      },
    ],
    name: 'aggregate3',
    outputs: [
      {
        components: [
          { internalType: 'bool', name: 'success', type: 'bool' },
          { internalType: 'bytes', name: 'returnData', type: 'bytes' },
        ],
        internalType: 'struct Multicall3.Result[]',
        name: 'returnData',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'payable',
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

// GinsengSwap V3 Pool ABI (simplified)
const POOL_ABI = [
  {
    inputs: [],
    name: 'token0',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'token1',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'fee',
    outputs: [{ internalType: 'uint24', name: '', type: 'uint24' }],
    stateMutability: 'view',
    type: 'function',
  },
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

export interface QuoteRequest {
  tokenIn: string;
  tokenOut: string;
  amount: string;
  fee: number;
  recipient: string;
  slippageTolerance: number;
  deadline: number;
}

export interface QuoteResponse {
  quote: string;
  quoteGasAdjusted: string;
  estimatedGasUsed: string;
  estimatedGasUsedQuoteToken: string;
  estimatedGasUsedUSD: string;
  methodParameters?: {
    calldata: string;
    value: string;
  };
  route: any[];
  blockNumber: number;
}

export class ConfluxRouter {
  private provider: JsonRpcProvider;
  private multicallContract: Contract;
  private factoryContract: Contract;

  constructor() {
    this.provider = new JsonRpcProvider(config.conflux.rpcUrl);
    this.multicallContract = new Contract(
      config.contracts.multicall,
      CONFLUX_MULTICALL_ABI,
      this.provider
    );
    this.factoryContract = new Contract(
      config.contracts.factory,
      FACTORY_ABI,
      this.provider
    );
  }

  async getQuote(request: QuoteRequest): Promise<QuoteResponse> {
    try {
      // Create tokens with correct decimals
      const tokenInDecimals = this.getTokenDecimals(request.tokenIn);
      const tokenOutDecimals = this.getTokenDecimals(request.tokenOut);
      
      const tokenIn = new Token(
        config.conflux.chainId,
        request.tokenIn as `0x${string}`,
        tokenInDecimals,
        'TOKEN_IN',
        'Token In'
      );
      
      const tokenOut = new Token(
        config.conflux.chainId,
        request.tokenOut as `0x${string}`,
        tokenOutDecimals,
        'TOKEN_OUT',
        'Token Out'
      );

      // Create amount
      const amount = CurrencyAmount.fromRawAmount(tokenIn, request.amount);

      // Get pool address
      const poolAddress = await this.factoryContract.getPool(
        tokenIn.address,
        tokenOut.address,
        request.fee
      );

      if (poolAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error('Pool not found');
      }

      // Get pool data using multicall
      const poolContract = new Contract(poolAddress, POOL_ABI, this.provider);
      
      const calls = [
        {
          target: poolAddress,
          allowFailure: true,
          callData: poolContract.interface.encodeFunctionData('slot0'),
        },
        {
          target: poolAddress,
          allowFailure: true,
          callData: poolContract.interface.encodeFunctionData('token0'),
        },
        {
          target: poolAddress,
          allowFailure: true,
          callData: poolContract.interface.encodeFunctionData('token1'),
        },
      ];

      const results = await this.multicallContract.callStatic.aggregate3(calls);
      
      if (!results[0].success) {
        throw new Error('Failed to get pool data');
      }

      // Decode slot0 data
      const slot0Data = poolContract.interface.decodeFunctionResult('slot0', results[0].returnData);
      const sqrtPriceX96 = slot0Data[0];

      // Calculate quote using QuoterV2 for accurate results
      const quote = await this.calculateQuoteFromQuoterV2(amount, tokenIn, tokenOut, request.fee, sqrtPriceX96);

      // Get current block
      const blockNumber = await this.provider.getBlockNumber();

      // For now, return a simplified quote
      // In a full implementation, you'd calculate the actual swap path and gas estimates
      return {
        quote: quote.toSignificant(6),
        quoteGasAdjusted: quote.toSignificant(6),
        estimatedGasUsed: '150000',
        estimatedGasUsedQuoteToken: '0',
        estimatedGasUsedUSD: '0',
        route: [
          {
            type: 'v3',
            input: tokenIn.address,
            output: tokenOut.address,
            fee: request.fee,
            poolAddress,
          },
        ],
        blockNumber,
      };

    } catch (error) {
      console.error('Error getting quote:', error);
      throw error;
    }
  }

  private async calculateQuoteFromQuoterV2(
    amount: CurrencyAmount<Token>,
    tokenIn: Token,
    tokenOut: Token,
    fee: number,
    sqrtPriceX96: any
  ): Promise<CurrencyAmount<Token>> {
    try {
      // Use the QuoterV2 contract for accurate quotes
      const quoterContract = new Contract(
        config.contracts.quoterV2,
        [
          {
            inputs: [
              {
                components: [
                  { internalType: 'address', name: 'tokenIn', type: 'address' },
                  { internalType: 'address', name: 'tokenOut', type: 'address' },
                  { internalType: 'uint256', name: 'fee', type: 'uint256' },
                  { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
                  { internalType: 'uint160', name: 'sqrtPriceLimitX96', type: 'uint160' },
                ],
                internalType: 'struct IQuoterV2.QuoteExactInputSingleParams',
                name: 'params',
                type: 'tuple',
              },
            ],
            name: 'quoteExactInputSingle',
            outputs: [
              { internalType: 'uint256', name: 'amountOut', type: 'uint256' },
              { internalType: 'uint160', name: 'sqrtPriceX96After', type: 'uint160' },
              { internalType: 'uint32', name: 'initializedTicksCrossed', type: 'uint32' },
              { internalType: 'uint256', name: 'gasEstimate', type: 'uint256' },
            ],
            stateMutability: 'nonpayable',
            type: 'function',
          },
        ],
        this.provider
      );

      const result = await quoterContract.quoteExactInputSingle({
        tokenIn: tokenIn.address,
        tokenOut: tokenOut.address,
        fee: fee,
        amountIn: amount.quotient.toString(),
        sqrtPriceLimitX96: '0',
      });

      return CurrencyAmount.fromRawAmount(tokenOut, result[0].toString());
    } catch (error) {
      console.error('Error getting quote from QuoterV2:', error);
      // Fallback to simplified calculation using actual pool price
      return this.calculateQuoteFromSqrtPrice(amount, sqrtPriceX96, tokenIn, tokenOut);
    }
  }

  private calculateQuoteFromSqrtPrice(
    amount: CurrencyAmount<Token>,
    sqrtPriceX96: any,
    tokenIn: Token,
    tokenOut: Token
  ): CurrencyAmount<Token> {
    // Proper sqrt price calculation for Uniswap V3
    const Q96 = BigInt(2) ** BigInt(96);
    const sqrtPrice = BigInt(sqrtPriceX96.toString());
    
    // Calculate price = (sqrtPriceX96 / 2^96)^2
    const price = Number(sqrtPrice * sqrtPrice) / Number(Q96 * Q96);
    
    // Calculate quote amount
    const amountIn = parseFloat(amount.toSignificant(6));
    const quoteAmount = amountIn * price;
    
    return CurrencyAmount.fromRawAmount(
      tokenOut,
      Math.floor(quoteAmount * (10 ** tokenOut.decimals)).toString()
    );
  }

  async getPoolData(tokenA: string, tokenB: string, fee: number) {
    try {
      const poolAddress = await this.factoryContract.getPool(tokenA, tokenB, fee);
      return poolAddress;
    } catch (error) {
      console.error('Error getting pool data:', error);
      throw error;
    }
  }

  async getBlockNumber(): Promise<number> {
    return await this.provider.getBlockNumber();
  }

  private getTokenDecimals(tokenAddress: string): number {
    // Get token decimals based on known token addresses
    const lowerAddress = tokenAddress.toLowerCase();
    
    if (lowerAddress === config.tokens.USDC.toLowerCase() || 
        lowerAddress === config.tokens.USDT.toLowerCase()) {
      return 18; // Both USDC and USDT have 18 decimals on Conflux eSpace
    }
    
    if (lowerAddress === config.tokens.WCFX.toLowerCase()) {
      return 18; // WCFX has 18 decimals
    }
    
    // Default to 18 decimals for unknown tokens
    return 18;
  }
}
