import {recordFn} from "/js/recordButton.js"
import {playFn} from "/js/play.js"
import {uploadFn} from "/js/upload.js"
import {v4 as uuid} from "/utils/uuid/v4.js";
//import {moment} from "/utils/moment/moment.js";


let currentURL;
moment.locale('es');
let escuchar

window.onload = function()
{
    const lirecordbutton = document.getElementById('liRecordButton')
    lirecordbutton.innerHTML = recordFn();

    const liplaybutton = document.getElementById('play')
    liplaybutton.innerHTML = playFn();
    document.getElementById('play1').disabled =true

    const liuploadbutton = document.getElementById('upload')
    liuploadbutton.innerHTML = uploadFn();
    const uploadbuttonreal = document.getElementById('upload1')
    uploadbuttonreal.disabled = true

    let app = new App(null,new Blob() ,'inactive');
    app.init()

    let grabar = false;
    escuchar = false;

    document.getElementById('record').addEventListener('click', () => {
        if(grabar===false)
        {   
            
            grabar=true;
            app.record();
        }
        else{
            grabar=false;

            app.stopRecording();

            document.getElementById('play1').disabled = false;
            uploadbuttonreal.disabled = false
        }
        // Reemplaza appInstance con la instancia de tu clase App
    });
    uploadbuttonreal.onclick = function () {

        const extractedString = currentURL.substring(currentURL.lastIndexOf('/') + 1);
        app.upload(extractedString);

    }


    document.getElementById('play1').addEventListener('click', () => {
        
        
        if(escuchar===false)
        {
            escuchar=true;
            app.playAudio();

        }
        else{
            escuchar=false;
            app.stopAudio();
        }


        // Reemplaza appInstance con la instancia de tu clase App
    });
    const urlActual = window.location.href;
    let usuario = urlActual.substring(urlActual.lastIndexOf('/') + 1);
    fetch(`${usuario}/list`)
        .then(response => response.json())
        .then(data => {
            console.log(data)
          const fileList = document.getElementById('fileList');
          data[0].files.forEach(file => {
            const fileDiv = document.createElement('div');
            const copyButton = document.createElement('button');
            const deleteButton = document.createElement('button');

            copyButton.innerText = '📋';
            deleteButton.innerText = '🗑️';

            fileDiv.textContent = moment(file.date).calendar().toLowerCase();
            fileDiv.appendChild(copyButton);
            fileDiv.appendChild(deleteButton);

            fileList.appendChild(fileDiv);
            copyButton.id = "copiar"
            copyButton.addEventListener('click', function(){
                navigator.clipboard.writeText(`localhost:3000/play/${file.filename}`).then(()=>console.log(file));
                Snackbar.show({text: 'link copiado.'});
            });

            deleteButton.id="borrar"
            deleteButton.addEventListener('click', function(){
                fetch(`${usuario}/delete/${file.filename}`, {
                    method: "POST",
                }).
                then(r=> console.log(r), window.location.reload()).
                catch( err =>console.error(err))
            })
        })
            
        })
        .catch(error => {
          console.error('Error al obtener la lista de archivos:', error);
        });

    
  
}
class App {
    audioChunks = [];
    isRecording = false;
    uuid;


    constructor(audio,blob,state) {
        this.audio = audio;
        this.blob=blob;
        this.state = state;
        this.secondsCounter=0;
    }
    async init(){
        try {

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.initAudio();
            await this.initRecord(stream);

        } catch (error) {
            console.error('No se ha podido acceder al micrófono', error);
        }
    }

    initAudio(){
        this.audio = new Audio();

        this.audio.onloadedmetadata = () => {

            console.log('Se ha cargado la información del audio ');
            this.setState({state: 'cargado'})

        };

        this.audio.ondurationchange = () => {
            console.log('Ha cambiado la duración del audio ' );

        };

        this.audio.ontimeupdate = () => {
            console.log('Tiempo de reproducción actualizado');



            this.setState({state: 'reproduciendo'})
        };

        this.audio.onended = () => {
            console.log('El audio ha finalizado');
            this.setState({state: 'finalizado'})
            escuchar=false;


        }
    }

    async initRecord(stream) {
        this.mediaRecorder = new MediaRecorder(stream);
        this.mediaRecorder.ondataavailable = (event) => {
            this.audioChunks.push(event.data);

        };

        this.mediaRecorder.onstop = () => {
            this.blob = new Blob(this.audioChunks, {type: 'audio/wav'});
            this.loadBlob();
            //const audioPlayer = document.getElementById('audioPlayer');
            //audioPlayer.src = this.audio.src;

        };
    }
    loadBlob()
    {
        this.audio.src= URL.createObjectURL(this.blob);
        currentURL = this.audio.src;

    }
    setState(state) {
        this.state = Object.assign({}, this.state, state);
        this.render();
    }

    render() {

       //let tiempoactualensegundos = this.audio.currentTime
        //let total = Math.round(duracionensegundos-tiempoactualensegundos)
        if(this.state=='inactive'){
            let tiempoinactive = this.convertirSegundosAMinutosYSegundos(300- this.secondsCounter)
            document.getElementById('record').textContent = `Record ${tiempoinactive}`;
        }
        if(this.state['state']== 'cargado'){
            let tiempocargado = this.convertirSegundosAMinutosYSegundos(this.secondsCounter)
            document.getElementById('play1').textContent = `Play ${tiempocargado}`;
        }
        if(this.state['state']== 'reproduciendo')
        {
            let tiempoplay = this.convertirSegundosAMinutosYSegundos(this.secondsCounter -  Math.round(this.audio.currentTime))
        document.getElementById('play1').textContent = `Play ${tiempoplay}`;
        
        }
        if(this.state['state']== 'finalizado')
        {
            let tiempofinalizado = this.convertirSegundosAMinutosYSegundos(this.secondsCounter)
        document.getElementById('play1').textContent = `Play ${tiempofinalizado}`;
        
        }

    }

    record(){

        if (!this.isRecording) {
            
            this.mediaRecorder.start();
            this.isRecording = true;
            this.startTimer()
            //document.getElementById('start').textContent = 'Parar la grabación';
            //document.getElementById('stop').disabled = false;
        } else {
            if (this.mediaRecorder.state === 'recording') {
                this.mediaRecorder.pause();
                //document.getElementById('start').textContent = 'Continuar la grabación';
            } else if (this.mediaRecorder.state === 'paused') {
                this.mediaRecorder.resume();
                
                //document.getElementById('start').textContent = 'Parar la grabación';
            }
        }
    }

    stopRecording(){
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();

            //document.getElementById('stop').disabled = true;
            //document.getElementById('start').textContent = 'Empezar grabación';
            this.isRecording = false;
            this.stopTimer()
        }
    }

    playAudio(){

        if (this.audio && this.blob) {
            this.audio.play();
        }

    }

    stopAudio(){
        if (this.audio) {
            this.audio.pause();
        }
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            this.secondsCounter++;
            console.log(this.secondsCounter);
            this.render()
        }, 1000);
    }

    stopTimer() {
        clearInterval(this.timerInterval);
    }
    convertirSegundosAMinutosYSegundos(segundos) {
        const minutos = Math.floor(segundos / 60);
        const segundosRestantes = segundos % 60;
        
        if (segundosRestantes<10){
            return `${minutos}:0${segundosRestantes}`;
        }
        else if(minutos==-1)
        {
            return `0:00`
        }
        else{
            return `${minutos}:${segundosRestantes}`;
        }

        
      }

    upload(extractedString) {
        this.setState({ uploading: true }); // estado actual: uploading
        
        
        const formData = new FormData();
        const file = this.blob;
        
        formData.append('recording', file, currentURL);

        console.log(this.blob)
        console.log(formData.get('recording'))
       
        
        const urlActual = window.location.href;
        let usuario = urlActual.substring(urlActual.lastIndexOf('/') + 1);
        // El usuario ( cambiarlo )
        fetch(`${usuario}/upload` , {
            method: "POST", // usaremos el método POST para subir el audio
            //headers: {'Content-Type': 'application/json',},
            body : formData, //JSON.stringify({ data: extractedString }),
            
        })
            .then((res) => res.json()) // el servidor, una vez recogido el audiodevolverá la lista de todos los ficheros a nombre del present usuario (inlcuido el que se acaba de subir)
            .then((json) => {
                this.setState({
                    files: json.files, // todos los ficheros del usuario
                    uploading: false, // actualizar el estado actual
                    uploaded: true, // actualizar estado actual
                });
                window.location.reload();
            })
            .catch((err) => {
                this.setState({ error: true });
            });
    }
}


