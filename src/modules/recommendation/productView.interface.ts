import { Types } from 'mongoose';

export interface IProductView {
  user: Types.ObjectId;
  product: Types.ObjectId;
  count: number;
  lastViewedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}
