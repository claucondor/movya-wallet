# ⚠️ SECURITY INCIDENT - API KEY EXPOSED

## What Happened

On November 13, 2025, your Hiro API key was **accidentally committed and pushed** to a public GitHub repository in commit `4c26a5b`.

**Exposed API Key:** `a76a78e142a2feed6d2e054a769e66dd`

## Status: ✅ RESOLVED

- ✅ Commit reverted from repository
- ✅ API key removed from source code
- ✅ Environment variable system implemented
- ⚠️ **YOU MUST** regenerate your API key

## What You Need to Do

### 1. Regenerate Your Hiro API Key (CRITICAL)

Your API key was exposed publicly, so you **MUST** regenerate it immediately:

1. Go to https://platform.hiro.so/
2. Login to your account
3. Navigate to API Keys
4. **Revoke** the old key: `a76a78e142a2feed6d2e054a769e66dd`
5. **Generate** a new API key
6. Save the new key securely

### 2. Configure Environment Variable

Once you have your new API key:

1. Open the `.env` file in the project root
2. Replace `YOUR_NEW_API_KEY_HERE` with your new key:
   ```bash
   EXPO_PUBLIC_HIRO_API_KEY=your_new_api_key_here
   ```
3. Save the file
4. **NEVER** commit the `.env` file to git

### 3. Verify Security

Check that `.env` is in `.gitignore`:
```bash
cat .gitignore | grep "^\.env$"
```

If not listed, add it:
```bash
echo ".env" >> .gitignore
```

## How We Fixed It

1. **Removed hardcoded key** from `app/core/constants/networks.ts`
2. **Added environment variable support** via `getHiroApiKey()`
3. **Updated balanceService** to use environment variable
4. **Created `.env.example`** as template
5. **Added `.env` to `.gitignore`** to prevent future exposure

## Files Changed

- ✅ `app/core/constants/networks.ts` - Added `getHiroApiKey()` helper
- ✅ `app/core/services/balanceService.ts` - Use environment variable
- ✅ `.env.example` - Template file (safe to commit)
- ✅ `.env` - Your actual keys (NEVER commit)
- ✅ `.gitignore` - Added `.env`

## Prevention

Moving forward:
- ✅ All API keys use environment variables
- ✅ `.env` file is gitignored
- ✅ Only `.env.example` templates are committed
- ✅ Code reviews check for hardcoded secrets

## Questions?

If you have any concerns or questions about this incident, please let me know.

---

**Created:** November 13, 2025
**Status:** Incident resolved, action required from user
**Severity:** High (API key exposure)
