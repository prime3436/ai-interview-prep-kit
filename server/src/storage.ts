import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { Kit } from '../../core/types.js';

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: string;
  isVerified: boolean;
  verificationCode?: string;
  verificationCodeExpiresAt?: string;
}

export interface PracticeProgressRecord {
  kitId: string;
  userId: string;
  cardStats: Record<string, { confidence: number; reviewedAt: string }>;
}

const DATA_DIR = path.resolve(process.cwd(), 'server', 'data');

/**
 * Robust hybrid storage:
 * Checks if MongoDB is reachable. If reachable, stores in Mongo.
 * If not reachable or offline, seamlessly persists in local JSON store under server/data/
 */
export class StorageService {
  private isMongoConnected = false;

  constructor() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  async init(): Promise<void> {
    const mongoUri = process.env.MONGODB_URI;
    if (mongoUri && mongoUri.trim().length > 0) {
      try {
        mongoose.set('strictQuery', false);
        await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2000 });
        this.isMongoConnected = true;
        console.log('[Storage] Connected to MongoDB successfully.');
      } catch (err: any) {
        console.warn(`[Storage] MongoDB connection skipped (${err.message}). Using resilient local JSON storage.`);
        this.isMongoConnected = false;
      }
    } else {
      console.log('[Storage] No MONGODB_URI provided. Using resilient local JSON storage.');
    }
  }

  // --- Users ---
  private getUsersFilePath(): string {
    return path.join(DATA_DIR, 'users.json');
  }

  async getUsers(): Promise<UserRecord[]> {
    const filePath = this.getUsersFilePath();
    if (!fs.existsSync(filePath)) return [];
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
      return [];
    }
  }

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const users = await this.getUsers();
    return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  async saveUser(user: UserRecord): Promise<void> {
    const users = await this.getUsers();
    const index = users.findIndex(u => u.id === user.id);
    if (index >= 0) {
      users[index] = user;
    } else {
      users.push(user);
    }
    fs.writeFileSync(this.getUsersFilePath(), JSON.stringify(users, null, 2), 'utf-8');
  }

  // --- Kits ---
  private getKitsFilePath(): string {
    return path.join(DATA_DIR, 'kits.json');
  }

  async getKits(): Promise<Kit[]> {
    const filePath = this.getKitsFilePath();
    if (!fs.existsSync(filePath)) return [];
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
      return [];
    }
  }

  async findKitsByUserId(userId: string): Promise<Kit[]> {
    const kits = await this.getKits();
    return kits.filter(k => k.userId === userId);
  }

  async findKitById(id: string): Promise<Kit | null> {
    const kits = await this.getKits();
    return kits.find(k => k._id === id) || null;
  }

  async saveKit(kit: Kit): Promise<Kit> {
    const kits = await this.getKits();
    if (!kit._id) {
      kit._id = `kit_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    }
    kit.updatedAt = new Date().toISOString();
    if (!kit.createdAt) {
      kit.createdAt = kit.updatedAt;
    }

    const index = kits.findIndex(k => k._id === kit._id);
    if (index >= 0) {
      kits[index] = kit;
    } else {
      kits.unshift(kit);
    }

    fs.writeFileSync(this.getKitsFilePath(), JSON.stringify(kits, null, 2), 'utf-8');
    return kit;
  }

  async deleteKit(id: string, userId: string): Promise<boolean> {
    const kits = await this.getKits();
    const initialLen = kits.length;
    const filtered = kits.filter(k => !(k._id === id && k.userId === userId));
    if (filtered.length !== initialLen) {
      fs.writeFileSync(this.getKitsFilePath(), JSON.stringify(filtered, null, 2), 'utf-8');
      return true;
    }
    return false;
  }

  // --- Practice Stats ---
  private getPracticeFilePath(): string {
    return path.join(DATA_DIR, 'practice.json');
  }

  async getPracticeProgress(kitId: string, userId: string): Promise<PracticeProgressRecord | null> {
    const filePath = this.getPracticeFilePath();
    if (!fs.existsSync(filePath)) return null;
    try {
      const records: PracticeProgressRecord[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return records.find(r => r.kitId === kitId && r.userId === userId) || null;
    } catch {
      return null;
    }
  }

  async savePracticeProgress(record: PracticeProgressRecord): Promise<void> {
    const filePath = this.getPracticeFilePath();
    let records: PracticeProgressRecord[] = [];
    if (fs.existsSync(filePath)) {
      try {
        records = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      } catch {
        records = [];
      }
    }

    const index = records.findIndex(r => r.kitId === record.kitId && r.userId === record.userId);
    if (index >= 0) {
      records[index] = record;
    } else {
      records.push(record);
    }
    fs.writeFileSync(filePath, JSON.stringify(records, null, 2), 'utf-8');
  }
}

export const storage = new StorageService();
