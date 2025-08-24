const { JsonRpcProvider } = require('@ethersproject/providers');
const { Contract } = require('@ethersproject/contracts');

// Test USDT -> USDC direction
async function testQuoterReverse() {
  console.log('Testing QuoterV2 contract - USDT -> USDC direction...');
  
  const provider = new JsonRpcProvider('https://main.confluxrpc.com');
  await provider.ready;
  
  // QuoterV2 contract address
  const quoterAddress = '0xEEDbDea29E8e44E9428407eA2A5De724318E923F';
  
  // Token addresses
  const USDT_ADDRESS = '0xfe97E85d13ABD9c1c33384E796F10B73905637cE';
  const USDC_ADDRESS = '0x6963efed0ab40f6c3d7bda44a05dcf1437c44372';
  
  // QuoterV2 ABI
  const quoterABI = [
    {
      inputs: [
        {
          components: [
            { internalType: 'address', name: 'tokenIn', type: 'address' },
            { internalType: 'address', name: 'tokenOut', type: 'address' },
            { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
            { internalType: 'uint24', name: 'fee', type: 'uint24' },
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
  
  const quoterContract = new Contract(quoterAddress, quoterABI, provider);
  
  const testAmounts = [
    { amount: '1000000000000000000', name: '1 USDT' }, // 1 USDT in wei
    { amount: '10000000000000000000', name: '10 USDT' }, // 10 USDT in wei
    { amount: '100000000000000000000', name: '100 USDT' }, // 100 USDT in wei
  ];
  
  for (const test of testAmounts) {
    try {
      console.log(`\nTesting: ${test.name}`);
      console.log(`Amount in wei: ${test.amount}`);
      
      const result = await quoterContract.callStatic.quoteExactInputSingle({
        tokenIn: USDT_ADDRESS,
        tokenOut: USDC_ADDRESS,
        amountIn: test.amount,
        fee: BigInt(500), // 0.05% fee
        sqrtPriceLimitX96: BigInt(0),
      });
      
      const amountOut = result[0].toString();
      const gasEstimate = result[3].toString();
      
      // Convert to human readable (both tokens have 18 decimals)
      const amountOutHuman = (BigInt(amountOut) * BigInt(10 ** 18)) / BigInt(10 ** 18);
      const amountOutFormatted = Number(amountOutHuman) / (10 ** 18);
      
      console.log(`✅ Success: ${amountOutFormatted} USDC`);
      console.log(`Raw amountOut: ${amountOut}`);
      console.log(`Gas estimate: ${gasEstimate}`);
      
    } catch (error) {
      console.error(`❌ Error for ${test.name}:`, error.message);
    }
  }
}

testQuoterReverse();
