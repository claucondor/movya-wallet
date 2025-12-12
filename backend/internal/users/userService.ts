import FirestoreService from '../firestore/firestoreService';

// Collection names
const USER_CREDENTIALS_COLLECTION = 'user_credentials';
const USERS_COLLECTION = 'users';

// Interfaces para tipado fuerte
export interface UserCredentials {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  googleUserId: string;
  email: string;
}

export interface UserProfile {
  email?: string;
  name?: string;
  googleUserId?: string;
  lastFaucetUse?: Date;
  faucetCount?: number;
  walletAddress?: string; // Legacy field - use walletAddressMainnet/Testnet instead
  walletAddressMainnet?: string; // Stacks mainnet address (SP...)
  walletAddressTestnet?: string; // Stacks testnet address (ST...)
  createdAt?: Date;
  updatedAt?: Date;
  picture?: string;
  walletNetwork?: string;
  walletType?: string;
}

/**
 * Servicio de gestión de usuarios
 */
class UserService {
  /**
   * Guardar credenciales de usuario después de la autenticación
   * @param userId - ID de usuario de Google
   * @param credentials - Credenciales de autenticación
   */
  static async saveCredentials(userId: string, credentials: UserCredentials): Promise<void> {
    await FirestoreService.setDocument(
      USER_CREDENTIALS_COLLECTION, 
      userId, 
      credentials
    );
  }

  /**
   * Obtener perfil de usuario
   * @param userId - ID de usuario de Google
   * @returns Perfil de usuario o null
   */
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    return FirestoreService.getDocument<UserProfile>(USERS_COLLECTION, userId);
  }

  /**
   * Crear o actualizar perfil de usuario
   * @param userId - ID de usuario de Google
   * @param userData - Datos de perfil de usuario
   */
  static async upsertUserProfile(userId: string, userData: UserProfile): Promise<void> {
    const existingProfile = await this.getUserProfile(userId);
    
    const profileToSave = {
      ...userData,
      updatedAt: new Date(),
      ...(existingProfile ? {} : { createdAt: new Date() })
    };

    await FirestoreService.setDocument(
      USERS_COLLECTION, 
      userId, 
      profileToSave
    );
  }

  /**
   * Verificar si un usuario puede usar el faucet
   * @param userId - ID de usuario de Google
   * @param cooldownHours - Horas entre usos del faucet
   * @returns Booleano que indica si puede usar el faucet
   */
  static async canUseFaucet(userId: string, cooldownHours: number = 24): Promise<boolean> {
    const userData = await this.getUserProfile(userId);
    
    // Si no existe el usuario, no puede usar el faucet
    if (!userData) return false;

    // Si nunca ha usado el faucet, puede usarlo
    if (!userData.lastFaucetUse) return true;

    // Verificar tiempo transcurrido desde el último uso
    const lastUse = userData.lastFaucetUse;
    const now = new Date();
    const timeSinceLastUse = now.getTime() - lastUse.getTime();
    
    return timeSinceLastUse >= cooldownHours * 60 * 60 * 1000;
  }

  /**
   * Actualizar uso del faucet
   * @param userId - ID de usuario de Google
   */
  static async updateFaucetUsage(userId: string): Promise<void> {
    const userData = await this.getUserProfile(userId);
    const currentFaucetCount = userData?.faucetCount ?? 0;

    await this.upsertUserProfile(userId, {
      lastFaucetUse: new Date(),
      faucetCount: currentFaucetCount + 1
    });
  }

  /**
   * Validate Stacks address format
   */
  private static isValidStacksAddress(address: string): boolean {
    // Mainnet: SP + 38-41 alphanumeric chars
    // Testnet: ST + 38-41 alphanumeric chars
    return /^(SP|ST)[A-Z0-9]{38,41}$/i.test(address);
  }

  /**
   * Guardar direcciones de wallet de un usuario (mainnet y testnet)
   * @param userId - ID de usuario de Google
   * @param addresses - Direcciones de wallet a guardar
   */
  static async saveWalletAddresses(
    userId: string,
    addresses: {
      mainnet?: string;
      testnet?: string;
    }
  ): Promise<void> {
    // Validate addresses if provided
    if (addresses.mainnet && !this.isValidStacksAddress(addresses.mainnet)) {
      throw new Error(`Invalid mainnet address: ${addresses.mainnet}`);
    }
    if (addresses.testnet && !this.isValidStacksAddress(addresses.testnet)) {
      throw new Error(`Invalid testnet address: ${addresses.testnet}`);
    }

    // Build update object
    const updateData: Partial<UserProfile> = {
      updatedAt: new Date()
    };

    if (addresses.mainnet) {
      updateData.walletAddressMainnet = addresses.mainnet;
      // Also set legacy field to mainnet address for backward compatibility
      updateData.walletAddress = addresses.mainnet;
    }
    if (addresses.testnet) {
      updateData.walletAddressTestnet = addresses.testnet;
    }

    await this.upsertUserProfile(userId, updateData);
    console.log(`[UserService] Saved wallet addresses for user ${userId}:`, addresses);
  }

  /**
   * Guardar o actualizar la dirección de wallet de un usuario (legacy - single address)
   * @param userId - ID de usuario de Google
   * @param walletAddress - Dirección de wallet a guardar
   * @param options - Opciones adicionales para la actualización
   */
  static async saveWalletAddress(
    userId: string,
    walletAddress: string,
    options?: {
      network?: 'mainnet' | 'testnet' | string;
      type?: 'evm' | 'solana' | 'stacks' | 'other';
    }
  ): Promise<void> {
    // Validate Stacks address
    if (!this.isValidStacksAddress(walletAddress)) {
      throw new Error(`Invalid Stacks wallet address: ${walletAddress}`);
    }

    // Determine which field to update based on address prefix or network option
    const isTestnet = walletAddress.startsWith('ST') || options?.network === 'testnet';

    const updateData: Partial<UserProfile> = {
      walletNetwork: options?.network,
      walletType: options?.type || 'stacks',
      updatedAt: new Date()
    };

    if (isTestnet) {
      updateData.walletAddressTestnet = walletAddress;
    } else {
      updateData.walletAddressMainnet = walletAddress;
      updateData.walletAddress = walletAddress; // Legacy field
    }

    await this.upsertUserProfile(userId, updateData);
    console.log(`[UserService] Saved wallet address for user ${userId}: ${walletAddress} (${isTestnet ? 'testnet' : 'mainnet'})`);
  }

  /**
   * Obtener la dirección de wallet de un usuario
   * @param userId - ID de usuario de Google
   * @param network - Red específica ('mainnet', 'testnet') o undefined para la que tenga
   * @returns Dirección de wallet o null
   */
  static async getWalletAddress(userId: string, network?: 'mainnet' | 'testnet'): Promise<{
    address: string | null;
    addressMainnet?: string | null;
    addressTestnet?: string | null;
    network?: string;
    type?: string;
  } | null> {
    const user = await this.getUserProfile(userId);

    if (!user) {
      return null;
    }

    // If specific network requested
    if (network === 'mainnet') {
      return user.walletAddressMainnet ? {
        address: user.walletAddressMainnet,
        addressMainnet: user.walletAddressMainnet,
        addressTestnet: user.walletAddressTestnet,
        network: 'mainnet',
        type: user.walletType || 'stacks'
      } : null;
    }

    if (network === 'testnet') {
      return user.walletAddressTestnet ? {
        address: user.walletAddressTestnet,
        addressMainnet: user.walletAddressMainnet,
        addressTestnet: user.walletAddressTestnet,
        network: 'testnet',
        type: user.walletType || 'stacks'
      } : null;
    }

    // Return any available address (prefer mainnet, fallback to testnet, then legacy)
    const address = user.walletAddressMainnet || user.walletAddressTestnet || user.walletAddress;

    if (!address) {
      return null;
    }

    return {
      address,
      addressMainnet: user.walletAddressMainnet,
      addressTestnet: user.walletAddressTestnet,
      network: user.walletNetwork,
      type: user.walletType || 'stacks'
    };
  }

  /**
   * Obtener usuario por email
   * @param email - Email del usuario
   * @returns Perfil de usuario o null
   */
  static async getUserByEmail(email: string): Promise<UserProfile | null> {
    // Usar queryDocuments para buscar por email
    const users = await FirestoreService.queryDocuments<UserProfile>(
      USERS_COLLECTION,
      (ref) => ref.where('email', '==', email.toLowerCase())
    );

    return users[0] || null;
  }
}

export default UserService; 