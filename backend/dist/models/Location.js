"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Village = exports.City = exports.SubDistrict = exports.District = exports.State = exports.Country = void 0;
const prismaBridge_1 = require("../db/prismaBridge");
const countrySchema = new prismaBridge_1.Schema({
    name: { type: String, required: true, trim: true, unique: true, index: true },
    code: { type: String, required: true, trim: true, uppercase: true, unique: true, index: true },
    isoCode: { type: String, required: true, trim: true, uppercase: true, index: true },
    phoneCode: { type: String, trim: true },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 999, index: true },
    sourceType: { type: String, default: 'GOVERNMENT', index: true },
    source: { type: String, default: 'ISO-3166 / Census India' },
}, { timestamps: true });
const stateSchema = new prismaBridge_1.Schema({
    countryId: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'Country', required: true, index: true },
    name: { type: String, required: true, trim: true, index: true },
    code: { type: String, required: true, trim: true, uppercase: true, index: true },
    type: { type: String, enum: ['State', 'Union Territory'], default: 'State', index: true },
    lgdCode: { type: String, trim: true, index: true },
    censusCode: { type: String, trim: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 999, index: true },
    sourceType: { type: String, default: 'GOVERNMENT', index: true },
    source: { type: String, default: 'LGD / Census India' },
}, { timestamps: true });
stateSchema.index({ countryId: 1, name: 1 }, { unique: true });
const districtSchema = new prismaBridge_1.Schema({
    stateId: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'State', required: true, index: true },
    countryId: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'Country', required: true, index: true },
    name: { type: String, required: true, trim: true, index: true },
    code: { type: String, trim: true, uppercase: true },
    lgdCode: { type: String, trim: true, index: true },
    censusCode: { type: String, trim: true, index: true },
    headquarters: { type: String, trim: true },
    isActive: { type: Boolean, default: true, index: true },
    sourceType: { type: String, default: 'GOVERNMENT', index: true },
    source: { type: String, default: 'Local Government Directory (LGD)' },
}, { timestamps: true });
districtSchema.index({ stateId: 1, name: 1 }, { unique: true });
const subDistrictSchema = new prismaBridge_1.Schema({
    districtId: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'District', required: true, index: true },
    stateId: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'State', required: true, index: true },
    name: { type: String, required: true, trim: true, index: true },
    code: { type: String, trim: true, uppercase: true },
    type: {
        type: String,
        enum: ['Taluka', 'Tehsil', 'Tahsil', 'Sub-District', 'Mandal', 'Revenue Division'],
        default: 'Taluka',
        index: true,
    },
    lgdCode: { type: String, trim: true, index: true },
    censusCode: { type: String, trim: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
    sourceType: { type: String, default: 'GOVERNMENT', index: true },
    source: { type: String, default: 'Local Government Directory (LGD)' },
}, { timestamps: true });
subDistrictSchema.index({ districtId: 1, name: 1 }, { unique: true });
const citySchema = new prismaBridge_1.Schema({
    districtId: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'District', required: true, index: true },
    stateId: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'State', required: true, index: true },
    subDistrictId: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'SubDistrict', index: true },
    name: { type: String, required: true, trim: true, index: true },
    code: { type: String, trim: true },
    type: {
        type: String,
        enum: ['City', 'Town', 'Municipal Corporation', 'Municipality', 'Cantonment'],
        default: 'City',
        index: true,
    },
    pincode: { type: String, trim: true, index: true },
    lgdCode: { type: String, trim: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 999, index: true },
    sourceType: { type: String, default: 'GOVERNMENT', index: true },
    source: { type: String, default: 'Local Government Directory (LGD) / ULB Master' },
}, { timestamps: true });
citySchema.index({ districtId: 1, name: 1 });
citySchema.index({ name: 'text' });
const villageSchema = new prismaBridge_1.Schema({
    subDistrictId: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'SubDistrict', required: true, index: true },
    districtId: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'District', required: true, index: true },
    stateId: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'State', required: true, index: true },
    name: { type: String, required: true, trim: true, index: true },
    code: { type: String, trim: true },
    villageCode: { type: String, trim: true, index: true },
    lgdCode: { type: String, trim: true, index: true },
    pincode: { type: String, trim: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
    sourceType: { type: String, default: 'GOVERNMENT', index: true },
    source: { type: String, default: 'Local Government Directory (LGD)' },
}, { timestamps: true });
villageSchema.index({ subDistrictId: 1, name: 1 });
villageSchema.index({ name: 'text' });
exports.Country = (0, prismaBridge_1.createPrismaModelAdapter)('country');
exports.State = (0, prismaBridge_1.createPrismaModelAdapter)('state', { country: 'countryId', countryId: 'countryId' });
exports.District = (0, prismaBridge_1.createPrismaModelAdapter)('district', { state: 'stateId', stateId: 'stateId', country: 'countryId', countryId: 'countryId' });
exports.SubDistrict = (0, prismaBridge_1.createPrismaModelAdapter)('subDistrict', { district: 'districtId', districtId: 'districtId' });
exports.City = (0, prismaBridge_1.createPrismaModelAdapter)('city', { state: 'stateId', stateId: 'stateId', district: 'districtId', districtId: 'districtId', subDistrict: 'subDistrictId', subDistrictId: 'subDistrictId' });
exports.Village = (0, prismaBridge_1.createPrismaModelAdapter)('village', { subDistrict: 'subDistrictId', subDistrictId: 'subDistrictId', district: 'districtId', districtId: 'districtId', state: 'stateId', stateId: 'stateId' });
//# sourceMappingURL=Location.js.map