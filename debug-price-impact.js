// Debug price impact calculation with exact API values
function debugPriceImpact() {
  console.log('=== Debugging Price Impact Calculation ===\n');
  
  // Values from API response
  const inputAmount = 1; // 1 USDC
  const outputAmount = 0.999213; // USDT
  const currentPrice = 0.999713; // USDT/USDC
  
  console.log('Input values:');
  console.log('  Input Amount:', inputAmount);
  console.log('  Output Amount:', outputAmount);
  console.log('  Current Price:', currentPrice);
  
  // Calculate expected output
  const expectedOutput = inputAmount * currentPrice;
  console.log('  Expected Output:', expectedOutput);
  
  // Check for division by zero
  if (expectedOutput === 0) {
    console.log('❌ ERROR: Expected output is zero!');
    return;
  }
  
  // Calculate price impact
  const priceImpact = ((expectedOutput - outputAmount) / expectedOutput) * 100;
  console.log('  Price Impact:', priceImpact);
  console.log('  Absolute Price Impact:', Math.abs(priceImpact));
  
  // Check if the result is NaN or Infinity
  if (isNaN(priceImpact) || !isFinite(priceImpact)) {
    console.log('❌ ERROR: Price impact is NaN or Infinity!');
    return;
  }
  
  console.log('✅ Price impact calculation successful');
}

debugPriceImpact();
