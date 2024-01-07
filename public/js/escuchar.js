import {playFn} from "/js/play.js"

window.onload = function()
{
    
    var audioPlayer = document.getElementById('audios')
    const liplaybutton = document.getElementById('play')
    liplaybutton.innerHTML = playFn();
    

    let escuchar = false;
    
    let nombrefinal = document.getElementById('play1')
    nombrefinal.textContent = "Play"
    nombrefinal.addEventListener('click', () => { 
       
        if(escuchar===false)
        {
            escuchar=true;
            audioPlayer.play();

        }
        else{
            escuchar=false;
            audioPlayer.pause();
        }


        
    });
}