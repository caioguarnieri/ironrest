require("dotenv").config();
require("express-async-errors");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
require("./config/db.config")();

const handleErrors = require("./middlewares/handleErrors");

const app = express();

app.use(express.json());
app.use(morgan("dev"));
// Não esquecer de criar variável de ambiente com o endereço do seu app React (local ou deployado no Netlify)
app.use(cors({ origin: process.env.REACT_APP_URL }));

const userRouter = require("./routes/user.routes");
const bookRouter = require("./routes/book.routes");
app.use("/api", userRouter);
app.use("/api", bookRouter);

// Middleware que intercepta os erros gerados no fileFilter do multer
app.use(handleErrors);

app.listen(Number(process.env.PORT), () =>
  console.log(`Server up and running at port ${process.env.PORT}`)
);
