import z from 'zod';

const locationValidation = z.object({
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
}).optional();

export const createAddressValidation = z.object({
  body: z.object({
    fullName: z.string().min(1, 'Full name is required'),
    phone: z.string().min(7, 'Valid phone number is required'),
    pincode: z.string().min(1, 'Pincode is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    street: z.string().min(1, 'Street is required'),
    landmark: z.string().optional(),
    location: locationValidation,
    isDefault: z.boolean().optional(),
  }),
});

export const updateAddressValidation = z.object({
  body: z.object({
    fullName: z.string().min(1, 'Full name is required').optional(),
    phone: z.string().min(7, 'Valid phone number is required').optional(),
    pincode: z.string().min(1, 'Pincode is required').optional(),
    city: z.string().min(1, 'City is required').optional(),
    state: z.string().min(1, 'State is required').optional(),
    street: z.string().min(1, 'Street is required').optional(),
    landmark: z.string().optional(),
    location: locationValidation,
    isDefault: z.boolean().optional(),
  }),
});
