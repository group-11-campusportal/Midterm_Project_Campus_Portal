import * as SecureStore from 'expo-secure-store'

// The JWT lives in the device keychain/keystore, never in AsyncStorage (S49).
const TOKEN_KEY = 'campus-portal.token'

export async function loadToken() {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY)
  } catch {
    // A keychain that cannot be read is treated as "logged out".
    return null
  }
}

export function saveToken(token) {
  return SecureStore.setItemAsync(TOKEN_KEY, token)
}

export async function clearToken() {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY)
  } catch {
    // Nothing stored is the same outcome as a successful delete.
  }
}
