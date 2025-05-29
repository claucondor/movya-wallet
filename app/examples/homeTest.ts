// Test file specifically for Home component balance loading
import PortfolioService from '../core/services/portfolioService';

/**
 * Test if the Home component can load portfolio data successfully
 */
export async function testHomePortfolioLoading() {
  console.log('=== Testing Home Portfolio Loading ===');
  
  try {
    console.log('1. Loading portfolio summary...');
    const summary = await PortfolioService.getPortfolioSummary(43114);
    console.log('Portfolio Summary:', summary);
    
    console.log('2. Loading full portfolio...');
    const portfolio = await PortfolioService.getPortfolio(43114);
    console.log('Full Portfolio:', portfolio);
    
    console.log('3. Checking individual tokens...');
    const avaxToken = portfolio.tokens.find(t => t.symbol === 'AVAX');
    const usdcToken = portfolio.tokens.find(t => t.symbol === 'USDC');
    
    console.log('AVAX Token:', avaxToken);
    console.log('USDC Token:', usdcToken);
    
    console.log('4. Simulating Home component display...');
    console.log('Total Balance for Home:', summary.totalBalance);
    console.log('AVAX Balance for Home:', avaxToken ? `$${avaxToken.valueUSD}` : '$0.00');
    console.log('USDC Balance for Home:', usdcToken ? `$${usdcToken.valueUSD}` : '$0.00');
    console.log('AVAX Change for Home:', avaxToken ? `${avaxToken.change24h >= 0 ? '+' : ''}${avaxToken.change24h.toFixed(1)}%` : '0.0%');
    
    return {
      success: true,
      summary,
      portfolio,
      avaxToken,
      usdcToken
    };
    
  } catch (error: any) {
    console.error('❌ Home Portfolio Loading Error:', error);
    return {
      success: false,
      error: error?.message || 'Unknown error'
    };
  }
}

/**
 * Test what the Home component would show with current wallet
 */
export async function simulateHomeDisplay() {
  console.log('=== Simulating Home Display ===');
  
  const result = await testHomePortfolioLoading();
  
  if (!result.success || !result.summary || !result.portfolio) {
    console.log('❌ Cannot simulate home display due to loading error');
    return;
  }
  
  console.log('✅ Home would display:');
  console.log(`📊 Total Balance: ${result.summary.totalBalance}`);
  console.log(`🏔️  AVAX: ${result.avaxToken ? `$${result.avaxToken.valueUSD} (${result.avaxToken.balance} AVAX)` : 'Not available'}`);
  console.log(`💵 USDC: ${result.usdcToken ? `$${result.usdcToken.valueUSD} (${result.usdcToken.balance} USDC)` : 'Not available'}`);
  console.log(`📈 AVAX Change: ${result.avaxToken ? `${result.avaxToken.change24h >= 0 ? '+' : ''}${result.avaxToken.change24h.toFixed(1)}%` : '0.0%'}`);
  console.log(`🏦 Wallet: ${result.portfolio.walletAddress}`);
}

// Usage:
// import { simulateHomeDisplay } from './examples/homeTest';
// simulateHomeDisplay(); 