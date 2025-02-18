const express = require("express");
const router = express.Router();
const {
  createExchangeRequest,
  getAllRequests,
} = require("../controllers/exchangeController");

router.post("/send-form", createExchangeRequest);

router.get("/requests", getAllRequests);

module.exports = router;
