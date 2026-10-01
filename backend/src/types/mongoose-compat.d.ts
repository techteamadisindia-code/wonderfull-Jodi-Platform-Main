/**
 * Global TypeScript declarations for Mongoose types compatibility with MySQL/Prisma.
 * This satisfies all type-level references to `mongoose.Types.ObjectId`, `Types.ObjectId`, etc.
 */
declare namespace mongoose {
  namespace Types {
    type ObjectId = string | any;
    class ObjectId {
      constructor(id?: string);
      toString(): string;
      toHexString(): string;
    }
  }
  type Document = any;
  type Schema = any;
  type FilterQuery<T> = any;
  type UpdateQuery<T> = any;
}

declare namespace Types {
  type ObjectId = string | any;
}
