document.addEventListener('DOMContentLoaded', () =>{
    const login = document.getElementById('login')
    const seePassword = document.getElementById('seePassword');
    const passwordInput = document.getElementById('password');

    seePassword.addEventListener('click', function () {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password'
        passwordInput.setAttribute('type', type);

        this.textContent = type === 'text' ? '🔓' : '🔒'; 
    })

    

    login.addEventListener('submit', async (e) =>{
        e.preventDefault();

        const formdata = new FormData(login);

        const email = formdata.get('email');
        const password = formdata.get ('password')

        const message = document.getElementById('message')
        message.textContent='';
        message.style.display ='none';


        try {
            const BASE_URL = window.location.origin; // automatically uses current domain

   const response = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
});


            if(response.ok){
                const responseData = await response.json();
                message.textContent = responseData.message;
                login.reset();
                message.style.display = 'block';
                

                setTimeout(() => {
                    window.location.href = '/home';
                }, 200);
            }
            else{
                const errorData = await response.json();
                message.textContent = errorData.error || 'login failed';
                message.style.display = 'block';
            }
         } catch (err) {
            console.error('Error logging in', err)
            message.textContent = 'An error occurred during login.';
            message.style.display = 'block';
         }
    })
})