const mongoose = require("mongoose");

const formSchema = new mongoose.Schema({
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
  telegramStatus: {
    sent: {
      type: Boolean,
      default: false,
    },
    sentAt: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Form", formSchema);
