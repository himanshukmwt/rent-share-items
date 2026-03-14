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
  updateItem,
  deleteItem,
  getFilteredItems,
  searchItems,
  getPaginatedItems
} = require("../controllers/item");

router.post("/", authMiddleware,validate(createItemSchema),upload.array('images', 4), createItem);
router.get("/filter", getFilteredItems);
router.get("/search", searchItems);
router.get("/page", getPaginatedItems);
router.get("/", getAllItems);
router.get("/:id",authMiddleware, getItemById);
router.put("/:id", authMiddleware, updateItem);
router.delete("/:id", authMiddleware, deleteItem);



module.exports = router;
