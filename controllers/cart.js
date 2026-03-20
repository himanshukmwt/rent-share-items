 const prisma = require('../config/prisma')

 // Add to Cart
const addToCart = async (req, res) => {
  try {
    const { itemId } = req.body;

    const item = await prisma.item.findUnique({
      where: { id: itemId }
    });

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    let cart = await prisma.cart.findUnique({
      where: { userId: req.user.id }
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId: req.user.id }
      });
    }
    //  Owner apna item rent nahi kar sakta
    if (item.ownerId === req.user.id) {
      return res.status(400).json({ 
        message: "Aap apna khud ka item cat nahi kar sakte" 
      });
    }

    // Item add karna
    await prisma.cart.update({
      where: { id: cart.id },
      data: {
        items: {
          connect: { id: itemId }  
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
          disconnect: { id: itemId }  
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
          set: []  
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
