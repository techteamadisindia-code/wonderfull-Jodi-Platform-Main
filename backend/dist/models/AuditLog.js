"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLog = void 0;
const prismaBridge_1 = require("../db/prismaBridge");
const auditLogSchema = new prismaBridge_1.Schema({
    adminUser: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'User' },
    adminId: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'User' },
    adminEmail: { type: String, required: true },
    adminName: { type: String, trim: true },
    action: { type: String, required: true, index: true },
    targetModel: { type: String, index: true },
    targetId: { type: String, index: true },
    targetProfileId: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'Profile', index: true },
    targetUserId: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'User', index: true },
    previousStatus: { type: String, trim: true },
    newStatus: { type: String, trim: true },
    reason: { type: String, trim: true },
    relatedReportId: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'Report' },
    details: { type: String },
    ipAddress: { type: String, default: '127.0.0.1' },
    status: { type: String, enum: ['SUCCESS', 'FAILED', 'WARNING'], default: 'SUCCESS' },
    metadata: { type: prismaBridge_1.Schema.Types.Mixed },
}, { timestamps: true });
exports.AuditLog = (0, prismaBridge_1.createPrismaModelAdapter)('auditLog', { "adminUser": "adminUserId", "targetProfile": "targetProfileId", "targetUser": "targetUserId", "relatedReport": "relatedReportId" });
//# sourceMappingURL=AuditLog.js.map