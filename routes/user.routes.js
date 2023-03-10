const router = require("express").Router();
const bcrypt = require("bcryptjs");

const UserModel = require("../models/User.model");
const generateToken = require("../config/jwt.config");
const isAuthenticated = require("../middlewares/isAuthenticated");
const attachCurrentUser = require("../middlewares/attachCurrentUser");

const salt_rounds = 10;

// Crud (CREATE) - HTTP POST
// Criar um novo usuário
router.post("/signup", async (req, res) => {
  try {
    // Recupera as informações necessárias do corpo da requisição
    const { name, email, role, password } = req.body;

    // Verifica se o nome não está em branco
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        msg: "Name is required.",
      });
    }

    // Verifica se o email não está em branco
    if (!email || email.trim().length === 0) {
      return res.status(400).json({
        msg: "Email is required.",
      });
    }    
    
    // Verifica se o role não está em branco ou se é algo diferente do permitido
    if (!role || !["ADMIN", "USER"].includes(role)) {
      return res.status(400).json({
        msg: "Role is required and must be ADMIN or USER.",
      });
    }    

    // Verifica se a senha não está em branco ou se a senha não é complexa o suficiente
    if (
      !password ||
      !password.match(
        /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$ %^&*-]).{8,}$/
      )
    ) {
      // O código 400 significa Bad Request
      return res.status(400).json({
        msg: "Password is required and must have at least 8 characters, uppercase and lowercase letters, numbers and special characters.",
      });
    }

    // Verifica se o email já está cadastrado
    const emailExists = await UserModel.findOne({ email });
    if (emailExists) {
      return res.status(400).json({
        msg: "Email already exists.",
      });
    }    

    // Gera o salt
    const salt = await bcrypt.genSalt(salt_rounds);

    // Criptografa a senha
    const hashedPassword = await bcrypt.hash(password, salt);

    // Salva os dados de usuário no banco de dados (MongoDB) usando o body da requisição como parâmetro
    const result = await UserModel.create({
      name,
      email,
      role,
      passwordHash: hashedPassword,
    });

    //Para não retornar a passwordHash
    result.passwordHash = undefined;

    // Responder o usuário recém-criado no banco para o cliente (solicitante). O status 201 significa Created
    return res.status(201).json(result);
  } catch (err) {
    console.error(err);
    // O status 500 signifca Internal Server Error
    return res.status(500).json({ msg: JSON.stringify(err) });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    // Extraindo o email e senha do corpo da requisição
    const { email, password } = req.body;

    // Verifica se o email não está em branco
    if (!email || email.trim().length === 0) {
      return res.status(400).json({
        msg: "Email is required",
      });
    }

    // Verifica se a senha não está em branco
    if (!password || password.trim().length === 0) {
      return res.status(400).json({
        msg: "Password is required",
      });
    }

    // Pesquisar esse usuário no banco pelo email
    const user = await UserModel.findOne({ email });

    console.log(user);

    // Se o usuário não foi encontrado, significa que ele não é cadastrado
    if (!user) {
      return res
        .status(400)
        .json({ msg: "This email is not yet registered in our website;" });
    }

    // Verificar se a senha do usuário pesquisado bate com a senha recebida pelo formulário

    if (await bcrypt.compare(password, user.passwordHash)) {
      // Gerando o JWT com os dados do usuário que acabou de logar
      const token = generateToken(user);

      return res.status(200).json({
        user: {
          name: user.name,
          email: user.email,
          _id: user._id,
          role: user.role,
        },
        token,
      });
    } else {
      // 401 Significa Unauthorized
      return res.status(401).json({ msg: "Wrong password or email" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: JSON.stringify(err) });
  }
});

// cRud (READ) - HTTP GET
// Buscar dados do usuário
router.get("/profile", isAuthenticated, attachCurrentUser, (req, res) => {
  try {
    // Buscar o usuário logado que está disponível através do middleware attachCurrentUser
    const loggedInUser = req.currentUser;

    if (loggedInUser) {
      // Responder o cliente com os dados do usuário. O status 200 significa OK
      return res.status(200).json(loggedInUser);
    } else {
      return res.status(404).json({ msg: "User not found." });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: JSON.stringify(err) });
  }
});

module.exports = router;
