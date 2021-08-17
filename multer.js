const multer = require("multer");

module.exports = multer({
  storage: multer.diskStorage({}),
  fileFilter: (req, file, cb) => {
    if (
      !(
        file.mimetype === "image/jpeg" ||
        file.mimetype === "image/png" ||
        file.mimetype === "image/jpg"
      )
    ) {
      cb({ message: "Unsuported File Format" }, false);
      return;
    }
    cb(null, true);
  },
});
