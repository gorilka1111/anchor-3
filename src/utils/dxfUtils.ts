
// Helper to calculate Bounding Box from DXF Data
export const calculateDXFBBox = (dxf: any): { minX: number, minY: number, maxX: number, maxY: number, width: number, height: number } => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    if (!dxf || !dxf.entities) return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };

    dxf.entities.forEach((entity: any) => {
        if (entity.type === 'LINE') {
            entity.vertices.forEach((v: any) => {
                minX = Math.min(minX, v.x);
                minY = Math.min(minY, v.y);
                maxX = Math.max(maxX, v.x);
                maxY = Math.max(maxY, v.y);
            });
        } else if (entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') {
            entity.vertices.forEach((v: any) => {
                minX = Math.min(minX, v.x);
                minY = Math.min(minY, v.y);
                maxX = Math.max(maxX, v.x);
                maxY = Math.max(maxY, v.y);
            });
        }
        // Add more entity types as needed (CIRCLE, ARC, etc. might need more complex calculation)
    });

    if (minX === Infinity) {
        return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
    }

    return {
        minX,
        minY,
        maxX,
        maxY,
        width: maxX - minX,
        height: maxY - minY
    };
};
