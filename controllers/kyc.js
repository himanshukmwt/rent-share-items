const prisma = require('../config/prisma')
const { encrypt } = require('../config/encryption');

const submitKYC = async (req, res,next) => {
  try {
    const { documentType, documentNumber } = req.body;
     const encryptedNumber = encrypt(documentNumber);

    const documentImageUrl = req.files?.document?.[0]?.path;
    const selfieUrl = req.files?.selfie?.[0]?.path;

    const existing = await prisma.kYC.findUnique({
      where: { userId: req.user.id }
    });

    if (existing) {
      if (existing.verificationStatus === 'REJECTED') {
        const kyc = await prisma.kYC.update({
          where: { userId: req.user.id },
          data: {
            documentType,
            documentNumber:encryptedNumber,
            documentImageUrl,
            selfieUrl,
            verificationStatus: 'PENDING'
          }
        });
        return res.status(200).json(kyc);
      }

      return res.status(400).json({ message: "KYC already submitted" });
    }

    const kyc = await prisma.kYC.create({
      data: {
        userId: req.user.id,
        documentType,
        documentNumber,
        documentImageUrl,
        selfieUrl,
        verificationStatus: "PENDING"
      }
    });

    await prisma.user.update({
      where: { id: req.user.id },
      data: { kycSubmitted: true }
    });

    res.status(201).json(kyc);

  } catch (err) {
    next(err);
  }
};

const getMyKYC = async (req, res,next) => {
  try {
    const kyc = await prisma.kYC.findUnique({
      where: { userId: req.user.id }
    });

    if (!kyc) {
      return res.status(404).json({ message: "KYC not submitted" });
    }

    res.json(kyc);

  } catch (err) {
    next(err);
  }
};


module.exports = {
  submitKYC,
  getMyKYC,
}