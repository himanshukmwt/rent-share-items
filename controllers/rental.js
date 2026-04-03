const prisma = require('../config/prisma')
const depositRules = require('../config/depositRules')
const razorpay = require('../config/razorpay');

async function createRental(req,res,next){
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
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });
    if (!user.kycVerified) {
      return res.status(403).json({ message: "Complete KYC first" });
    }

    // Conflict check (dates sahi hain ab)
    const start = new Date(startDate);  
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);      
    end.setHours(23, 59, 59, 999);
    
    const returnBlock = new Date(end);
    returnBlock.setDate(returnBlock.getDate() + 1);

    const conflict = await prisma.rental.findFirst({
      where: {
        itemId: itemId,
        status: { in: ["PENDING", "ACTIVE"] },
        startDate: { lt: returnBlock },    
        endDate: { gt: start },
        OR: [
        { status: "ACTIVE" },
        { status: "PENDING", expiresAt: { gt: new Date() } }    ] 
      }
    });

    if (conflict) {
    const bookedStart = new Date(conflict.startDate).toLocaleDateString('en-IN');
    const returnDate = new Date(conflict.endDate);
    returnDate.setDate(returnDate.getDate() + 1);
    const bookedEnd = returnDate.toLocaleDateString('en-IN');
    
    return res.status(409).json({ 
      message: `Item already booked from ${bookedStart} to ${bookedEnd}` 
    });
  }


    const days = Math.ceil(
      (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)
    );
    const rentalAmount = days * item.pricePerDay;  


    const multiplier = depositRules[item.category.toLowerCase()] || depositRules.default;
    const depositAmount = item.pricePerDay * multiplier;

    // Platform fee - 5% of rental amount
    const platformFee = Math.min(Math.round(rentalAmount * 0.05), 20);
    const totalAmount=rentalAmount+depositAmount+platformFee;
   
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
          totalAmount:totalAmount,
          status: "PENDING",
          expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 min 
        }
      });

      return rental;
    });
    
    res.status(201).json({
      message: "Rental created - Complete payment",
      result
    });

  } catch (error) {
    next(err);
  }
};


async function getMyRentals(req,res,next){
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
    next(err);
  }
};


// Get Single Rental
async function getRentalById(req, res, next) {
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
                phoneNumber: true,
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
    if (rental.status === "ACTIVE" &&  rental.item.owner.latitude ) {
      locationLink = `https://www.google.com/maps?q=${rental.item.owner.latitude},${rental.item.owner.longitude}`
    }

    res.json({ ...rental, locationLink });

  } catch (err) {
    next(err);
  }
};


async function completeRental(req, res, next){
  try {
    const { rentalId } = req.body;

    const rental = await prisma.rental.findUnique({
      where: { id: rentalId }
    });

    if (!rental) {
      return res.status(404).json({ message: "Rental not found" });
    }

    if (rental.status === "ACTIVE") {
      return res.status(400).json({ message: "Rental active hai" });
    }

      if (rental.status !== "RETURNING") {
      return res.status(400).json({ 
        message: "Item return nahi hua abhi" 
      });
    }

    const result = await prisma.$transaction(async (tx) => {

      await tx.rental.update({
        where: { id: rentalId },
        data: { status: "COMPLETED" }
      });

      // Item available kiya
      await tx.item.update({
        where: { id: rental.itemId },
        data: { availability: true }
      });

      return { message: "Rental completed" };
    });

    res.json(result);

  } catch (err) {
    next(err);
  }
};

async function getOwnerRentals(req, res, next) {
  try {
    const rentals = await prisma.rental.findMany({
      where: {
        item: { ownerId: req.user.id }  
      },
      include: {
        item: true,
        user: {
          select: { name: true, email: true }  
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(rentals);
  } catch (err) {
    next(err);
  }
};

async function returnItem(req, res, next) {
  try {
    const { rentalId } = req.body;

    const rental = await prisma.rental.findUnique({
      where: { id: rentalId }
    });

    // Sirf renter return kar sakta hai
    if (rental.userId !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (rental.status !== "ACTIVE") {
      return res.status(400).json({ message: "Rental active nahi hai" });
    }

    await prisma.rental.update({
      where: { id: rentalId },
      data: { status: "RETURNING" }
    });

    res.json({ message: "Return request sent to owner" });

  } catch (err) {
    next(err);
  }
};

// Owner Request
async function ownerRequest(req, res, next) {
  try {
    const { rentalId, damageReport, damageAmount } = req.body;
    const damageProofUrls = req.files?.map(f => f.path) || [];

    const rental = await prisma.rental.findUnique({
      where: { id: rentalId },
      include: { item: true }
    });

    if (!rental) {
      return res.status(404).json({ message: "Rental not found" });
    }

    // Owner check
    if (rental.item.ownerId !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (rental.status !== "RETURNING") {
      return res.status(400).json({ message: "Item return nahi hua abhi" });
    }

    const isDamaged = !!(damageReport);

    // Damage proof required
    if (isDamaged && damageProofUrls.length === 0) {
      return res.status(400).json({ message: "Damage proof photo required" });
    }

    await prisma.rental.update({
      where: { id: rentalId },
      data: {
        status:         "PENDING_REVIEW",
        isDamaged,
        damageReport:   damageReport || null,
        damageAmount:   damageAmount ? Number(damageAmount) : null,
        damageProofUrls
      }
    });

    res.json({ message: "Request sent to admin" });

  } catch (err) {
    next(err);
  }
};




// verifyPickupOTP - Owner verify karega
async function verifyPickupOTP(req, res) {
  const { rentalId, otp } = req.body;

  const rental = await prisma.rental.findUnique({
    where: { id: rentalId },
    include: { item: true }
  });

  // Sirf OWNER verify kar sakta hai
  if (rental.item.ownerId !== req.user.id) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  if (rental.pickupOTP !== otp) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  await prisma.rental.update({
    where: { id: rentalId },
    data: {
      isPickedUp: true,
      pickedUpAt: new Date(),
      pickupOTP:  null
    }
  });

  res.json({ message: "Pickup confirmed" });
}

module.exports={
    createRental,
    getMyRentals,
    getRentalById,
    completeRental,
    getOwnerRentals,
    ownerRequest,
    returnItem,
    verifyPickupOTP
}

