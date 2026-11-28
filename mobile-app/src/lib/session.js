import * as SecureStore from 'expo-secure-store'

// The JWT lives in the device keychain/keystore, never in AsyncStorage (S49).
const TOKEN_KEY = 'campus-portal.token'
// The last profile from the server, so an offline start still knows the user's role and name.
const USER_KEY = 'campus-portal.user'

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

export async function loadUser() {
  try {
    const text = await SecureStore.getItemAsync(USER_KEY)
    return text ? JSON.parse(text) : null
  } catch {
    return null
  }
}

export async function saveUser(user) {
  try {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user))
  } catch {
    // Only a cache: the app still works, it just cannot start offline.
  }
}

export async function clearToken() {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY)
    await SecureStore.deleteItemAsync(USER_KEY)
  } catch {
    // Nothing stored is the same outcome as a successful delete.
  }
}
