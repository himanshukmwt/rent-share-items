const prisma = require('../config/prisma');

async function createInitialPayment(req,res){
    try{
        const {rentalId}= req.body;
        const rental= await prisma.rental.findUnique({
            where: { id: rentalId },
            include: { item: true }
            });

        
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
        const totalAmount = rentalAmount + depositAmount;

       
        const result = await prisma.$transaction(async (tx) => {

        const transaction = await tx.transaction.create({
            data: {
            rentalId: rental.id,
            userId: req.user.id,
            rentalAmount: rentalAmount,       
            depositAmount: depositAmount,
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

        // Step 1: Rental dhundo
        const rental = await prisma.rental.findUnique({
        where: { id: rentalId },
        include: { item: true }
        });

        if (!rental) {
        return res.status(404).json({ message: "Rental not found" });
        }

        // Step 2: Sirf apna rental extend kar sake
        if (rental.userId !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized" });
        }

        // Step 3: Rental active hai check karo
        if (rental.status !== "ACTIVE") {
        return res.status(400).json({ 
            message: "Sirf active rental extend ho sakta hai" 
        });
        }

        // Step 4: Date valid hai check karo
        const oldEnd = new Date(rental.endDate);
        const newEnd = new Date(newEndDate);

        if (newEnd <= oldEnd) {
        return res.status(400).json({ message: "Invalid new date" });
        }

        // Step 5: Conflict check karo new dates ke liye
        const conflict = await prisma.rental.findFirst({
        where: {
            itemId: rental.itemId,
            id: { not: rentalId },        // apna rental exclude karo
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

        // Step 6: Extra amount calculate karo
        const extraDays = Math.ceil(
        (newEnd - oldEnd) / (1000 * 60 * 60 * 24)
        );
        const rentAmount = extraDays * rental.item.pricePerDay;

        // Step 7: Transaction + Rental update ek saath
        const result = await prisma.$transaction(async (tx) => {

        // Extension transaction banao
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

        // Rental endDate update karo
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

    // Step 1: Rental dhundo
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

    // Step 2: Check karo
    if (rental.userId !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (rental.status !== "COMPLETED") {
      return res.status(400).json({ message: "Item return karo pehle" });
    }

    // Step 3: depositAmount check karo
    const depositAmount = rental.depositAmount;

    if (!depositAmount || depositAmount === 0) {
      return res.status(400).json({ message: "No deposit to refund" });
    }

    // Step 4: Already refunded check
    const alreadyRefunded = await prisma.transaction.findFirst({
      where: {
        rentalId: rental.id,
        type: "REFUND"
      }
    });

    if (alreadyRefunded) {
      return res.status(400).json({ message: "Deposit already refunded" });
    }

    // Step 5: Refund transaction
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

    // Sirf apni transaction dekh sake
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