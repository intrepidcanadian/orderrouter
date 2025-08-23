// Test improved price impact calculation
function calculatePriceImpact(amountIn, amountOut, currentPrice) {
  const inputAmount = parseFloat(amountIn);
  const outputAmount = parseFloat(amountOut);
  
  if (inputAmount === 0 || outputAmount === 0) return 0;
  
  // Calculate the execution price (what price you actually got)
  const executionPrice = outputAmount / inputAmount;
  
  // Current market price from the pool
  const marketPrice = parseFloat(currentPrice);
  
  if (marketPrice === 0) return 0;
  
  // Price impact = (market price - execution price) / market price * 100
  const priceImpact = ((marketPrice - executionPrice) / marketPrice) * 100;
  
  return Math.abs(priceImpact);
}

console.log('=== Testing Improved Price Impact Calculation ===\n');

// Test case 1: USDC to USDT (stablecoin pair)
console.log('Test 1: 100 USDC → USDT (Stablecoin pair)');
console.log('  Input: 100 USDC');
console.log('  Output: 99.9208 USDT');
console.log('  Current Price: 0.999713 USDT/USDC');
const executionPrice1 = 99.9208 / 100; // 0.999208
console.log('  Execution Price:', executionPrice1);
const impact1 = calculatePriceImpact('100', '99.9208', '0.999713');
console.log('  Price Impact:', impact1.toFixed(4) + '%');
console.log('');

// Test case 2: USDC to ETH (volatile pair)
console.log('Test 2: 3000 USDC → ETH (Volatile pair)');
console.log('  Input: 3000 USDC');
console.log('  Output: 1.0 ETH');
console.log('  Current Price: 0.00033 ETH/USDC (ETH = $3000)');
const executionPrice2 = 1.0 / 3000; // 0.000333...
console.log('  Execution Price:', executionPrice2);
const impact2 = calculatePriceImpact('3000', '1.0', '0.00033');
console.log('  Price Impact:', impact2.toFixed(4) + '%');
console.log('');

// Test case 3: Large USDC to ETH trade (higher price impact)
console.log('Test 3: 30000 USDC → ETH (Large volatile trade)');
console.log('  Input: 30000 USDC');
console.log('  Output: 9.5 ETH (worse rate due to slippage)');
console.log('  Current Price: 0.00033 ETH/USDC');
const executionPrice3 = 9.5 / 30000; // 0.000317
console.log('  Execution Price:', executionPrice3);
const impact3 = calculatePriceImpact('30000', '9.5', '0.00033');
console.log('  Price Impact:', impact3.toFixed(4) + '%');
console.log('');

// Test case 4: ETH to USDC (reverse direction)
console.log('Test 4: 1 ETH → USDC (Reverse direction)');
console.log('  Input: 1 ETH');
console.log('  Output: 2950 USDC (slightly worse than $3000)');
console.log('  Current Price: 3000 USDC/ETH');
const executionPrice4 = 2950 / 1; // 2950
console.log('  Execution Price:', executionPrice4);
const impact4 = calculatePriceImpact('1', '2950', '3000');
console.log('  Price Impact:', impact4.toFixed(4) + '%');
