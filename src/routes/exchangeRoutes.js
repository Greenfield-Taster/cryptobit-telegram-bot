const express = require("express");
const router = express.Router();
const {
  createExchangeRequest,
  getRequestById,
  setupWebhook,
  handleWebhook,
} = require("../controllers/exchangeController");
const { authenticateToken } = require("../controllers/authController");

router.post("/send-form", authenticateToken, createExchangeRequest);
router.get("/request/:id", authenticateToken, getRequestById);

router.post("/setup-webhook", authenticateToken, setupWebhook);
router.post("/telegramWebhook", handleWebhook);

module.exports = router;
