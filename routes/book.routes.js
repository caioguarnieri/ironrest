const router = require("express").Router();

const BookModel = require("../models/Book.model");
const isAuthenticated = require("../middlewares/isAuthenticated");
const attachCurrentUser = require("../middlewares/attachCurrentUser");
const isAdmin = require("../middlewares/isAdmin");

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