import { create } from 'zustand';
import { temporal } from 'zundo';
import { v4 as uuidv4 } from 'uuid';
import type { Wall, Anchor, Dimension, ProjectLayers, ToolType } from '../types';

interface ProjectState {
    scaleRatio: number; // px per meter
    walls: Wall[];
    anchors: Anchor[];
    dimensions: Dimension[];
    layers: ProjectLayers;
    activeTool: ToolType;
    selectedIds: string[];
    wallPreset: 'default' | 'thick' | 'wide';
    standardWallThickness: number;
    thickWallThickness: number;
    wideWallThickness: number;
    anchorMode: 'manual' | 'auto';

    // Anchor Settings
    anchorRadius: number;
    anchorShape: 'circle' | 'square';
    showAnchorRadius: boolean;

    // Actions
    setScaleRatio: (ratio: number) => void;
    setTool: (tool: ToolType) => void;
    setSelection: (ids: string[]) => void;
    setWallPreset: (preset: 'default' | 'thick' | 'wide') => void;
    setStandardWallThickness: (thickness: number) => void;
    setThickWallThickness: (thickness: number) => void;
    setWideWallThickness: (thickness: number) => void;
    setAnchorMode: (mode: 'manual' | 'auto') => void;

    // Anchor Actions
    setAnchorRadius: (r: number) => void;
    setAnchorShape: (s: 'circle' | 'square') => void;
    setShowAnchorRadius: (v: boolean) => void;
    alignAnchors: (type: 'horizontal' | 'vertical') => void;

    addWall: (wall: Omit<Wall, 'id'>) => void;
    updateWall: (id: string, updates: Partial<Wall>) => void;
    removeWall: (id: string) => void;
    addAnchor: (anchor: Omit<Anchor, 'id'>) => void;
    updateAnchor: (id: string, updates: Partial<Anchor>) => void;
    removeAnchor: (id: string) => void;
    addDimension: (dim: Omit<Dimension, 'id'>) => void;
    updateDimension: (id: string, updates: Partial<Dimension>) => void;
    removeDimension: (id: string) => void;
    toggleLayer: (layer: keyof ProjectLayers) => void;
}

export const useProjectStore = create<ProjectState>()(
    temporal(
        (set) => ({
            scaleRatio: 50, // Default 50px = 1m
            walls: [],
            anchors: [],
            dimensions: [],
            layers: {
                walls: true,
                heatmap: true,
                floorplan: true,
                dimensions: true,
            },
            activeTool: 'select',
            selectedIds: [],
            wallPreset: 'thick',
            standardWallThickness: 0.1, // Default 10cm
            thickWallThickness: 0.2,
            wideWallThickness: 0.3,
            anchorMode: 'manual',

            // Anchor Settings Defaults
            anchorRadius: 5,
            anchorShape: 'circle',
            showAnchorRadius: true,

            setScaleRatio: (ratio) => set({ scaleRatio: ratio }),
            setTool: (tool) => set({ activeTool: tool }),
            setSelection: (ids) => set({ selectedIds: ids }),
            setWallPreset: (preset) => set({ wallPreset: preset }),
            setStandardWallThickness: (thickness) => set({ standardWallThickness: thickness }),
            setThickWallThickness: (t) => set({ thickWallThickness: t }),
            setWideWallThickness: (t) => set({ wideWallThickness: t }),
            setAnchorMode: (mode) => set({ anchorMode: mode }),

            // Anchor Actions
            setAnchorRadius: (r) => set({ anchorRadius: r }),
            setAnchorShape: (s) => set({ anchorShape: s }),
            setShowAnchorRadius: (v) => set({ showAnchorRadius: v }),

            alignAnchors: (type) => set((state) => {
                const selectedAnchors = state.anchors.filter(a => state.selectedIds.includes(a.id));
                if (selectedAnchors.length < 2) return state;

                let updates: Partial<Anchor>[] = [];
                // We need to map updates to specific IDs. 
                // Easier to map over all anchors and update matches.

                let targetVal = 0;
                if (type === 'horizontal') {
                    // Align Vertically to share the same Y.
                    // Reference: Left-most anchor (Smallest X).
                    const leftMost = selectedAnchors.reduce((prev, curr) => (curr.x < prev.x ? curr : prev));
                    targetVal = leftMost.y;
                } else {
                    // Align Horizontally to share the same X.
                    // Reference: Top-most anchor (Smallest Y).
                    const topMost = selectedAnchors.reduce((prev, curr) => (curr.y < prev.y ? curr : prev));
                    targetVal = topMost.x;
                }

                return {
                    anchors: state.anchors.map(a => {
                        if (state.selectedIds.includes(a.id)) {
                            if (type === 'horizontal') return { ...a, y: targetVal };
                            if (type === 'vertical') return { ...a, x: targetVal };
                        }
                        return a;
                    })
                };
            }),

            addWall: (wall) => set((state) => ({
                walls: [...state.walls, { ...wall, id: uuidv4() }]
            })),

            updateWall: (id, updates) => set((state) => ({
                walls: state.walls.map((w) => (w.id === id ? { ...w, ...updates } : w)),
            })),

            removeWall: (id) => set((state) => ({
                walls: state.walls.filter((w) => w.id !== id),
            })),

            addAnchor: (anchor) => set((state) => {
                // Determine prefix based on anchorMode or passed type (logic currently relies on global anchorMode or just checking context)
                // Let's assume we use state.anchorMode as default, or we can check the ID if provided (but here we generate it).
                // Actually, the UI usually switches anchorMode when selecting tool.

                const prefix = state.anchorMode === 'manual' ? 'M' : 'A';

                // Find next number
                const existingIds = state.anchors
                    .filter(a => a.id.startsWith(prefix))
                    .map(a => parseInt(a.id.substring(1)))
                    .filter(n => !isNaN(n));

                const nextNum = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
                const newId = `${prefix}${nextNum}`;

                return {
                    anchors: [...state.anchors, { ...anchor, id: newId }]
                };
            }),

            updateAnchor: (id, updates) => set((state) => ({
                anchors: state.anchors.map((a) => (a.id === id ? { ...a, ...updates } : a)),
            })),

            removeAnchor: (id) => set((state) => ({
                anchors: state.anchors.filter((a) => a.id !== id),
            })),

            toggleLayer: (layer) => set((state) => ({
                layers: { ...state.layers, [layer]: !state.layers[layer] }
            })),

            addDimension: (dim) => set((state) => ({
                dimensions: [...state.dimensions, { ...dim, id: uuidv4() }]
            })),

            updateDimension: (id, updates) => set((state) => ({
                dimensions: state.dimensions.map((d) => (d.id === id ? { ...d, ...updates } : d)),
            })),

            removeDimension: (id) => set((state) => ({
                dimensions: state.dimensions.filter((d) => d.id !== id)
            })),
        }),
        {
            limit: 100,
            partialize: (state) => {
                const { activeTool, ...rest } = state;
                return rest;
            },
        }
    )
);
