// Test price impact calculation
function calculatePriceImpact(amountIn, amountOut, currentPrice) {
  const inputAmount = parseFloat(amountIn);
  const outputAmount = parseFloat(amountOut);
  const marketPrice = parseFloat(currentPrice);
  
  console.log('Input values:');
  console.log('  Input Amount:', inputAmount);
  console.log('  Output Amount:', outputAmount);
  console.log('  Market Price:', marketPrice);
  
  // Calculate expected output based on market price
  const expectedOutput = inputAmount * marketPrice;
  console.log('  Expected Output:', expectedOutput);
  
  // Calculate price impact
  const priceImpact = ((expectedOutput - outputAmount) / expectedOutput) * 100;
  console.log('  Price Impact:', priceImpact.toFixed(4) + '%');
  
  return Math.abs(priceImpact);
}

console.log('=== Testing Price Impact Calculation ===\n');

// Test case 1: USDC to USDT
console.log('Test 1: 100 USDC → USDT');
calculatePriceImpact('100', '99.9208', '0.999713');
console.log('');

// Test case 2: 1 USDC to USDT  
console.log('Test 2: 1 USDC → USDT');
calculatePriceImpact('1', '0.9992128037864465', '0.999713');
console.log('');

// Test case 3: 10 USDC to USDT
console.log('Test 3: 10 USDC → USDT');
calculatePriceImpact('10', '9.99212401333684', '0.999713');
