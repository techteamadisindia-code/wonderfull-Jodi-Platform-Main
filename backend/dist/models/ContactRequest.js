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
exports.ContactRequest = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const contactRequestSchema = new mongoose_1.Schema({
    requester: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    recipient: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
        type: String,
        enum: ['PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED'],
        default: 'PENDING',
        index: true,
    },
    contactCreditDeducted: { type: Boolean, default: false },
    contactUnlockedAt: { type: Date, default: null },
    message: { type: String, trim: true, default: '' },
}, { timestamps: true });
// Virtual aliases for requesterId and recipientId
contactRequestSchema.virtual('requesterId').get(function () {
    return this.requester;
});
contactRequestSchema.virtual('recipientId').get(function () {
    return this.recipient;
});
// Index to efficiently look up mutual relationship and prevent duplicate pending requests
contactRequestSchema.index({ requester: 1, recipient: 1 });
contactRequestSchema.index({ recipient: 1, status: 1 });
exports.ContactRequest = mongoose_1.default.models.ContactRequest ||
    mongoose_1.default.model('ContactRequest', contactRequestSchema);
//# sourceMappingURL=ContactRequest.js.map