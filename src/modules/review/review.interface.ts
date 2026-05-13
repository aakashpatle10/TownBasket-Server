import { Types } from 'mongoose';

export interface IReview {
  product: Types.ObjectId;
  user: Types.ObjectId;
  order: Types.ObjectId;
  rating: number;
  comment?: string;
  images: string[];
  isVerifiedPurchase: boolean;
}
