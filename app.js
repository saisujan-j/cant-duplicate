const firebaseConfig = {
  apiKey: "AIzaSyD2po__btGn8Cm9L8sMgLZV65TI_66ZvOk",
  authDomain: "canteennnn.firebaseapp.com",
  projectId: "canteennnn",
  storageBucket: "canteennnn.firebasestorage.app",
  messagingSenderId: "957049527157",
  appId: "1:957049527157:web:d9ca5d5c8d4a9c1277d13c",
  measurementId: "G-9P5W4JGCGQ"
};

let db = null;
if (typeof firebase !== 'undefined') {
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
}

// 1. Daily Token Reset Logic
const todayStr = new Date().toDateString();
if (localStorage.getItem('vb_last_date') !== todayStr) {
  localStorage.setItem('vb_token', 1);
  localStorage.setItem('vb_last_date', todayStr);
}

// 2. Empty Default Menu (Upload via Admin now)
const defaultMenu = [];

const state = {
  menu: JSON.parse(localStorage.getItem('vb_menu')) || defaultMenu,
  cart: new Map(),
  token: parseInt(localStorage.getItem('vb_token')) || 1,
  activeCat: 'All',
  searchQuery: ''
};

if (!localStorage.getItem('vb_menu')) {
  localStorage.setItem('vb_menu', JSON.stringify(defaultMenu));
}

const DOM = {};

document.addEventListener('DOMContentLoaded', () => {
  DOM.catBar = document.getElementById('catBar');
  DOM.itemGrid = document.getElementById('itemGrid');
  DOM.cartList = document.getElementById('cartList');
  DOM.totalPayable = document.getElementById('totalPayable');
  DOM.topCartQty = document.getElementById('topCartQty');
  DOM.tokenDisplay = document.getElementById('tokenDisplay');
  DOM.modalToken = document.getElementById('modalToken');

  renderCategories();
  renderItems();
  updateTokenUI();

  if (db) {
    db.collection('menu').onSnapshot((snapshot) => {
      if (!snapshot.empty) {
        const cloudMenu = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        state.menu = cloudMenu;
        localStorage.setItem('vb_menu', JSON.stringify(cloudMenu));
        renderCategories();
        renderItems();
      }
    });
  }
});

function updateTokenUI() {
  if (DOM.tokenDisplay) DOM.tokenDisplay.textContent = `Token #${state.token}`;
  if (DOM.modalToken) DOM.modalToken.textContent = `Token #${state.token}`;
}

function handleSearch() {
  state.searchQuery = document.getElementById('searchInput').value.toLowerCase().trim();
  renderItems();
}

function renderCategories() {
  if (!DOM.catBar) return;
  const cats = ['All', ...new Set(state.menu.map(i => i.cat))];
  DOM.catBar.innerHTML = cats.map(c => 
    `<button class="cat-btn ${c === state.activeCat ? 'active' : ''}" onclick="filterCat('${c}')">${c}</button>`
  ).join('');
}

function filterCat(cat) {
  state.activeCat = cat;
  renderCategories();
  renderItems();
}

function renderItems() {
  if (!DOM.itemGrid) return;
  
  let list = state.activeCat === 'All' ? state.menu : state.menu.filter(i => i.cat === state.activeCat);

  if (state.searchQuery) {
    list = list.filter(i => i.name.toLowerCase().includes(state.searchQuery));
  }

  DOM.itemGrid.innerHTML = list.map(i => {
    const inCart = state.cart.get(String(i.id));
    const qty = inCart ? inCart.qty : 0;

    return `
      <div class="dish-card">
        <div class="dish-img-wrapper">
          <div class="veg-badge"></div>
          <img src="${i.img}" class="dish-img" alt="${i.name}">
        </div>
        <div class="dish-info">
          <div>
            <h4>${i.name}</h4>
            <p>₹${i.price}</p>
          </div>
          ${qty === 0 ? 
            `<button class="btn-add" onclick="addToCart('${i.id}')">ADD +</button>` : 
            `<div class="qty-select-wrapper">
              <span>Qty:</span>
              <select class="qty-dropdown" onchange="handleQtyChange('${i.id}', this.value)">
                <option value="0">0 (Remove)</option>
                <option value="1" ${qty === 1 ? 'selected' : ''}>1</option>
                <option value="2" ${qty === 2 ? 'selected' : ''}>2</option>
                <option value="3" ${qty === 3 ? 'selected' : ''}>3</option>
                <option value="4" ${qty === 4 ? 'selected' : ''}>4</option>
                <option value="5" ${qty === 5 ? 'selected' : ''}>5</option>
                <option value="6" ${qty === 6 ? 'selected' : ''}>6</option>
                <option value="7" ${qty === 7 ? 'selected' : ''}>7</option>
                <option value="8" ${qty === 8 ? 'selected' : ''}>8</option>
                <option value="9" ${qty === 9 ? 'selected' : ''}>9</option>
                <option value="custom" ${qty > 9 ? 'selected' : ''}>${qty > 9 ? qty : '9+ (Custom)'}</option>
              </select>
            </div>`
          }
        </div>
      </div>
    `;
  }).join('');
}

function addToCart(id) {
  const strId = String(id);
  const product = state.menu.find(i => String(i.id) === strId);
  if (product) {
    state.cart.set(strId, { ...product, qty: 1 });
  }
  renderItems();
  updateCartUI();
}

function handleQtyChange(id, value) {
  const strId = String(id);
  
  if (value === "custom") {
    const inputVal = prompt("Enter custom quantity:", state.cart.get(strId)?.qty || 10);
    const num = parseInt(inputVal, 10);
    
    if (!isNaN(num) && num > 0) {
      if (state.cart.has(strId)) {
        state.cart.get(strId).qty = num;
      }
    } else if (num === 0) {
      state.cart.delete(strId);
    }
  } else {
    const num = parseInt(value, 10);
    if (num <= 0) {
      state.cart.delete(strId);
    } else if (state.cart.has(strId)) {
      state.cart.get(strId).qty = num;
    }
  }

  renderItems();
  updateCartUI();
}

function clearCart() {
  state.cart.clear();
  renderItems();
  updateCartUI();
}

function updateCartUI() {
  let count = 0;
  let sum = 0;
  let html = '';

  state.cart.forEach((item, id) => {
    count += item.qty;
    const itemTotal = item.qty * item.price;
    sum += itemTotal;

    html += `
      <div class="cart-item">
        <div>
          <strong>${item.name}</strong><br>
          <small>₹${item.price} x ${item.qty} = ₹${itemTotal}</small>
        </div>
        <div class="qty-select-wrapper" style="width: 110px;">
          <select class="qty-dropdown" onchange="handleQtyChange('${id}', this.value)">
            <option value="0">0 (Remove)</option>
            <option value="1" ${item.qty === 1 ? 'selected' : ''}>1</option>
            <option value="2" ${item.qty === 2 ? 'selected' : ''}>2</option>
            <option value="3" ${item.qty === 3 ? 'selected' : ''}>3</option>
            <option value="4" ${item.qty === 4 ? 'selected' : ''}>4</option>
            <option value="5" ${item.qty === 5 ? 'selected' : ''}>5</option>
            <option value="6" ${item.qty === 6 ? 'selected' : ''}>6</option>
            <option value="7" ${item.qty === 7 ? 'selected' : ''}>7</option>
            <option value="8" ${item.qty === 8 ? 'selected' : ''}>8</option>
            <option value="9" ${item.qty === 9 ? 'selected' : ''}>9</option>
            <option value="custom" ${item.qty > 9 ? 'selected' : ''}>${item.qty > 9 ? item.qty : '9+'}</option>
          </select>
        </div>
      </div>
    `;
  });

  if (DOM.topCartQty) DOM.topCartQty.textContent = count;
  if (DOM.totalPayable) DOM.totalPayable.textContent = sum.toFixed(2);
  if (DOM.cartList) DOM.cartList.innerHTML = count === 0 ? '<div class="empty-state">Your order is empty. Add an item from the menu.</div>' : html;
}

function openCartModal() {
  document.getElementById('cartModal').classList.add('active');
}

function closeCartModal() {
  document.getElementById('cartModal').classList.remove('active');
}

function processAndPrint() {
  if (state.cart.size === 0) {
    alert('Your cart is empty!');
    return;
  }

  const WIDTH = 32;

  const fit = (value, width) => {
    value = String(value ?? '');
    return value.length > width ? value.slice(0, width) : value;
  };

  const left = (value, width) => fit(value, width).padEnd(width, ' ');
  const right = (value, width) => fit(value, width).padStart(width, ' ');
  const center = (value) => {
    value = fit(value, WIDTH);
    return ' '.repeat(Math.max(0, Math.floor((WIDTH - value.length) / 2))) + value;
  };

  const divider = '-'.repeat(WIDTH);
  const orderItems = [];
  let sum = 0;

  const receiptLines = [
    center('VEG BITE'),
    center('College Canteen'),
    divider,
    center('TOKEN NO: ' + state.token),
    center(new Date().toLocaleString('en-IN', {
      dateStyle: 'short',
      timeStyle: 'short'
    })),
    divider,
    left('ITEM', 14) + left('QTY', 7) + right('AMOUNT', 11),
    divider
  ];

  state.cart.forEach(i => {
    const itemTotal = i.qty * i.price;
    sum += itemTotal;

    orderItems.push({
      name: i.name,
      price: i.price,
      qty: i.qty
    });

    receiptLines.push(
      left(i.name, 14) +
      left(i.qty + 'x' + i.price, 7) +
      right('Rs.' + itemTotal.toFixed(2), 11)
    );
  });

  receiptLines.push(
    divider,
    left('TOTAL:', 21) + right('Rs.' + sum.toFixed(2), 11),
    divider,
    center('Thank You! Visit Again'),
    '',
    ''
  );

  const receiptText = receiptLines.join('\n');

  // Update hidden receipt for browser-print fallback.
  const receiptTextEl = document.getElementById('receiptText');
  if (receiptTextEl) receiptTextEl.textContent = receiptText;

  document.getElementById('tToken').textContent = state.token;
  document.getElementById('tTotal').textContent = sum.toFixed(2);
  document.getElementById('tDate').textContent = new Date().toLocaleString('en-IN');

  const orderRecord = {
    token: state.token,
    items: orderItems,
    total: sum,
    createdAt: new Date().toISOString()
  };

  const sales = JSON.parse(localStorage.getItem('vb_sales')) || [];
  sales.push(orderRecord);
  localStorage.setItem('vb_sales', JSON.stringify(sales));

  if (db) {
    db.collection('orders').add(orderRecord).catch(err => {
      console.error('Firestore order save failed:', err);
    });
  }

  closeCartModal();

  // IMPORTANT:
  // RawBT's documented web format is:
  // intent:<encoded text>#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;
  // Use encodeURI here, matching RawBT examples.
  if (/Android/i.test(navigator.userAgent)) {
    const rawbtUrl =
      'intent:' +
      encodeURI(receiptText) +
      '#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;';

    let leftPage = false;

    const onVisibilityChange = () => {
      if (document.hidden) {
        leftPage = true;
        document.removeEventListener('visibilitychange', onVisibilityChange);
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    // This is executed directly from the Print button click.
    window.location.href = rawbtUrl;

    // If Chrome/Android refuses the RawBT intent, fall back to normal printing.
    setTimeout(() => {
      document.removeEventListener('visibilitychange', onVisibilityChange);

      if (!leftPage && !document.hidden) {
        window.print();
      }
    }, 1200);
  } else {
    window.print();
  }

  state.token++;
  localStorage.setItem('vb_token', state.token);
  state.cart.clear();
  updateTokenUI();
  renderItems();
  updateCartUI();
}
