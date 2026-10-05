"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DailyUserVisit = void 0;
const prismaBridge_1 = require("../db/prismaBridge");
const dailyUserVisitSchema = new prismaBridge_1.Schema({
    user: {
        type: prismaBridge_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User reference is required'],
        index: true,
    },
    visitDate: {
        type: String,
        required: [true, 'Visit date (YYYY-MM-DD) is required'],
        match: [/^\d{4}-\d{2}-\d{2}$/, 'Visit date must follow YYYY-MM-DD format'],
        index: true,
    },
    firstVisitedAt: {
        type: Date,
        default: Date.now,
    },
    lastVisitedAt: {
        type: Date,
        default: Date.now,
    },
    visitCount: {
        type: Number,
        default: 1,
        min: 1,
    },
    ipAddress: {
        type: String,
        trim: true,
    },
    userAgent: {
        type: String,
        trim: true,
    },
}, {
    timestamps: true,
});
// Compound Unique Constraint: One user + One calendar day = Exactly One Visit Record
dailyUserVisitSchema.index({ user: 1, visitDate: 1 }, { unique: true });
// Compound index for date range aggregations
dailyUserVisitSchema.index({ visitDate: 1, user: 1 });
exports.DailyUserVisit = (0, prismaBridge_1.createPrismaModelAdapter)('dailyUserVisit', { "user": "userId" });
//# sourceMappingURL=DailyUserVisit.js.map