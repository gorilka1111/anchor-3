import type { Point, Wall } from '../types';

// Helper to check line vs line intersection
export const linesIntersect = (p1: Point, p2: Point, p3: Point, p4: Point): boolean => {
    const ccw = (a: Point, b: Point, c: Point) => (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
    return (ccw(p1, p3, p4) !== ccw(p2, p3, p4)) && (ccw(p1, p2, p3) !== ccw(p1, p2, p4));
};

// Count wall intersections for a path
export const countIntersections = (path: Point[], walls: Wall[]): number => {
    let count = 0;
    for (let i = 0; i < path.length - 1; i++) {
        const p1 = path[i];
        const p2 = path[i + 1];

        // Skip tiny segments
        if (Math.abs(p1.x - p2.x) < 0.1 && Math.abs(p1.y - p2.y) < 0.1) continue;

        for (const wall of walls) {
            // Wall geometry
            const w1 = { x: wall.points[0], y: wall.points[1] };
            const w2 = { x: wall.points[2], y: wall.points[3] };
            if (linesIntersect(p1, p2, w1, w2)) {
                count++;
            }
        }
    }
    return count;
};

// Smart Orthogonal Routing (L-Shapes and Z-Shapes)
export const getOrthogonalPath = (start: Point, end: Point, walls: Wall[] = []): Point[] => {
    // 0. Trivial Case
    if (walls.length === 0) {
        return [start, { x: end.x, y: start.y }, end];
    }

    const candidates: { path: Point[], intersections: number, bends: number }[] = [];

    // Helper to evaluate a path
    const evaluate = (path: Point[], bends: number) => {
        const intersections = countIntersections(path, walls);
        candidates.push({ path, intersections, bends });
    };

    // 1. L-Shapes (1 Bend)
    // Option 1A: Horiz -> Vert
    evaluate([start, { x: end.x, y: start.y }, end], 1);
    // Option 1B: Vert -> Horiz
    evaluate([start, { x: start.x, y: end.y }, end], 1);

    // Optimization: If any L-path has 0 intersections, pick it immediately (shortest bends)
    // Note: If both have 0, we can pick either.
    const cleanLPath = candidates.find(c => c.intersections === 0 && c.bends === 1);
    if (cleanLPath) return cleanLPath.path;

    // 2. Z-Shapes (2 Bends)
    // We scan intermediate positions to find a "gap"
    // Type A: Horiz -> Vert -> Horiz (Scan x_mid)
    // Type B: Vert -> Horiz -> Vert (Scan y_mid)

    // We can try a few split ratios.
    // Denser scan to find gaps (doors) that might be missed by sparse steps
    const steps: number[] = [];
    for (let t = 0.05; t < 1.0; t += 0.05) {
        steps.push(t);
    }

    steps.forEach(t => {
        // Type A: Split X
        const x_mid = start.x + (end.x - start.x) * t;
        evaluate([
            start,
            { x: x_mid, y: start.y },
            { x: x_mid, y: end.y },
            end
        ], 2);

        // Type B: Split Y
        const y_mid = start.y + (end.y - start.y) * t;
        evaluate([
            start,
            { x: start.x, y: y_mid },
            { x: end.x, y: y_mid },
            end
        ], 2);
    });


    // 3. Selection
    // Sort by: 
    // 1. Intersections (Ascending)
    // 2. Bends (Ascending) - Prefer simpler paths
    // 3. Length? (Manhattan is constant for these monotonic paths, so ignored)

    candidates.sort((a, b) => {
        if (a.intersections !== b.intersections) return a.intersections - b.intersections;
        return a.bends - b.bends;
    });

    return candidates[0].path;
};

export const calculateLength = (points: Point[], scaleRatio: number): number => {
    let lengthPx = 0;
    for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        lengthPx += Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    }
    // scaleRatio is px per meter
    return lengthPx / scaleRatio;
}
