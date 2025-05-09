import { Request, Response } from 'express';
import UserService from '../users/userService';

/**
 * Guardar la dirección de wallet de un usuario
 */
export async function saveWalletAddressHandler(req: Request, res: Response) {
  const { userId, walletAddress, network, type } = req.body;

  // Validaciones básicas
  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }
  if (!walletAddress) {
    return res.status(400).json({ error: "Wallet address is required" });
  }

  try {
    // Intentar guardar la dirección de wallet
    await UserService.saveWalletAddress(userId, walletAddress, { 
      network, 
      type 
    });

    // Obtener la dirección guardada para confirmar
    const savedWallet = await UserService.getWalletAddress(userId);

    return res.status(200).json({
      message: "Wallet address saved successfully",
      wallet: savedWallet
    });
  } catch (error) {
    console.error("Error saving wallet address:", error);
    
    // Manejar diferentes tipos de errores
    if (error instanceof Error && error.message.includes('inválida')) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(500).json({ 
      error: "Failed to save wallet address", 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

/**
 * Obtener la dirección de wallet de un usuario
 */
export async function getWalletAddressHandler(req: Request, res: Response) {
  const { userId } = req.params;

  // Validaciones básicas
  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    // Intentar obtener la dirección de wallet
    const wallet = await UserService.getWalletAddress(userId);

    if (!wallet) {
      return res.status(404).json({ 
        error: "No wallet address found for this user" 
      });
    }

    return res.status(200).json(wallet);
  } catch (error) {
    console.error("Error retrieving wallet address:", error);
    return res.status(500).json({ 
      error: "Failed to retrieve wallet address", 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
} 