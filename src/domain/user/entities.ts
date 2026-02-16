export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile extends BaseEntity {
  name: string;
  email: string;
  role: 'user' | 'admin';
  subscription: 'free' | 'premium';
  phone: string | null;
  avatar: string | null;
}
