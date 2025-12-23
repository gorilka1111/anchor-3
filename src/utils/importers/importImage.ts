
export const importImage = (file: File): Promise<{ src: string, width: number, height: number }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const src = e.target?.result as string;
            if (!src) return reject('Failed to read file');

            const img = new Image();
            img.onload = () => {
                resolve({
                    src,
                    width: img.width,
                    height: img.height
                });
            };
            img.onerror = reject;
            img.src = src;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};
