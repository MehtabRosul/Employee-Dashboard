import { Injectable, inject } from '@angular/core';
import { CryptoService } from './crypto.service';

/**
 * Type-safe LocalStorage service with encryption support
 * Automatically encrypts data before storing and decrypts on retrieval
 */
@Injectable({
    providedIn: 'root'
})
export class StorageService {
    private crypto = inject(CryptoService);

    /**
     * Get item from localStorage with type safety and automatic decryption
     */
    async get<T>(key: string): Promise<T | null> {
        try {
            const item = localStorage.getItem(key);
            if (!item) return null;

            // Decrypt the data
            return await this.crypto.decrypt<T>(item);
        } catch (error) {
            console.error(`Error reading from localStorage (${key}):`, error);
            return null;
        }
    }

    /**
     * Set item in localStorage with automatic encryption
     */
    async set<T>(key: string, value: T): Promise<boolean> {
        try {
            // Encrypt the data
            const encrypted = await this.crypto.encrypt(value);
            localStorage.setItem(key, encrypted);
            return true;
        } catch (error) {
            console.error(`Error writing to localStorage (${key}):`, error);
            return false;
        }
    }

    /**
     * Remove item from localStorage
     */
    remove(key: string): void {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error(`Error removing from localStorage (${key}):`, error);
        }
    }

    /**
     * Clear all items from localStorage
     */
    clear(): void {
        try {
            localStorage.clear();
        } catch (error) {
            console.error('Error clearing localStorage:', error);
        }
    }

    /**
     * Check if key exists in localStorage
     */
    has(key: string): boolean {
        return localStorage.getItem(key) !== null;
    }

    /**
     * Get all keys from localStorage
     */
    keys(): string[] {
        return Object.keys(localStorage);
    }
}
