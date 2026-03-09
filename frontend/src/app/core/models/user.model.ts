export interface User {
    id: number;
    username: string;
    email: string;
    role: string;
    token?: string; // Only present during Login/Register
    isOnline: boolean;
    lastSeen: Date;
    avatarUrl?: string;
    connectionId?: string;
}