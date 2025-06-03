import { Request, Response } from 'express';
import ContactService from '../contacts/contactService';

/**
 * Añadir un contacto por dirección
 */
export async function addContactByAddressHandler(req: Request, res: Response) {
  const { userId, nickname, address } = req.body;

  // Validaciones básicas
  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }
  if (!nickname) {
    return res.status(400).json({ error: "Nickname is required" });
  }
  if (!address) {
    return res.status(400).json({ error: "Address is required" });
  }

  try {
    const contact = await ContactService.addContactByAddress(
      userId, 
      nickname, 
      address
    );

    return res.status(201).json({
      message: "Contact added successfully",
      contact
    });
  } catch (error) {
    console.error("Error adding contact by address:", error);
    
    // Manejar diferentes tipos de errores
    if (error instanceof Error) {
      switch (error.message) {
        case 'Nickname already exists for this user':
          return res.status(409).json({ error: error.message });
        case 'Invalid wallet address':
          return res.status(400).json({ error: error.message });
        default:
          return res.status(500).json({ 
            error: "Failed to add contact", 
            details: error.message 
          });
      }
    }

    return res.status(500).json({ 
      error: "Failed to add contact", 
      details: 'Unknown error' 
    });
  }
}

/**
 * Añadir un contacto por email
 */
export async function addContactByEmailHandler(req: Request, res: Response) {
  const { userId, nickname, email } = req.body;

  // Validaciones básicas
  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }
  if (!nickname) {
    return res.status(400).json({ error: "Nickname is required" });
  }
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const contact = await ContactService.addContactByEmail(
      userId, 
      nickname, 
      email
    );

    return res.status(201).json({
      message: "Contact added successfully",
      contact
    });
  } catch (error) {
    console.error("Error adding contact by email:", error);
    
    // Manejar diferentes tipos de errores
    if (error instanceof Error) {
      switch (error.message) {
        case 'Nickname already exists for this user':
          return res.status(409).json({ error: error.message });
        case 'Invalid email format':
          return res.status(400).json({ error: error.message });
        case 'No user found with this email':
          return res.status(404).json({ error: error.message });
        default:
          return res.status(500).json({ 
            error: "Failed to add contact", 
            details: error.message 
          });
      }
    }

    return res.status(500).json({ 
      error: "Failed to add contact", 
      details: 'Unknown error' 
    });
  }
}

/**
 * Obtener contactos de un usuario
 */
export async function getContactsHandler(req: Request, res: Response) {
  const { userId } = req.params;

  // Validaciones básicas
  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    const contacts = await ContactService.getContacts(userId);

    return res.status(200).json({
      contacts,
      count: contacts.length
    });
  } catch (error) {
    console.error("Error retrieving contacts:", error);
    return res.status(500).json({ 
      error: "Failed to retrieve contacts", 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

/**
 * Obtener un contacto por nickname
 */
export async function getContactByNicknameHandler(req: Request, res: Response) {
  const { userId, nickname } = req.params;

  // Validaciones básicas
  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }
  if (!nickname) {
    return res.status(400).json({ error: "Nickname is required" });
  }

  try {
    const contact = await ContactService.getContactByNickname(userId, nickname);

    if (!contact) {
      return res.status(404).json({ 
        error: "Contact not found" 
      });
    }

    return res.status(200).json(contact);
  } catch (error) {
    console.error("Error retrieving contact:", error);
    return res.status(500).json({ 
      error: "Failed to retrieve contact", 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

/**
 * Eliminar un contacto
 */
export async function deleteContactHandler(req: Request, res: Response) {
  const { userId, contactId } = req.params;

  // Validaciones básicas
  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }
  if (!contactId) {
    return res.status(400).json({ error: "Contact ID is required" });
  }

  try {
    await ContactService.deleteContact(contactId, userId);

    return res.status(200).json({ 
      message: "Contact deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting contact:", error);
    
    // Manejar diferentes tipos de errores
    if (error instanceof Error) {
      switch (error.message) {
        case 'Contact not found or unauthorized':
          return res.status(404).json({ error: error.message });
        default:
          return res.status(500).json({ 
            error: "Failed to delete contact", 
            details: error.message 
          });
      }
    }

    return res.status(500).json({ 
      error: "Failed to delete contact", 
      details: 'Unknown error' 
    });
  }
}

/**
 * Actualizar un contacto
 */
export async function updateContactHandler(req: Request, res: Response) {
  const { userId, contactId } = req.params;
  const { nickname, value } = req.body;

  // Validaciones básicas
  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }
  if (!contactId) {
    return res.status(400).json({ error: "Contact ID is required" });
  }

  // Al menos uno de los campos debe ser proporcionado
  if (!nickname && !value) {
    return res.status(400).json({ error: "At least nickname or value must be provided" });
  }

  try {
    const updates: { nickname?: string; value?: string } = {};
    
    if (nickname) {
      updates.nickname = nickname;
    }
    
    if (value) {
      updates.value = value;
    }

    const updatedContact = await ContactService.updateContact(contactId, userId, updates);

    return res.status(200).json({
      message: "Contact updated successfully",
      contact: updatedContact
    });
  } catch (error) {
    console.error("Error updating contact:", error);
    
    // Manejar diferentes tipos de errores
    if (error instanceof Error) {
      switch (error.message) {
        case 'Contact not found or unauthorized':
          return res.status(404).json({ error: error.message });
        case 'Nickname already exists for this user':
          return res.status(409).json({ error: error.message });
        case 'Invalid wallet address':
        case 'Invalid email format':
        case 'No user found with this email':
          return res.status(400).json({ error: error.message });
        default:
          return res.status(500).json({ 
            error: "Failed to update contact", 
            details: error.message 
          });
      }
    }

    return res.status(500).json({ 
      error: "Failed to update contact", 
      details: 'Unknown error' 
    });
  }
} 