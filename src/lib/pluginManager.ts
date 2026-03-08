/**
 * Plugin Manager - Add, delete, enable/disable, import/export plugins
 * Plugins stored in localStorage
 */
import { validateCode, safeExecute } from './sandboxedExec';

export type PluginType = 'operation' | 'metric' | 'visualization' | 'export';

export interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  type: PluginType;
  enabled: boolean;
  code: string;
  config: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'bsee_plugins';

function loadPlugins(): Plugin[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function savePlugins(plugins: Plugin[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plugins));
}

export class PluginManager {
  private plugins: Plugin[];
  private listeners: Set<() => void> = new Set();
  private loadedPlugins: Set<string> = new Set();
  private pluginErrors: Map<string, string> = new Map();

  constructor() {
    this.plugins = loadPlugins();
    this.loadEnabledPlugins();
  }

  private loadEnabledPlugins(): void {
    for (const plugin of this.plugins) {
      if (plugin.enabled) {
        this.loadPlugin(plugin);
      }
    }
  }

  private loadPlugin(plugin: Plugin): boolean {
    try {
      const validation = validateCode(plugin.code);
      if (!validation.safe) {
        throw new Error(`Blocked APIs: ${validation.violations.join(', ')}`);
      }

      // Execute plugin code with a registration API
      const pluginApi = {
        type: plugin.type,
        id: plugin.id,
        name: plugin.name,
        config: plugin.config,
        log: (msg: string) => console.log(`[PLUGIN:${plugin.name}]`, msg),
      };

      safeExecute(
        ['plugin'],
        plugin.code,
        [pluginApi]
      );

      this.loadedPlugins.add(plugin.id);
      this.pluginErrors.delete(plugin.id);
      console.log(`[PLUGIN] Loaded: ${plugin.name} (${plugin.type})`);
      return true;
    } catch (e) {
      const errorMsg = (e as Error).message;
      this.pluginErrors.set(plugin.id, errorMsg);
      console.warn(`[PLUGIN] Failed to load ${plugin.name}:`, errorMsg);
      // Auto-disable faulty plugins
      plugin.enabled = false;
      plugin.updatedAt = new Date().toISOString();
      return false;
    }
  }

  private unloadPlugin(pluginId: string): void {
    this.loadedPlugins.delete(pluginId);
    this.pluginErrors.delete(pluginId);
  }

  restartPlugins(): { loaded: number; errors: string[] } {
    const errors: string[] = [];
    this.loadedPlugins.clear();
    this.pluginErrors.clear();
    for (const plugin of this.plugins) {
      if (plugin.enabled) {
        if (!this.loadPlugin(plugin)) {
          errors.push(`Failed to load ${plugin.name}: ${this.pluginErrors.get(plugin.id)}`);
        }
      }
    }
    this.notify();
    return { loaded: this.loadedPlugins.size, errors };
  }

  isLoaded(id: string): boolean { return this.loadedPlugins.has(id); }
  getError(id: string): string | undefined { return this.pluginErrors.get(id); }
  getLoadedCount(): number { return this.loadedPlugins.size; }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    savePlugins(this.plugins);
    this.listeners.forEach(l => l());
  }

  getAll(): Plugin[] { return [...this.plugins]; }
  getEnabled(): Plugin[] { return this.plugins.filter(p => p.enabled); }
  getByType(type: PluginType): Plugin[] { return this.plugins.filter(p => p.type === type); }
  getById(id: string): Plugin | undefined { return this.plugins.find(p => p.id === id); }

  add(plugin: Omit<Plugin, 'id' | 'createdAt' | 'updatedAt'>): Plugin {
    const now = new Date().toISOString();
    const newPlugin: Plugin = {
      ...plugin,
      id: `plugin_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: now,
      updatedAt: now,
    };
    this.plugins.push(newPlugin);
    this.notify();
    return newPlugin;
  }

  update(id: string, updates: Partial<Omit<Plugin, 'id' | 'createdAt'>>): boolean {
    const idx = this.plugins.findIndex(p => p.id === id);
    if (idx === -1) return false;
    this.plugins[idx] = { ...this.plugins[idx], ...updates, updatedAt: new Date().toISOString() };
    this.notify();
    return true;
  }

  remove(id: string): boolean {
    const idx = this.plugins.findIndex(p => p.id === id);
    if (idx === -1) return false;
    this.plugins.splice(idx, 1);
    this.notify();
    return true;
  }

  toggle(id: string): boolean {
    const plugin = this.plugins.find(p => p.id === id);
    if (!plugin) return false;
    plugin.enabled = !plugin.enabled;
    plugin.updatedAt = new Date().toISOString();
    if (plugin.enabled) {
      this.loadPlugin(plugin);
    } else {
      this.unloadPlugin(id);
    }
    this.notify();
    return true;
  }

  enableAll(): void {
    this.plugins.forEach(p => { p.enabled = true; p.updatedAt = new Date().toISOString(); });
    this.notify();
  }

  disableAll(): void {
    this.plugins.forEach(p => { p.enabled = false; p.updatedAt = new Date().toISOString(); });
    this.notify();
  }

  exportPlugins(ids?: string[]): string {
    const toExport = ids ? this.plugins.filter(p => ids.includes(p.id)) : this.plugins;
    return JSON.stringify({ type: 'bsee-plugins', version: '1.0', plugins: toExport }, null, 2);
  }

  importPlugins(json: string): { imported: number; errors: string[] } {
    const errors: string[] = [];
    try {
      const data = JSON.parse(json);
      if (!data.plugins || !Array.isArray(data.plugins)) {
        return { imported: 0, errors: ['Invalid plugin format'] };
      }
      let imported = 0;
      for (const p of data.plugins) {
        if (!p.name || !p.type || !p.code) {
          errors.push(`Skipping invalid plugin: ${p.name || 'unnamed'}`);
          continue;
        }
        // Check for duplicate
        const existing = this.plugins.find(ep => ep.name === p.name && ep.version === p.version);
        if (existing) {
          errors.push(`Skipping duplicate: ${p.name} v${p.version}`);
          continue;
        }
        this.add({ name: p.name, version: p.version || '1.0', description: p.description || '', type: p.type, enabled: false, code: p.code, config: p.config || {} });
        imported++;
      }
      return { imported, errors };
    } catch (e) {
      return { imported: 0, errors: [`Parse error: ${(e as Error).message}`] };
    }
  }

  getStats(): { total: number; enabled: number; byType: Record<string, number> } {
    const byType: Record<string, number> = {};
    this.plugins.forEach(p => { byType[p.type] = (byType[p.type] || 0) + 1; });
    return { total: this.plugins.length, enabled: this.getEnabled().length, byType };
  }
}

export const pluginManager = new PluginManager();
