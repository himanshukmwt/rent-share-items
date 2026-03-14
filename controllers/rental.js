const prisma = require('../config/prisma')
const depositRules = require('../config/depositRules')

async function createRental(req,res){
  try {
    const { itemId, startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: "Dates required" });
    }

    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({ message: "Invalid date range" });
    }

    // Item exist check
    const item = await prisma.item.findUnique({
      where: { id: itemId }
    });

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    // Availability check
    if (!item.availability) {
      return res.status(400).json({ message: "Item not available" });
    }
    //Owner apna item rent nahi kar sakta
    if (item.ownerId === req.user.id) {
      return res.status(400).json({ 
        message: "Aap apna khud ka item rent nahi kar sakte" 
      });
    }

    // Step 4: KYC check
    // const user = await prisma.user.findUnique({
    //   where: { id: req.user.id }
    // });
    // if (!user.kycVerified) {
    //   return res.status(403).json({ message: "Complete KYC first" });
    // }

    // Conflict check (dates sahi hain ab)
    const start = new Date(startDate);  
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);      
    end.setHours(23, 59, 59, 999);

    const conflict = await prisma.rental.findFirst({
      where: {
        itemId: itemId,
        status: { in: ["PENDING", "ACTIVE"] },
        startDate: { lt: end },    
        endDate: { gt: start },
        OR: [
        { status: "ACTIVE" },
        { status: "PENDING", expiresAt: { gt: new Date() } }    ] 
      }
    });

    if (conflict) {
      return res.status(400).json({
        message: "Item already booked for selected dates"
      });
    }


    const days = Math.ceil(
      (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)
    );
    const rentalAmount = days * item.pricePerDay;  


    const multiplier = depositRules[item.category.toLowerCase()] || depositRules.default;
    const depositAmount = item.pricePerDay * multiplier;

    // Platform fee - 5% of rental amount
    const platformFee   = Math.round(rentalAmount * 0.05);

   
    const result = await prisma.$transaction(async (tx) => {

    
      const rental = await tx.rental.create({
        data: {
          userId: req.user.id,   
          itemId: itemId,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          rentalAmount,          
          depositAmount,
          platformFee,
          status: "PENDING",
          expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 min 
        }
      });

      return rental;
    });
    
    res.status(201).json({
      message: "Rental created - Complete payment",
      result,
      totalAmount: rentalAmount + depositAmount + platformFee
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


async function getMyRentals(req,res){
    try{
        const rentals= await prisma.rental.findMany({
            where: { 
                userId: req.user.id  
            },
            include: {
                item: true  
            }
        });

        res.json(rentals);
    }catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get Single Rental
async function getRentalById(req, res) {
  try {
    const rental = await prisma.rental.findUnique({
      where: { id: req.params.id },
      include: {
        item: {
          include: {
            owner: {
              select: {
                name:      true,
                city:      true,
                area:      true,
                latitude:  true,
                longitude: true,
              }
            }
          }
        }
      }
    });

    if (!rental) {
      return res.status(404).json({ message: "Rental not found" });
    }

    // Sirf apna rental dekh sakte hai
    if (rental.userId !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // ACTIVE nahi hai toh GPS hide 
    if (rental.status !== "ACTIVE") {
      rental.item.owner.latitude  = null;
      rental.item.owner.longitude = null;
    }

    // Google Maps link
    let locationLink = null;
    if (rental.status === "PENDING" &&  rental.item.owner.latitude ) {
      locationLink = `https://www.google.com/maps?q=${rental.item.owner.latitude},${rental.item.owner.longitude}`
    }
     
    res.json({ ...rental, locationLink });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

async function getAllRentals(req,res){
    try {
        const rentals = await prisma.rental.findMany({
            include:{
                user:{
                    select:{
                        name: true,
                        email:true,
                    }
                },
                item:{
                    select:{
                        name:true,
                    }
                }
            }
        });
      res.json(rentals);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports={
    createRental,
    getMyRentals,
    getAllRentals,
    getRentalById
}

