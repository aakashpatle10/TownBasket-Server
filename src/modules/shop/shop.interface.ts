import { Types } from 'mongoose';

export interface IShop {
  owner: Types.ObjectId;
  shopName: string;
  description: string;
  banner?: string;
  bannerPublicId?: string;
  profileImage?: string;
  profileImagePublicId?: string;
  bio?: string;
  featuredProducts?: Types.ObjectId[];
}
