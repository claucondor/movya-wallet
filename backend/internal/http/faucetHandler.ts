import { Request, Response } from 'express';
import BlockchainService from '../services/blockchainService';
import UserService from '../users/userService';

/**
 * Endpoint para solicitar fondos de faucet
 */
export async function faucetHandler(req: Request, res: Response) {
  const { network, address, userId } = req.body;

  try {
    // 1. Verificar si el usuario existe
    const user = await UserService.getUserProfile(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // 2. Verificar si puede usar el faucet
    const canUseFaucet = await UserService.canUseFaucet(userId);
    if (!canUseFaucet) {
      return res.status(429).json({ 
        error: "Faucet can only be used once every 24 hours",
        lastFaucetUse: user.lastFaucetUse
      });
    }

    // 3. Verificar saldo
    const balance = await BlockchainService.getBalance(network, address);
    if (Number(balance) > 0.02) {
      return res.status(400).json({ 
        error: "Address balance is too high to use faucet",
        currentBalance: balance
      });
    }

    // 4. Enviar AVAX
    const txHash = await BlockchainService.sendAVAX(network, address, "0.2");

    // 5. Actualizar uso del faucet
    await UserService.updateFaucetUsage(userId);

    return res.json({ 
      txHash, 
      message: "Faucet funds successfully sent" 
    });
  } catch (error) {
    console.error("Faucet error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
} 