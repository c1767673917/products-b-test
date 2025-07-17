import mongoose, { Document } from 'mongoose';
export interface ICategory extends Document {
    categoryId: string;
    name: string;
    level: number;
    parentId?: string;
    path: string;
    productCount: number;
    isActive: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Category: mongoose.Model<ICategory, {}, {}, {}, mongoose.Document<unknown, {}, ICategory, {}> & ICategory & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Category.d.ts.map