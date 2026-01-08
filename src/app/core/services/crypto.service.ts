import { Injectable } from '@angular/core';

/**
 * Professional-grade encryption service using Web Crypto API
 * Implements AES-GCM (Galois/Counter Mode) for authenticated encryption
 * 
 * Features:
 * - 256-bit AES encryption
 * - Authenticated encryption (integrity + confidentiality)
 * - Random IV generation for each encryption
 * - PBKDF2 key derivation with 100,000 iterations
 * - Salt-based key uniqueness per browser instance
 */
@Injectable({
    providedIn: 'root'
})
export class CryptoService {
    private readonly ALGORITHM = 'AES-GCM';
    private readonly KEY_LENGTH = 256;
    private readonly IV_LENGTH = 12; // 96 bits recommended for GCM
    private readonly SALT_LENGTH = 16;
    private readonly ITERATIONS = 100000;
    private readonly SALT_KEY = 'employee-dashboard-crypto-salt';

    private cryptoKey: CryptoKey | null = null;
    private initPromise: Promise<void> | null = null;

    constructor() {
        this.initPromise = this.initialize();
    }

    /**
     * Initialize the crypto service - generates or retrieves encryption key
     */
    private async initialize(): Promise<void> {
        try {
            const salt = this.getOrCreateSalt();
            this.cryptoKey = await this.deriveKey(salt);
        } catch (error) {
            console.error('CryptoService: Failed to initialize encryption', error);
            // Fallback: service will work without encryption
            this.cryptoKey = null;
        }
    }

    /**
     * Get or create a unique salt for this browser instance
     */
    private getOrCreateSalt(): Uint8Array {
        try {
            const storedSalt = localStorage.getItem(this.SALT_KEY);
            if (storedSalt) {
                return this.base64ToBytes(storedSalt);
            }

            // Generate new random salt
            const salt = crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));
            localStorage.setItem(this.SALT_KEY, this.bytesToBase64(salt));
            return salt;
        } catch {
            // If localStorage fails, generate temporary salt
            return crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));
        }
    }

    /**
     * Derive a cryptographic key using PBKDF2
     * Uses a combination of fixed application secret + browser-specific salt
     */
    private async deriveKey(salt: Uint8Array): Promise<CryptoKey> {
        // Application-level secret combined with browser-specific salt
        const password = 'employee-dashboard-v1-' + navigator.userAgent;
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            'PBKDF2',
            false,
            ['deriveKey']
        );

        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt as any,
                iterations: this.ITERATIONS,
                hash: 'SHA-256'
            },
            keyMaterial,
            {
                name: this.ALGORITHM,
                length: this.KEY_LENGTH
            },
            false,
            ['encrypt', 'decrypt']
        );
    }

    /**
     * Encrypt data using AES-GCM
     * @param plaintext - The data to encrypt (will be JSON stringified if object)
     * @returns Base64 encoded encrypted string with IV prepended
     */
    async encrypt(plaintext: unknown): Promise<string> {
        await this.initPromise;

        if (!this.cryptoKey || !this.isWebCryptoSupported()) {
            // Fallback: return base64 encoded JSON (still protects from casual viewing)
            return 'plain:' + btoa(unescape(encodeURIComponent(JSON.stringify(plaintext))));
        }

        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(JSON.stringify(plaintext));

            // Generate random IV for each encryption
            const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));

            const encrypted = await crypto.subtle.encrypt(
                {
                    name: this.ALGORITHM,
                    iv: iv
                },
                this.cryptoKey,
                data
            );

            // Prepend IV to encrypted data
            const combined = new Uint8Array(iv.length + encrypted.byteLength);
            combined.set(iv);
            combined.set(new Uint8Array(encrypted), iv.length);

            return 'enc:' + this.bytesToBase64(combined);
        } catch (error) {
            console.error('CryptoService: Encryption failed', error);
            // Fallback to base64 encoding
            return 'plain:' + btoa(unescape(encodeURIComponent(JSON.stringify(plaintext))));
        }
    }

    /**
     * Decrypt data using AES-GCM
     * @param ciphertext - The encrypted string to decrypt
     * @returns Decrypted and parsed data
     */
    async decrypt<T>(ciphertext: string): Promise<T | null> {
        await this.initPromise;

        if (!ciphertext) {
            return null;
        }

        // Handle plain base64 encoded data (fallback or legacy)
        if (ciphertext.startsWith('plain:')) {
            try {
                return JSON.parse(decodeURIComponent(escape(atob(ciphertext.slice(6)))));
            } catch {
                return null;
            }
        }

        // Handle legacy unencrypted data (for migration)
        if (!ciphertext.startsWith('enc:')) {
            try {
                return JSON.parse(ciphertext);
            } catch {
                return null;
            }
        }

        if (!this.cryptoKey || !this.isWebCryptoSupported()) {
            return null;
        }

        try {
            const combined = this.base64ToBytes(ciphertext.slice(4));
            const iv = combined.slice(0, this.IV_LENGTH);
            const encrypted = combined.slice(this.IV_LENGTH);

            const decrypted = await crypto.subtle.decrypt(
                {
                    name: this.ALGORITHM,
                    iv: iv
                },
                this.cryptoKey,
                encrypted
            );

            const decoder = new TextDecoder();
            return JSON.parse(decoder.decode(decrypted));
        } catch (error) {
            console.error('CryptoService: Decryption failed', error);
            return null;
        }
    }

    /**
     * Check if Web Crypto API is supported
     */
    private isWebCryptoSupported(): boolean {
        return !!(
            typeof crypto !== 'undefined' &&
            crypto.subtle &&
            typeof crypto.subtle.encrypt === 'function'
        );
    }

    /**
     * Convert Uint8Array to Base64 string
     */
    private bytesToBase64(bytes: Uint8Array): string {
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    /**
     * Convert Base64 string to Uint8Array
     */
    private base64ToBytes(base64: string): Uint8Array {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }

    /**
     * Generate a cryptographically secure random ID
     * Uses crypto.randomUUID() if available, falls back to manual generation
     */
    generateSecureId(): string {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }

        // Fallback for older browsers
        const bytes = crypto.getRandomValues(new Uint8Array(16));
        const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
}
