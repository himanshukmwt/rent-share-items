const prisma=require("../config/prisma");

async function createReview(req,res){
  try {
    const { rentalId, rating, comment } = req.body;

    if (!rentalId) {
      return res.status(400).json({ message: "Rental ID is required" });
    }
    const rental = await prisma.rental.findUnique({
      where: { id: rentalId }
    });

    if (!rental) {
      return res.status(404).json({ message: "Rental not found" });
    }

    if (rental.userId !== req.user.id) {
      return res.status(403).json({ message: "Not allowed" });
    }

    // if (rental.status !== "COMPLETED") {
    //   return res.status(400).json({ message: "Complete rental first" });
    // }

    const alreadyReviewed = await prisma.review.findUnique({
      where: { rentalId: rentalId }
    });

    if (alreadyReviewed) {
      return res.status(400).json({ message: "Already reviewed" });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating 1-5 honi chahiye" });
    }

    const review = await prisma.review.create({
      data: {
        rentalId,
        userId: req.user.id,
        rating,
        comment
      }
    });

    res.status(201).json(review);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

async function getItemReviews(req,res){
try {
    const reviews = await prisma.review.findMany({
      where: {
        rental: {
          itemId: req.params.itemId  
        }
      },
      include: {
        user: {
          select: {
            name: true  
          }
        }
      }
    });

    res.json(reviews);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

async function deleteReview(req,res){
   try {
    const review = await prisma.review.findUnique({
      where: { id: req.params.id }
    });

    if (!review) {
      return res.status(404).json({ message: "Not found" });
    }

    if (review.userId !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await prisma.review.delete({
      where: { id: req.params.id }
    });

    res.json({ message: "Review deleted" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports={
    createReview,
    getItemReviews,
    deleteReview
}