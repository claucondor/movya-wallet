import { Request, Response } from 'express';
import UserService from '../users/userService';

/**
 * Endpoint para solicitar fondos de faucet de Stacks testnet
 * Usa el faucet oficial de Hiro para testnet
 */
export async function faucetHandler(req: Request, res: Response) {
  const { network, address, userId } = req.body;

  try {
    // 1. Verificar que sea testnet
    if (network !== 'testnet') {
      return res.status(400).json({
        error: "Faucet is only available for testnet",
        message: "Please switch to testnet to use the faucet"
      });
    }

    // 2. Verificar formato de dirección Stacks
    if (!address || (!address.startsWith('ST') && !address.startsWith('SP'))) {
      return res.status(400).json({
        error: "Invalid Stacks address",
        message: "Address must start with ST (testnet) or SP (mainnet)"
      });
    }

    // 3. Verificar si el usuario existe
    const user = await UserService.getUserProfile(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // 4. Verificar si puede usar el faucet
    const canUseFaucet = await UserService.canUseFaucet(userId);
    if (!canUseFaucet) {
      return res.status(429).json({
        error: "Faucet can only be used once every 24 hours",
        lastFaucetUse: user.lastFaucetUse
      });
    }

    // 5. Verificar saldo actual en testnet
    try {
      const balanceResponse = await fetch(
        `https://api.testnet.hiro.so/extended/v1/address/${address}/balances`
      );

      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        const balanceSTX = Number(balanceData.stx.balance) / 1_000_000; // Convert from microSTX

        // Si tiene más de 10 STX, no puede usar el faucet
        if (balanceSTX > 10) {
          return res.status(400).json({
            error: "Address balance is too high to use faucet",
            currentBalance: `${balanceSTX.toFixed(2)} STX`,
            message: "Faucet is only for addresses with less than 10 STX"
          });
        }
      }
    } catch (balanceError) {
      console.warn('Could not check balance, proceeding with faucet request:', balanceError);
    }

    // 6. Solicitar fondos del faucet oficial de Hiro
    const faucetResponse = await fetch('https://api.testnet.hiro.so/extended/v1/faucets/stx', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address: address,
        stacking: false
      })
    });

    if (!faucetResponse.ok) {
      const errorData = await faucetResponse.json().catch(() => ({}));
      return res.status(faucetResponse.status).json({
        error: "Faucet request failed",
        message: errorData.error || faucetResponse.statusText,
        details: errorData
      });
    }

    const faucetData = await faucetResponse.json();

    // 7. Actualizar uso del faucet
    await UserService.updateFaucetUsage(userId);

    return res.json({
      success: true,
      txId: faucetData.txId || faucetData.txid,
      message: "Faucet funds successfully requested. You will receive 500 STX on testnet.",
      explorerUrl: `https://explorer.hiro.so/txid/${faucetData.txId || faucetData.txid}?chain=testnet`
    });
  } catch (error: any) {
    console.error("Faucet error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error.message || "Unknown error"
    });
  }
} 