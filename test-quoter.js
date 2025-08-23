const { JsonRpcProvider } = require('@ethersproject/providers');
const { Contract } = require('@ethersproject/contracts');

// QuoterV2 ABI for quoteExactInputSingle
const QUOTER_V2_ABI = [
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
];

async function testQuoterV2() {
  const provider = new JsonRpcProvider('https://evm.confluxrpc.com');
  
  const quoterV2Address = '0xEEDbDea29E8e44E9428407eA2A5De724318E923F';
  const quoterContract = new Contract(quoterV2Address, QUOTER_V2_ABI, provider);
  
  const USDC = '0x6963efed0ab40f6c3d7bda44a05dcf1437c44372';
  const USDT = '0xfe97E85d13ABD9c1c33384E796F10B73905637cE';
  
  const testAmounts = [
    '1000000000000000000',   // 1 USDC
    '10000000000000000000',  // 10 USDC
    '100000000000000000000', // 100 USDC
  ];
  
  console.log('Testing QuoterV2 contract with different amounts...');
  console.log('USDC -> USDT, 0.05% fee');
  
  for (const amountIn of testAmounts) {
    try {
      console.log(`\nTesting amount: ${parseFloat(amountIn) / Math.pow(10, 18)} USDC`);
      
      const result = await quoterContract.callStatic.quoteExactInputSingle({
        tokenIn: USDC,
        tokenOut: USDT,
        fee: 500, // 0.05%
        amountIn: amountIn,
        sqrtPriceLimitX96: '0',
      });
      
      const amountOut = parseFloat(result[0].toString()) / Math.pow(10, 18);
      console.log(`✅ Success: ${amountOut} USDT`);
      console.log(`Gas estimate: ${result[3].toString()}`);
      
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
    }
  }
}

testQuoterV2();
