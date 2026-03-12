 const prisma = require('../config/prisma')

 // Add to Cart
const addToCart = async (req, res) => {
  try {
    const { itemId } = req.body;

    let cart = await prisma.cart.findUnique({
      where: { userId: req.user.id }
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId: req.user.id }
      });
    }

    // Item add karo
    await prisma.cart.update({
      where: { id: cart.id },
      data: {
        items: {
          connect: { id: itemId }  // ✅ Simple connect
        }
      }
    });

    res.json({ message: "Item added to cart" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Remove from Cart
const removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.body;

    const cart = await prisma.cart.findUnique({
      where: { userId: req.user.id }
    });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    await prisma.cart.update({
      where: { id: cart.id },
      data: {
        items: {
          disconnect: { id: itemId }  // ✅ Simple disconnect
        }
      }
    });

    res.json({ message: "Item removed from cart" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Get My Cart
const getMyCart = async (req, res) => {
  try {
    const cart = await prisma.cart.findUnique({
      where: { userId: req.user.id },
      include: {
        items: {
          select: {
            id: true,
            name: true,
            category: true,
            pricePerDay: true,
            images: true,
            availability: true
          }
        }
      }
    });

    if (!cart) {
      return res.json({ message: "Cart empty hai", items: [] });
    }

    res.json(cart);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Clear Cart
const clearCart = async (req, res) => {
  try {
    const cart = await prisma.cart.findUnique({
      where: { userId: req.user.id },
      include: { items: true }
    });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    await prisma.cart.update({
      where: { id: cart.id },
      data: {
        items: {
          set: []  // ✅ Sab disconnect
        }
      }
    });

    res.json({ message: "Cart cleared" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

  module.exports={
      addToCart,
      getMyCart,
      removeFromCart,
      clearCart
  }
