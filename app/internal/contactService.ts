// File: contactService.ts
// Este archivo no es una ruta, es un servicio
import Constants from 'expo-constants';
import { storage } from '../core/storage';

// Add a default export to suppress Expo Router "missing default export" warning
export default function ContactServiceExport() {
  return null; // This will never be rendered
}

const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl || 'http://localhost:8080';

// Define los tipos según el OpenAPI
export interface Contact {
  id?: string;
  ownerId: string;
  nickname: string;
  type: 'address' | 'email';
  value: string;
  targetUserId?: string;
  createdAt?: string;
}

/**
 * Obtener todos los contactos del usuario
 * @param userId ID del usuario
 * @returns Lista de contactos
 */
export async function getContacts(userId: string): Promise<{
  success: boolean;
  contacts: Contact[];
  count: number;
  message?: string;
}> {
  // Asegurarse de que userId sea una cadena válida y no vacía antes de usarla en la URL
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    console.error('[ContactService] getContacts: userId is invalid or missing.');
    return {
      success: false,
      contacts: [],
      count: 0,
      message: 'User ID is invalid or missing for frontend request.'
    };
  }

  try {
    // Obtener el token si existe
    const token = storage.getString('userToken');
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Añadir el token si existe
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Modificar la URL para incluir el userId como parámetro de ruta
    const response = await fetch(`${BACKEND_URL}/contacts/${userId}`, {
      method: 'GET',
      headers,
    });
    
    const data = await response.json();
    
    if (response.ok) {
      return {
        success: true,
        contacts: data.contacts,
        count: data.count
      };
    } else {
      return {
        success: false,
        contacts: [],
        count: 0,
        message: data.error || 'Error al obtener contactos'
      };
    }
  } catch (error: any) {
    console.error('[ContactService] Error obteniendo contactos:', error);
    return {
      success: false,
      contacts: [],
      count: 0,
      message: `Error de conexión: ${error.message}`
    };
  }
}

/**
 * Obtener un contacto por nickname
 * @param userId ID del usuario
 * @param nickname Nickname del contacto
 * @returns Contacto si existe
 */
export async function getContactByNickname(userId: string, nickname: string): Promise<{
  success: boolean;
  contact?: Contact;
  message?: string;
}> {
  try {
    // Obtener el token si existe
    const token = storage.getString('userToken');
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Añadir el token si existe
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${BACKEND_URL}/contacts/nickname/${encodeURIComponent(nickname)}`, {
      method: 'GET',
      headers,
    });
    
    if (response.ok) {
      const contact = await response.json();
      return {
        success: true,
        contact
      };
    } else {
      const data = await response.json();
      return {
        success: false,
        message: data.error || 'Contacto no encontrado'
      };
    }
  } catch (error: any) {
    console.error('[ContactService] Error obteniendo contacto:', error);
    return {
      success: false,
      message: `Error de conexión: ${error.message}`
    };
  }
}

/**
 * Añadir un contacto por dirección
 * @param userId ID del usuario
 * @param nickname Nickname único del contacto
 * @param address Dirección de wallet
 * @returns Resultado de la operación
 */
export async function addContactByAddress(userId: string, nickname: string, address: string): Promise<{
  success: boolean;
  contact?: Contact;
  message: string;
}> {
  try {
    // Obtener el token si existe
    const token = storage.getString('userToken');
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Añadir el token si existe
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${BACKEND_URL}/contacts/address`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        userId,
        nickname,
        address
      }),
    });
    
    const data = await response.json();
    
    if (response.status === 201) {
      return {
        success: true,
        contact: data.contact,
        message: 'Contacto añadido correctamente'
      };
    } else {
      return {
        success: false,
        message: data.error || 'Error al añadir contacto'
      };
    }
  } catch (error: any) {
    console.error('[ContactService] Error añadiendo contacto por dirección:', error);
    return {
      success: false,
      message: `Error de conexión: ${error.message}`
    };
  }
}

/**
 * Añadir un contacto por email
 * @param userId ID del usuario
 * @param nickname Nickname único del contacto
 * @param email Email del contacto
 * @returns Resultado de la operación
 */
export async function addContactByEmail(userId: string, nickname: string, email: string): Promise<{
  success: boolean;
  contact?: Contact;
  message: string;
}> {
  try {
    // Obtener el token si existe
    const token = storage.getString('userToken');
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Añadir el token si existe
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${BACKEND_URL}/contacts/email`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        userId,
        nickname,
        email
      }),
    });
    
    const data = await response.json();
    
    if (response.status === 201) {
      return {
        success: true,
        contact: data.contact,
        message: 'Contacto añadido correctamente'
      };
    } else {
      return {
        success: false,
        message: data.error || 'Error al añadir contacto'
      };
    }
  } catch (error: any) {
    console.error('[ContactService] Error añadiendo contacto por email:', error);
    return {
      success: false,
      message: `Error de conexión: ${error.message}`
    };
  }
}

/**
 * Eliminar un contacto
 * @param userId ID del usuario
 * @param contactId ID del contacto a eliminar
 * @returns Resultado de la operación
 */
export async function deleteContact(userId: string, contactId: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    // Obtener el token si existe
    const token = storage.getString('userToken');
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Añadir el token si existe
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${BACKEND_URL}/contacts/${encodeURIComponent(contactId)}`, {
      method: 'DELETE',
      headers,
    });
    
    if (response.ok) {
      return {
        success: true,
        message: 'Contacto eliminado correctamente'
      };
    } else {
      const data = await response.json();
      return {
        success: false,
        message: data.error || 'Error al eliminar contacto'
      };
    }
  } catch (error: any) {
    console.error('[ContactService] Error eliminando contacto:', error);
    return {
      success: false,
      message: `Error de conexión: ${error.message}`
    };
  }
}

/**
 * Actualizar un contacto
 * @param userId ID del usuario
 * @param contactId ID del contacto a actualizar
 * @param nickname Nuevo nickname (opcional)
 * @param value Nuevo valor (email o dirección) (opcional)
 * @returns Resultado de la operación
 */
export async function updateContact(userId: string, contactId: string, nickname?: string, value?: string): Promise<{
  success: boolean;
  contact?: Contact;
  message: string;
}> {
  try {
    // Obtener el token si existe
    const token = storage.getString('userToken');
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Añadir el token si existe
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Construir el body solo con los campos que se van a actualizar
    const updateBody: { nickname?: string; value?: string } = {};
    if (nickname !== undefined) {
      updateBody.nickname = nickname;
    }
    if (value !== undefined) {
      updateBody.value = value;
    }

    const response = await fetch(`${BACKEND_URL}/contacts/${encodeURIComponent(contactId)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updateBody),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      return {
        success: true,
        contact: data.contact,
        message: 'Contacto actualizado correctamente'
      };
    } else {
      return {
        success: false,
        message: data.error || 'Error al actualizar contacto'
      };
    }
  } catch (error: any) {
    console.error('[ContactService] Error actualizando contacto:', error);
    return {
      success: false,
      message: `Error de conexión: ${error.message}`
    };
  }
} 