const prisma = require('../config/prisma');

async function createInitialPayment(req,res){
    try{
        const {rentalId}= req.body;
        const rental= await prisma.rental.findUnique({
            where: { id: rentalId },
            include: { item: true },
             select: { upiId: true }
            });

         if (!user.upiId) {
            return res.status(400).json({ 
              message: "Pehle profile mein UPI ID save karo" 
            });
          }
        if(!rental){
            return res.status(404).json({message:"Rental not found"});
        }

        if (rental.status === "ACTIVE") {
           return res.status(400).json({ message: "Already paid" });
        }

        if (rental.userId !== req.user.id) {
            return res.status(403).json({ message: "Unauthorized" });
        }

         const days = Math.ceil(
        (new Date(rental.endDate) - new Date(rental.startDate)) / 
        (1000 * 60 * 60 * 24)
        );

        const rentalAmount = days * rental.item.pricePerDay;
        const depositAmount = rental.depositAmount;
        const platformFee   = Math.round(rentalAmount * 0.05);
        const totalAmount = rentalAmount + depositAmount+platformFee;

       
        const result = await prisma.$transaction(async (tx) => {

        const transaction = await tx.transaction.create({
            data: {
            rentalId: rental.id,
            userId: req.user.id,
            upiId: user.upiId,
            rentalAmount: rentalAmount,       
            depositAmount: depositAmount,
            platformFee:platformFee,
            totalAmount:totalAmount,
            paymentMethod: "online",
            type: "PAYMENT",           
            status: "SUCCESS"
            }
        });

        await tx.rental.update({
            where: { id: rentalId },
            data: { status: "ACTIVE" }   
        });
         await tx.item.update({
            where: { id: rental.itemId },
            data: { availability: false }
          });

        return transaction;
        });

        res.status(201).json(result);

    } catch (err) {
        res.status(500).json({ message: err.message });
    }

};

async function extendRentalPayment(req,res){
    try {
        const { rentalId, newEndDate } = req.body;

        // Rental dhundo
        const rental = await prisma.rental.findUnique({
        where: { id: rentalId },
        include: { item: true }
        });

        if (!rental) {
        return res.status(404).json({ message: "Rental not found" });
        }

        // Sirf apna rental extend kar sake
        if (rental.userId !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized" });
        }

        //  Rental active check 
        if (rental.status !== "ACTIVE") {
        return res.status(400).json({ 
            message: "Sirf active rental extend ho sakta hai" 
        });
        }

        // S Date valid hai check 
        const oldEnd = new Date(rental.endDate);
        const newEnd = new Date(newEndDate);

        if (newEnd <= oldEnd) {
        return res.status(400).json({ message: "Invalid new date" });
        }

        // Conflict check karo new dates ke liye
        const conflict = await prisma.rental.findFirst({
        where: {
            itemId: rental.itemId,
            id: { not: rentalId },        
            status: { in: ["PENDING", "ACTIVE"] },
            startDate: { lt: newEnd },
            endDate: { gt: oldEnd }
        }
        });

        if (conflict) {
        return res.status(400).json({ 
            message: "Item already booked for extended dates" 
        });
        }

        //  Extra amount calculate 
        const extraDays = Math.ceil(
        (newEnd - oldEnd) / (1000 * 60 * 60 * 24)
        );
        const rentAmount = extraDays * rental.item.pricePerDay;

        //  Transaction + Rental update ek saath
        const result = await prisma.$transaction(async (tx) => {

        // Extension transaction 
        const transaction = await tx.transaction.create({
            data: {
            rentalId: rental.id,
            userId: req.user.id,        
            rentalAmount: rentAmount,
            depositAmount: 0,           
            totalAmount: rentAmount,
            paymentMethod: "online",
            type: "EXTENSION",          
            status: "SUCCESS"
            }
        });

        // Rental endDate update 
        await tx.rental.update({
            where: { id: rentalId },
            data: { endDate: newEnd }
        });

        return transaction;
        });

        res.json(result);

     } catch (err) {
          res.status(500).json({ message: err.message });
  }
};

async function refundDeposit(req, res){
 try {
    const { rentalId } = req.body;

    // Rental dhundo
    const rental = await prisma.rental.findUnique({
      where: { id: rentalId },
      include: { 
        item: true,
        transaction: true 
      }
    });

    if (!rental) {
      return res.status(404).json({ message: "Rental not found" });
    }

    //  Check 
    if (rental.userId !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (rental.status !== "COMPLETED") {
      return res.status(400).json({ message: "Item return karo pehle" });
    }

    // depositAmount check 
    const depositAmount = rental.depositAmount;

    if (!depositAmount || depositAmount === 0) {
      return res.status(400).json({ message: "No deposit to refund" });
    }

    // Already refunded check
    const alreadyRefunded = await prisma.transaction.findFirst({
      where: {
        rentalId: rental.id,
        type: "REFUND"
      }
    });

    if (alreadyRefunded) {
      return res.status(400).json({ message: "Deposit already refunded" });
    }

    // Refund transaction
    const result = await prisma.$transaction(async (tx) => {

      const refund = await tx.transaction.create({
        data: {
          rentalId: rental.id,           
          userId: req.user.id,
          rentalAmount: 0,
          depositAmount: depositAmount,   
          totalAmount: depositAmount,     
          paymentMethod: "online",
          type: "REFUND",
          status: "REFUNDED",
          refundedAt: new Date()
        }
      });

      await tx.item.update({
        where: { id: rental.itemId },
        data: { availability: true }
      });

      return refund;
    });

    res.status(201).json({
      message: "Deposit refunded successfully",
      refund: result
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function getMyTransactions(req,res){
     try {
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.user.id },
      include: {
        rental: {
          include: {
            item: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }  
    });

    res.json(transactions);

  }catch(err){
    res.status(500).json({message:err.message});
  }
};

async function completeRental(req, res){
  try {
    const { rentalId } = req.body;

    const rental = await prisma.rental.findUnique({
      where: { id: rentalId }
    });

    if (!rental) {
      return res.status(404).json({ message: "Rental not found" });
    }

    if (rental.status !== "ACTIVE") {
      return res.status(400).json({ message: "Rental active nahi hai" });
    }

    const result = await prisma.$transaction(async (tx) => {

      await tx.rental.update({
        where: { id: rentalId },
        data: { status: "COMPLETED" }
      });

      // Item available karo
      await tx.item.update({
        where: { id: rental.itemId },
        data: { availability: true }
      });

      return { message: "Rental completed" };
    });

    res.json(result);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

async function getTransactionById(req, res){
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: req.params.id },
      include: {
        rental: {
          include: {
            item: {
              select: { name: true, category: true }
            }
          }
        },
        user: {
          select: { name: true, email: true }
        }
      }
    });

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    // Sirf apni transaction dekh sakte hai
    if (transaction.userId !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    res.json(transaction);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}


async function getAllTransactions(req, res){
  try {
    // Admin check
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Admin only" });
    }

    const transactions = await prisma.transaction.findMany({
      include: {
        user: {
          select: { name: true, email: true }
        },
        rental: {
          include: {
            item: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    res.json(transactions);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports={
    createInitialPayment,
    refundDeposit,
    extendRentalPayment,
    getMyTransactions,
    completeRental,
    getTransactionById
}