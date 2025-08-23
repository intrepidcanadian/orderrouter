const { JsonRpcProvider } = require('@ethersproject/providers');
const { Contract } = require('@ethersproject/contracts');

// Pool ABI for checking liquidity
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
  {
    inputs: [],
    name: 'liquidity',
    outputs: [{ internalType: 'uint128', name: '', type: 'uint128' }],
    stateMutability: 'view',
    type: 'function',
  },
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
];

async function testPoolState() {
  const provider = new JsonRpcProvider('https://evm.confluxrpc.com');
  
  // Pool addresses from our factory test
  const pools = {
    '0.05%': '0xAccd1dB6D556177B9c4685BA342349B337D33079',
    '0.3%': '0xCd0c7A06D95a5fE99D3Aa3Bc9f174B8999cC36Bf',
    '1%': '0xf67Cdb3bad835ED165819b8699cD8D40942c6D00'
  };

  console.log('Testing USDC-USDT pool states...\n');

  for (const [feeName, poolAddress] of Object.entries(pools)) {
    try {
      console.log(`=== ${feeName} Pool (${poolAddress}) ===`);
      
      const poolContract = new Contract(poolAddress, POOL_ABI, provider);
      
      // Get basic pool info
      const [token0, token1, slot0, liquidity] = await Promise.all([
        poolContract.token0(),
        poolContract.token1(),
        poolContract.slot0(),
        poolContract.liquidity()
      ]);

      console.log('Token0:', token0);
      console.log('Token1:', token1);
      console.log('Current Liquidity:', liquidity.toString());
      console.log('SqrtPriceX96:', slot0[0].toString());
      console.log('Tick:', slot0[1]);
      console.log('Unlocked:', slot0[6]);
      
      // Calculate price
      const Q96 = BigInt(2) ** BigInt(96);
      const sqrtPrice = Number(slot0[0]) / Number(Q96);
      const price = sqrtPrice * sqrtPrice;
      console.log('Current Price (token1/token0):', price);
      
      // Check if pool has liquidity
      if (liquidity.toString() === '0') {
        console.log('❌ Pool has NO liquidity!');
      } else {
        console.log('✅ Pool has liquidity');
      }
      
      console.log('');
    } catch (error) {
      console.log(`❌ Error checking ${feeName} pool:`, error.message);
      console.log('');
    }
  }
}

testPoolState();
