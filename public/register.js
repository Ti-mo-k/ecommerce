document.addEventListener('DOMContentLoaded', () => {
  const register = document.getElementById('register');

  register.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formdata = new FormData(register);
    const name = formdata.get('name');
    const email = formdata.get('email');
    const password = formdata.get('password');
    const confirmPassword = formdata.get('confirmPassword');

    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    try {
      const response = await fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, confirmPassword })
      });

      // Read backend response text
      const message = await response.text();

      if (response.ok) {
        alert(message); // e.g. "Registered successfully"
        register.reset(); // clear form after success
      } else {
        alert(message); // e.g. "Email already exists"
        register.reset();
      }
    } catch (error) {
      console.error('Error during registration:', error);
      alert('Something went wrong. Try again later.');
    }
  });
});
