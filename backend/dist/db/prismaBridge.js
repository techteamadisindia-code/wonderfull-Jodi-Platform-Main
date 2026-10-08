"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mongoose = exports.Schema = exports.Types = exports.PrismaUpdateQuery = exports.PrismaQueryBuilder = void 0;
exports.normalizeFilter = normalizeFilter;
exports.normalizeSort = normalizeSort;
exports.cleanUnsupportedModelFields = cleanUnsupportedModelFields;
exports.cleanPrismaData = cleanPrismaData;
exports.prepareUpdateData = prepareUpdateData;
exports.prepareSetOnInsertData = prepareSetOnInsertData;
exports.prepareCreateDataFromUpdate = prepareCreateDataFromUpdate;
exports.runPrismaAggregate = runPrismaAggregate;
exports.createPrismaModelAdapter = createPrismaModelAdapter;
const client_1 = require("@prisma/client");
const client_2 = require("./client");
/**
 * Unescapes regex special characters for Prisma string queries.
 */
function unescapeRegexPattern(str) {
    return str.replace(/\\([\\^$.*+?()[\]{}|/])/g, '$1');
}
/**
 * Parses MongoDB regex pattern into database-compatible Prisma string filter.
 * In MySQL / MariaDB, string collations (e.g. utf8mb4_unicode_ci) are case-insensitive by default.
 * Prisma Client rejects the `mode` parameter on MySQL providers ("Unknown argument `mode`").
 * This helper maps anchors (^...$) to equals / startsWith / endsWith / contains without the unsupported `mode` arg.
 */
function parseRegexToPrismaFilter(pattern) {
    let p = pattern;
    const startsWithAnchor = p.startsWith('^');
    const endsWithAnchor = p.endsWith('$');
    if (startsWithAnchor && endsWithAnchor) {
        p = p.slice(1, -1);
        p = unescapeRegexPattern(p);
        return { equals: p };
    }
    else if (startsWithAnchor) {
        p = p.slice(1);
        p = unescapeRegexPattern(p);
        return { startsWith: p };
    }
    else if (endsWithAnchor) {
        p = p.slice(0, -1);
        p = unescapeRegexPattern(p);
        return { endsWith: p };
    }
    else {
        if (p.startsWith('.*'))
            p = p.slice(2);
        if (p.endsWith('.*'))
            p = p.slice(0, -2);
        p = unescapeRegexPattern(p);
        return { contains: p };
    }
}
/**
 * Normalizes MongoDB filter syntax to Prisma `where` clause.
 */
function normalizeFilter(filter = {}, fieldMap = {}) {
    if (!filter || typeof filter !== 'object')
        return {};
    if (Array.isArray(filter))
        return filter.map((f) => normalizeFilter(f, fieldMap));
    const where = {};
    for (const [rawKey, rawValInitial] of Object.entries(filter)) {
        let key = rawKey;
        let rawVal = rawValInitial;
        // Handle _id -> id mapping
        if (key === '_id') {
            key = 'id';
        }
        else if (fieldMap[key]) {
            key = fieldMap[key];
        }
        // Convert ObjectId instances or objects with _id/id to string
        if (rawVal && typeof rawVal === 'object') {
            if (rawVal._id)
                rawVal = String(rawVal._id);
            else if (rawVal.id && typeof rawVal.id === 'string' && rawVal.id.length >= 24)
                rawVal = String(rawVal.id);
            else if (typeof rawVal.toString === 'function' && rawVal.constructor?.name === 'ObjectId') {
                rawVal = rawVal.toString();
            }
        }
        // Participants relational filter mapping for Conversation
        if (key === 'participants') {
            if (rawVal && typeof rawVal === 'object' && ('$all' in rawVal || Array.isArray(rawVal.$all))) {
                const allList = rawVal.$all || [];
                const normalizedIds = allList.map((v) => v && typeof v === 'object' ? String(v._id || v.id) : String(v));
                if (!where.AND)
                    where.AND = [];
                for (const pId of normalizedIds) {
                    where.AND.push({ participants: { some: { userId: pId } } });
                }
                where.AND.push({ participants: { every: { userId: { in: normalizedIds } } } });
                continue;
            }
            if (rawVal && typeof rawVal === 'object' && '$in' in rawVal) {
                const inList = rawVal.$in || [];
                const normalizedIds = (Array.isArray(inList) ? inList : [inList]).map((v) => v && typeof v === 'object' ? String(v._id || v.id) : String(v));
                where.participants = { some: { userId: { in: normalizedIds } } };
                continue;
            }
            if (rawVal && typeof rawVal === 'object' && '$eq' in rawVal) {
                const eqVal = rawVal.$eq;
                const targetId = eqVal && typeof eqVal === 'object' ? String(eqVal._id || eqVal.id) : String(eqVal);
                where.participants = { some: { userId: targetId } };
                continue;
            }
            if (rawVal && typeof rawVal === 'object' && !Array.isArray(rawVal) && !(rawVal instanceof Date)) {
                if (rawVal.some || rawVal.every || rawVal.none) {
                    where.participants = rawVal;
                    continue;
                }
            }
            const targetId = rawVal && typeof rawVal === 'object' ? String(rawVal._id || rawVal.id || rawVal.toString()) : String(rawVal);
            where.participants = { some: { userId: targetId } };
            continue;
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
            where[key] = parseRegexToPrismaFilter(rawVal.source);
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
                parsedOps.in = (Array.isArray(opObj.$in) ? opObj.$in : [opObj.$in]).map((v) => v && typeof v === 'object' && (v._id || v.id)
                    ? String(v._id || v.id)
                    : v && typeof v.toString === 'function' && v.constructor?.name === 'ObjectId'
                        ? v.toString()
                        : v);
                hasOp = true;
            }
            if ('$nin' in opObj) {
                parsedOps.notIn = (Array.isArray(opObj.$nin) ? opObj.$nin : [opObj.$nin]).map((v) => v && typeof v === 'object' && (v._id || v.id)
                    ? String(v._id || v.id)
                    : v && typeof v.toString === 'function' && v.constructor?.name === 'ObjectId'
                        ? v.toString()
                        : v);
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
                const pattern = typeof opObj.$regex === 'string' ? opObj.$regex : opObj.$regex.source;
                const parsed = parseRegexToPrismaFilter(pattern);
                Object.assign(parsedOps, parsed);
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
 * Prisma Client requires an array of single-key objects when sorting by multiple fields
 * (e.g. `[{ sortOrder: 'asc' }, { name: 'asc' }]`).
 */
function normalizeSort(sort) {
    if (!sort)
        return undefined;
    const result = [];
    if (typeof sort === 'string') {
        const parts = sort.trim().split(/\s+/).filter(Boolean);
        for (const part of parts) {
            if (part.startsWith('-')) {
                const field = part.slice(1);
                result.push({ [field === '_id' ? 'id' : field]: 'desc' });
            }
            else {
                const field = part.startsWith('+') ? part.slice(1) : part;
                result.push({ [field === '_id' ? 'id' : field]: 'asc' });
            }
        }
        return result.length > 0 ? result : undefined;
    }
    if (Array.isArray(sort)) {
        for (const item of sort) {
            if (Array.isArray(item) && item.length >= 2) {
                const fieldKey = item[0] === '_id' ? 'id' : item[0];
                const dir = item[1] === -1 || item[1] === 'desc' || item[1] === 'DESC' ? 'desc' : 'asc';
                result.push({ [fieldKey]: dir });
            }
            else if (item && typeof item === 'object') {
                for (const [k, v] of Object.entries(item)) {
                    const fieldKey = k === '_id' ? 'id' : k;
                    const dir = v === -1 || v === 'desc' || v === 'DESC' ? 'desc' : 'asc';
                    result.push({ [fieldKey]: dir });
                }
            }
            else if (typeof item === 'string') {
                const sub = normalizeSort(item);
                if (sub)
                    result.push(...sub);
            }
        }
        return result.length > 0 ? result : undefined;
    }
    if (typeof sort === 'object') {
        for (const [k, v] of Object.entries(sort)) {
            const fieldKey = k === '_id' ? 'id' : k;
            const dir = v === -1 || v === 'desc' || v === 'DESC' ? 'desc' : 'asc';
            result.push({ [fieldKey]: dir });
        }
        return result.length > 0 ? result : undefined;
    }
    return undefined;
}
/**
 * Clean data to conform to Prisma expectations
 */
/**
 * Safely strips legacy Mongoose schema fields for Profile and User before Prisma calls.
 * Explicitly and narrowly scoped to avoid altering other models (e.g. Award, BlogPost, JobOpening).
 */
function cleanUnsupportedModelFields(data, modelName) {
    if (!data || typeof data !== 'object')
        return data;
    const mName = String(modelName || '').toLowerCase();
    if (mName === 'profile') {
        delete data.deletedAt;
        delete data.deletedBy;
        delete data.deletedById;
        delete data.deletionReason;
        delete data.statusReason;
        delete data.statusChangedAt;
        delete data.statusChangedBy;
        delete data.statusChangedById;
    }
    else if (mName === 'user') {
        delete data.deletedAt;
        delete data.deletedBy;
        delete data.deletionReason;
        delete data.suspendedAt;
        delete data.suspendedBy;
        delete data.suspensionReason;
    }
    return data;
}
function cleanPrismaData(data, fieldMap = {}) {
    if (!data || typeof data !== 'object')
        return data;
    const clean = { ...data };
    // Remove internal artifacts
    delete clean.__v;
    delete clean.save;
    delete clean.toObject;
    delete clean.toJSON;
    delete clean.$__;
    delete clean.$isNew;
    // Remap fields from fieldMap (e.g. user -> userId)
    for (const [k, v] of Object.entries(fieldMap)) {
        if (clean[k] !== undefined) {
            const val = clean[k];
            clean[v] =
                val && typeof val === 'object' && (val._id || val.id)
                    ? String(val._id || val.id)
                    : val && typeof val.toString === 'function' && val.constructor?.name === 'ObjectId'
                        ? val.toString()
                        : val;
            delete clean[k];
        }
    }
    // Convert any remaining ObjectId values in fields to string
    for (const [key, val] of Object.entries(clean)) {
        if (val && typeof val === 'object') {
            const v = val;
            if (v._id)
                clean[key] = String(v._id);
            else if (v.id && typeof v.id === 'string' && v.id.length >= 24)
                clean[key] = String(v.id);
            else if (typeof v.toString === 'function' && v.constructor?.name === 'ObjectId') {
                clean[key] = v.toString();
            }
        }
    }
    return clean;
}
/**
 * Prepares data for update operation.
 * Returns normal update data; `$setOnInsert` is handled separately
 * by the upsert-aware update methods.
 */
function prepareUpdateData(update, fieldMap = {}) {
    if (!update || typeof update !== 'object')
        return {};
    let data = {};
    if (update.$set) {
        data = { ...update.$set };
    }
    else {
        data = { ...update };
    }
    delete data._id;
    delete data.id;
    delete data.$set;
    delete data.$unset;
    delete data.$setOnInsert;
    delete data.$inc;
    // Handle $inc
    if (update.$inc) {
        for (const [incKey, incVal] of Object.entries(update.$inc)) {
            const targetKey = fieldMap[incKey] || incKey;
            data[targetKey] = { increment: Number(incVal) };
        }
    }
    // Strip raw participants array on scalar update to avoid Prisma validation error
    if (Array.isArray(data.participants)) {
        delete data.participants;
    }
    return cleanPrismaData(data, fieldMap);
}
/**
 * Prepares fields that should only be applied when an upsert
 * creates a new record.
 */
function prepareSetOnInsertData(update, fieldMap = {}) {
    if (!update || typeof update !== 'object' || !update.$setOnInsert) {
        return {};
    }
    const data = { ...update.$setOnInsert };
    delete data._id;
    delete data.id;
    return cleanPrismaData(data, fieldMap);
}
/**
 * Prepares fields for a create operation when an upsert-aware update (e.g. findOneAndUpdate with upsert: true)
 * cannot find an existing record and must create a new one.
 *
 * Ensures:
 * 1. Fields like `$inc: { visitCount: 1 }` (which Prisma converts to `{ increment: 1 }` for updates)
 *    are converted into scalar numbers (e.g. `visitCount: 1`) so Prisma `create` does not fail with
 *    "Argument visitCount: Invalid value provided. Expected Int, provided Object."
 * 2. Values in `$setOnInsert` are merged.
 * 3. Atomic operators like `{ increment: X }`, `{ decrement: X }`, `{ set: X }` are unwrapped into scalar primitives.
 * 4. Filter values from `where` that are objects (like `{ equals: '...' }`) are unwrapped to primitive values.
 */
function prepareCreateDataFromUpdate(update, where, setOnInsertData, updateData, fieldMap = {}) {
    const createData = {};
    // Extract scalar values from where
    if (where && typeof where === 'object') {
        for (const [k, v] of Object.entries(where)) {
            if (k === 'OR' || k === 'AND' || k === 'NOT')
                continue;
            if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
                if ('equals' in v) {
                    createData[k] = v.equals;
                }
                else if (!('contains' in v || 'startsWith' in v || 'endsWith' in v || 'in' in v)) {
                    createData[k] = v;
                }
            }
            else {
                createData[k] = v;
            }
        }
    }
    // Merge setOnInsertData
    if (setOnInsertData && typeof setOnInsertData === 'object') {
        Object.assign(createData, setOnInsertData);
    }
    // Merge updateData, unwrapping update operators to scalar values
    if (updateData && typeof updateData === 'object') {
        for (const [key, val] of Object.entries(updateData)) {
            if (val && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
                if ('increment' in val) {
                    createData[key] = Number(val.increment);
                }
                else if ('decrement' in val) {
                    createData[key] = -Number(val.decrement);
                }
                else if ('set' in val) {
                    createData[key] = val.set;
                }
                else {
                    createData[key] = val;
                }
            }
            else {
                createData[key] = val;
            }
        }
    }
    // If $inc was present in the update object, ensure scalar numbers are initialized
    if (update?.$inc) {
        for (const [incKey, incVal] of Object.entries(update.$inc)) {
            const targetKey = fieldMap[incKey] || incKey;
            if (createData[targetKey] === undefined ||
                (typeof createData[targetKey] === 'object' && createData[targetKey]?.increment !== undefined)) {
                createData[targetKey] = Number(incVal);
            }
        }
    }
    return cleanPrismaData(createData, fieldMap);
}
/**
 * Attaches a `.save()` method to a returned database record so it behaves like a Mongoose document.
 */
function attachSave(record, delegate, fieldMap = {}, delegateName = '') {
    if (!record || typeof record !== 'object')
        return record;
    Object.defineProperty(record, 'save', {
        enumerable: false,
        writable: true,
        configurable: true,
        value: async function () {
            const self = this;
            const id = self.id || self._id;
            const dataToSave = cleanPrismaData({ ...self }, fieldMap);
            delete dataToSave.id;
            delete dataToSave._id;
            if (Array.isArray(dataToSave.participants)) {
                delete dataToSave.participants;
            }
            for (const [key, val] of Object.entries(dataToSave)) {
                if (typeof val === 'function') {
                    delete dataToSave[key];
                }
            }
            const mName = String(delegateName || delegate?.name || '').toLowerCase();
            if (mName.includes('contactinquiry')) {
                dataToSave.replies = dataToSave.replies ?? [];
                dataToSave.statusHistory = dataToSave.statusHistory ?? [];
            }
            cleanUnsupportedModelFields(dataToSave, mName);
            const currentParticipants = self.participants;
            const saved = await delegate.upsert({
                where: { id },
                create: { id, ...dataToSave },
                update: dataToSave,
            });
            Object.assign(self, (0, client_2.toClient)(saved));
            if (currentParticipants !== undefined) {
                self.participants = currentParticipants;
            }
            return self;
        },
    });
    if (!record.toObject) {
        Object.defineProperty(record, 'toObject', {
            enumerable: false,
            writable: true,
            configurable: true,
            value: function () {
                const obj = { ...this };
                delete obj.save;
                delete obj.toObject;
                delete obj.toJSON;
                return obj;
            },
        });
    }
    if (!record.toJSON) {
        Object.defineProperty(record, 'toJSON', {
            enumerable: false,
            writable: true,
            configurable: true,
            value: function () {
                return this.toObject ? this.toObject() : { ...this };
            },
        });
    }
    return record;
}
const prismaModelRelations = {};
const prismaModelAllFields = {};
if (client_1.Prisma?.dmmf?.datamodel?.models) {
    for (const model of client_1.Prisma.dmmf.datamodel.models) {
        const mName = model.name.toLowerCase();
        prismaModelRelations[mName] = {};
        prismaModelAllFields[mName] = new Set(model.fields.map((f) => f.name));
        for (const field of model.fields) {
            if (field.kind === 'object') {
                prismaModelRelations[mName][field.name] = {
                    targetModel: field.type.toLowerCase(),
                    isList: field.isList,
                };
            }
        }
    }
}
/**
 * Checks whether a given path chain (e.g. ['participants', 'user']) consists entirely of valid Prisma relations.
 */
function resolvePrismaRelationPath(startModel, pathSegments) {
    if (!startModel || pathSegments.length === 0)
        return { isValid: false };
    let currentModel = startModel.toLowerCase();
    for (const segment of pathSegments) {
        const rel = prismaModelRelations[currentModel]?.[segment];
        if (!rel)
            return { isValid: false };
        currentModel = rel.targetModel;
    }
    return { isValid: true, leafModel: currentModel };
}
/**
 * Merges nested path segments into a valid nested Prisma include structure without duplicate keys or dotted strings.
 * Example: ['a', 'b'] with leafValue = true -> { a: { include: { b: true } } }
 */
function addNestedInclude(rootInclude, segments, leafValue) {
    if (!segments || segments.length === 0)
        return;
    if (segments.length === 1) {
        const key = segments[0];
        if (rootInclude[key] && typeof rootInclude[key] === 'object' && rootInclude[key].include) {
            if (leafValue && typeof leafValue === 'object' && leafValue.select) {
                rootInclude[key].select = { ...(rootInclude[key].select || {}), ...leafValue.select };
            }
        }
        else {
            rootInclude[key] = leafValue;
        }
        return;
    }
    const [head, ...tail] = segments;
    if (!rootInclude[head] || typeof rootInclude[head] !== 'object' || !rootInclude[head].include) {
        rootInclude[head] = { include: {} };
    }
    addNestedInclude(rootInclude[head].include, tail, leafValue);
}
/**
 * Parses whitespace-separated select field strings (e.g. 'name code' or '-password')
 * into Prisma select dictionary with id/_id mapped to id.
 */
function parseSelectFields(selectStr) {
    if (!selectStr || typeof selectStr !== 'string')
        return undefined;
    const parts = selectStr.split(/\s+/).filter(Boolean);
    if (parts.length === 0 || parts.some((p) => p.startsWith('-')))
        return undefined;
    const selectObj = { id: true };
    for (const p of parts) {
        selectObj[p === '_id' ? 'id' : p] = true;
    }
    return selectObj;
}
const VIRTUAL_FIELD_TO_MODEL = {
    // Country
    countryId: { delegate: 'country', idKey: 'countryId', nameKey: 'country' },
    country: { delegate: 'country', idKey: 'countryId', nameKey: 'country' },
    // State
    stateId: { delegate: 'state', idKey: 'stateId', nameKey: 'state' },
    state: { delegate: 'state', idKey: 'stateId', nameKey: 'state' },
    // District
    districtId: { delegate: 'district', idKey: 'districtId', nameKey: 'district' },
    district: { delegate: 'district', idKey: 'districtId', nameKey: 'district' },
    // SubDistrict
    subDistrictId: { delegate: 'subDistrict', idKey: 'subDistrictId', nameKey: 'subDistrict' },
    subDistrict: { delegate: 'subDistrict', idKey: 'subDistrictId', nameKey: 'subDistrict' },
    // City
    cityId: { delegate: 'city', idKey: 'cityId', nameKey: 'city' },
    city: { delegate: 'city', idKey: 'cityId', nameKey: 'city' },
    // Village
    villageId: { delegate: 'village', idKey: 'villageId', nameKey: 'village' },
    village: { delegate: 'village', idKey: 'villageId', nameKey: 'village' },
    // Religion
    religionId: { delegate: 'religion', idKey: 'religionId', nameKey: 'religion' },
    religion: { delegate: 'religion', idKey: 'religionId', nameKey: 'religion' },
    // Caste
    casteId: { delegate: 'caste', idKey: 'casteId', nameKey: 'caste' },
    caste: { delegate: 'caste', idKey: 'casteId', nameKey: 'caste' },
    // SubCaste
    subCasteId: { delegate: 'subCaste', idKey: 'subCasteId', nameKey: 'subCaste' },
    subCaste: { delegate: 'subCaste', idKey: 'subCasteId', nameKey: 'subCaste' },
    // Language
    motherTongueId: { delegate: 'language', idKey: 'motherTongueId', nameKey: 'motherTongue' },
    motherTongue: { delegate: 'language', idKey: 'motherTongueId', nameKey: 'motherTongue' },
    otherLanguagesIds: { delegate: 'language', idKey: 'otherLanguagesIds', nameKey: 'otherLanguages', isList: true },
    otherLanguages: { delegate: 'language', idKey: 'otherLanguagesIds', nameKey: 'otherLanguages', isList: true },
};
/**
 * Resolves virtual and non-Prisma populates (such as Profile JSON subdocuments and Report.moderator)
 * post-query by batching database queries.
 */
async function resolveVirtualPopulates(records, populates, delegateName) {
    if (!records || records.length === 0 || !populates || populates.length === 0)
        return;
    for (const pop of populates) {
        const rawPath = typeof pop === 'string' ? pop : pop.path;
        const selectStr = typeof pop === 'object' ? pop.select : undefined;
        const selectObj = parseSelectFields(selectStr);
        // 1. Report relations (reporter, reportedUser, reportedProfile, moderator, handledByAdminId)
        // Handled virtually to safely tolerate orphaned foreign keys without Prisma Inconsistent query result crash
        if (delegateName === 'report' && (rawPath === 'reporter' || rawPath === 'reportedUser')) {
            const fieldId = rawPath === 'reporter' ? 'reporterId' : 'reportedUserId';
            const userIds = new Set();
            for (const rec of records) {
                if (!rec)
                    continue;
                const val = rec[fieldId] ||
                    (typeof rec[rawPath] === 'string' ? rec[rawPath] : rec[rawPath]?.id || rec[rawPath]?._id);
                if (val && typeof val === 'string')
                    userIds.add(val);
            }
            if (userIds.size > 0) {
                const users = await client_2.prisma.user.findMany({
                    where: { id: { in: Array.from(userIds) } },
                    select: selectObj ? { id: true, ...selectObj } : undefined,
                });
                const userMap = new Map(users.map((u) => [u.id, (0, client_2.toClient)(u)]));
                for (const rec of records) {
                    if (!rec)
                        continue;
                    const val = rec[fieldId] ||
                        (typeof rec[rawPath] === 'string' ? rec[rawPath] : rec[rawPath]?.id || rec[rawPath]?._id);
                    rec[rawPath] = (val && userMap.get(val)) || null;
                }
            }
            else {
                for (const rec of records) {
                    if (!rec)
                        continue;
                    rec[rawPath] = null;
                }
            }
            continue;
        }
        if (delegateName === 'report' && rawPath === 'reportedProfile') {
            const profileIds = new Set();
            for (const rec of records) {
                if (!rec)
                    continue;
                const val = rec.reportedProfileId ||
                    (typeof rec[rawPath] === 'string' ? rec[rawPath] : rec[rawPath]?.id || rec[rawPath]?._id);
                if (val && typeof val === 'string')
                    profileIds.add(val);
            }
            if (profileIds.size > 0) {
                const profiles = await client_2.prisma.profile.findMany({
                    where: { id: { in: Array.from(profileIds) } },
                    select: selectObj ? { id: true, ...selectObj } : undefined,
                });
                const profMap = new Map(profiles.map((p) => [p.id, (0, client_2.toClient)(p)]));
                for (const rec of records) {
                    if (!rec)
                        continue;
                    const val = rec.reportedProfileId ||
                        (typeof rec[rawPath] === 'string' ? rec[rawPath] : rec[rawPath]?.id || rec[rawPath]?._id);
                    rec[rawPath] = (val && profMap.get(val)) || null;
                }
            }
            else {
                for (const rec of records) {
                    if (!rec)
                        continue;
                    rec[rawPath] = null;
                }
            }
            continue;
        }
        // 2. Moderator / HandledByAdmin (Report or other admin models)
        if (rawPath === 'moderator' || rawPath === 'handledByAdminId') {
            const fieldId = rawPath === 'moderator' ? 'moderatorId' : 'handledByAdminId';
            const userIds = new Set();
            for (const rec of records) {
                if (!rec)
                    continue;
                const val = rec[fieldId] ||
                    (typeof rec[rawPath] === 'string' ? rec[rawPath] : rec[rawPath]?.id || rec[rawPath]?._id);
                if (val && typeof val === 'string')
                    userIds.add(val);
            }
            if (userIds.size > 0) {
                const users = await client_2.prisma.user.findMany({
                    where: { id: { in: Array.from(userIds) } },
                    select: selectObj ? { id: true, ...selectObj } : undefined,
                });
                const userMap = new Map(users.map((u) => [u.id, (0, client_2.toClient)(u)]));
                for (const rec of records) {
                    if (!rec)
                        continue;
                    const val = rec[fieldId] ||
                        (typeof rec[rawPath] === 'string' ? rec[rawPath] : rec[rawPath]?.id || rec[rawPath]?._id);
                    if (val && userMap.has(val)) {
                        rec[rawPath] = userMap.get(val);
                    }
                    else {
                        rec[rawPath] = null;
                    }
                }
            }
            else {
                for (const rec of records) {
                    if (!rec)
                        continue;
                    if (!rec[rawPath] || typeof rec[rawPath] === 'string') {
                        rec[rawPath] = null;
                    }
                }
            }
            continue;
        }
        // 2. Generic createdBy / updatedBy / deletedBy scalar user IDs
        if (rawPath === 'createdBy' || rawPath === 'updatedBy' || rawPath === 'deletedBy') {
            const fieldId = rawPath + 'Id';
            const userIds = new Set();
            for (const rec of records) {
                if (!rec)
                    continue;
                const val = rec[fieldId] ||
                    (typeof rec[rawPath] === 'string' ? rec[rawPath] : rec[rawPath]?.id || rec[rawPath]?._id);
                if (val && typeof val === 'string')
                    userIds.add(val);
            }
            if (userIds.size > 0) {
                const users = await client_2.prisma.user.findMany({
                    where: { id: { in: Array.from(userIds) } },
                    select: selectObj ? { id: true, ...selectObj } : undefined,
                });
                const userMap = new Map(users.map((u) => [u.id, (0, client_2.toClient)(u)]));
                for (const rec of records) {
                    if (!rec)
                        continue;
                    const val = rec[fieldId] ||
                        (typeof rec[rawPath] === 'string' ? rec[rawPath] : rec[rawPath]?.id || rec[rawPath]?._id);
                    if (val && userMap.has(val)) {
                        rec[rawPath] = userMap.get(val);
                    }
                }
            }
            continue;
        }
        // 3. Dotted paths on JSON subdocuments (e.g. currentLocation.countryId, nativePlaceDetails.stateId, communityDetails.religionId, languageDetails.motherTongueId)
        const parts = rawPath.split('.');
        if (parts.length === 2) {
            const [subDocKey, fieldKey] = parts;
            const mapping = VIRTUAL_FIELD_TO_MODEL[fieldKey];
            if (mapping && client_2.prisma[mapping.delegate]) {
                const idSet = new Set();
                for (const rec of records) {
                    if (!rec)
                        continue;
                    let subDoc = rec[subDocKey];
                    if (typeof subDoc === 'string') {
                        try {
                            subDoc = JSON.parse(subDoc);
                            rec[subDocKey] = subDoc;
                        }
                        catch (_) { }
                    }
                    if (subDoc && typeof subDoc === 'object') {
                        const rawVal = subDoc[mapping.idKey] || subDoc[mapping.nameKey];
                        if (mapping.isList) {
                            const list = Array.isArray(rawVal) ? rawVal : rawVal ? [rawVal] : [];
                            for (const item of list) {
                                const id = typeof item === 'object' && item ? item.id || item._id : item;
                                if (id && typeof id === 'string')
                                    idSet.add(id);
                            }
                        }
                        else {
                            const id = typeof rawVal === 'object' && rawVal ? rawVal.id || rawVal._id : rawVal;
                            if (id && typeof id === 'string')
                                idSet.add(id);
                        }
                    }
                }
                if (idSet.size > 0) {
                    const entities = await client_2.prisma[mapping.delegate].findMany({
                        where: { id: { in: Array.from(idSet) } },
                        select: selectObj ? { id: true, ...selectObj } : undefined,
                    });
                    const entityMap = new Map(entities.map((e) => [e.id, (0, client_2.toClient)(e)]));
                    for (const rec of records) {
                        if (!rec)
                            continue;
                        let subDoc = rec[subDocKey];
                        if (typeof subDoc === 'string') {
                            try {
                                subDoc = JSON.parse(subDoc);
                                rec[subDocKey] = subDoc;
                            }
                            catch (_) { }
                        }
                        if (subDoc && typeof subDoc === 'object') {
                            const rawVal = subDoc[mapping.idKey] || subDoc[mapping.nameKey];
                            if (mapping.isList) {
                                const list = Array.isArray(rawVal) ? rawVal : rawVal ? [rawVal] : [];
                                const populated = list.map((item) => {
                                    const id = typeof item === 'object' && item ? item.id || item._id : item;
                                    return entityMap.get(id) || item;
                                });
                                subDoc[mapping.idKey] = populated;
                                subDoc[mapping.nameKey] = populated;
                            }
                            else {
                                const id = typeof rawVal === 'object' && rawVal ? rawVal.id || rawVal._id : rawVal;
                                if (id && entityMap.has(id)) {
                                    const populated = entityMap.get(id);
                                    subDoc[mapping.idKey] = populated;
                                    subDoc[mapping.nameKey] = populated;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
/**
 * Chainable query builder simulating Mongoose Query API on top of Prisma.
 */
class PrismaQueryBuilder {
    constructor(prismaDelegate, filter = {}, isFindOne = false, fieldMap = {}, delegateName = '') {
        this.queryOptions = {};
        this.populateParticipants = false;
        this.populatedRelations = [];
        this.virtualPopulates = [];
        this.prismaDelegate = prismaDelegate;
        this.fieldMap = fieldMap;
        this.where = normalizeFilter(filter, fieldMap);
        this.isFindOne = isFindOne;
        this.delegateName = delegateName;
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
        if (this.delegateName === 'conversation' && targetPath === 'participants') {
            const selectFieldsObj = parseSelectFields(targetSelect);
            this.queryOptions.include.participants = {
                include: {
                    user: selectFieldsObj ? { select: selectFieldsObj } : true,
                },
            };
            this.populateParticipants = true;
            return this;
        }
        // Map Mongoose FK paths (e.g. districtId, stateId, religionId) to Prisma relation field names
        const POPULATE_RELATION_MAP = {
            districtId: 'district',
            stateId: 'state',
            subDistrictId: 'subDistrict',
            religionId: 'religion',
            casteId: 'caste',
            subCasteId: 'subCaste',
            countryId: 'country',
            userId: 'user',
            createdBy: 'createdBy',
            updatedBy: 'updatedBy',
            deletedBy: 'deletedBy',
        };
        const isDotted = targetPath.includes('.');
        const selectObj = parseSelectFields(targetSelect);
        const leafValue = selectObj ? { select: selectObj } : true;
        if (!isDotted) {
            if (this.delegateName === 'report' &&
                ['reporter', 'reportedUser', 'reportedProfile', 'moderator', 'handledByAdminId'].includes(targetPath)) {
                this.virtualPopulates.push({ path: targetPath, select: targetSelect });
                return this;
            }
            const relationName = POPULATE_RELATION_MAP[targetPath] ||
                (targetPath.endsWith('Id') ? targetPath.slice(0, -2) : targetPath);
            const isRealRelation = resolvePrismaRelationPath(this.delegateName, [relationName]).isValid;
            if (isRealRelation) {
                this.populatedRelations.push({ path: targetPath, relationName });
                addNestedInclude(this.queryOptions.include, [relationName], leafValue);
            }
            else {
                // Scalar / virtual populate (e.g. moderator, createdBy, etc.)
                this.virtualPopulates.push({ path: targetPath, select: targetSelect });
            }
            return this;
        }
        // Dotted path (e.g. currentLocation.countryId or nested relations)
        const rawSegments = targetPath.split('.');
        const normalizedSegments = rawSegments.map((seg) => POPULATE_RELATION_MAP[seg] || (seg.endsWith('Id') ? seg.slice(0, -2) : seg));
        const isRealNestedRelation = resolvePrismaRelationPath(this.delegateName, normalizedSegments).isValid;
        if (isRealNestedRelation) {
            addNestedInclude(this.queryOptions.include, normalizedSegments, leafValue);
            this.populatedRelations.push({
                path: targetPath,
                relationName: normalizedSegments[normalizedSegments.length - 1],
            });
        }
        else {
            // JSON subdocument or virtual dotted populate
            this.virtualPopulates.push({ path: targetPath, select: targetSelect });
        }
        return this;
    }
    lean() {
        return this;
    }
    async exec() {
        const args = { where: this.where };
        if (this.delegateName === 'conversation' &&
            !this.queryOptions.select &&
            !this.queryOptions.include?.participants) {
            if (!this.queryOptions.include)
                this.queryOptions.include = {};
            this.queryOptions.include.participants = true;
        }
        if (this.queryOptions.sort)
            args.orderBy = this.queryOptions.sort;
        if (this.queryOptions.skip !== undefined)
            args.skip = this.queryOptions.skip;
        if (this.queryOptions.limit !== undefined)
            args.take = this.queryOptions.limit;
        // Sanitize and normalize includes
        let cleanInclude = undefined;
        if (this.queryOptions.include && Object.keys(this.queryOptions.include).length > 0) {
            cleanInclude = {};
            for (const [k, v] of Object.entries(this.queryOptions.include)) {
                if (this.delegateName === 'report' &&
                    ['reporter', 'reportedUser', 'reportedProfile', 'moderator', 'handledByAdminId'].includes(k)) {
                    const selectStr = v?.select ? Object.keys(v.select).join(' ') : undefined;
                    this.virtualPopulates.push({ path: k, select: selectStr });
                    continue;
                }
                if (k.includes('.')) {
                    const segs = k.split('.');
                    if (resolvePrismaRelationPath(this.delegateName, segs).isValid) {
                        addNestedInclude(cleanInclude, segs, v);
                    }
                    else {
                        this.virtualPopulates.push({ path: k });
                    }
                }
                else if (resolvePrismaRelationPath(this.delegateName, [k]).isValid) {
                    cleanInclude[k] = v;
                }
                else {
                    // Not a valid Prisma relation on this model -> route to virtual populate
                    this.virtualPopulates.push({ path: k });
                }
            }
            if (Object.keys(cleanInclude).length === 0) {
                cleanInclude = undefined;
            }
        }
        if (this.queryOptions.select) {
            args.select = { ...this.queryOptions.select };
            if (cleanInclude) {
                for (const [k, v] of Object.entries(cleanInclude)) {
                    args.select[k] = v;
                }
            }
            const known = prismaModelAllFields[this.delegateName?.toLowerCase()];
            if (known) {
                for (const k of Object.keys(args.select)) {
                    if (!known.has(k)) {
                        delete args.select[k];
                    }
                }
            }
        }
        else if (cleanInclude) {
            args.include = cleanInclude;
        }
        const formatRecord = (rec) => {
            if (!rec)
                return rec;
            if (this.delegateName === 'conversation' && Array.isArray(rec.participants)) {
                if (this.populateParticipants) {
                    rec.participants = rec.participants.map((cp) => (0, client_2.toClient)(cp.user ? { ...cp.user, _id: cp.user.id } : { _id: cp.userId, id: cp.userId }));
                }
                else {
                    rec.participants = rec.participants.map((cp) => cp.userId ? cp.userId : String(cp._id || cp.id || cp));
                }
            }
            for (const { path: pPath, relationName } of this.populatedRelations) {
                if (rec[relationName] !== undefined && rec[relationName] !== null) {
                    rec[pPath] = (0, client_2.toClient)(rec[relationName]);
                }
            }
            return rec;
        };
        if (this.isFindOne) {
            const record = await this.prismaDelegate.findFirst(args);
            if (!record)
                return null;
            if (this.virtualPopulates.length > 0) {
                await resolveVirtualPopulates([record], this.virtualPopulates, this.delegateName);
            }
            const clientRecord = formatRecord((0, client_2.toClient)(record));
            return attachSave(clientRecord, this.prismaDelegate, this.fieldMap, this.delegateName);
        }
        else {
            const records = await this.prismaDelegate.findMany(args);
            if (records.length > 0 && this.virtualPopulates.length > 0) {
                await resolveVirtualPopulates(records, this.virtualPopulates, this.delegateName);
            }
            const clientRecords = (0, client_2.toClientArray)(records).map((r) => attachSave(formatRecord(r), this.prismaDelegate, this.fieldMap, this.delegateName));
            return clientRecords;
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
class PrismaUpdateQuery {
    constructor(updateFn) {
        this.populateList = [];
        this.updateFn = updateFn;
    }
    select(...args) {
        return this;
    }
    populate(path, selectFields) {
        const targetPath = typeof path === 'string' ? path : path.path;
        const targetSelect = typeof path === 'object' && path.select ? path.select : selectFields;
        this.populateList.push({ path: targetPath, select: targetSelect });
        return this;
    }
    lean() {
        return this;
    }
    exec() {
        return this.updateFn({ populate: this.populateList });
    }
    then(onfulfilled, onrejected) {
        return this.exec().then(onfulfilled, onrejected);
    }
    catch(onrejected) {
        return this.exec().catch(onrejected);
    }
}
exports.PrismaUpdateQuery = PrismaUpdateQuery;
/**
 * Robust in-memory aggregation runner for MongoDB pipelines over MySQL/Prisma records.
 */
async function runPrismaAggregate(delegate, pipeline = [], fieldMap = {}) {
    if (!Array.isArray(pipeline) || pipeline.length === 0) {
        return [];
    }
    let initialWhere = {};
    let startIndex = 0;
    if (pipeline[0] && pipeline[0].$match) {
        initialWhere = normalizeFilter(pipeline[0].$match, fieldMap);
        startIndex = 1;
    }
    const rawRecords = await delegate.findMany({ where: initialWhere });
    let current = (0, client_2.toClientArray)(rawRecords);
    for (let i = startIndex; i < pipeline.length; i++) {
        const stage = pipeline[i];
        const stageType = Object.keys(stage)[0];
        const stageVal = stage[stageType];
        switch (stageType) {
            case '$match': {
                const filter = stageVal;
                current = current.filter((item) => {
                    for (const [k, v] of Object.entries(filter)) {
                        const itemKey = k === '_id' ? 'id' : k;
                        if (typeof v === 'object' && v !== null) {
                            if ('$gt' in v && !(item[itemKey] > v.$gt))
                                return false;
                            if ('$gte' in v && !(item[itemKey] >= v.$gte))
                                return false;
                            if ('$lt' in v && !(item[itemKey] < v.$lt))
                                return false;
                            if ('$lte' in v && !(item[itemKey] <= v.$lte))
                                return false;
                            if ('$ne' in v && item[itemKey] === v.$ne)
                                return false;
                            if ('$in' in v && !(v.$in.includes(item[itemKey])))
                                return false;
                        }
                        else if (item[itemKey] !== v) {
                            return false;
                        }
                    }
                    return true;
                });
                break;
            }
            case '$group': {
                const groups = new Map();
                const idExpr = stageVal._id;
                for (const doc of current) {
                    let key = null;
                    if (idExpr === null) {
                        key = '__null__';
                    }
                    else if (typeof idExpr === 'string' && idExpr.startsWith('$')) {
                        const field = idExpr.slice(1);
                        key = doc[field];
                    }
                    else {
                        key = idExpr;
                    }
                    const keyStr = typeof key === 'object' ? JSON.stringify(key) : String(key);
                    if (!groups.has(keyStr)) {
                        groups.set(keyStr, []);
                    }
                    groups.get(keyStr).push(doc);
                }
                const results = [];
                for (const [, docs] of groups.entries()) {
                    const groupResult = {};
                    const first = docs[0];
                    if (idExpr === null) {
                        groupResult._id = null;
                    }
                    else if (typeof idExpr === 'string' && idExpr.startsWith('$')) {
                        const field = idExpr.slice(1);
                        groupResult._id = first[field];
                    }
                    else {
                        groupResult._id = idExpr;
                    }
                    for (const [prop, acc] of Object.entries(stageVal)) {
                        if (prop === '_id')
                            continue;
                        if (typeof acc === 'object' && acc !== null) {
                            if ('$sum' in acc) {
                                const sumExpr = acc.$sum;
                                let sum = 0;
                                for (const d of docs) {
                                    if (typeof sumExpr === 'number') {
                                        sum += sumExpr;
                                    }
                                    else if (typeof sumExpr === 'string' && sumExpr.startsWith('$')) {
                                        sum += Number(d[sumExpr.slice(1)]) || 0;
                                    }
                                    else if (typeof sumExpr === 'object' && sumExpr.$cond) {
                                        const [cond, trueVal, falseVal] = sumExpr.$cond;
                                        let isTrue = false;
                                        if (cond?.$in) {
                                            const [targetField, targetList] = cond.$in;
                                            const val = typeof targetField === 'string' && targetField.startsWith('$')
                                                ? d[targetField.slice(1)]
                                                : targetField;
                                            isTrue = Array.isArray(targetList) && targetList.includes(val);
                                        }
                                        const valToAdd = isTrue
                                            ? typeof trueVal === 'string' && trueVal.startsWith('$')
                                                ? Number(d[trueVal.slice(1)]) || 0
                                                : Number(trueVal) || 0
                                            : typeof falseVal === 'string' && falseVal.startsWith('$')
                                                ? Number(d[falseVal.slice(1)]) || 0
                                                : Number(falseVal) || 0;
                                        sum += valToAdd;
                                    }
                                }
                                groupResult[prop] = sum;
                            }
                            else if ('$addToSet' in acc) {
                                const field = acc.$addToSet;
                                const set = new Set();
                                for (const d of docs) {
                                    const val = typeof field === 'string' && field.startsWith('$') ? d[field.slice(1)] : field;
                                    if (val !== undefined && val !== null)
                                        set.add(val);
                                }
                                groupResult[prop] = Array.from(set);
                            }
                            else if ('$push' in acc) {
                                const field = acc.$push;
                                groupResult[prop] = docs.map((d) => typeof field === 'string' && field.startsWith('$') ? d[field.slice(1)] : field);
                            }
                        }
                    }
                    results.push(groupResult);
                }
                current = results;
                break;
            }
            case '$project': {
                current = current.map((doc) => {
                    const res = {};
                    for (const [field, spec] of Object.entries(stageVal)) {
                        if (spec === 1 || spec === true) {
                            res[field] = doc[field];
                        }
                        else if (typeof spec === 'string' && spec.startsWith('$')) {
                            res[field] = doc[spec.slice(1)];
                        }
                        else if (typeof spec === 'object' && spec !== null) {
                            if ('$size' in spec) {
                                const target = spec.$size;
                                const arr = typeof target === 'string' && target.startsWith('$') ? doc[target.slice(1)] : target;
                                res[field] = Array.isArray(arr) ? arr.length : 0;
                            }
                        }
                    }
                    return res;
                });
                break;
            }
            case '$sort': {
                const norm = normalizeSort(stageVal);
                if (norm && norm.length > 0) {
                    current = [...current].sort((a, b) => {
                        for (const sortItem of norm) {
                            const [field, dir] = Object.entries(sortItem)[0];
                            const valA = a[field];
                            const valB = b[field];
                            if (valA < valB)
                                return dir === 'desc' ? 1 : -1;
                            if (valA > valB)
                                return dir === 'desc' ? -1 : 1;
                        }
                        return 0;
                    });
                }
                break;
            }
            case '$skip': {
                current = current.slice(Number(stageVal) || 0);
                break;
            }
            case '$limit': {
                current = current.slice(0, Number(stageVal) || 0);
                break;
            }
            case '$count': {
                current = [{ [stageVal]: current.length }];
                break;
            }
            default:
                break;
        }
    }
    return current;
}
/**
 * Creates a Model Adapter wrapping a Prisma Delegate.
 * Provides a 100% MySQL/Prisma backed drop-in replacement for Mongoose models.
 */
function createPrismaModelAdapter(delegateName, fieldMap = {}) {
    const getDelegate = () => client_2.prisma[delegateName];
    function ModelConstructor(data = {}) {
        if (!(this instanceof ModelConstructor)) {
            return new ModelConstructor(data);
        }
        const clean = cleanPrismaData(data, fieldMap);
        Object.assign(this, clean);
        const self = this;
        if (!self.id && !self._id) {
            const newId = (0, client_2.generateObjectId)();
            self.id = newId;
            self._id = newId;
        }
        else if (self.id && !self._id) {
            self._id = self.id;
        }
        else if (self._id && !self.id) {
            self.id = self._id;
        }
        attachSave(this, getDelegate(), fieldMap, String(delegateName));
    }
    ModelConstructor.prototype.toObject = function () {
        const obj = { ...this };
        delete obj.save;
        delete obj.toObject;
        delete obj.toJSON;
        return obj;
    };
    ModelConstructor.prototype.toJSON = function () {
        return this.toObject();
    };
    ModelConstructor.find = function (filter = {}) {
        return new PrismaQueryBuilder(getDelegate(), filter, false, fieldMap, String(delegateName));
    };
    ModelConstructor.findOne = function (filter = {}) {
        return new PrismaQueryBuilder(getDelegate(), filter, true, fieldMap, String(delegateName));
    };
    ModelConstructor.findById = function (id) {
        const stringId = id?._id ? String(id._id) : id?.id ? String(id.id) : String(id);
        return new PrismaQueryBuilder(getDelegate(), { id: stringId }, true, fieldMap, String(delegateName));
    };
    ModelConstructor.create = async function (data) {
        const delegate = getDelegate();
        if (Array.isArray(data)) {
            const results = [];
            for (const item of data) {
                const res = await ModelConstructor.create(item);
                results.push(res);
            }
            return results;
        }
        const id = data.id || data._id || (0, client_2.generateObjectId)();
        if (delegateName === 'conversation' && data.participants && Array.isArray(data.participants)) {
            const participantIds = data.participants.map((p) => p && typeof p === 'object' ? String(p._id || p.id) : String(p));
            const cleanData = cleanUnsupportedModelFields(cleanPrismaData({ ...data, id }, fieldMap), String(delegateName));
            delete cleanData.participants;
            const created = await delegate.create({
                data: {
                    ...cleanData,
                    participants: {
                        create: participantIds.map((uId) => ({ userId: uId })),
                    },
                },
                include: {
                    participants: true,
                },
            });
            const clientObj = (0, client_2.toClient)(created);
            clientObj.participants = participantIds;
            return attachSave(clientObj, delegate, fieldMap, String(delegateName));
        }
        const cleanData = cleanPrismaData({ ...data, id }, fieldMap);
        const mName = String(delegateName).toLowerCase();
        if (mName === 'contactinquiry') {
            cleanData.replies = cleanData.replies ?? [];
            cleanData.statusHistory = cleanData.statusHistory ?? [];
        }
        const created = await delegate.create({ data: cleanData });
        return attachSave((0, client_2.toClient)(created), delegate, fieldMap, String(delegateName));
    };
    ModelConstructor.insertMany = async function (data, options) {
        return ModelConstructor.create(data);
    };
    ModelConstructor.updateOne = async function (filter, update, options = {}) {
        const delegate = getDelegate();
        const where = normalizeFilter(filter, fieldMap);
        const updateData = cleanUnsupportedModelFields(prepareUpdateData(update, fieldMap), String(delegateName));
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
    };
    ModelConstructor.updateMany = async function (filter, update, options = {}) {
        return ModelConstructor.updateOne(filter, update, options);
    };
    ModelConstructor.findByIdAndUpdate = function (id, update, options = {}) {
        return new PrismaUpdateQuery(async (opts) => {
            const delegate = getDelegate();
            const stringId = id?._id ? String(id._id) : id?.id ? String(id.id) : String(id);
            const updateData = cleanUnsupportedModelFields(prepareUpdateData(update, fieldMap), String(delegateName));
            try {
                const updated = await delegate.update({
                    where: { id: stringId },
                    data: updateData,
                });
                const clientObj = (0, client_2.toClient)(updated);
                if (delegateName === 'conversation') {
                    const populateParticipantsOpt = opts?.populate?.find((p) => p.path === 'participants');
                    const pRows = await client_2.prisma.conversationParticipant.findMany({
                        where: { conversationId: stringId },
                        include: populateParticipantsOpt ? { user: true } : undefined,
                    });
                    if (populateParticipantsOpt) {
                        clientObj.participants = pRows.map((cp) => (0, client_2.toClient)(cp.user ? { ...cp.user, _id: cp.user.id } : { _id: cp.userId, id: cp.userId }));
                    }
                    else {
                        clientObj.participants = pRows.map((cp) => cp.userId);
                    }
                }
                if (opts?.populate && opts.populate.length > 0) {
                    await resolveVirtualPopulates([clientObj], opts.populate, String(delegateName));
                }
                return attachSave(clientObj, delegate, fieldMap, String(delegateName));
            }
            catch (err) {
                if (err.code === 'P2025') {
                    if (options?.upsert) {
                        const setOnInsertData = prepareSetOnInsertData(update, fieldMap);
                        const createData = prepareCreateDataFromUpdate(update, { id: stringId }, setOnInsertData, updateData, fieldMap);
                        const created = await delegate.create({
                            data: {
                                id: stringId,
                                ...createData,
                            },
                        });
                        const clientObj = (0, client_2.toClient)(created);
                        if (opts?.populate && opts.populate.length > 0) {
                            await resolveVirtualPopulates([clientObj], opts.populate, String(delegateName));
                        }
                        return attachSave(clientObj, delegate, fieldMap, String(delegateName));
                    }
                    return null;
                }
                throw err;
            }
        });
    };
    ModelConstructor.findOneAndUpdate = function (filter, update, options = {}) {
        return new PrismaUpdateQuery(async (opts) => {
            const delegate = getDelegate();
            const where = normalizeFilter(filter, fieldMap);
            const updateData = cleanUnsupportedModelFields(prepareUpdateData(update, fieldMap), String(delegateName));
            const existing = await delegate.findFirst({ where });
            if (!existing) {
                if (options?.upsert) {
                    const id = (0, client_2.generateObjectId)();
                    const setOnInsertData = prepareSetOnInsertData(update, fieldMap);
                    const createData = prepareCreateDataFromUpdate(update, where, setOnInsertData, updateData, fieldMap);
                    try {
                        const created = await delegate.create({
                            data: {
                                id,
                                ...createData,
                            },
                        });
                        const clientObj = (0, client_2.toClient)(created);
                        if (opts?.populate && opts.populate.length > 0) {
                            await resolveVirtualPopulates([clientObj], opts.populate, String(delegateName));
                        }
                        return attachSave(clientObj, delegate, fieldMap, String(delegateName));
                    }
                    catch (createErr) {
                        if (createErr.code === 'P2002') {
                            // Concurrency collision: another process created the record with unique constraints
                            const existingRecord = await delegate.findFirst({ where });
                            if (existingRecord) {
                                const updated = await delegate.update({
                                    where: { id: existingRecord.id },
                                    data: updateData,
                                });
                                const clientObj = (0, client_2.toClient)(updated);
                                if (opts?.populate && opts.populate.length > 0) {
                                    await resolveVirtualPopulates([clientObj], opts.populate, String(delegateName));
                                }
                                return attachSave(clientObj, delegate, fieldMap);
                            }
                        }
                        throw createErr;
                    }
                }
                return null;
            }
            const updated = await delegate.update({
                where: { id: existing.id },
                data: updateData,
            });
            const clientObj = (0, client_2.toClient)(updated);
            if (delegateName === 'conversation') {
                const populateParticipantsOpt = opts?.populate?.find((p) => p.path === 'participants');
                const pRows = await client_2.prisma.conversationParticipant.findMany({
                    where: { conversationId: existing.id },
                    include: populateParticipantsOpt ? { user: true } : undefined,
                });
                if (populateParticipantsOpt) {
                    clientObj.participants = pRows.map((cp) => (0, client_2.toClient)(cp.user ? { ...cp.user, _id: cp.user.id } : { _id: cp.userId, id: cp.userId }));
                }
                else {
                    clientObj.participants = pRows.map((cp) => cp.userId);
                }
            }
            if (opts?.populate && opts.populate.length > 0) {
                await resolveVirtualPopulates([clientObj], opts.populate, String(delegateName));
            }
            return attachSave(clientObj, delegate, fieldMap);
        });
    };
    ModelConstructor.deleteOne = async function (filter) {
        const delegate = getDelegate();
        const where = normalizeFilter(filter, fieldMap);
        const result = await delegate.deleteMany({ where });
        return { acknowledged: true, deletedCount: result.count };
    };
    ModelConstructor.deleteMany = async function (filter) {
        return ModelConstructor.deleteOne(filter);
    };
    ModelConstructor.findByIdAndDelete = async function (id) {
        const delegate = getDelegate();
        const stringId = id?._id ? String(id._id) : id?.id ? String(id.id) : String(id);
        try {
            const deleted = await delegate.delete({ where: { id: stringId } });
            return (0, client_2.toClient)(deleted);
        }
        catch (err) {
            if (err.code === 'P2025')
                return null;
            throw err;
        }
    };
    ModelConstructor.countDocuments = async function (filter = {}) {
        const delegate = getDelegate();
        const where = normalizeFilter(filter, fieldMap);
        return delegate.count({ where });
    };
    ModelConstructor.estimatedDocumentCount = async function () {
        return getDelegate().count();
    };
    ModelConstructor.distinct = async function (field, filter = {}) {
        const delegate = getDelegate();
        const where = normalizeFilter(filter, fieldMap);
        const prismaField = fieldMap[field] || (field === '_id' ? 'id' : field);
        const records = await delegate.findMany({
            where,
            select: { [prismaField]: true },
            distinct: [prismaField],
        });
        return records.map((r) => r[prismaField]).filter((v) => v !== null && v !== undefined);
    };
    ModelConstructor.aggregate = async function (pipeline = []) {
        return runPrismaAggregate(getDelegate(), pipeline, fieldMap);
    };
    return ModelConstructor;
}
/**
 * Types & ObjectId compatibility helper to replace mongoose.Types without needing MongoDB.
 */
exports.Types = {
    ObjectId: class ObjectId {
        constructor(id) {
            if (id && typeof id === 'object' && (id._id || id.id)) {
                this.id = String(id._id || id.id);
            }
            else {
                this.id = id ? String(id) : (0, client_2.generateObjectId)();
            }
        }
        toString() {
            return this.id;
        }
        valueOf() {
            return this.id;
        }
        toJSON() {
            return this.id;
        }
        equals(other) {
            return this.id === String(other?._id || other?.id || other);
        }
        static isValid(id) {
            return typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
        }
    },
};
exports.Schema = Object.assign(function Schema(def = {}, options = {}) {
    const virtualObj = {
        get: function (..._args) {
            return virtualObj;
        },
        set: function (..._args) {
            return virtualObj;
        },
    };
    const schemaObj = {
        def,
        options,
        methods: {},
        statics: {},
        index: function (..._args) {
            return schemaObj;
        },
        virtual: function (..._args) {
            return virtualObj;
        },
        pre: function (..._args) {
            return schemaObj;
        },
        post: function (..._args) {
            return schemaObj;
        },
        plugin: function (..._args) {
            return schemaObj;
        },
        set: function (..._args) {
            return schemaObj;
        },
        path: function (..._args) {
            return {};
        },
    };
    return schemaObj;
}, {
    Types: {
        ObjectId: exports.Types.ObjectId,
        Mixed: 'Mixed',
        String: String,
        Number: Number,
        Boolean: Boolean,
        Date: Date,
        Array: Array,
    },
});
exports.mongoose = {
    Types: exports.Types,
    Schema: exports.Schema,
    models: {},
    model: (name, schema) => {
        const delegate = name.charAt(0).toLowerCase() + name.slice(1);
        return createPrismaModelAdapter(delegate);
    },
    isValidObjectId: (id) => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id),
};
exports.default = exports.mongoose;
//# sourceMappingURL=prismaBridge.js.map