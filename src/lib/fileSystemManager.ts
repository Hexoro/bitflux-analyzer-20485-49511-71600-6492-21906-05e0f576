/**
 * File System Manager - Manages multiple binary files
 * Includes temp file management and cleanup
 */

import { FileState } from './fileState';

export interface BinaryFile {
  id: string;
  name: string;
  created: Date;
  modified: Date;
  type: 'binary' | 'text';
  state: FileState;
  group?: string; // Optional grouping
  isTemp?: boolean; // Temporary file flag
}

const FILES_STORAGE_KEY = 'bitwise_files';
const GROUPS_STORAGE_KEY = 'bitwise_groups';
const ACTIVE_FILE_KEY = 'bitwise_active_file';
const TEMP_FILE_MAX_AGE = 60 * 60 * 1000; // 1 hour
const TEMP_FILE_MAX_COUNT = 10;

export class FileSystemManager {
  private files: Map<string, BinaryFile> = new Map();
  private groups: Set<string> = new Set();
  private activeFileId: string | null = null;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
    // Only create default file if no files were loaded
    if (this.files.size === 0) {
      this.createFile('untitled.txt', '', 'binary');
    }
    // Auto-cleanup temp files on startup
    this.cleanupTempFiles();
  }

  // Load from localStorage
  private loadFromStorage(): void {
    try {
      const filesData = localStorage.getItem(FILES_STORAGE_KEY);
      if (filesData) {
        const parsed = JSON.parse(filesData);
        parsed.forEach((fileData: any) => {
          const state = new FileState(fileData.bits || '');
          const file: BinaryFile = {
            id: fileData.id,
            name: fileData.name,
            created: new Date(fileData.created),
            modified: new Date(fileData.modified),
            type: fileData.type,
            state,
            group: fileData.group,
            isTemp: fileData.isTemp || false,
          };
          this.files.set(file.id, file);
        });
      }

      const groupsData = localStorage.getItem(GROUPS_STORAGE_KEY);
      if (groupsData) {
        const parsed = JSON.parse(groupsData);
        parsed.forEach((group: string) => this.groups.add(group));
      }

      const activeFileId = localStorage.getItem(ACTIVE_FILE_KEY);
      if (activeFileId && this.files.has(activeFileId)) {
        this.activeFileId = activeFileId;
      } else if (this.files.size > 0) {
        this.activeFileId = this.getFiles()[0].id;
      }
    } catch (error) {
      console.error('Failed to load files from storage:', error);
    }
  }

  // Save to localStorage
  private saveToStorage(): void {
    try {
      const filesData = Array.from(this.files.values()).map(file => ({
        id: file.id,
        name: file.name,
        created: file.created,
        modified: file.modified,
        type: file.type,
        group: file.group,
        isTemp: file.isTemp,
        bits: file.state.model.getBits(),
      }));
      localStorage.setItem(FILES_STORAGE_KEY, JSON.stringify(filesData));

      const groupsData = Array.from(this.groups);
      localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(groupsData));

      if (this.activeFileId) {
        localStorage.setItem(ACTIVE_FILE_KEY, this.activeFileId);
      }
    } catch (error) {
      console.error('Failed to save files to storage:', error);
    }
  }

  // Create a new file
  createFile(name: string, bits: string = '', type: 'binary' | 'text' = 'binary'): BinaryFile {
    const id = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const state = new FileState(bits);
    const isTemp = name.endsWith('.tmp') || name.startsWith('player_') || name.startsWith('result_');
    
    const file: BinaryFile = {
      id,
      name,
      created: new Date(),
      modified: new Date(),
      type,
      state,
      isTemp,
    };
    
    this.files.set(id, file);
    this.activeFileId = id;
    this.saveToStorage();
    this.notifyListeners();
    return file;
  }

  // Get all files
  getFiles(): BinaryFile[] {
    return Array.from(this.files.values()).sort((a, b) => 
      a.created.getTime() - b.created.getTime()
    );
  }

  // Get non-temp files only
  getPermanentFiles(): BinaryFile[] {
    return this.getFiles().filter(f => !f.isTemp);
  }

  // Get temp files only
  getTempFiles(): BinaryFile[] {
    return this.getFiles().filter(f => f.isTemp);
  }

  // Get active file
  getActiveFile(): BinaryFile | null {
    if (!this.activeFileId) return null;
    return this.files.get(this.activeFileId) || null;
  }

  // Set active file
  setActiveFile(id: string): void {
    if (this.files.has(id)) {
      this.activeFileId = id;
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  // Update file content
  updateFile(id: string, bits: string): void {
    const file = this.files.get(id);
    if (file) {
      file.state.model.loadBits(bits);
      file.modified = new Date();
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  // Rename file
  renameFile(id: string, newName: string): void {
    const file = this.files.get(id);
    if (file) {
      file.name = newName;
      file.modified = new Date();
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  // Delete file
  deleteFile(id: string): void {
    this.files.delete(id);
    
    // If deleted file was active, switch to another file
    if (this.activeFileId === id) {
      const files = this.getFiles();
      this.activeFileId = files.length > 0 ? files[0].id : null;
    }
    
    this.saveToStorage();
    this.notifyListeners();
  }

  // Cleanup old temp files
  cleanupTempFiles(): { deleted: number; remaining: number } {
    const now = Date.now();
    const tempFiles = this.getTempFiles();
    let deletedCount = 0;

    // Delete files older than max age
    tempFiles.forEach(file => {
      const age = now - file.created.getTime();
      if (age > TEMP_FILE_MAX_AGE) {
        this.files.delete(file.id);
        deletedCount++;
      }
    });

    // If still too many, delete oldest ones
    const remainingTemp = this.getTempFiles();
    if (remainingTemp.length > TEMP_FILE_MAX_COUNT) {
      const toDelete = remainingTemp
        .sort((a, b) => a.created.getTime() - b.created.getTime())
        .slice(0, remainingTemp.length - TEMP_FILE_MAX_COUNT);
      
      toDelete.forEach(file => {
        this.files.delete(file.id);
        deletedCount++;
      });
    }

    if (deletedCount > 0) {
      // Update active file if needed
      if (this.activeFileId && !this.files.has(this.activeFileId)) {
        const files = this.getFiles();
        this.activeFileId = files.length > 0 ? files[0].id : null;
      }
      this.saveToStorage();
      this.notifyListeners();
    }

    return {
      deleted: deletedCount,
      remaining: this.getTempFiles().length,
    };
  }

  // Delete all temp files
  clearAllTempFiles(): number {
    const tempFiles = this.getTempFiles();
    let deletedCount = 0;

    tempFiles.forEach(file => {
      this.files.delete(file.id);
      deletedCount++;
    });

    if (deletedCount > 0) {
      if (this.activeFileId && !this.files.has(this.activeFileId)) {
        const files = this.getFiles();
        this.activeFileId = files.length > 0 ? files[0].id : null;
      }
      this.saveToStorage();
      this.notifyListeners();
    }

    return deletedCount;
  }

  // Convert text to binary
  static textToBinary(text: string): string {
    let bits = '';
    for (let i = 0; i < text.length; i++) {
      const byte = text.charCodeAt(i);
      bits += byte.toString(2).padStart(8, '0');
    }
    return bits;
  }

  // Convert binary to text
  static binaryToText(bits: string): string {
    let text = '';
    for (let i = 0; i < bits.length; i += 8) {
      const byte = bits.substring(i, i + 8);
      if (byte.length === 8) {
        text += String.fromCharCode(parseInt(byte, 2));
      }
    }
    return text;
  }

  // Set file group
  setFileGroup(id: string, group: string): void {
    const file = this.files.get(id);
    if (file) {
      file.group = group;
      file.modified = new Date();
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  // Add a new group
  addGroup(groupName: string): void {
    if (groupName.trim()) {
      this.groups.add(groupName.trim());
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  // Delete a group
  deleteGroup(groupName: string): void {
    this.groups.delete(groupName);
    // Remove group from all files that had it
    this.files.forEach(file => {
      if (file.group === groupName) {
        file.group = undefined;
      }
    });
    this.saveToStorage();
    this.notifyListeners();
  }

  // Get all unique groups (combines stored groups and groups from files)
  getGroups(): string[] {
    const allGroups = new Set<string>(this.groups);
    this.files.forEach(file => {
      if (file.group) allGroups.add(file.group);
    });
    return Array.from(allGroups).sort();
  }

  // Subscribe to changes
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  // Get file by ID
  getFile(id: string): BinaryFile | undefined {
    return this.files.get(id);
  }
}

// Singleton instance for global access
export const fileSystemManager = new FileSystemManager();
