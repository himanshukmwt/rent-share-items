const cloudinary = require('cloudinary').v2
const { CloudinaryStorage } = require('multer-storage-cloudinary')
const multer = require('multer')

// Cloudinary configure 
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

// Storage configure 
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'rentshare/items',  // Cloudinary folder
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 800, height: 600, crop: 'limit' }]
  }
});

const kycStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'rentshare/kyc',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  }
});


const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});


const uploadKYC = multer({
   storage: kycStorage, 
    limits: { fileSize: 5 * 1024 * 1024 }
   });


module.exports = { upload,uploadKYC,cloudinary }