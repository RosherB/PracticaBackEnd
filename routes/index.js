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


async function insertAudio(userId, fileName) {
  const audioInfo = {
    users: [
      {
        "name": userId,
        "filename": fileName,
        "date": Date.now(),
        "accessed": Date.now()
      }
    ]
  };

  try {
    await db.users.insertOne(audioInfo);
  } catch (error) {
    console.error('Error al insertar el nuevo documento en MongoDB:', error);
  }
}


// desde la base de datos obtener los últimos 5 audios del presente usuario (id), las grabaciones ordenadas por fecha (primero las más actuales)
// crea el objeto json solicitado
// (o [] si el usuario no tiene grabaciones asociadas
// y devuelve
const handleList = async (id, callback) => {
  db.users.find({ 'users.name': id }, function (err, grabaciones) {
    if (err) {
      console.log('Error al buscar las grabaciones');
      callback([]);
    } else {
      if (grabaciones.length > 0) {
        grabaciones.sort((a, b) => b.users[0].date - a.users[0].date);
        const ultimasGrabaciones = grabaciones.slice(0, 5);

        const files = { "files": [] };
        ultimasGrabaciones.forEach(grabacion => {
          const fileObj = { "filename": grabacion.users[0].filename, "date": grabacion.users[0].date };
          files.files.push(fileObj);
        });
        
        callback([files]);
      } else {
        console.log("Usuario no encontrado");
        callback([]);
      }
    }
  });
};

router.get('/', function (req, res, next) {
  
  res.render('index', { title: 'Express' });

  // función cleanup
  setInterval(async function () {
    const fiveDaysAgo = Date.now() - 432000000; // 432000000 = 5 días en milisegundos
    try {
      // Eliminar audios de la base de datos
      await db.users.remove({ 'users.date': { $lt: fiveDaysAgo } },(err,grabaciones)=>{
        if (err) {
          console.error('Error al borrar los audios de más de 5 días:', err);
          res.status(500).send('Error del servidor');
        } else {
          console.log("Cleanup realizado correctamente en la base de datos.");
        }
      });

      // Buscar y eliminar archivos en el sistema de ficheros
      fs.readdir('./recordings', (err, files) => {
        if (err) {
          console.error('Error al leer el directorio de grabaciones:', err);
          return;
        }

        files.forEach(file => {
          const filePath = path.join('./recordings/', file);
          fs.stat(filePath, (err, stats) => {
            if (err) {
              console.error('Error al obtener información del archivo:', err);
              return;
            }

            if (stats.isFile() && stats.mtime.getTime() < fiveDaysAgo) {
              fs.unlink(filePath, err => {
                if (err) {
                  console.error('Error al eliminar el archivo:', err);
                } else {
                  console.log('Archivo eliminado correctamente:', file);
                }
              });
            }
          });
        });
      });

      console.log('Cleanup ejecutado correctamente.');
    } catch (error) {
      console.error('Error en la función cleanup:', error);
    }
  }, 3600000); // 3600000 = 1 hora en milisegundos
});

router.get("/list", (req, res, next) => {
  let urlCompleta = req.originalUrl.slice(1)
  let urlfinal = urlCompleta.replace('/list', '');
  handleList(urlfinal, function (lista) {
    res.send(lista);
  });
});

router.post("/upload", upload.single('recording'), async (req, res, next) => {
  // comprueba que no hay errores
  // y guarda los metadatos en la base de datos
  // (name, filename, date, accessed)
  let urlCompleta = req.originalUrl.slice(1)
  let userId = urlCompleta.replace('/upload', '');
  

  // Logramos el blob
  let blobnuevo = req.file;
  //comprobar que el tamaño es menor a 2500000 bytes
  if(blobnuevo.size<2500000)
  {
    let nombrearch = blobnuevo.originalname;

    const audioInfo = {
      users: [
        {
          "name": userId,
          "filename": nombrearch,
          "date": Date.now(),
          "accessed": Date.now()
        }
      ]
    };

    try {
      await db.users.insertOne(audioInfo);
    }
    catch (error) {
      console.error('Error al insertar el nuevo documento en MongoDB:', error);
    }

    fs.writeFile('./recordings/'+ nombrearch + '.ogg', Buffer.from(blobnuevo.buffer), (err) => {
      if (err) {
        console.error('Error al escribir el archivo:', err);
        return;
      }
    
      console.log('Archivo guardado correctamente');
    });

    // llama a la función handleList, para obtener las últimas 5 grabaciones
    handleList(userId, function (lista) {
      res.send(lista);
    });

  
  }
});

// Esta función borrara :filename de la carpeta recordings
// además, lo borrará también de la base de datos. Erabiltzailearen
// Devolverá como respuesta las últimas 5 grabaciones del usuario.
router.post("/delete/:filename", async (req, res, next) => {
  try {
    const filename = req.params.filename;
    let urlCompleta = req.originalUrl.slice(1)
    let urlfinal = urlCompleta.replace(`/${filename}`, '');
    let name = urlfinal.replace('/delete', '');

    db.users.remove(
        { 'users.name': name, 'users.filename': filename }, (err, resultado) => {
          if (err) {
            console.error('Error al borrar la grabación:', err);
            res.status(500).send('Error del servidor');
          } else {
            handleList(name, function (lista) {
              res.send(lista);
            });
          }
        }
    );

    const rutaArchivoAEliminar = path.join('./recordings/', filename+'.ogg');

    fs.unlink(rutaArchivoAEliminar, (err) => {
      if (err) {
        console.error('Error al eliminar el archivo:', err);
        return;
      }
      console.log('Archivo eliminado correctamente');
    });

  } catch (error) {
    console.error('Error al borrar el archivo y obtener las grabaciones:', error);
    res.status(500).send('Error del servidor');
  }
});



module.exports = router;
