// @ts-ignore
import aesjs from 'aes-js';
import axios from 'axios';
import { Platform } from 'react-native';

// Helper to convert hex string to byte array
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

// Helper to convert byte array to hex string
function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    let part = bytes[i].toString(16);
    if (part.length < 2) {
      part = '0' + part;
    }
    hex += part;
  }
  return hex;
}

let solvedCookie: string | null = null;

export async function getBypassCookie(baseUrl: string): Promise<string | null> {
  if (solvedCookie) {
    return solvedCookie;
  }

  try {
    console.log('[Bypass Solver] Fetching challenge page from:', baseUrl);
    
    // We make a GET request to the homepage to trigger/solve the cookie challenge.
    // We use a clean axios instance to avoid infinite interceptor loops.
    const response = await axios.get(baseUrl, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      responseType: 'text',
      timeout: 10000,
    });

    const html = response.data;
    if (typeof html !== 'string') {
      console.log('[Bypass Solver] Response is not HTML, bypass might not be needed.');
      return null;
    }

    // Check if the response contains the Nginx testcookie slowAES script challenge
    if (!html.includes('slowAES.decrypt') && !html.includes('toNumbers')) {
      console.log('[Bypass Solver] Challenge script not found. Already bypassed or not enforced.');
      return null;
    }

    console.log('[Bypass Solver] Security challenge detected! Parsing parameters...');

    // Extract hex values inside toNumbers("...") 
    // The format is: var a=toNumbers("HEX"),b=toNumbers("HEX"),c=toNumbers("HEX")
    const regex = /toNumbers\("([a-fA-F0-9]+)"\)/g;
    const hexStrings: string[] = [];
    let match;
    while ((match = regex.exec(html)) !== null) {
      hexStrings.push(match[1]);
    }

    if (hexStrings.length < 3) {
      console.warn('[Bypass Solver] Failed to parse 3 hex strings from challenge. Found:', hexStrings.length);
      return null;
    }

    // slowAES.decrypt(c, 2, a, b)
    // Parameter 1: c (Ciphertext) -> 3rd match (index 2)
    // Parameter 3: a (Key) -> 1st match (index 0)
    // Parameter 4: b (IV) -> 2nd match (index 1)
    const keyHex = hexStrings[0];
    const ivHex = hexStrings[1];
    const cipherHex = hexStrings[2];

    console.log('[Bypass Solver] Decrypting challenge:');
    console.log('  Key (a):', keyHex);
    console.log('  IV (b):', ivHex);
    console.log('  Cipher (c):', cipherHex);

    const key = hexToBytes(keyHex);
    const iv = hexToBytes(ivHex);
    const cipher = hexToBytes(cipherHex);

    const aesCbc = new aesjs.ModeOfOperation.cbc(key, iv);
    const decryptedBytes = aesCbc.decrypt(cipher);
    const decryptedCookie = bytesToHex(decryptedBytes);

    console.log('[Bypass Solver] Decrypted cookie value:', decryptedCookie);
    solvedCookie = decryptedCookie;

    // In web mode, write the cookie to document.cookie so browser attaches it
    if (Platform.OS === 'web') {
      document.cookie = `__test=${decryptedCookie}; expires=Thu, 31-Dec-37 23:55:55 GMT; path=/`;
      console.log('[Bypass Solver] Saved __test cookie to document.cookie');
    }

    return decryptedCookie;
  } catch (error: any) {
    console.error('[Bypass Solver] Error solving challenge:', error.message || error);
    return null;
  }
}
