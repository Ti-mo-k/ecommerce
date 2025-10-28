document.addEventListener('DOMContentLoaded', () => {
    const login = document.getElementById('login');
    const seePassword = document.getElementById('seePassword');
    const passwordInput = document.getElementById('password');

    // Toggle show/hide password
    seePassword.addEventListener('click', function () {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.textContent = type === 'text' ? '🔓' : '🔒';
    });

    // Handle login form submission
    login.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formdata = new FormData(login);
        const email = formdata.get('email');
        const password = formdata.get('password');
        

        const message = document.getElementById('message');
        message.textContent = '';
        message.style.display = 'none';

        try {
            const BASE_URL = window.location.origin; // automatically uses your domain (local or production)
            const guestCart = JSON.parse(localStorage.getItem('cart')) || [];

            const response = await fetch(`${BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, guestCart })
            });

            const data = await response.json();

            if (response.ok) {
                message.textContent = data.message || 'Login successful!';
                message.style.display = 'block';

                // ✅ Clear guest cart after successful merge
                localStorage.removeItem('cart');

                login.reset();
                setTimeout(() => {
                    window.location.href = '/home';
                }, 200);
            } else {
                message.textContent = data.error || 'Login failed';
                message.style.display = 'block';
            }
        } catch (err) {
            console.error('Error logging in', err);
            message.textContent = 'An error occurred during login.';
            message.style.display = 'block';
        }
    });
});
