import { useProjectStore } from '../store/useProjectStore';
import { detectRooms } from './room-detection';

export interface BOMData {
    anchors: number;
    hubs: {
        total: number;
        byCapacity: Record<number, number>;
    };
    cables: {
        count: number;
        totalLength: number; // Meters
        totalLengthWithMargin: number; // +20%
    };
    rooms: number;
}

export const calculateBOM = (): BOMData => {
    const state = useProjectStore.getState();
    const { anchors, hubs, cables } = state;

    const hubCounts: Record<number, number> = {};
    hubs.forEach(h => {
        hubCounts[h.capacity] = (hubCounts[h.capacity] || 0) + 1;
    });

    const totalCableLength = cables.reduce((acc, c) => acc + c.length, 0);

    // Calculate actual rooms
    let roomCount = 0;
    try {
        const detection = detectRooms(state.walls);
        roomCount = detection ? detection.length : 0;
    } catch (e) {
        console.warn("Room detection for BOM failed", e);
    }

    return {
        anchors: anchors.length,
        hubs: {
            total: hubs.length,
            byCapacity: hubCounts
        },
        cables: {
            count: cables.length,
            totalLength: totalCableLength,
            totalLengthWithMargin: totalCableLength * 1.2
        },
        rooms: roomCount
    };
};
