const { JsonRpcProvider } = require('@ethersproject/providers');
const { Contract } = require('@ethersproject/contracts');

// Factory ABI
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

async function testFactory() {
  const provider = new JsonRpcProvider('https://evm.confluxrpc.com');
  
  const factoryAddress = '0x62Aa0294cB42Aae39b7772313eAdfa5d489146eC';
  const factoryContract = new Contract(factoryAddress, FACTORY_ABI, provider);
  
  const USDC = '0x6963efed0ab40f6c3d7bda44a05dcf1437c44372';
  const USDT = '0xfe97E85d13ABD9c1c33384E796F10B73905637cE';
  
  const feeTiers = [100, 500, 3000, 10000]; // 0.01%, 0.05%, 0.3%, 1%
  
  console.log('Testing Factory contract...');
  console.log('Checking USDC-USDT pools:');
  
  for (const fee of feeTiers) {
    try {
      const poolAddress = await factoryContract.getPool(USDC, USDT, fee);
      console.log(`Fee ${fee} (${fee/10000}%): ${poolAddress}`);
      
      if (poolAddress !== '0x0000000000000000000000000000000000000000') {
        console.log(`  ✅ Pool exists`);
      } else {
        console.log(`  ❌ Pool does not exist`);
      }
    } catch (error) {
      console.log(`Fee ${fee} (${fee/10000}%): Error - ${error.message}`);
    }
  }
}

testFactory();
