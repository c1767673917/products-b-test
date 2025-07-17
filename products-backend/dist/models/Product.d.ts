import mongoose, { Document } from 'mongoose';
export interface IProduct extends Document {
    productId: string;
    recordId: string;
    name: string;
    sequence: string;
    category: {
        primary: string;
        secondary: string;
    };
    price: {
        normal: number;
        discount: number;
        discountRate: number;
        currency: string;
    };
    images: {
        front?: string;
        back?: string;
        label?: string;
        package?: string;
        gift?: string;
    };
    origin: {
        country: string;
        province: string;
        city: string;
    };
    platform: string;
    specification: string;
    flavor: string;
    manufacturer: string;
    collectTime: Date;
    createdAt: Date;
    updatedAt: Date;
    searchText: string;
    status: string;
    isVisible: boolean;
}
export declare const Product: mongoose.Model<IProduct, {}, {}, {}, mongoose.Document<unknown, {}, IProduct, {}> & IProduct & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Product.d.ts.map