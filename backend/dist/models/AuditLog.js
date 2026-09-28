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
exports.AuditLog = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const auditLogSchema = new mongoose_1.Schema({
    adminUser: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    adminId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    adminEmail: { type: String, required: true },
    adminName: { type: String, trim: true },
    action: { type: String, required: true, index: true },
    targetModel: { type: String, index: true },
    targetId: { type: String, index: true },
    targetProfileId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Profile', index: true },
    targetUserId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', index: true },
    previousStatus: { type: String, trim: true },
    newStatus: { type: String, trim: true },
    reason: { type: String, trim: true },
    relatedReportId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Report' },
    details: { type: String },
    ipAddress: { type: String, default: '127.0.0.1' },
    status: { type: String, enum: ['SUCCESS', 'FAILED', 'WARNING'], default: 'SUCCESS' },
    metadata: { type: mongoose_1.Schema.Types.Mixed },
}, { timestamps: true });
exports.AuditLog = mongoose_1.default.models.AuditLog || mongoose_1.default.model('AuditLog', auditLogSchema);
//# sourceMappingURL=AuditLog.js.map