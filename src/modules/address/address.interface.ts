import { Types } from 'mongoose';

export interface IAddressLocation {
  lat?: number;
  lng?: number;
}

export interface IAddress {
  user: Types.ObjectId;
  fullName: string;
  phone: string;
  pincode: string;
  city: string;
  state: string;
  street: string;
  landmark?: string;
  location?: IAddressLocation;
  isDefault: boolean;
}
