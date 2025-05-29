// Example file to test the services
// You can run these functions in your development console or integrate into your app

import PriceService from '../core/services/priceService';
import BalanceService from '../core/services/balanceService';
import PortfolioService from '../core/services/portfolioService';

/**
 * Test Price Service (Mock Prices)
 */
export async function testPriceService() {
  console.log('=== Testing Price Service (Mock) ===');
  
  try {
    // Test individual token price
    const avaxPrice = await PriceService.getTokenPrice('AVAX');
    console.log('AVAX Price:', avaxPrice);
    
    const usdcPrice = await PriceService.getTokenPrice('USDC');
    console.log('USDC Price:', usdcPrice);
    
    // Test multiple prices
    const allPrices = await PriceService.getAllAvalanchePrices();
    console.log('All Avalanche Prices:', allPrices);
    
    // Test USD calculation
    const usdValue = await PriceService.calculateUSDValue('AVAX', 2.5);
    console.log('2.5 AVAX in USD:', usdValue);
    
  } catch (error) {
    console.error('Price Service Error:', error);
  }
}

/**
 * Test Balance Service (Real Blockchain Data)
 */
export async function testBalanceService() {
  console.log('=== Testing Balance Service (Real Blockchain) ===');
  
  try {
    // Test AVAX balance
    const avaxBalance = await BalanceService.getAVAXBalance(43114); // Mainnet
    console.log('AVAX Balance:', avaxBalance);
    
    // Test USDC balance
    const usdcBalance = await BalanceService.getUSDCBalance(43114);
    console.log('USDC Balance:', usdcBalance);
    
    // Test all balances
    const allBalances = await BalanceService.getAllBalances(43114);
    console.log('All Balances:', allBalances);
    
    // Test wallet address
    const walletAddress = BalanceService.getWalletAddress();
    console.log('Wallet Address:', walletAddress);
    
    // Test sufficient balance check
    const canSend = await BalanceService.hasSufficientBalance('AVAX', 0.1, 43114);
    console.log('Can send 0.1 AVAX?', canSend);
    
  } catch (error) {
    console.error('Balance Service Error:', error);
  }
}

/**
 * Test Portfolio Service (Combined Real + Mock)
 */
export async function testPortfolioService() {
  console.log('=== Testing Portfolio Service (Real Balances + Mock Prices) ===');
  
  try {
    // Test full portfolio
    const portfolio = await PortfolioService.getPortfolio(43114);
    console.log('Complete Portfolio:', portfolio);
    
    // Test portfolio summary
    const summary = await PortfolioService.getPortfolioSummary(43114);
    console.log('Portfolio Summary:', summary);
    
    // Test individual token with price
    const avaxToken = await PortfolioService.getTokenBalance('AVAX', 43114);
    console.log('AVAX Token with Price:', avaxToken);
    
    // Test transaction check
    const canTransact = await PortfolioService.canMakeTransaction('AVAX', 0.1, 43114);
    console.log('Can make 0.1 AVAX transaction?', canTransact);
    
  } catch (error) {
    console.error('Portfolio Service Error:', error);
  }
}

/**
 * Run all tests
 */
export async function runAllTests() {
  console.log('🚀 Starting Service Tests...\n');
  
  await testPriceService();
  console.log('\n');
  
  await testBalanceService();
  console.log('\n');
  
  await testPortfolioService();
  console.log('\n');
  
  console.log('✅ All tests completed!');
}

// Example usage in your app:
// import { runAllTests } from './examples/serviceTest';
// runAllTests(); 