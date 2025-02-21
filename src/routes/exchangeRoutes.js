const express = require("express");
const router = express.Router();
const {
  createExchangeRequest,
  getRequestById,
} = require("../controllers/exchangeController");
const { authenticateToken } = require("../controllers/authController");

router.post("/send-form", authenticateToken, createExchangeRequest);
router.get("/request/:id", authenticateToken, getRequestById);

module.exports = router;
