/** Hash a PIN string using SHA-256 (falls back to btoa) */
export async function hashPin(pin: string): Promise<string> {
  try {
    const data = new TextEncoder().encode(pin);
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return btoa(pin);
  }
}

export async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  const hash = await hashPin(pin);
  return hash === storedHash;
}
