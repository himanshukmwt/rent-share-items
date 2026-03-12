const prisma = require('../config/prisma')


async function createRental(req,res){
  try {
    const { itemId, startDate, endDate } = req.body;

    // Step 1: Valid dates check
    if (!startDate || !endDate) {
      return res.status(400).json({ message: "Dates required" });
    }

    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({ message: "Invalid date range" });
    }

    // Step 2: Item exist check
    const item = await prisma.item.findUnique({
      where: { id: itemId }
    });

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    // Step 3: Availability check
    if (!item.availability) {
      return res.status(400).json({ message: "Item not available" });
    }

    // Step 4: KYC check
    // const user = await prisma.user.findUnique({
    //   where: { id: req.user.id }
    // });
    // if (!user.kycVerified) {
    //   return res.status(403).json({ message: "Complete KYC first" });
    // }

    // Step 5: Conflict check (dates sahi hain ab)
    const start = new Date(startDate);  // ✅ Fix
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);      // ✅ Fix
    end.setHours(23, 59, 59, 999);

    const conflict = await prisma.rental.findFirst({
      where: {
        itemId: itemId,
        status: { in: ["PENDING", "ACTIVE"] },
        startDate: { lt: end },    // ✅ Sahi logic
        endDate: { gt: start }     // ✅ Sahi logic
      }
    });

    if (conflict) {
      return res.status(400).json({
        message: "Item already booked for selected dates"
      });
    }

    // Step 6: Amount calculate karo
    const days = Math.ceil(
      (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)
    );
    const rentalAmount = days * item.pricePerDay;  // ✅ Add kiya

    // Step 7: Deposit calculate karo
    const depositRules = {
      electronics: 3,
      camera: 3,       // ✅ Tumhare categories
      tools: 2,
      clothes: 1,
      gaming: 2,
      music: 2,
      camping: 2
    };

    const multiplier = depositRules[item.category.toLowerCase()] || 2;
    const depositAmount = item.pricePerDay * multiplier;

    // Step 8: Rental + Item update transaction mein
    const result = await prisma.$transaction(async (tx) => {

      // Rental banao
      const rental = await tx.rental.create({
        data: {
          userId: req.user.id,   
          itemId: itemId,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          rentalAmount,          
          depositAmount,
          status: "PENDING"
        }
      });

      // Item unavailable karo
      // await tx.item.update({
      //   where: { id: itemId },
      //   data: { availability: false }
      // });

      return rental;
    });
    
    res.status(201).json({
      message: "Rental created - Complete payment",
      result,
      totalAmount: rentalAmount + depositAmount
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
}

