const prisma = require("../config/prisma");
const { cloudinary } = require('../config/cloudinary');
const depositRules = require('../config/depositRules');

// Create item
async function createItem(req,res){
  try{
      const {name,category,description,pricePerDay}=req.body;
      
      //Duplicate check
      const existingItem = await prisma.item.findFirst({
        where: {
          ownerId:  req.user.id,
          name:     { equals: name, mode: "insensitive" },
          category: { equals: category, mode: "insensitive" }
        }
      });

      if (existingItem) {
        return res.status(400).json({ 
          message: "This item is already listed" 
        });
      }

      // Step 4: KYC check
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });
    if (!user.kycVerified || !user.upiId || !user.city || !user.area) { 
      return res.status(403).json({ message: "Complete your profile first" });
    }
  
      const multiplier    = depositRules[category?.toLowerCase()] ||depositRules.default;
      const depositAmount = Number(pricePerDay) * multiplier;

      // Deposit 20000 se zyada nahi honi chahiye
      if (depositAmount > 20000) {
        return res.status(400).json({ 
          message: `Deposit amount ${depositAmount} hai jo 20,000 se zyada hai. Price kam karo.` 
        });
      }

      if (!pricePerDay || pricePerDay <= 0) {
            return res.status(400).json({
          message: "Valid pricePerDay required"
        });
      }
      const images = req.files?.map(file => file.path) || []

      if (images.length === 0) {
        return res.status(400).json({ message: "Kam se kam 1 image required hai" });
      }

      if (images.length > 4) {
        return res.status(400).json({ message: "Maximum 4 images allowed hain" });
      }
      const item= await prisma.item.create({
        data:{
          name,
          category,
          description,
          pricePerDay:Number(pricePerDay),
          images,
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
        where: {
          ownerId: { not: req.user.id }  
        },
      include: {
        owner: true
      } 
    });
      return res.status(200).json(items);
    // const { startDate, endDate } = req.query;
    // const items = await prisma.item.findMany({
    //   where: {
    //     ownerId: { not: req.user.id },
    //     availability: true,
    //     ...(startDate && endDate ? {
    //       rentals: {
    //         none: {
    //           AND: [
    //             { startDate: { lte: new Date(endDate) } },
    //             { endDate: { gte: new Date(startDate) } },
    //             { status: { notIn: ['CANCELLED', 'REJECTED'] } }
    //           ]
    //         }
    //       }
    //     } : {})
    //   },
    //   include: {
    //     owner: true
    //   }
    // });

    // return res.status(200).json(items);
      }catch (error) {
        console.log(error);
     return res.status(500).json({ message: error.message });
  };
};

// Get single item
async function  getItemById(req,res){
   try {
    const item = await prisma.item.findUnique({
      where: { id: req.params.id },
      include: {
        owner: {
         select: {
            name: true,
            city: true,   
            area: true,   
          } 
        }, 
        reviews: {
          include: {
            user: {
              select: { name: true }
            }
      }
    },
     rentals: {  
      where: { status: { in: ['ACTIVE', 'PENDING'] } },
      select: { startDate: true, endDate: true, status: true }
    }
  }
    });

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.status(200).json(item);
  } catch (error) {
    console.log("Error:", error.message)
    res.status(500).json({ message: error.message });
  }
};

async function getMyItems(req, res) {
  try {
    const items = await prisma.item.findMany({
      where: { ownerId: req.user.id },
      include: {
        owner: {
          select: { name: true, city: true, area: true }
        }
      }
    });

    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

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

     //Active rental check
    const activeRental = await prisma.rental.findFirst({
      where: {
        itemId: req.params.id,
        status: { in: ["PENDING", "ACTIVE"] }
      }
    });

    if (activeRental) {
      return res.status(400).json({ 
        message: "Item delete nahi ho sakta — active rental hai" 
      });
    }

    const carts = await prisma.cart.findMany({
  where: {
    items: { some: { id: req.params.id } }
  }
});

for (const cart of carts) {
  await prisma.cart.update({
    where: { id: cart.id },
    data: {
      items: {
        disconnect: { id: req.params.id }
      }
    }
  });
}

     // reviews delete 
    await prisma.review.deleteMany({
      where: { itemId: req.params.id }
    });

    // transactions delete 
    await prisma.transaction.deleteMany({
      where: { rental: { itemId: req.params.id } }
    });

    // rentals delete 
    await prisma.rental.deleteMany({
      where: { itemId: req.params.id }
    });

    

    //Cloudinary se images delete 
    for (const imageUrl of item.images) {
      const publicId = imageUrl.split('/').pop().split('.')[0]
      await cloudinary.uploader.destroy(`rentshare/items/${publicId}`)
    }

    // item delete 
    await prisma.item.delete({
      where: { id: req.params.id }
    });
    
    await prisma.item.delete({
      where: { id: req.params.id }
    });
    res.status(200).json({ message: "Item deleted successfully" });
  }catch (error) {
    res.status(500).json({ message: error.message });
  }
};


async function getFilteredItems(req, res) {
  try {
    const { category, maxPrice, city } = req.query;

    const items = await prisma.item.findMany({
      where: {
        ...(category && { 
          category: { equals: category, mode: 'insensitive' } 
        }),
        ...(maxPrice && { 
          pricePerDay: { lte: Number(maxPrice) } 
        }),
        ...(city && { 
          owner: { 
            city: { contains: city, mode: 'insensitive' } // ✅ Owner ki city
          } 
        }),
      },
      include: {
        owner: { select: { name: true, city: true, area: true } }
      }
    });

    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

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



module.exports={
  createItem,
  getAllItems,
  getItemById,
  getMyItems,
  deleteItem,
  getFilteredItems,
  searchItems,
}