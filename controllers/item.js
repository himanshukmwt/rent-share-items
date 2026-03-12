const prisma = require("../config/prisma");

// Create item
async function createItem(req,res){
  try{
      const {name,category,description,pricePerDay}=req.body;

      if (!pricePerDay || pricePerDay <= 0) {
            return res.status(400).json({
          message: "Valid pricePerDay required"
        });
      }
      const item= await prisma.item.create({
        data:{
          name,
          category,
          description,
          pricePerDay:Number(pricePerDay),
          owner: {
            connect: { id: req.user.id }
          }
        }
        
      });
    
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get All Items
async function getAllItems(req,res){
    try{
      const items = await prisma.item.findMany({
      include: {
        owner: true
      } 
    });
      return res.status(200).json(items);
      }catch (error) {
     return res.status(500).json({ message: error.message });
  };
};

// Get single item
async function  getItemById(req,res){
   try {
    const item = await prisma.item.findUnique({
      where: { id: req.params.id },
      include: {
        owner: true,
        // reviews: true
      }
    });

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.status(200).json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update an item
async function updateItem(req,res){
  try{
     const existingItem = await prisma.item.findUnique({
      where: { id: req.params.id }
    });

    if(!existingItem){
      return res.status(404).json({message:"Item not found"});
    }

    //if it is related to the owner or not
    if(existingItem.ownerId!==req.user.id){
      return res.status(403).json({message:"Unauthorized access"});
    }
    const item = await prisma.item.update({
      where: { id: req.params.id },
      data: {
        ...req.body,
        pricePerDay: req.body.pricePerDay
          ? Number(req.body.pricePerDay)
          : existingItem.pricePerDay
      }
    });
     res.status(200).json(item);
  }catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete an item
async function deleteItem(req,res){
  try{
    const item = await prisma.item.findUnique({
      where: { id: req.params.id }
    });

    if(!item){
      return res.status(404).json({message:"Item not found"});
    }
     //if it is related to the owner or not
    if(item.ownerId!==req.user.id){
      return res.status(403).json({message:"Unauthorized access"});
    }
    
    await prisma.item.delete({
      where: { id: req.params.id }
    });
    res.status(200).json({ message: "Item deleted successfully" });
  }catch (error) {
    res.status(500).json({ message: error.message });
  }
};


const getFilteredItems = async (req, res) => {
  try {
    const {
      category,
      minPrice,
      maxPrice,
      available,
      owner
    } = req.query;

    let filter = {};

    if (category) {
      filter.category = category;
    }

    if (minPrice || maxPrice) {
      filter.pricePerDay = {};
      if (minPrice) {
        filter.pricePerDay.gte = Number(minPrice); 
      }
      if (maxPrice) {
        filter.pricePerDay.lte = Number(maxPrice); 
      }
    }

    if (available !== undefined) {
      filter.availability = available === "true";
    }

    if (owner) {
      filter.ownerId = owner; 
    }

    const items = await prisma.item.findMany({
      where: filter,
      include: {
        owner: {
          select: {
            name: true  
          }
        }
      }
    });

    res.status(200).json(items);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const searchItems = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ message: "Search query required" });
    }

    const items = await prisma.item.findMany({
      where: {
        OR: [                          
          { name:        { contains: q, mode: "insensitive" } },  
          { description: { contains: q, mode: "insensitive" } },
          { category:    { contains: q, mode: "insensitive" } }
        ]
      },
      include: {
        owner: {
          select: { name: true }
        }
      }
    });

    res.json(items);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getPaginatedItems = async (req, res) => {
  try {
    let { page = 1, limit = 10 } = req.query;

    page  = Number(page);
    limit = Number(limit);
    const skip = (page - 1) * limit;

    const total = await prisma.item.count(); 

    const items = await prisma.item.findMany({
      skip,                             
      take: limit,                     
      include: {
        owner: {
          select: { name: true }
        }
      }
    });

    res.json({
      totalItems:  total,
      currentPage: page,
      totalPages:  Math.ceil(total / limit),
      items
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports={
  createItem,
  getAllItems,
  getItemById,
  updateItem,
  deleteItem,
  getFilteredItems,
  searchItems,
  getPaginatedItems
}