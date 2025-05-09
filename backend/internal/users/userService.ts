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
  walletAddress?: string;
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
   * Guardar o actualizar la dirección de wallet de un usuario
   * @param userId - ID de usuario de Google
   * @param walletAddress - Dirección de wallet a guardar
   * @param options - Opciones adicionales para la actualización
   */
  static async saveWalletAddress(
    userId: string, 
    walletAddress: string, 
    options?: {
      network?: string;
      type?: 'evm' | 'solana' | 'other';
    }
  ): Promise<void> {
    // Validar dirección de wallet (ejemplo básico para direcciones EVM)
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      throw new Error('Dirección de wallet inválida');
    }

    // Obtener perfil existente
    const existingProfile = await this.getUserProfile(userId);

    // Preparar datos de actualización
    const updateData: UserProfile = {
      ...existingProfile,
      walletAddress,
      walletNetwork: options?.network,
      walletType: options?.type,
      updatedAt: new Date()
    };

    // Guardar perfil actualizado
    await this.upsertUserProfile(userId, updateData);
  }

  /**
   * Obtener la dirección de wallet de un usuario
   * @param userId - ID de usuario de Google
   * @returns Dirección de wallet o null
   */
  static async getWalletAddress(userId: string): Promise<{
    address: string | null, 
    network?: string, 
    type?: string
  } | null> {
    const user = await this.getUserProfile(userId);
    
    if (!user || !user.walletAddress) {
      return null;
    }

    return {
      address: user.walletAddress,
      network: user.walletNetwork,
      type: user.walletType
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