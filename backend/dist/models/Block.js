"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Block = void 0;
const prismaBridge_1 = require("../db/prismaBridge");
const blockSchema = new prismaBridge_1.Schema({
    blocker: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    blockedUser: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reason: { type: String, trim: true, maxlength: 500 },
}, { timestamps: true });
blockSchema.index({ blocker: 1, blockedUser: 1 }, { unique: true });
exports.Block = (0, prismaBridge_1.createPrismaModelAdapter)('block', { "blocker": "blockerId", "blockedUser": "blockedUserId" });
//# sourceMappingURL=Block.js.map