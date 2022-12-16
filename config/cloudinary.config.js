const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

// Não esquecer de criar as variáveis de ambiente no .env com as chaves da API do Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "pictures", // Aqui você pode escolher o nome da pasta que irá armazenar seus arquivos no Cloudinary
    // Na opção format podemos escolher o formato resultante da imagem que será armazenada no Cloudinary
    format: async (req, file) => "png",
    use_filename: true,
    public_id: async (req, file) => file.filename,
  },
});

const uploadCloud = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const [type, extension] = file.mimetype.split("/");
    if (type !== "image") {
      cb(new AppError("File must be an image"), false);
    }
    if (extension !== "png") {
      cb(new AppError("The image must be in png format"), false);
    }

    cb(null, true);
  },
 });

module.exports = uploadCloud;
