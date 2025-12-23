export type WallMaterial = 'concrete' | 'glass' | 'wood' | 'metal' | 'drywall';

export interface Wall {
    id: string;
    points: [number, number, number, number]; // x1, y1, x2, y2
    thickness: number; // meters
    material: WallMaterial;
    attenuation: number; // dB
}

export interface Anchor {
    id: string;
    x: number;
    y: number;
    power: number; // dBm
    range: number; // meters
    radius?: number; // Override radius in meters
    shape?: 'circle' | 'square'; // Override shape
    groupId?: string; // For grouping anchors
}

export interface Dimension {
    id: string;
    type: 'free' | 'wall';
    points: number[];
    label: string;
    textOffset?: { x: number; y: number }; // Offset from default position
}

export type ToolType = 'select' | 'wall' | 'wall_rect' | 'anchor' | 'anchor_auto' | 'scale' | 'dimension' | 'trim' | 'extend' | 'mirror';

export interface ProjectLayers {
    walls: boolean;
    heatmap: boolean;
    floorplan: boolean;
    dimensions: boolean;
}
