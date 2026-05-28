export const createId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

export const starText = (stars: number) => "★".repeat(stars) + "☆".repeat(5 - stars);
