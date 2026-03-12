const prisma=require("../config/prisma");

const checkout = async (req, res) => {
  try {
    const { itemId, startDate, endDate } = req.body;

    // Step 1: Dates valid check
    if (!startDate || !endDate) {
      return res.status(400).json({ message: "Dates required" });
    }

    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({ message: "Invalid date range" });
    }

    // Step 2: Item check
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

    // Step 4: Cart check
    const cart = await prisma.cart.findUnique({
      where: { userId: req.user.id },
      include: { items: true }
    });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    // Step 5: Item cart mein hai check
    const itemInCart = cart.items.some((i) => i.id === itemId);
    if (!itemInCart) {
      return res.status(400).json({ 
        message: "Item cart mein nahi hai" 
      });
    }

    // Step 6: Conflict check - Rental table se ✅
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const conflict = await prisma.rental.findFirst({
      where: {
        itemId,
        status: { in: ["PENDING", "ACTIVE"] },
        startDate: { lt: end },
        endDate: { gt: start }
      }
    });

    if (conflict) {
      return res.status(400).json({ 
        message: "Item already booked for these dates" 
      });
    }

    // Step 7: Amount calculate
    const days = Math.ceil(
      (new Date(endDate) - new Date(startDate)) /
      (1000 * 60 * 60 * 24)
    );
    const rentalAmount = days * item.pricePerDay;

    // Step 8: Deposit calculate
    const depositRules = {
      electronics: 3,
      camera: 3,
      tools: 2,
      clothes: 1,
      gaming: 2,
      music: 2,
      camping: 2
    };
    const multiplier = depositRules[item.category.toLowerCase()] || 2;
    const depositAmount = item.pricePerDay * multiplier;
    const totalAmount = rentalAmount + depositAmount;

    // Step 9: Sab ek transaction mein
    const result = await prisma.$transaction(async (tx) => {

      // Rental banao ✅ (Reservation nahi)
      const rental = await tx.rental.create({
        data: {
          userId: req.user.id,
          itemId,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          rentalAmount,
          depositAmount,
          status: "ACTIVE"
        }
      });

      // Transaction save karo
      await tx.transaction.create({
        data: {
          rentalId: rental.id,
          userId: req.user.id,
          rentalAmount: rentalAmount,
          depositAmount,
          totalAmount,
          paymentMethod: "online",
          type: "PAYMENT",
          status: "SUCCESS"
        }
      });

      // Item unavailable karo
      await tx.item.update({
        where: { id: itemId },
        data: { availability: false }
      });

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
    res.status(500).json({ message: err.message });
  }
}

module.exports=checkout;