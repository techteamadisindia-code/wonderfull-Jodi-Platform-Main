"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Counter = void 0;
exports.getNextCandidateId = getNextCandidateId;
const prismaBridge_1 = require("../db/prismaBridge");
const counterSchema = new prismaBridge_1.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 100000 },
}, { timestamps: true });
exports.Counter = (0, prismaBridge_1.createPrismaModelAdapter)('counter');
/**
 * Get next atomic sequence number formatted as WJ-XXXXXX
 */
async function getNextCandidateId() {
    const result = await exports.Counter.findByIdAndUpdate('candidateId', { $inc: { seq: 1 } }, { new: true, upsert: true, setDefaultsOnInsert: true });
    return `WJ-${result?.seq || 100000}`;
}
//# sourceMappingURL=Counter.js.map