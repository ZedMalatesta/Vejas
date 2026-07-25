export interface Room {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  adminId: string;
  allowGuestControl: boolean;
  createdAt?: Date;
}
