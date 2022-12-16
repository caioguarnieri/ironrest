const AppError = require("../errors/AppError");

module.exports = (err, req, res, next) => {
  console.log(err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: "error",
      message: err.message,
    });
  }

  return res.status(500).json({
    status: "error",
    message: {
      en: "Internal server error",
      ptbr: "Erro interno do servidor",
    },
  });
};
