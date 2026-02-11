/**
 * Domain Entities
 * Pure business objects with no infrastructure dependencies
 */

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// Add your domain entities here
