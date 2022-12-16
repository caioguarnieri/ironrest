const router = require("express").Router();

const cloudinary = require("cloudinary").v2;
const BookModel = require("../models/Book.model");
const isAuthenticated = require("../middlewares/isAuthenticated");
const attachCurrentUser = require("../middlewares/attachCurrentUser");
const isAdmin = require("../middlewares/isAdmin");
const AppError = require("../errors/AppError");

// Remove a imagem que foi enviada para o cloudinary
function destroyImageInCloudinary(image) {
    const pathParts = image.split("/");
    const pathPartsLength = pathParts.length;
    const folder = pathParts[pathPartsLength - 2];
    const filename = pathParts[pathPartsLength - 1].split(".")[0];
  
    const publicId = `${folder}/${filename}`;
  
    cloudinary.uploader.destroy(publicId, (err, result) => {
      console.log(result);
      console.log(err);
  
      if (err) {
        throw new AppError(err.message);
      }
    });
}

// Criar um novo livro
router.post(
    "/book",
    isAuthenticated,
    attachCurrentUser,
    isAdmin,
    async (req, res) => {
      try {
        const { author, title, synopsis, releaseYear, genre, coverImage } =
          req.body;
  
        // Verifica se o author não está em branco
        if (!author || author.trim().length === 0) {
          return res.status(400).json({
            msg: "Author is required",
          });
        }
  
        // Verifica se o título não está em branco
        if (!title || title.trim().length === 0) {
          return res.status(400).json({
            msg: "Title is required",
          });
        }
  
        // Verifica se o ano de lançamento não está em branco ou se não é do tipo permitido
        if (!releaseYear || !Number(releaseYear)) {
          return res.status(400).json({
            msg: "ReleaseYear is required and must be of number",
          });
        }
  
        // Veficia se o id (author) enviado é compatível com o modelo de id do mongodb
        if (!author.match(/^[0-9a-fA-F]{24}$/)) {
          return res.status(404).json({ error: "Author not found" });
        }
  
        const loggedInUser = req.currentUser;
  
        // Verifica se o id do author enviado por parâmetro é o mesmo que o usuário logado identificado pelo token enviado pela requisição
        if (!loggedInUser || loggedInUser._id.toString() !== author) {
          return res.status(404).json({
            msg: "Only the logged in user can create a new book",
          });
        }
  
        // Salva os dados de livro no banco de dados
        const book = await BookModel.create({
          author,
          title,
          synopsis,
          releaseYear,
          genre,
          coverImage,
        });
  
            return res.status(201).json(book);
        } catch (err) {
            console.error(err);
            return res.status(500).json({ msg: JSON.stringify(err) });
        }
    }
);

// Retorna todos os livros
router.get("/book", isAuthenticated, async (req, res) => {
    try {
      const books = await BookModel.find().populate("author");
      books.forEach((book) => (book.author.passwordHash = undefined));
      return res.status(200).json(books);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ msg: JSON.stringify(err) });
    }
});

// Retorna apenas um livro
router.get("/book/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
  
      // Veficia se o id enviado é compatível com o modelo de id do mongodb
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(404).json({ error: "Book not found" });
      }
  
      const book = await BookModel.findById(id).populate("author");
      if (!book) {
        return res.status(404).json({
          msg: "Book not found",
        });
      }
  
      book.author.passwordHash = undefined;
  
      return res.status(200).json(book);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ msg: JSON.stringify(err) });
    }
});

// Atualiza um livro
router.patch(
    "/book/:id",
    isAuthenticated,
    attachCurrentUser,
    isAdmin,
    async (req, res) => {
      try {
        const { id } = req.params;
        const { title, synopsis, releaseYear, genre, coverImage } = req.body;
  
        if (releaseYear && !Number(releaseYear)) {
          return res.status(400).json({
            msg: "ReleaseYear must be of number",
          });
        }
  
        // Veficia se o id enviado é compatível com o modelo de id do mongodb
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
          return res.status(404).json({ error: "Book not found" });
        }
  
        const book = await BookModel.findById(id);
        if (!book) {
          return res.status(404).json({
            msg: "Book not found",
          });
        }
  
        const loggedInUser = req.currentUser;
  
        if (book.author.toString() !== loggedInUser._id.toString()) {
          return res.status(400).json({
            msg: "Only the author of the book can edit it",
          });
        }
  
        const oldCoverImage = book.coverImage;
  
        book.title = title || book.title;
        book.synopsis = synopsis || book.synopsis;
        book.releaseYear = releaseYear || book.releaseYear;
        book.genre = genre || book.genre;
        book.coverImage = coverImage || book.coverImage;
  
        await book.save();
  
        if (coverImage) {
          // Exluir a imagem antiga do cloudinary, se encontrar
          destroyImageInCloudinary(oldCoverImage);
        }
  
        return res.status(200).json(book);
      } catch (err) {
        console.error(err);
        return res.status(500).json({ msg: JSON.stringify(err) });
      }
    }
);

// Remove um livro
router.delete(
    "/book/:id",
    isAuthenticated,
    attachCurrentUser,
    isAdmin,
    async (req, res) => {
      try {
        const { id } = req.params;
  
        // Veficia se o id enviado é compatível com o modelo de id do mongodb
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
          return res.status(404).json({ error: "Book not found" });
        }
  
        const book = await BookModel.findById(id);
        if (!book) {
          return res.status(404).json({
            msg: "Book not found",
          });
        }
  
        const loggedInUser = req.currentUser;
  
        if (book.author.toString() !== loggedInUser._id.toString()) {
          return res.status(400).json({
            msg: "Only the author of the book can delete it",
          });
        }
  
        const coverImage = book.coverImage;
  
        await book.delete();
        destroyImageInCloudinary(coverImage);
  
        return res.status(204).json();
      } catch (err) {
        console.error(err);
        return res.status(500).json({ msg: JSON.stringify(err) });
      }
    }
  );