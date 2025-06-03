# Movya Wallet Backend API Documentation

## User Lookup Endpoints

### Check Wallet Address

**Endpoint:** `GET /api/users/check-address/:address`

**Description:** Check if a wallet address belongs to an app user. This endpoint is public and doesn't require authentication.

**Parameters:**
- `address` (path parameter): Ethereum wallet address to check (must be a valid 0x format address)

**Response:**
```json
{
  "success": true,
  "data": {
    "isAppUser": true,
    "userInfo": {
      "nickname": "John D",
      "email": "john@example.com",
      "userId": "google_user_123"
    }
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Invalid wallet address format"
}
```

**Use Cases:**
- Transaction detection service to identify if incoming transactions are from app users
- Contact suggestions when adding new contacts
- Enhanced transaction history with user context

---

### Get User by Address (Detailed)

**Endpoint:** `GET /api/users/by-address/:address`

**Description:** Get detailed user information by wallet address. Requires authentication.

**Parameters:**
- `address` (path parameter): Ethereum wallet address
- `Authorization` (header): Bearer token for authentication

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "google_user_123",
    "email": "john@example.com",
    "name": "John Doe",
    "picture": "https://example.com/avatar.jpg",
    "walletAddress": "0x1234567890123456789012345678901234567890",
    "walletNetwork": "avalanche",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**
```json
{
  "success": false,
  "message": "User not found with this wallet address"
}
```

```json
{
  "success": false,
  "message": "Invalid wallet address format"
}
```

**Use Cases:**
- Admin operations to get user details
- Support operations to identify users
- User profile management

---

## Integration Examples

### Frontend Integration

```typescript
import UserLookupService from '../services/userLookupService';

// Check if address belongs to app user
const lookupService = UserLookupService.getInstance();
const result = await lookupService.checkWalletAddress('0x1234...');

if (result.isAppUser) {
  console.log('Transaction from app user:', result.userInfo?.nickname);
}

// Get detailed user info (requires auth)
const userDetails = await lookupService.getUserByAddress('0x1234...', authToken);
```

### Transaction Detection Integration

The transaction detection service automatically uses these endpoints to:

1. Identify when incoming transactions are from other app users
2. Display user nicknames instead of wallet addresses
3. Add special indicators for app-to-app transactions
4. Enable enhanced transaction history with user context

---

## Security Considerations

1. **Public Check Endpoint**: The check address endpoint is intentionally public to enable transaction detection without requiring authentication.

2. **Limited Information**: The public endpoint only returns basic user information (nickname, email, userId) to protect privacy.

3. **Detailed Endpoint Protection**: The detailed user information endpoint requires authentication to prevent unauthorized access to sensitive user data.

4. **Address Validation**: Both endpoints validate wallet address format to prevent invalid requests.

---

## Error Handling

All endpoints return consistent error responses with:
- `success: false`
- `message`: Human-readable error description
- `error`: Technical error details (in development mode)

Common error scenarios:
- Invalid wallet address format
- User not found
- Network/database errors
- Authentication failures (for protected endpoints) 