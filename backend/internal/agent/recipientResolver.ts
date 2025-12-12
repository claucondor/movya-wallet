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
   * @param network - Red actual ('mainnet' o 'testnet') para seleccionar la dirección correcta
   * @returns Objeto con dirección y tipo de recipiente
   */
  static async resolveRecipient(userId: string, recipient: string, network: 'mainnet' | 'testnet' = 'mainnet'): Promise<{
    address: string | null;
    type: 'nickname' | 'email' | 'address' | 'unknown';
    originalValue: string;
  }> {
    console.log(`[RecipientResolver] Resolving recipient: "${recipient}" for userId: ${userId}, network: ${network}`);

    // Si ya es una dirección de wallet, devolverla directamente
    if (this.isWalletAddress(recipient)) {
      console.log(`[RecipientResolver] "${recipient}" is a wallet address`);
      return {
        address: recipient,
        type: 'address',
        originalValue: recipient
      };
    }

    // Si parece un email, intentar resolver por email
    if (this.isEmail(recipient)) {
      console.log(`[RecipientResolver] "${recipient}" looks like an email, trying to resolve...`);
      const result = await this.resolveByEmail(userId, recipient, network);
      if (result.address) {
        console.log(`[RecipientResolver] Resolved email to address: ${result.address}`);
        return result;
      }
    }

    // Intentar resolver por nickname
    console.log(`[RecipientResolver] Trying to resolve "${recipient}" as nickname...`);
    const nicknameResult = await this.resolveByNickname(userId, recipient, network);
    if (nicknameResult.address) {
      console.log(`[RecipientResolver] Resolved nickname to address: ${nicknameResult.address}`);
      return nicknameResult;
    }

    // No se pudo resolver
    console.log(`[RecipientResolver] Could not resolve "${recipient}" to any address`);
    return {
      address: null,
      type: 'unknown',
      originalValue: recipient
    };
  }

  /**
   * Comprueba si una cadena parece ser una dirección de wallet
   * Soporta tanto direcciones EVM (0x...) como Stacks (SP.../ST...)
   */
  private static isWalletAddress(value: string): boolean {
    // EVM address (0x + 40 hex chars)
    if (/^0x[a-fA-F0-9]{40}$/.test(value)) {
      return true;
    }
    // Stacks mainnet address (SP + alphanumeric)
    if (/^SP[A-Z0-9]{38,40}$/.test(value)) {
      return true;
    }
    // Stacks testnet address (ST + alphanumeric)
    if (/^ST[A-Z0-9]{38,40}$/.test(value)) {
      return true;
    }
    return false;
  }

  /**
   * Comprueba si una cadena parece ser un email
   */
  private static isEmail(value: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  }

  /**
   * Selecciona la dirección correcta basándose en la red
   */
  private static selectAddressForNetwork(
    walletData: { address?: string | null; addressMainnet?: string | null; addressTestnet?: string | null } | null,
    network: 'mainnet' | 'testnet'
  ): string | null {
    if (!walletData) return null;

    // Si la red es testnet, preferir addressTestnet
    if (network === 'testnet') {
      const testnetAddress = walletData.addressTestnet;
      if (testnetAddress) {
        console.log(`[RecipientResolver] Selected testnet address: ${testnetAddress}`);
        return testnetAddress;
      }
      // Fallback: si no hay testnet específico, usar address si empieza con ST
      if (walletData.address?.startsWith('ST')) {
        return walletData.address;
      }
      console.log(`[RecipientResolver] Warning: No testnet address available, wallet has: ${JSON.stringify(walletData)}`);
      return null;
    }

    // Si la red es mainnet, preferir addressMainnet o address
    const mainnetAddress = walletData.addressMainnet || walletData.address;
    if (mainnetAddress?.startsWith('SP')) {
      console.log(`[RecipientResolver] Selected mainnet address: ${mainnetAddress}`);
      return mainnetAddress;
    }

    console.log(`[RecipientResolver] Warning: No mainnet address available, wallet has: ${JSON.stringify(walletData)}`);
    return null;
  }

  /**
   * Intenta resolver un email a una dirección de wallet
   * 1. Busca si el usuario tiene un contacto con ese email
   * 2. Si no, busca si existe un usuario con ese email en la plataforma
   */
  private static async resolveByEmail(userId: string, email: string, network: 'mainnet' | 'testnet'): Promise<{
    address: string | null;
    type: 'email';
    originalValue: string;
  }> {
    console.log(`[RecipientResolver] resolveByEmail: Looking up email "${email}" for network: ${network}`);

    // 1. Verificar si el usuario tiene un contacto con ese email
    const contacts = await ContactService.getContacts(userId);
    console.log(`[RecipientResolver] User has ${contacts.length} contacts`);

    const emailContact = contacts.find(
      contact => contact.type === 'email' && contact.value.toLowerCase() === email.toLowerCase()
    );

    if (emailContact) {
      console.log(`[RecipientResolver] Found email contact:`, emailContact);
      if (emailContact.targetUserId) {
        const targetWallet = await UserService.getWalletAddress(emailContact.targetUserId);
        console.log(`[RecipientResolver] Target wallet lookup result:`, targetWallet);

        const selectedAddress = this.selectAddressForNetwork(targetWallet, network);
        if (selectedAddress) {
          return {
            address: selectedAddress,
            type: 'email',
            originalValue: email
          };
        }
      }
    }

    // 2. Buscar directamente si existe un usuario con ese email
    console.log(`[RecipientResolver] Looking up user by email: "${email}"`);
    const user = await UserService.getUserByEmail(email);
    console.log(`[RecipientResolver] getUserByEmail result:`, user);

    if (user && user.googleUserId) {
      console.log(`[RecipientResolver] Found user with googleUserId: ${user.googleUserId}`);
      const userWallet = await UserService.getWalletAddress(user.googleUserId);
      console.log(`[RecipientResolver] User wallet lookup result:`, userWallet);

      const selectedAddress = this.selectAddressForNetwork(userWallet, network);
      if (selectedAddress) {
        console.log(`[RecipientResolver] Resolved email to address: ${selectedAddress}`);
        return {
          address: selectedAddress,
          type: 'email',
          originalValue: email
        };
      }
    }

    // No se encontró wallet asociada al email
    console.log(`[RecipientResolver] Could not resolve email "${email}" to any address`);
    return {
      address: null,
      type: 'email',
      originalValue: email
    };
  }

  /**
   * Intenta resolver un nickname a una dirección de wallet
   */
  private static async resolveByNickname(userId: string, nickname: string, network: 'mainnet' | 'testnet'): Promise<{
    address: string | null;
    type: 'nickname';
    originalValue: string;
  }> {
    console.log(`[RecipientResolver] Looking up nickname "${nickname}" for user ${userId}, network: ${network}`);

    // Buscar contacto por nickname
    const contact = await ContactService.getContactByNickname(userId, nickname);

    if (!contact) {
      console.log(`[RecipientResolver] No contact found with nickname "${nickname}"`);
      return {
        address: null,
        type: 'nickname',
        originalValue: nickname
      };
    }

    console.log(`[RecipientResolver] Found contact:`, contact);

    // Si el contacto es de tipo dirección, devolverla directamente
    // Pero verificar que sea la red correcta
    if (contact.type === 'address') {
      const address = contact.value;
      const isMainnetAddress = address.startsWith('SP');
      const isTestnetAddress = address.startsWith('ST');

      // Validar que la dirección guardada coincide con la red actual
      if (network === 'testnet' && isMainnetAddress) {
        console.log(`[RecipientResolver] Contact address ${address} is mainnet but user is on testnet`);
        return {
          address: null,
          type: 'nickname',
          originalValue: nickname
        };
      }
      if (network === 'mainnet' && isTestnetAddress) {
        console.log(`[RecipientResolver] Contact address ${address} is testnet but user is on mainnet`);
        return {
          address: null,
          type: 'nickname',
          originalValue: nickname
        };
      }

      console.log(`[RecipientResolver] Contact is address type, returning: ${contact.value}`);
      return {
        address: contact.value,
        type: 'nickname',
        originalValue: nickname
      };
    }

    // Si el contacto es de tipo email y tiene un targetUserId, obtener la wallet de ese usuario
    if (contact.type === 'email' && contact.targetUserId) {
      console.log(`[RecipientResolver] Contact is email type, looking up wallet for targetUserId: ${contact.targetUserId}`);
      const targetWallet = await UserService.getWalletAddress(contact.targetUserId);
      console.log(`[RecipientResolver] Target wallet lookup result:`, targetWallet);

      const selectedAddress = this.selectAddressForNetwork(targetWallet, network);
      if (selectedAddress) {
        console.log(`[RecipientResolver] Found target wallet: ${selectedAddress}`);
        return {
          address: selectedAddress,
          type: 'nickname',
          originalValue: nickname
        };
      }
    }

    // No se pudo resolver el nickname a una dirección
    console.log(`[RecipientResolver] Could not resolve nickname "${nickname}" to address`);
    return {
      address: null,
      type: 'nickname',
      originalValue: nickname
    };
  }
} 