document.addEventListener('DOMContentLoaded', () =>{

    const forgotform = document.getElementById('forgotform')

    forgotform.addEventListener('submit', async (e) =>{
        e.preventDefault();

        const formdata = new FormData(forgotform)
        const email = formdata.get('email')

        const message = document.getElementById('message')
        message.textContent='';
        message.style.display = 'none';
        setTimeout(() => {
            message.style.display = 'none'; 
        }, 5000);

        try {
            const response = await fetch('/forgot-password',{
                method:'POST',
                headers:{
                    'Content-Type': 'application/json'
                },
                body:JSON.stringify({email})

            })

            if(response.ok){
                const responseData = await response.json();
                message.textContent = responseData.message;
                forgotform.reset();
                message.style.display = 'block';
            }
            else{
               const errorData = await response.json();
               message.textContent = errorData.error;
               message.style.display ='block';
            }
         } catch (error) {
            console.log('Error', error)
            message.textContent = 'An error occurred during sending.';
            message.style.display = 'block';
         }


    })

})