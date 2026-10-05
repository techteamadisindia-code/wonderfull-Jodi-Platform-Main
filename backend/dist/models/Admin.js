"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Admin = void 0;
const prismaBridge_1 = require("../db/prismaBridge");
const adminSchema = new prismaBridge_1.Schema({
    user: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    permissions: [{ type: String, trim: true }],
}, { timestamps: true });
exports.Admin = (0, prismaBridge_1.createPrismaModelAdapter)('admin', { "user": "userId" });
//# sourceMappingURL=Admin.js.map