const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth");
const validate = require("../middleware/validate");
const  {createItemSchema} = require("../validators/itemValidation");
const { upload } = require('../config/cloudinary');
const {
  createItem,
  getAllItems,
  getItemById,
  getMyItems,
  deleteItem,
  getFilteredItems,
  searchItems,
} = require("../controllers/item");

router.post("/", authMiddleware,validate(createItemSchema),upload.array('images', 4), createItem);
router.get("/filter", getFilteredItems);
router.get("/search", searchItems);
router.get("/my", authMiddleware, getMyItems)
router.get("/", authMiddleware,getAllItems);
router.get("/:id",authMiddleware, getItemById);
router.delete("/:id", authMiddleware, deleteItem);;




module.exports = router;
