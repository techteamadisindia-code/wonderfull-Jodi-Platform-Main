import { prisma, toClient, toClientArray, generateObjectId } from './client';

export interface QueryOptions {
  sort?: any;
  skip?: number;
  limit?: number;
  select?: any;
  include?: any;
  populate?: Array<{ path: string; select?: string }>;
}

/**
 * Normalizes MongoDB filter syntax to Prisma `where` clause.
 */
export function normalizeFilter(filter: any = {}, fieldMap: Record<string, string> = {}): any {
  if (!filter || typeof filter !== 'object') return {};
  if (Array.isArray(filter)) return filter.map((f) => normalizeFilter(f, fieldMap));

  const where: any = {};

  for (const [rawKey, rawVal] of Object.entries(filter)) {
    let key = rawKey;

    // Handle _id -> id mapping
    if (key === '_id') {
      key = 'id';
    } else if (fieldMap[key]) {
      key = fieldMap[key];
    }

    // Logical Operators
    if (key === '$or') {
      if (Array.isArray(rawVal)) {
        where.OR = rawVal.map((sub) => normalizeFilter(sub, fieldMap));
      }
      continue;
    }

    if (key === '$and') {
      if (Array.isArray(rawVal)) {
        where.AND = rawVal.map((sub) => normalizeFilter(sub, fieldMap));
      }
      continue;
    }

    // Direct RegExp
    if (rawVal instanceof RegExp) {
      where[key] = {
        contains: rawVal.source,
        mode: rawVal.flags.includes('i') ? 'insensitive' : 'default',
      };
      continue;
    }

    // Operators in nested objects
    if (rawVal && typeof rawVal === 'object' && !(rawVal instanceof Date) && !Array.isArray(rawVal)) {
      const opObj = rawVal as any;
      const parsedOps: any = {};
      let hasOp = false;

      if ('$eq' in opObj) {
        parsedOps.equals = opObj.$eq;
        hasOp = true;
      }
      if ('$ne' in opObj) {
        parsedOps.not = opObj.$ne;
        hasOp = true;
      }
      if ('$in' in opObj) {
        parsedOps.in = Array.isArray(opObj.$in) ? opObj.$in : [opObj.$in];
        hasOp = true;
      }
      if ('$nin' in opObj) {
        parsedOps.notIn = Array.isArray(opObj.$nin) ? opObj.$nin : [opObj.$nin];
        hasOp = true;
      }
      if ('$gt' in opObj) {
        parsedOps.gt = opObj.$gt;
        hasOp = true;
      }
      if ('$gte' in opObj) {
        parsedOps.gte = opObj.$gte;
        hasOp = true;
      }
      if ('$lt' in opObj) {
        parsedOps.lt = opObj.$lt;
        hasOp = true;
      }
      if ('$lte' in opObj) {
        parsedOps.lte = opObj.$lte;
        hasOp = true;
      }
      if ('$regex' in opObj) {
        const flags = opObj.$options || '';
        const pattern = typeof opObj.$regex === 'string' ? opObj.$regex : opObj.$regex.source;
        parsedOps.contains = pattern;
        if (flags.includes('i') || opObj.$regex?.flags?.includes('i')) {
          parsedOps.mode = 'insensitive';
        }
        hasOp = true;
      }

      if (hasOp) {
        where[key] = parsedOps;
        continue;
      }
    }

    // Default equality
    where[key] = rawVal;
  }

  return where;
}

/**
 * Normalizes MongoDB sort syntax to Prisma `orderBy` clause.
 */
export function normalizeSort(sort: any): any {
  if (!sort) return undefined;

  if (typeof sort === 'string') {
    const parts = sort.trim().split(/\s+/);
    const orderObj: any = {};
    for (const part of parts) {
      if (part.startsWith('-')) {
        orderObj[part.slice(1)] = 'desc';
      } else {
        orderObj[part] = 'asc';
      }
    }
    return orderObj;
  }

  if (typeof sort === 'object' && !Array.isArray(sort)) {
    const orderObj: any = {};
    for (const [k, v] of Object.entries(sort)) {
      const fieldKey = k === '_id' ? 'id' : k;
      orderObj[fieldKey] = v === -1 || v === 'desc' || v === 'DESC' ? 'desc' : 'asc';
    }
    return orderObj;
  }

  return undefined;
}

/**
 * Chainable query builder simulating Mongoose Query API on top of Prisma.
 */
export class PrismaQueryBuilder<T = any> implements PromiseLike<T> {
  private prismaDelegate: any;
  private where: any;
  private fieldMap: Record<string, string>;
  private isFindOne: boolean;
  private queryOptions: QueryOptions = {};

  constructor(prismaDelegate: any, filter: any = {}, isFindOne = false, fieldMap: Record<string, string> = {}) {
    this.prismaDelegate = prismaDelegate;
    this.fieldMap = fieldMap;
    this.where = normalizeFilter(filter, fieldMap);
    this.isFindOne = isFindOne;
  }

  sort(sortObj: any): this {
    this.queryOptions.sort = normalizeSort(sortObj);
    return this;
  }

  skip(n: number): this {
    this.queryOptions.skip = n;
    return this;
  }

  limit(n: number): this {
    this.queryOptions.limit = n;
    return this;
  }

  select(fields: string | Record<string, number>): this {
    // If fields is string like "-password" or "fullName email"
    if (typeof fields === 'string') {
      const parts = fields.split(/\s+/).filter(Boolean);
      const isExclusion = parts.some((p) => p.startsWith('-'));
      if (!isExclusion) {
        const selectObj: any = { id: true };
        for (const p of parts) {
          selectObj[p === '_id' ? 'id' : p] = true;
        }
        this.queryOptions.select = selectObj;
      }
    }
    return this;
  }

  populate(path: string | { path: string; select?: string }, selectFields?: string): this {
    const targetPath = typeof path === 'string' ? path : path.path;
    const targetSelect = typeof path === 'object' && path.select ? path.select : selectFields;

    if (!this.queryOptions.include) {
      this.queryOptions.include = {};
    }

    if (targetSelect && typeof targetSelect === 'string') {
      const selectFieldsObj: any = { id: true };
      targetSelect.split(/\s+/).filter(Boolean).forEach((f) => {
        selectFieldsObj[f === '_id' ? 'id' : f] = true;
      });
      this.queryOptions.include[targetPath] = { select: selectFieldsObj };
    } else {
      this.queryOptions.include[targetPath] = true;
    }
    return this;
  }

  lean(): this {
    return this;
  }

  async exec(): Promise<T> {
    const args: any = { where: this.where };

    if (this.queryOptions.sort) args.orderBy = this.queryOptions.sort;
    if (this.queryOptions.skip !== undefined) args.skip = this.queryOptions.skip;
    if (this.queryOptions.limit !== undefined) args.take = this.queryOptions.limit;
    if (this.queryOptions.select) args.select = this.queryOptions.select;
    if (this.queryOptions.include) args.include = this.queryOptions.include;

    if (this.isFindOne) {
      const record = await this.prismaDelegate.findFirst(args);
      return toClient(record) as unknown as T;
    } else {
      const records = await this.prismaDelegate.findMany(args);
      return toClientArray(records) as unknown as T;
    }
  }

  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.exec().then(onfulfilled, onrejected);
  }

  catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null
  ): Promise<T | TResult> {
    return this.exec().catch(onrejected);
  }
}

/**
 * Creates a Model Adapter wrapping a Prisma Delegate.
 */
export function createPrismaModelAdapter(
  delegateName: keyof typeof prisma,
  fieldMap: Record<string, string> = {}
) {
  const delegate = (prisma as any)[delegateName];

  return {
    find(filter: any = {}) {
      return new PrismaQueryBuilder(delegate, filter, false, fieldMap);
    },

    findOne(filter: any = {}) {
      return new PrismaQueryBuilder(delegate, filter, true, fieldMap);
    },

    findById(id: string | any) {
      const stringId = id?._id ? String(id._id) : String(id);
      return new PrismaQueryBuilder(delegate, { id: stringId }, true, fieldMap);
    },

    async create(data: any | any[]) {
      if (Array.isArray(data)) {
        const results = [];
        for (const item of data) {
          const id = item.id || item._id || generateObjectId();
          const cleanItem = { ...item, id };
          delete cleanItem._id;
          const created = await delegate.create({ data: cleanItem });
          results.push(toClient(created));
        }
        return results;
      }

      const id = data.id || data._id || generateObjectId();
      const cleanData = { ...data, id };
      delete cleanData._id;

      // Map relation fields if needed (e.g. user -> userId)
      for (const [k, v] of Object.entries(fieldMap)) {
        if (cleanData[k] !== undefined) {
          cleanData[v] = typeof cleanData[k] === 'object' && cleanData[k]?._id
            ? String(cleanData[k]._id)
            : String(cleanData[k]);
          delete cleanData[k];
        }
      }

      const created = await delegate.create({ data: cleanData });
      return toClient(created);
    },

    async updateOne(filter: any, update: any, options: any = {}) {
      const where = normalizeFilter(filter, fieldMap);
      const updateData = update.$set ? { ...update.$set } : { ...update };
      delete updateData._id;
      delete updateData.id;

      // Handle increment
      if (update.$inc) {
        for (const [incKey, incVal] of Object.entries(update.$inc)) {
          updateData[incKey] = { increment: incVal };
        }
      }

      const result = await delegate.updateMany({
        where,
        data: updateData,
      });

      return {
        acknowledged: true,
        matchedCount: result.count,
        modifiedCount: result.count,
        upsertedId: null,
      };
    },

    async updateMany(filter: any, update: any, options: any = {}) {
      return this.updateOne(filter, update, options);
    },

    async findByIdAndUpdate(id: string | any, update: any, options: any = {}) {
      const stringId = id?._id ? String(id._id) : String(id);
      const updateData = update.$set ? { ...update.$set } : { ...update };
      delete updateData._id;
      delete updateData.id;

      if (update.$inc) {
        for (const [incKey, incVal] of Object.entries(update.$inc)) {
          updateData[incKey] = { increment: incVal };
        }
      }

      try {
        const updated = await delegate.update({
          where: { id: stringId },
          data: updateData,
        });
        return toClient(updated);
      } catch (err: any) {
        if (err.code === 'P2025') {
          return null; // Record not found
        }
        throw err;
      }
    },

    async deleteOne(filter: any) {
      const where = normalizeFilter(filter, fieldMap);
      const result = await delegate.deleteMany({ where });
      return { acknowledged: true, deletedCount: result.count };
    },

    async deleteMany(filter: any) {
      return this.deleteOne(filter);
    },

    async findByIdAndDelete(id: string | any) {
      const stringId = id?._id ? String(id._id) : String(id);
      try {
        const deleted = await delegate.delete({ where: { id: stringId } });
        return toClient(deleted);
      } catch (err: any) {
        if (err.code === 'P2025') return null;
        throw err;
      }
    },

    async countDocuments(filter: any = {}) {
      const where = normalizeFilter(filter, fieldMap);
      return delegate.count({ where });
    },

    async distinct(field: string, filter: any = {}) {
      const where = normalizeFilter(filter, fieldMap);
      const records = await delegate.findMany({
        where,
        select: { [field]: true },
        distinct: [field],
      });
      return records.map((r: any) => r[field]).filter((v: any) => v !== null && v !== undefined);
    },
  };
}
