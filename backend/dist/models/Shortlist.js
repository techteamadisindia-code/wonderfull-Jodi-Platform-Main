"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Shortlist = void 0;
const prismaBridge_1 = require("../db/prismaBridge");
const shortlistSchema = new prismaBridge_1.Schema({
    user: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    profile: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'Profile', required: true, index: true },
}, { timestamps: true });
shortlistSchema.index({ user: 1, profile: 1 }, { unique: true });
exports.Shortlist = (0, prismaBridge_1.createPrismaModelAdapter)('shortlist', { "user": "userId", "profile": "profileId" });
//# sourceMappingURL=Shortlist.js.map