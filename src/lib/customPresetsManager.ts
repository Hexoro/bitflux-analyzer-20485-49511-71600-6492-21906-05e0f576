/**
 * Custom Presets Manager - Shared state for custom generation presets and graphs
 */

import { GenerationConfig } from './generationPresets';

const GENERATION_STORAGE_KEY = 'bsee_custom_generation_presets';
const GRAPHS_STORAGE_KEY = 'bsee_custom_graphs';

export interface CustomPreset {
  id: string;
  name: string;
  description: string;
  config: GenerationConfig;
  code?: string; // Optional code-based generation
  isCodeBased?: boolean;
}

export interface GraphDefinition {
  id: string;
  name: string;
  description: string;
  type: 'bar' | 'line' | 'area' | 'scatter' | 'radar';
  enabled: boolean;
  dataFn: string;
}

class CustomPresetsManager {
  private presets: CustomPreset[] = [];
  private graphs: GraphDefinition[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const presetsData = localStorage.getItem(GENERATION_STORAGE_KEY);
      if (presetsData) {
        this.presets = JSON.parse(presetsData);
      }

      const graphsData = localStorage.getItem(GRAPHS_STORAGE_KEY);
      if (graphsData) {
        this.graphs = JSON.parse(graphsData);
      }
    } catch (e) {
      console.error('Failed to load custom presets:', e);
    }
  }

  private savePresetsToStorage() {
    try {
      localStorage.setItem(GENERATION_STORAGE_KEY, JSON.stringify(this.presets));
    } catch (e) {
      console.error('Failed to save presets:', e);
    }
  }

  private saveGraphsToStorage() {
    try {
      localStorage.setItem(GRAPHS_STORAGE_KEY, JSON.stringify(this.graphs));
    } catch (e) {
      console.error('Failed to save graphs:', e);
    }
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Presets
  getCustomPresets(): CustomPreset[] {
    return [...this.presets];
  }

  addPreset(preset: Omit<CustomPreset, 'id'>): CustomPreset {
    const newPreset: CustomPreset = {
      ...preset,
      id: `custom_${Date.now()}`,
    };
    this.presets.push(newPreset);
    this.savePresetsToStorage();
    this.notify();
    return newPreset;
  }

  updatePreset(id: string, preset: Partial<CustomPreset>) {
    const index = this.presets.findIndex(p => p.id === id);
    if (index >= 0) {
      this.presets[index] = { ...this.presets[index], ...preset };
      this.savePresetsToStorage();
      this.notify();
    }
  }

  deletePreset(id: string) {
    this.presets = this.presets.filter(p => p.id !== id);
    this.savePresetsToStorage();
    this.notify();
  }

  clearPresets() {
    this.presets = [];
    this.savePresetsToStorage();
    this.notify();
  }

  // Graphs
  getGraphs(): GraphDefinition[] {
    return [...this.graphs];
  }

  getEnabledGraphs(): GraphDefinition[] {
    return this.graphs.filter(g => g.enabled);
  }

  addGraph(graph: Omit<GraphDefinition, 'id'>): GraphDefinition {
    const newGraph: GraphDefinition = {
      ...graph,
      id: `custom_graph_${Date.now()}`,
    };
    this.graphs.push(newGraph);
    this.saveGraphsToStorage();
    this.notify();
    return newGraph;
  }

  updateGraph(id: string, graph: Partial<GraphDefinition>) {
    const index = this.graphs.findIndex(g => g.id === id);
    if (index >= 0) {
      this.graphs[index] = { ...this.graphs[index], ...graph };
      this.saveGraphsToStorage();
      this.notify();
    }
  }

  deleteGraph(id: string) {
    this.graphs = this.graphs.filter(g => g.id !== id);
    this.saveGraphsToStorage();
    this.notify();
  }

  toggleGraph(id: string) {
    const graph = this.graphs.find(g => g.id === id);
    if (graph) {
      graph.enabled = !graph.enabled;
      this.saveGraphsToStorage();
      this.notify();
    }
  }

  setGraphs(graphs: GraphDefinition[]) {
    this.graphs = graphs;
    this.saveGraphsToStorage();
    this.notify();
  }
}

export const customPresetsManager = new CustomPresetsManager();
