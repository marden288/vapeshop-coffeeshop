const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;

const DATA_PATH = path.join(__dirname, 'data', 'db.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

function ensureDbFile() {
  const dir = path.dirname(DATA_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(
      DATA_PATH,
      JSON.stringify(
        {
          products: [],
          users: [],
          orders: [],
          cartByUserId: {}
        },
        null,
        2
      )
    );
  }
}

function readDb() {
  ensureDbFile();
  const raw = fs.readFileSync(DATA_PATH, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch {
    return { products: [], users: [], orders: [], cartByUserId: {} };
  }
}

function writeDb(db) {
  ensureDbFile();
  fs.writeFileSync(DATA_PATH, JSON.stringify(db, null, 2));
}

function seedIfEmpty() {
  const db = readDb();
  if (db.products?.length) return;

  db.products = [
    { id: 'c1', name: 'Caramel Macchiato', desc: 'Smooth espresso with vanilla & caramel drizzle', price: 5.25, category: 'coffee', img: 'https://picsum.photos/id/225/300/200', type: 'Hot Coffee' },
    { id: 'c2', name: 'Iced Vanilla Latte', desc: 'Chilled latte, creamy vanilla bean', price: 5.75, category: 'coffee', img: 'https://picsum.photos/id/146/300/200', type: 'Iced Coffee' },
    { id: 'c3', name: 'Double Espresso', desc: 'Rich and bold double shot, aromatic', price: 3.5, category: 'coffee', img: 'https://picsum.photos/id/130/300/200', type: 'Espresso Drinks' },
    { id: 'c4', name: 'Matcha Green Tea', desc: 'Premium ceremonial matcha latte', price: 4.95, category: 'non-coffee', img: 'https://picsum.photos/id/152/300/200', type: 'Non-Coffee' },
    { id: 'p1', name: 'Blueberry Muffin', desc: 'Fresh baked, buttery muffin with streusel', price: 3.25, category: 'pastry', img: 'https://picsum.photos/id/264/300/200', type: 'Pastries' },
    { id: 'v1', name: 'Elf Bar BC5000', desc: 'Disposable 5000 puffs, blue razz ice', price: 18.99, category: 'vape', img: 'https://picsum.photos/id/21/300/200', type: 'Disposable' },
    { id: 'v2', name: 'Vaporesso XROS 3', desc: 'Pod system, adjustable airflow, sleek', price: 32.99, category: 'vape', img: 'https://picsum.photos/id/26/300/200', type: 'Device' },
    { id: 'v3', name: 'Naked 100 Menthol', desc: '60mL e-liquid, icy menthol blast', price: 19.99, category: 'vape', img: 'https://picsum.photos/id/48/300/200', type: 'E-Liquid' },
    { id: 'v4', name: 'Coils Pack (5pcs)', desc: 'Mesh coils 0.6 ohm, long lasting', price: 14.5, category: 'vape', img: 'https://picsum.photos/id/74/300/200', type: 'Accessory' },
    { id: 'v5', name: 'Starter Kit: Caliburn G3', desc: 'Complete kit + 2 pods, best for beginners', price: 39.99, category: 'vape', img: 'https://picsum.photos/id/77/300/200', type: 'Starter Kit' }
  ];

  db.users = [
    { id: 'demo1', email: 'member@cloud.com', points: 280, password: 'pass123', name: 'Coffee Lover', profilePic: 'https://randomuser.me/api/portraits/men/32.jpg' }
  ];

  db.orders = [
    {
      id: 'ORDDEMO1',
      items: [db.products[0]],
      total: db.products[0].price,
      date: new Date().toISOString(),
      status: 'confirmed',
      userId: 'demo1'
    }
  ];

  db.cartByUserId = { demo1: [] };

  writeDb(db);
}

seedIfEmpty();

app.use(express.static(PUBLIC_DIR));

// -------- API --------
app.get('/api/products', (req, res) => {
  const db = readDb();
  res.json({ products: db.products || [] });
});

app.post('/api/auth/register', (req, res) => {
  const { email, name, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  const db = readDb();
  db.users = db.users || [];
  const existing = db.users.find((u) => u.email === email);
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const user = {
    id: String(Date.now()),
    email,
    name: name || 'Member',
    points: 100,
    password,
    profilePic: 'https://randomuser.me/api/portraits/men/32.jpg'
  };

  db.users.push(user);
  db.cartByUserId = db.cartByUserId || {};
  db.cartByUserId[user.id] = [];
  writeDb(db);

  res.json({ user });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  const db = readDb();
  const user = (db.users || []).find((u) => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  res.json({ user });
});

app.post('/api/profile/pic', (req, res) => {
  const { userId, dataUrl } = req.body || {};
  if (!userId || !dataUrl) return res.status(400).json({ error: 'userId and dataUrl are required' });
  const db = readDb();
  db.users = db.users || [];
  const user = db.users.find((u) => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.profilePic = dataUrl;
  writeDb(db);
  res.json({ user });
});

app.get('/api/admin/stats', (req, res) => {
  const db = readDb();
  const orders = db.orders || [];
  const totalSales = orders.reduce((s, o) => s + (o.total || 0), 0);
  res.json({
    totalSales,
    ordersCount: orders.length,
    usersCount: (db.users || []).length,
    productsCount: (db.products || []).length
  });
});

app.get('/api/admin/orders', (req, res) => {
  const db = readDb();
  res.json({ orders: db.orders || [] });
});

app.post('/api/cart/checkout', (req, res) => {
  const { userId, items } = req.body || {};
  if (!items || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Cart items required' });

  const db = readDb();
  db.orders = db.orders || [];

  const total = items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 0), 0);
  const order = {
    id: 'ORD' + Date.now(),
    items,
    total,
    date: new Date().toISOString(),
    status: 'confirmed',
    userId: userId || null
  };

  db.orders.push(order);

  // apply points if logged in
  if (userId) {
    db.users = db.users || [];
    const user = db.users.find((u) => u.id === userId);
    if (user) {
      const addPoints = Math.floor(total * 10);
      user.points = (user.points || 0) + addPoints;
    }
  }

  // clear cart
  db.cartByUserId = db.cartByUserId || {};
  if (userId) db.cartByUserId[userId] = [];

  writeDb(db);
  res.json({ order });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// Router-safe SPA fallback for common routes
['/home','/about','/products','/business-plan','/gallery','/contact','/admin','/cart','/membership'].forEach((p) => {
  app.get(p, (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));
});

// Fallback for everything else
app.use((req, res, next) => {
  if (req.path && req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});





app.listen(PORT, () => {
  console.log(`Cloud & Brew running on http://localhost:${PORT}`);
});

