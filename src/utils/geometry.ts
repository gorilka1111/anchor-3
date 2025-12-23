
export const SNAP_DISTANCE_Pixels = 10;

export interface Point {
    x: number;
    y: number;
}

export const dist = (p1: Point, p2: Point) => Math.hypot(p2.x - p1.x, p2.y - p1.y);

export const getNearestPoint = (
    cursor: Point,
    snapPoints: Point[],
    threshold: number
): Point | null => {
    let nearest: Point | null = null;
    let minDist = threshold;

    for (const p of snapPoints) {
        const d = dist(cursor, p);
        if (d < minDist) {
            minDist = d;
            nearest = p;
        }
    }
    return nearest;
};

// Generates a rectangle polygon from a centerline
export const generateWallPolygon = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    thicknessPixels: number
): number[] => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);

    if (len === 0) return [x1, y1];

    // Unit normal vector
    const nx = -dy / len;
    const ny = dx / len;

    // Half thickness
    const half = thicknessPixels / 2;

    // Four corners
    const p1x = x1 + nx * half;
    const p1y = y1 + ny * half;

    const p2x = x2 + nx * half;
    const p2y = y2 + ny * half;

    const p3x = x2 - nx * half;
    const p3y = y2 - ny * half;

    const p4x = x1 - nx * half;
    const p4y = y1 - ny * half;

    return [p1x, p1y, p2x, p2y, p3x, p3y, p4x, p4y];
};

export const applyOrthogonal = (start: Point, current: Point): Point => {
    const dx = current.x - start.x;
    const dy = current.y - start.y;

    if (Math.abs(dx) > Math.abs(dy)) {
        return { x: current.x, y: start.y };
    } else {
        return { x: start.x, y: current.y };
    }
};

// Distance from point p to line segment v-w
export const distToSegmentSquared = (p: Point, v: Point, w: Point): { dist2: number, proj: Point } => {
    const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
    if (l2 === 0) return { dist2: dist(p, v) ** 2, proj: v };
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    const proj = { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) };
    return { dist2: dist(p, proj) ** 2, proj };
};

export const getSnapPoint = (
    cursor: Point,
    walls: import('../types').Wall[], // Avoid circular dependency if possible, or use type import
    threshold: number
): Point | null => {
    let nearest: Point | null = null;
    let minDist = threshold;

    // 1. Check Vertices
    const vertices: Point[] = [];
    walls.forEach(w => {
        vertices.push({ x: w.points[0], y: w.points[1] });
        vertices.push({ x: w.points[2], y: w.points[3] });
    });

    const nearestVertex = getNearestPoint(cursor, vertices, threshold);
    if (nearestVertex) {
        return nearestVertex; // Vertices take priority
    }

    // 2. Check Edges (Centerlines)
    for (const w of walls) {
        const p1 = { x: w.points[0], y: w.points[1] };
        const p2 = { x: w.points[2], y: w.points[3] };
        const { dist2, proj } = distToSegmentSquared(cursor, p1, p2);
        const d = Math.sqrt(dist2);

        if (d < minDist) {
            minDist = d;
            nearest = proj;
        }
    }

    return nearest;
};
