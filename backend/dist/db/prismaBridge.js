"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaQueryBuilder = void 0;
exports.normalizeFilter = normalizeFilter;
exports.normalizeSort = normalizeSort;
exports.createPrismaModelAdapter = createPrismaModelAdapter;
const client_1 = require("./client");
/**
 * Normalizes MongoDB filter syntax to Prisma `where` clause.
 */
function normalizeFilter(filter = {}, fieldMap = {}) {
    if (!filter || typeof filter !== 'object')
        return {};
    if (Array.isArray(filter))
        return filter.map((f) => normalizeFilter(f, fieldMap));
    const where = {};
    for (const [rawKey, rawVal] of Object.entries(filter)) {
        let key = rawKey;
        // Handle _id -> id mapping
        if (key === '_id') {
            key = 'id';
        }
        else if (fieldMap[key]) {
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
            const opObj = rawVal;
            const parsedOps = {};
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
function normalizeSort(sort) {
    if (!sort)
        return undefined;
    if (typeof sort === 'string') {
        const parts = sort.trim().split(/\s+/);
        const orderObj = {};
        for (const part of parts) {
            if (part.startsWith('-')) {
                orderObj[part.slice(1)] = 'desc';
            }
            else {
                orderObj[part] = 'asc';
            }
        }
        return orderObj;
    }
    if (typeof sort === 'object' && !Array.isArray(sort)) {
        const orderObj = {};
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
class PrismaQueryBuilder {
    constructor(prismaDelegate, filter = {}, isFindOne = false, fieldMap = {}) {
        this.queryOptions = {};
        this.prismaDelegate = prismaDelegate;
        this.fieldMap = fieldMap;
        this.where = normalizeFilter(filter, fieldMap);
        this.isFindOne = isFindOne;
    }
    sort(sortObj) {
        this.queryOptions.sort = normalizeSort(sortObj);
        return this;
    }
    skip(n) {
        this.queryOptions.skip = n;
        return this;
    }
    limit(n) {
        this.queryOptions.limit = n;
        return this;
    }
    select(fields) {
        // If fields is string like "-password" or "fullName email"
        if (typeof fields === 'string') {
            const parts = fields.split(/\s+/).filter(Boolean);
            const isExclusion = parts.some((p) => p.startsWith('-'));
            if (!isExclusion) {
                const selectObj = { id: true };
                for (const p of parts) {
                    selectObj[p === '_id' ? 'id' : p] = true;
                }
                this.queryOptions.select = selectObj;
            }
        }
        return this;
    }
    populate(path, selectFields) {
        const targetPath = typeof path === 'string' ? path : path.path;
        const targetSelect = typeof path === 'object' && path.select ? path.select : selectFields;
        if (!this.queryOptions.include) {
            this.queryOptions.include = {};
        }
        if (targetSelect && typeof targetSelect === 'string') {
            const selectFieldsObj = { id: true };
            targetSelect.split(/\s+/).filter(Boolean).forEach((f) => {
                selectFieldsObj[f === '_id' ? 'id' : f] = true;
            });
            this.queryOptions.include[targetPath] = { select: selectFieldsObj };
        }
        else {
            this.queryOptions.include[targetPath] = true;
        }
        return this;
    }
    lean() {
        return this;
    }
    async exec() {
        const args = { where: this.where };
        if (this.queryOptions.sort)
            args.orderBy = this.queryOptions.sort;
        if (this.queryOptions.skip !== undefined)
            args.skip = this.queryOptions.skip;
        if (this.queryOptions.limit !== undefined)
            args.take = this.queryOptions.limit;
        if (this.queryOptions.select)
            args.select = this.queryOptions.select;
        if (this.queryOptions.include)
            args.include = this.queryOptions.include;
        if (this.isFindOne) {
            const record = await this.prismaDelegate.findFirst(args);
            return (0, client_1.toClient)(record);
        }
        else {
            const records = await this.prismaDelegate.findMany(args);
            return (0, client_1.toClientArray)(records);
        }
    }
    then(onfulfilled, onrejected) {
        return this.exec().then(onfulfilled, onrejected);
    }
    catch(onrejected) {
        return this.exec().catch(onrejected);
    }
}
exports.PrismaQueryBuilder = PrismaQueryBuilder;
/**
 * Creates a Model Adapter wrapping a Prisma Delegate.
 */
function createPrismaModelAdapter(delegateName, fieldMap = {}) {
    const delegate = client_1.prisma[delegateName];
    return {
        find(filter = {}) {
            return new PrismaQueryBuilder(delegate, filter, false, fieldMap);
        },
        findOne(filter = {}) {
            return new PrismaQueryBuilder(delegate, filter, true, fieldMap);
        },
        findById(id) {
            const stringId = id?._id ? String(id._id) : String(id);
            return new PrismaQueryBuilder(delegate, { id: stringId }, true, fieldMap);
        },
        async create(data) {
            if (Array.isArray(data)) {
                const results = [];
                for (const item of data) {
                    const id = item.id || item._id || (0, client_1.generateObjectId)();
                    const cleanItem = { ...item, id };
                    delete cleanItem._id;
                    const created = await delegate.create({ data: cleanItem });
                    results.push((0, client_1.toClient)(created));
                }
                return results;
            }
            const id = data.id || data._id || (0, client_1.generateObjectId)();
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
            return (0, client_1.toClient)(created);
        },
        async updateOne(filter, update, options = {}) {
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
        async updateMany(filter, update, options = {}) {
            return this.updateOne(filter, update, options);
        },
        async findByIdAndUpdate(id, update, options = {}) {
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
                return (0, client_1.toClient)(updated);
            }
            catch (err) {
                if (err.code === 'P2025') {
                    return null; // Record not found
                }
                throw err;
            }
        },
        async deleteOne(filter) {
            const where = normalizeFilter(filter, fieldMap);
            const result = await delegate.deleteMany({ where });
            return { acknowledged: true, deletedCount: result.count };
        },
        async deleteMany(filter) {
            return this.deleteOne(filter);
        },
        async findByIdAndDelete(id) {
            const stringId = id?._id ? String(id._id) : String(id);
            try {
                const deleted = await delegate.delete({ where: { id: stringId } });
                return (0, client_1.toClient)(deleted);
            }
            catch (err) {
                if (err.code === 'P2025')
                    return null;
                throw err;
            }
        },
        async countDocuments(filter = {}) {
            const where = normalizeFilter(filter, fieldMap);
            return delegate.count({ where });
        },
        async distinct(field, filter = {}) {
            const where = normalizeFilter(filter, fieldMap);
            const records = await delegate.findMany({
                where,
                select: { [field]: true },
                distinct: [field],
            });
            return records.map((r) => r[field]).filter((v) => v !== null && v !== undefined);
        },
    };
}
//# sourceMappingURL=prismaBridge.js.map