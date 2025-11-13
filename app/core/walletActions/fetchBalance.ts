import { ActionResultInput } from '../../types/agent';
import { WalletActionResult } from '../walletActionHandler';
import BalanceService from '../services/balanceService';

/**
 * Fetch user's balance on Stacks blockchain (STX and SIP-010 tokens)
 */
export async function fetchStacksBalance(): Promise<WalletActionResult> {
  console.log('[fetchBalance] Starting balance query on Stacks');

  try {
    // 1. Get balances using BalanceService
    const stxBalance = await BalanceService.getSTXBalance('mainnet');
    const usdaBalance = await BalanceService.getUSDABalance('mainnet');
    const sbtcBalance = await BalanceService.getSBTCBalance('mainnet');

    // 2. Format balance information
    let balanceText = `${stxBalance.balance} STX`;

    if (usdaBalance && parseFloat(usdaBalance.balance) > 0) {
      balanceText += `, ${usdaBalance.balance} USDA`;
    }

    if (sbtcBalance && parseFloat(sbtcBalance.balance) > 0) {
      balanceText += `, ${sbtcBalance.balance} sBTC`;
    }

    balanceText += ` on Stacks`;

    console.log(`[fetchBalance] Balance obtained: ${balanceText}`);

    // 3. Prepare data to report to agent
    const actionResult: ActionResultInput = {
      actionType: 'FETCH_BALANCE',
      status: 'success',
      data: {
        balance: balanceText
      }
    };

    // 4. Return result for agent to generate natural response
    return {
      success: true,
      responseMessage: "",
      data: actionResult
    };
  } catch (error: any) {
    console.error('[fetchBalance] Error querying balance:', error);

    // Prepare error data
    const errorResult: ActionResultInput = {
      actionType: 'FETCH_BALANCE',
      status: 'failure',
      data: {
        errorCode: 'BALANCE_FETCH_ERROR',
        errorMessage: error.message || 'Could not query balance'
      }
    };

    return {
      success: false,
      responseMessage: `Error: ${error.message}`,
      data: errorResult
    };
  }
}

// Export as default for backward compatibility
export default fetchStacksBalance;
