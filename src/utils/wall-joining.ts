import type { Wall } from '../types';
import ClipperLib from 'clipper-lib';

const SCALE = 1000;
const EPS = 0.1;

export const generateJoinedWalls = (walls: Wall[], scaleRatio: number, allWalls: Wall[] = []): { x: number, y: number }[][] => {
    if (walls.length === 0) return [];

    // Use allWalls for connectivity if provided, otherwise default to the subset 'walls'
    // This allows a subset (e.g. thin walls) to know they are connected to thick walls
    const graphWalls = allWalls.length > 0 ? allWalls : walls;

    // 1. Build Adjacency Graph: Endpoint Key -> Wall[]
    const adj = new Map<string, Wall[]>();
    const getKey = (x: number, y: number) => `${Math.round(x * 100)},${Math.round(y * 100)}`;

    // Track degree of each vertex
    const degrees = new Map<string, number>();

    graphWalls.forEach(w => {
        const k1 = getKey(w.points[0], w.points[1]);
        const k2 = getKey(w.points[2], w.points[3]);

        if (!adj.has(k1)) adj.set(k1, []);
        if (!adj.has(k2)) adj.set(k2, []);
        adj.get(k1)!.push(w);
        adj.get(k2)!.push(w);

        degrees.set(k1, (degrees.get(k1) || 0) + 1);
        degrees.set(k2, (degrees.get(k2) || 0) + 1);
    });

    const resultPolys: { x: number, y: number }[][] = [];
    const processedWalls = new Set<string>(); // Keep local processed set for the subset loop

    // However, if we traverse the *subset*, we must ensure we don't traverse outside of it
    // But we DO want to see the neighbors for extension.

    const allOffsetPaths = new ClipperLib.Paths();

    const getNextPath = (): Wall[] | null => {
        let startWall: Wall | null = null;
        for (const w of walls) { // Iterate over the SUBSET
            if (!processedWalls.has(w.id)) {
                startWall = w;
                break;
            }
        }

        if (!startWall) return null;

        const path: Wall[] = [startWall];
        processedWalls.add(startWall.id);

        // Extend Forward
        let currW = startWall;
        let pEndKey = getKey(currW.points[2], currW.points[3]);

        while (true) {
            const neighbors = adj.get(pEndKey);
            if ((degrees.get(pEndKey) || 0) !== 2) break;

            const nextW = neighbors?.find(w => !processedWalls.has(w.id));
            if (!nextW) break;

            // Break chain if thickness changes (handle visual join via extension instead)
            if (Math.abs(nextW.thickness - currW.thickness) > 0.001) break;

            path.push(nextW);
            processedWalls.add(nextW.id);
            currW = nextW;

            const k1 = getKey(nextW.points[0], nextW.points[1]);
            const k2 = getKey(nextW.points[2], nextW.points[3]);
            pEndKey = (k1 === pEndKey) ? k2 : k1;
        }

        // Extend Backward
        let pStartKey = getKey(startWall.points[0], startWall.points[1]);
        while (true) {
            if ((degrees.get(pStartKey) || 0) !== 2) break;

            const neighbors = adj.get(pStartKey);
            const nextW = neighbors?.find(w => !processedWalls.has(w.id));
            if (!nextW) break;

            // Break chain if thickness changes
            if (Math.abs(nextW.thickness - startWall.thickness) > 0.001) break;

            path.unshift(nextW);
            processedWalls.add(nextW.id);

            const k1 = getKey(nextW.points[0], nextW.points[1]);
            const k2 = getKey(nextW.points[2], nextW.points[3]);
            pStartKey = (k1 === pStartKey) ? k2 : k1;
        }

        return path;
    };

    let path;
    while ((path = getNextPath())) {
        if (path.length === 0) continue;

        const points: { X: number, Y: number }[] = [];
        let curr = path[0];
        let p1 = { x: curr.points[0], y: curr.points[1] };
        let p2 = { x: curr.points[2], y: curr.points[3] };

        if (path.length === 1) {
            points.push({ X: p1.x * SCALE, Y: p1.y * SCALE });
            points.push({ X: p2.x * SCALE, Y: p2.y * SCALE });
        } else {
            const nextW = path[1];
            const n1 = { x: nextW.points[0], y: nextW.points[1] };
            const n2 = { x: nextW.points[2], y: nextW.points[3] };

            const sharedIsP2 = (distSq(p2, n1) < EPS || distSq(p2, n2) < EPS);

            if (sharedIsP2) {
                points.push({ X: p1.x * SCALE, Y: p1.y * SCALE });
                points.push({ X: p2.x * SCALE, Y: p2.y * SCALE });
            } else {
                points.push({ X: p2.x * SCALE, Y: p2.y * SCALE });
                points.push({ X: p1.x * SCALE, Y: p1.y * SCALE });
            }

            let lastP = { x: points[points.length - 1].X / SCALE, y: points[points.length - 1].Y / SCALE };

            for (let i = 1; i < path.length; i++) {
                const w = path[i];
                const ws = { x: w.points[0], y: w.points[1] };
                const we = { x: w.points[2], y: w.points[3] };

                if (distSq(ws, lastP) < EPS) {
                    points.push({ X: we.x * SCALE, Y: we.y * SCALE });
                    lastP = we;
                } else {
                    points.push({ X: ws.x * SCALE, Y: ws.y * SCALE });
                    lastP = ws;
                }
            }
        }

        // --- Manual Extension Logic (Miter Simulation) ---
        // 1. Check Start
        const startKey = getKey(points[0].X / SCALE, points[0].Y / SCALE);
        const startNeighbors = adj.get(startKey) || [];
        // Filter out self (path[0] is self)
        const otherStartNeighbors = startNeighbors.filter(w => w.id !== path[0].id);

        if (otherStartNeighbors.length > 0) {
            // Find max thickness of connected neighbor
            const maxNeighborThickness = Math.max(...otherStartNeighbors.map(n => n.thickness));

            // Extend Start Point BACKWARDS
            const pStart = points[0];
            const pNext = points[1];
            const dx = pStart.X - pNext.X;
            const dy = pStart.Y - pNext.Y;
            const len = Math.hypot(dx, dy);
            if (len > 0.001) {
                // Use Neighbor Half Width for extension distance
                const halfWidth = (maxNeighborThickness * scaleRatio * SCALE) / 2;
                const extX = (dx / len) * halfWidth;
                const extY = (dy / len) * halfWidth;
                points[0] = { X: pStart.X + extX, Y: pStart.Y + extY };
            }
        }

        // 2. Check End
        const endKey = getKey(points[points.length - 1].X / SCALE, points[points.length - 1].Y / SCALE);
        const endNeighbors = adj.get(endKey) || [];
        const otherEndNeighbors = endNeighbors.filter(w => w.id !== path[path.length - 1].id);

        if (otherEndNeighbors.length > 0) {
            const maxNeighborThickness = Math.max(...otherEndNeighbors.map(n => n.thickness));

            // Extend End Point FORWARDS
            const pEnd = points[points.length - 1];
            const pPrev = points[points.length - 2];
            const dx = pEnd.X - pPrev.X;
            const dy = pEnd.Y - pPrev.Y;
            const len = Math.hypot(dx, dy);
            if (len > 0.001) {
                const halfWidth = (maxNeighborThickness * scaleRatio * SCALE) / 2;
                const extX = (dx / len) * halfWidth;
                const extY = (dy / len) * halfWidth;
                points[points.length - 1] = { X: pEnd.X + extX, Y: pEnd.Y + extY };
            }
        }
        // -----------------------------------------------------------------

        const co = new ClipperLib.ClipperOffset();
        const startP = { x: points[0].X / SCALE, y: points[0].Y / SCALE };
        const endP = { x: points[points.length - 1].X / SCALE, y: points[points.length - 1].Y / SCALE };
        const isLoop = (distSq(startP, endP) < EPS && path.length > 2);

        const joinType = ClipperLib.JoinType.jtMiter;
        const endType = isLoop ? ClipperLib.EndType.etClosedLine : ClipperLib.EndType.etOpenButt;

        co.AddPath(points, joinType, endType);
        co.MiterLimit = 5.0;

        const halfWidth = (path[0].thickness * scaleRatio * SCALE) / 2;
        const solution = new ClipperLib.Paths();
        co.Execute(solution, halfWidth);

        // Accumulate for Union
        for (let i = 0; i < solution.length; i++) {
            allOffsetPaths.push(solution[i]);
        }
    }

    // Union all paths to merge overlaps (fixing T-junctions)
    const clip = new ClipperLib.Clipper();
    clip.AddPaths(allOffsetPaths, ClipperLib.PolyType.ptSubject, true);
    const unioned = new ClipperLib.Paths();
    clip.Execute(ClipperLib.ClipType.ctUnion, unioned, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);

    // Convert back to our point format and scale down
    for (let i = 0; i < unioned.length; i++) {
        const poly = unioned[i].map((p: { X: number, Y: number }) => ({ x: p.X / SCALE, y: p.Y / SCALE }));
        resultPolys.push(poly);
    }

    return resultPolys;
};

export const generateUnionBoundary = (walls: Wall[], scaleRatio: number): { x: number, y: number }[][] => {
    // 1. Get all polygons (using the same logic as joined walls to correctly handle offsets)
    // We can reuse generateJoinedWalls(walls, scaleRatio, walls) to get the pieces with correct joins
    const pieces = generateJoinedWalls(walls, scaleRatio, walls);
    if (pieces.length === 0) return [];

    // 2. Convert to Clipper Paths
    const subj = new ClipperLib.Paths();
    pieces.forEach(poly => {
        const p = poly.map(pt => ({ X: pt.x * SCALE, Y: pt.y * SCALE }));
        subj.push(p);
    });

    // 3. Union All
    const clip = new ClipperLib.Clipper();
    clip.AddPaths(subj, ClipperLib.PolyType.ptSubject, true);
    const solution = new ClipperLib.Paths();
    // Use NonZero fill to handle standard merged shapes
    clip.Execute(ClipperLib.ClipType.ctUnion, solution, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);

    // 4. Convert back
    return solution.map(path => path.map((pt: { X: number, Y: number }) => ({ x: pt.X / SCALE, y: pt.Y / SCALE })));
};

const distSq = (p1: { x: number, y: number }, p2: { x: number, y: number }) => (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2;
