// models/ExchangeRequest.js
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
  saveToWallet: {
    type: Boolean,
    default: false,
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
});

module.exports = mongoose.model("exchange_requests", exchangeRequestSchema);
