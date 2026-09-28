"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Village = exports.City = exports.SubDistrict = exports.District = exports.State = exports.Country = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const countrySchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true, unique: true, index: true },
    code: { type: String, required: true, trim: true, uppercase: true, unique: true, index: true },
    isoCode: { type: String, required: true, trim: true, uppercase: true, index: true },
    phoneCode: { type: String, trim: true },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 999, index: true },
    sourceType: { type: String, default: 'GOVERNMENT', index: true },
    source: { type: String, default: 'ISO-3166 / Census India' },
}, { timestamps: true });
const stateSchema = new mongoose_1.Schema({
    countryId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Country', required: true, index: true },
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
const districtSchema = new mongoose_1.Schema({
    stateId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'State', required: true, index: true },
    countryId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Country', required: true, index: true },
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
const subDistrictSchema = new mongoose_1.Schema({
    districtId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'District', required: true, index: true },
    stateId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'State', required: true, index: true },
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
const citySchema = new mongoose_1.Schema({
    districtId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'District', required: true, index: true },
    stateId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'State', required: true, index: true },
    subDistrictId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'SubDistrict', index: true },
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
const villageSchema = new mongoose_1.Schema({
    subDistrictId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'SubDistrict', required: true, index: true },
    districtId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'District', required: true, index: true },
    stateId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'State', required: true, index: true },
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
exports.Country = mongoose_1.default.model('Country', countrySchema);
exports.State = mongoose_1.default.model('State', stateSchema);
exports.District = mongoose_1.default.model('District', districtSchema);
exports.SubDistrict = mongoose_1.default.model('SubDistrict', subDistrictSchema);
exports.City = mongoose_1.default.model('City', citySchema);
exports.Village = mongoose_1.default.model('Village', villageSchema);
//# sourceMappingURL=Location.js.map