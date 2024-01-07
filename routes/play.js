const express = require('express');
const router = express.Router();
const mongojs = require('mongojs');
const db = mongojs('mongodb://127.0.0.1:27017/grabaciones', ['users']);
const fs = require('fs');



const multer = require('multer');
const storage = multer.memoryStorage(); 

const upload = multer({ storage: storage });

const path = require('path');


router.use(express.urlencoded({ extended: true }));
router.use(express.json());

// leer :filename desde la carpeta recordings
// si no está, devuelve un error (404)
// sino en la base de datos, actualizar el último acceso a :filename en la base de datos
// para finalizar, enviar el fichero haciendo uso de sendFile
router.get("/:filename", async (req, res, next) => {
    let filename1 = req.params.filename;
    
    const filePath = fs.readFileSync('./recordings/'+ filename1 +  '.ogg');
    const oggBase64 = Buffer.from(filePath).toString('base64');
    
    const filtro = { "users.filename": filename1 };
    const nuevoValor = { $set: { "users.$.accessed": Date.now() } };

    
    db.users.update(
        filtro,
        nuevoValor,
        { multi: false }, 
        (error, resultado) => {
          if (error) {
            console.error("Error al actualizar el documento:", error);
          } else {
            console.log(`${resultado.n} documento(s) actualizado(s)`);
          }
          db.close();
        }
      );

    res.render('play', {oggBase64});
    })
    module.exports = router;