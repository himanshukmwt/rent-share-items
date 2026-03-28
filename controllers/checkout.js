const prisma=require("../config/prisma");
const depositRules=require("../config/depositRules");
const checkout = async (req, res) => {
  try {
    const { itemId, startDate, endDate } = req.body;

    // Dates valid check
    if (!startDate || !endDate) {
      return res.status(400).json({ message: "Dates required" });
    }

    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({ message: "Invalid date range" });
    }

    // Item check
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

    if (item.ownerId === req.user.id) {
      return res.status(400).json({ 
        message: "Aap apna khud ka item rent nahi kar sakte" 
      });
    }

    // Cart check
    const cart = await prisma.cart.findUnique({
      where: { userId: req.user.id },
      include: { items: true }
    });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    // Item cart mein hai check
    const itemInCart = cart.items.some((i) => i.id === itemId);
    if (!itemInCart) {
      return res.status(400).json({ 
        message: "Item cart mein nahi hai" 
      });
    }

    //Conflict check - Rental table se 
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const returnBlock = new Date(end);
    returnBlock.setDate(returnBlock.getDate() + 1);

    const conflict = await prisma.rental.findFirst({
      where: {
        itemId,
        status: { in: ["PENDING", "ACTIVE"] },
        startDate: { lt: returnBlock },
        endDate: { gt: start },
        OR: [
          { status: "ACTIVE" },
          { status: "PENDING", expiresAt: { gt: new Date() } } ]
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

    // Amount calculate
    const days = Math.ceil(
      (new Date(endDate) - new Date(startDate)) /
      (1000 * 60 * 60 * 24)
    );
    const rentalAmount = days * item.pricePerDay;

    const multiplier = depositRules[item.category.toLowerCase()] || depositRules.default;
    const depositAmount = item.pricePerDay * multiplier;
     const platformFee   = Math.round(rentalAmount * 0.05);
    const totalAmount = rentalAmount + depositAmount+platformFee;

    // Sab ek transaction mein
    const result = await prisma.$transaction(async (tx) => {

      // Rental banao 
      const rental = await tx.rental.create({
        data: {
          userId: req.user.id,
          itemId,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          rentalAmount,
          depositAmount,
          platformFee,
          totalAmount,
          status: "ACTIVE",
          expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 min
        }
      });

      // Transaction save karo
      await tx.transaction.create({
        data: {
          rentalId: rental.id,
          userId: req.user.id,
          paymentMethod: "online",
          type: "PAYMENT",
          status: "SUCCESS"
        }
      });

      // Item unavailable karo
      // await tx.item.update({
      //   where: { id: itemId },
      //   data: { availability: false }
      // });

      // Item cart se remove karo
      await tx.cart.update({
        where: { id: cart.id },
        data: {
          items: {
            disconnect: { id: itemId }
          }
        }
      });

      return rental;
    });

    res.status(201).json({
      message: "Checkout successful",
      rental: result
    });

  } catch (err) {
    next(err);
  }
}

module.exports=checkout;