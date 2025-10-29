// === Cart functions ===
async function addToCart(id, name, price, type = 'product') {
  price = Number(price);

  // Check if user is logged in
  const loginRes = await fetch('/check-login', {credentials: 'include'});
  const loginData = await loginRes.json();

  if (loginData.loggedIn) {
    // Add to server cart
    const res = await fetch('/api/cart/update', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      credentials: 'include',
      body: JSON.stringify({ productId: id, change: 1, type })
    });
    if (res.ok) {
      alert(`${name} added to cart`);
    } else {
      alert('Failed to add to cart');
    }
  } else {
    // Add to localStorage cart
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    let existing = cart.find(item => item.id === id && item.type === type);
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({ id, name, price, quantity: 1, type });
    }
    localStorage.setItem("cart", JSON.stringify(cart));
    alert(`${name} added to cart`);
  }
}



function checkOut() {
  window.location.href = "cart.html";
}

// === Navbar dropdown ===
const menuButton = document.getElementById("menuButton");
const menu = document.getElementById("menu");
menuButton.addEventListener("click", () => {
  menu.hidden = !menu.hidden;
});

// === Dynamic Categories ===
async function loadCategory(category) {
  const section = document.getElementById("product-section");
  menu.hidden = true;

  // Fetch products from backend
  const response = await fetch('/api/products');
  const allProducts = await response.json();
  const items = allProducts.filter(p => p.category === category);

  section.innerHTML = `
    <h2 style="text-align:center; margin-top:30px;">${category.toUpperCase()}</h2>
    <div class="product-grid">
      ${items.map(item => `
        <div class="product-card">
          <img src="${item.image_url}" alt="${item.name}">
          <h3>${item.name}</h3>
          <p>KES ${item.price}</p>
          <button onclick="addToCart(${item.id}, '${item.name}', ${item.price}, 'product')">Add to Cart</button>        </div>
      `).join('')}
    </div>
  `;
}

function showCategory(category) {
  loadCategory(category);
}

// === Load current offers dynamically ===
async function loadOffers() {
  const response = await fetch('/api/offers');
  const offers = await response.json();
  const container = document.querySelector('.offers-row');
  container.innerHTML = '';

  offers.forEach(offer => {
    const card = document.createElement('div');
    card.classList.add('offers-card');
    card.innerHTML = `
      <h3>${offer.name}</h3>
      <img src="${offer.image_url}" alt="${offer.name}">
      <h2>${offer.description}</h2>
      <p>Offer Price: KES ${offer.offer_price}</p>
<button onclick="addToCart(${offer.id}, '${offer.name}', ${offer.offer_price}, 'offer')">Add to Cart</button>    `;
    container.appendChild(card);
  });
}

// === Check login and update header ===
fetch('/check-login')
  .then(res => res.json())
  .then(data => {
    if (data.loggedIn) {
      // Show welcome message
      const welcomeMsg = document.getElementById('welcomeMsg');
      welcomeMsg.innerText = `Welcome, ${data.user.name}`;
      welcomeMsg.style.display = 'inline';

      // Show logout button
      const logoutBtn = document.getElementById('logoutBtn');
      logoutBtn.style.display = 'inline';

      // Hide register/login buttons
      document.getElementById('registerBtn').style.display = 'none';
      document.getElementById('loginBtn').style.display = 'none';
    }
  });

// === Logout button ===
document.getElementById('logoutBtn').addEventListener('click', () => {
  window.location.href = '/logout';
});

// === Initialize page ===
loadOffers();
