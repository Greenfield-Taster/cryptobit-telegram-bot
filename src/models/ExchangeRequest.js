const mongoose = require("mongoose");

const exchangeRequestSchema = new mongoose.Schema({
  fromCrypto: {
    type: String,
    required: true,
  },
  toCrypto: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  calculatedAmount: {
    type: Number,
    required: true,
  },
  senderWallet: {
    type: String,
    required: true,
  },
  recipientWallet: {
    type: String,
    required: true,
  },
  orderId: {
    type: String,
    required: true,
  },
  saveFromWallet: {
    type: Boolean,
    default: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  telegramMessageId: {
    type: Number,
  },
  sentToTelegram: {
    type: Boolean,
    default: false,
  },
  telegramSentAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ["pending", "processing", "completed", "failed"],
    default: "pending",
  },
  adminConfirmed: {
    type: Boolean,
    default: false,
  },
  completedAt: {
    type: Date,
    default: null,
  },
  promoCodeApplied: {
    type: Boolean,
    default: false,
  },
  promoCodeDiscount: {
    type: Number,
    default: 0,
  },
  promoCodeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PromoCode",
    default: null,
  },
});

module.exports = mongoose.model("exchange_requests", exchangeRequestSchema);
