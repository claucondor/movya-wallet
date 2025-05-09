import ContactService from '../contacts/contactService';
import UserService from '../users/userService';

/**
 * Clase para resolver diferentes tipos de destinatarios a direcciones de wallet
 */
export default class RecipientResolver {
  /**
   * Resuelve un nickname o email a una dirección de wallet
   * 
   * @param userId - ID del usuario que hace la solicitud
   * @param recipient - Puede ser nickname, email o dirección de wallet
   * @returns Objeto con dirección y tipo de recipiente
   */
  static async resolveRecipient(userId: string, recipient: string): Promise<{
    address: string | null;
    type: 'nickname' | 'email' | 'address' | 'unknown';
    originalValue: string;
  }> {
    // Si ya es una dirección de wallet, devolverla directamente
    if (this.isWalletAddress(recipient)) {
      return {
        address: recipient,
        type: 'address',
        originalValue: recipient
      };
    }

    // Si parece un email, intentar resolver por email
    if (this.isEmail(recipient)) {
      const result = await this.resolveByEmail(userId, recipient);
      if (result.address) {
        return result;
      }
    }

    // Intentar resolver por nickname
    const nicknameResult = await this.resolveByNickname(userId, recipient);
    if (nicknameResult.address) {
      return nicknameResult;
    }

    // No se pudo resolver
    return {
      address: null,
      type: 'unknown',
      originalValue: recipient
    };
  }

  /**
   * Comprueba si una cadena parece ser una dirección de wallet EVM
   */
  private static isWalletAddress(value: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(value);
  }

  /**
   * Comprueba si una cadena parece ser un email
   */
  private static isEmail(value: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  }

  /**
   * Intenta resolver un email a una dirección de wallet
   * 1. Busca si el usuario tiene un contacto con ese email
   * 2. Si no, busca si existe un usuario con ese email en la plataforma
   */
  private static async resolveByEmail(userId: string, email: string): Promise<{
    address: string | null;
    type: 'email';
    originalValue: string;
  }> {
    // 1. Verificar si el usuario tiene un contacto con ese email
    const contacts = await ContactService.getContacts(userId);
    const emailContact = contacts.find(
      contact => contact.type === 'email' && contact.value.toLowerCase() === email.toLowerCase()
    );

    if (emailContact && emailContact.targetUserId) {
      // Si el contacto existe y tiene un targetUserId, obtener la wallet de ese usuario
      const targetWallet = await UserService.getWalletAddress(emailContact.targetUserId);
      
      if (targetWallet && targetWallet.address) {
        return {
          address: targetWallet.address,
          type: 'email',
          originalValue: email
        };
      }
    }

    // 2. Buscar directamente si existe un usuario con ese email
    const user = await UserService.getUserByEmail(email);
    
    if (user && user.googleUserId) {
      const userWallet = await UserService.getWalletAddress(user.googleUserId);
      
      if (userWallet && userWallet.address) {
        return {
          address: userWallet.address,
          type: 'email',
          originalValue: email
        };
      }
    }

    // No se encontró wallet asociada al email
    return {
      address: null,
      type: 'email',
      originalValue: email
    };
  }

  /**
   * Intenta resolver un nickname a una dirección de wallet
   */
  private static async resolveByNickname(userId: string, nickname: string): Promise<{
    address: string | null;
    type: 'nickname';
    originalValue: string;
  }> {
    // Buscar contacto por nickname
    const contact = await ContactService.getContactByNickname(userId, nickname);
    
    if (!contact) {
      return {
        address: null,
        type: 'nickname',
        originalValue: nickname
      };
    }

    // Si el contacto es de tipo dirección, devolverla directamente
    if (contact.type === 'address') {
      return {
        address: contact.value,
        type: 'nickname',
        originalValue: nickname
      };
    }
    
    // Si el contacto es de tipo email y tiene un targetUserId, obtener la wallet de ese usuario
    if (contact.type === 'email' && contact.targetUserId) {
      const targetWallet = await UserService.getWalletAddress(contact.targetUserId);
      
      if (targetWallet && targetWallet.address) {
        return {
          address: targetWallet.address,
          type: 'nickname',
          originalValue: nickname
        };
      }
    }

    // No se pudo resolver el nickname a una dirección
    return {
      address: null,
      type: 'nickname',
      originalValue: nickname
    };
  }
} 