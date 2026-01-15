import { useProjectStore } from '../store/useProjectStore';
import { v4 as uuidv4 } from 'uuid';
import type { Point, Cable } from '../types';
import { getOrthogonalPath, calculateLength } from './routing';



export const autoConnect = () => {
    const store = useProjectStore.getState();
    const { hubs, anchors, walls, scaleRatio, activeTopology, setCables } = store;

    if (hubs.length === 0 || anchors.length === 0) return;

    const newCables: Cable[] = [];
    const hubCapacities = hubs.map(h => ({ ...h, used: 0 }));

    if (activeTopology === 'star') {
        anchors.forEach(anchor => {
            // Find closest hub with capacity
            let closestHub = null;
            let minDist = Infinity;

            hubCapacities.forEach((hub, index) => {
                if (hub.used < hub.capacity) {
                    const dist = Math.sqrt(Math.pow(hub.x - anchor.x, 2) + Math.pow(hub.y - anchor.y, 2));
                    if (dist < minDist) {
                        minDist = dist;
                        closestHub = index;
                    }
                }
            });

            if (closestHub !== null) {
                const hub = hubs[closestHub];
                hubCapacities[closestHub].used++;

                const start = { x: hub.x, y: hub.y };
                const end = { x: anchor.x, y: anchor.y };

                // Use smart routing
                const routingWalls = store.allowOutsideConnections ? [] : walls;
                const points = getOrthogonalPath(start, end, routingWalls);
                const length = calculateLength(points, scaleRatio);

                newCables.push({
                    id: uuidv4(),
                    fromId: hub.id,
                    toId: anchor.id,
                    points,
                    length
                });
            }
        });
    } else if (activeTopology === 'daisy') {
        // Daisy Chain Logic: Greedy Nearest Neighbor
        // 1. Assign each anchor to closest Hub (clustering)
        // 2. For each Hub, create a chain

        const unvisitedAnchors = new Set(anchors.map(a => a.id));

        hubs.forEach(hub => {
            let currentPoint: Point = { x: hub.x, y: hub.y };
            let currentSourceId = hub.id;
            let chainCount = 0;
            // Basic limit to prevent infinite loops or crazy long chains if not intended.
            const MAX_CHAIN_LENGTH = 10;

            while (chainCount < MAX_CHAIN_LENGTH && unvisitedAnchors.size > 0) {
                // Find nearest unvisited anchor to currentPoint
                let nearestId: string | null = null;
                let minDistance = Infinity;

                anchors.forEach(a => {
                    if (unvisitedAnchors.has(a.id)) {
                        const dist = Math.sqrt(Math.pow(a.x - currentPoint.x, 2) + Math.pow(a.y - currentPoint.y, 2));
                        if (dist < minDistance) {
                            minDistance = dist;
                            nearestId = a.id;
                        }
                    }
                });

                if (nearestId) {
                    // Check if adding this anchor is "reasonable" (e.g. not jumping across the whole map if another hub is closer)
                    // For now, simple greedy.

                    const targetAnchor = anchors.find(a => a.id === nearestId)!;
                    const start = currentPoint;
                    const end = { x: targetAnchor.x, y: targetAnchor.y };

                    // Use smart routing
                    const routingWalls = store.allowOutsideConnections ? [] : walls;
                    const points = getOrthogonalPath(start, end, routingWalls);
                    const length = calculateLength(points, scaleRatio);

                    newCables.push({
                        id: uuidv4(),
                        fromId: currentSourceId,
                        toId: nearestId,
                        points,
                        length
                    });

                    // Advance
                    unvisitedAnchors.delete(nearestId);
                    currentPoint = end;
                    currentSourceId = nearestId; // Next cable starts from this anchor
                    chainCount++;
                } else {
                    break; // No more anchors or all visited
                }
            }
        });
    }

    setCables(newCables);
};
