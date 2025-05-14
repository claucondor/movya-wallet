import FirestoreService from '../firestore/firestoreService';
import UserService from '../users/userService';

// Definir tipos de contacto
export interface Contact {
  id?: string;  // ID generado por Firestore
  ownerId: string;  // ID del usuario que crea el contacto
  nickname: string;
  type: 'address' | 'email';
  value: string;  // Dirección o email
  targetUserId?: string;  // ID del usuario objetivo (si es un email de usuario existente)
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Servicio de gestión de contactos
 */
class ContactService {
  private static CONTACTS_COLLECTION = 'contacts';

  /**
   * Validar si un nickname ya existe para un usuario
   * @param ownerId - ID del usuario propietario
   * @param nickname - Nickname a verificar
   * @returns Booleano indicando si el nickname ya existe
   */
  private static async nicknameExists(ownerId: string, nickname: string): Promise<boolean> {
    const existingContacts = await FirestoreService.queryDocuments<Contact>(
      this.CONTACTS_COLLECTION,
      (ref) => ref.where('ownerId', '==', ownerId).where('nickname', '==', nickname)
    );
    return existingContacts.length > 0;
  }

  /**
   * Añadir un contacto por dirección
   * @param ownerId - ID del usuario que añade el contacto
   * @param nickname - Nickname del contacto
   * @param address - Dirección de wallet
   * @returns Contacto creado
   */
  static async addContactByAddress(
    ownerId: string, 
    nickname: string, 
    address: string
  ): Promise<Contact> {
    // Validar nickname único
    if (await this.nicknameExists(ownerId, nickname)) {
      throw new Error('Nickname already exists for this user');
    }

    // Validar dirección (básica validación EVM)
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new Error('Invalid wallet address');
    }

    const newContact: Contact = {
      ownerId,
      nickname,
      type: 'address',
      value: address.toLowerCase(), // Normalizar dirección
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Usar addDocument para que Firestore genere el ID
    const contactId = await FirestoreService.addDocument(
      this.CONTACTS_COLLECTION, 
      newContact
    );

    return { ...newContact, id: contactId };
  }

  /**
   * Añadir un contacto por email
   * @param ownerId - ID del usuario que añade el contacto
   * @param nickname - Nickname del contacto
   * @param email - Email del contacto
   * @returns Contacto creado
   */
  static async addContactByEmail(
    ownerId: string, 
    nickname: string, 
    email: string
  ): Promise<Contact> {
    // Validar nickname único
    if (await this.nicknameExists(ownerId, nickname)) {
      throw new Error('Nickname already exists for this user');
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }

    // Buscar usuario por email
    const targetUser = await UserService.getUserByEmail(email);
    if (!targetUser) {
      throw new Error('No user found with this email');
    }

    const newContact: Contact = {
      ownerId,
      nickname,
      type: 'email',
      value: email.toLowerCase(), // Normalizar email
      targetUserId: targetUser.googleUserId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Usar addDocument para que Firestore genere el ID
    const contactId = await FirestoreService.addDocument(
      this.CONTACTS_COLLECTION, 
      newContact
    );

    return { ...newContact, id: contactId };
  }

  /**
   * Obtener contactos de un usuario
   * @param ownerId - ID del usuario
   * @returns Lista de contactos
   */
  static async getContacts(ownerId: string): Promise<Contact[]> {
    return FirestoreService.queryDocuments<Contact>(
      this.CONTACTS_COLLECTION,
      (ref) => ref.where('ownerId', '==', ownerId)
    );
  }

  /**
   * Obtener un contacto por nickname
   * @param ownerId - ID del usuario
   * @param nickname - Nickname del contacto
   * @returns Contacto o null
   */
  static async getContactByNickname(
    ownerId: string, 
    nickname: string
  ): Promise<Contact | null> {
    const contacts = await FirestoreService.queryDocuments<Contact>(
      this.CONTACTS_COLLECTION,
      (ref) => ref
        .where('ownerId', '==', ownerId)
        .where('nickname', '==', nickname)
    );

    return contacts[0] || null;
  }

  /**
   * Eliminar un contacto
   * @param contactId - ID del contacto a eliminar
   * @param ownerId - ID del usuario propietario
   */
  static async deleteContact(
    contactId: string, 
    ownerId: string
  ): Promise<void> {
    // Primero verificar que el contacto pertenece al usuario
    const contact = await FirestoreService.getDocument<Contact>(
      this.CONTACTS_COLLECTION, 
      contactId
    );

    if (!contact || contact.ownerId !== ownerId) {
      throw new Error('Contact not found or unauthorized');
    }

    await FirestoreService.deleteDocument(
      this.CONTACTS_COLLECTION, 
      contactId
    );
  }
}

export default ContactService; 