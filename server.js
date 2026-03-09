const express = require('express');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Настройка Middlewares
app.use(cors()); // Позволяет фронтенду (Netlify) делать запросы к бэкенду
app.use(express.json()); // Позволяет серверу понимать JSON в POST запросах

// 1. Подключение к MongoDB Atlas
// На сервере Render мы создадим переменную с таким названием
const dbURI = process.env.MONGODB_URI; 

mongoose.connect(dbURI)
    .then(() => console.log("Успешное подключение к MongoDB Atlas"))
    .catch(err => console.error("Ошибка подключения к базе:", err));

// 2. Описание схемы данных
const trailSchema = new mongoose.Schema({
    name: { type: String, required: true },
    level: { type: String, required: true },
    url: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const Trail = mongoose.model('Trail', trailSchema);

// 3. API Маршруты (Endpoints)

// GET: Получить все трассы из базы
app.get('/api/trails', async (req, res) => {
    try {
        const trails = await Trail.find().sort({ createdAt: -1 });
        res.json(trails);
    } catch (err) {
        res.status(500).json({ message: "Ошибка при получении данных" });
    }
});

// POST: Сохранить новую трассу в базу
app.post('/api/trails', async (req, res) => {
    try {
        const newTrail = new Trail({
            name: req.body.name,
            level: req.body.level,
            url: req.body.url
        });
        const savedTrail = await newTrail.save();
        res.status(201).json(savedTrail);
    } catch (err) {
        res.status(400).json({ message: "Ошибка при сохранении данных" });
    }
});



const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const User = mongoose.model('User', userSchema);


// Маршрут регистрации
app.post('/api/register', async (req, res) => {
    const { email, password } = req.body;
    console.log("📥 Получен запрос на регистрацию:", email);

    try {
        // 1. Проверяем, существует ли пользователь
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Этот email уже зарегистрирован" });
        }

        // 2. Шифруем пароль (10 — это уровень сложности шифрования)
        const hashedPassword = await bcrypt.hash(password, 10);

        // 3. Создаем и сохраняем в базу
        const newUser = new User({
            email,
            password: hashedPassword
        });

        const savedUser = await newUser.save(); // Обязательно await!
        console.log("✅ Пользователь сохранен в БД:", savedUser.email);

        res.status(201).json({ message: "Регистрация прошла успешно!" });

    } catch (error) {
        console.error("❌ Ошибка сервера:", error.message);
        res.status(500).json({ message: "Ошибка при регистрации", error: error.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Сервер запущен на порту ${PORT}`));

// Добавь это в свой server.js после маршрута регистрации

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    console.log("🔑 Попытка входа:", email);

    try {
        // 1. Ищем пользователя по почте
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Пользователь не найден" });
        }

        // 2. Сравниваем введенный пароль с тем, что в базе
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Неверный пароль" });
        }

        // Если всё ок
        console.log("✅ Успешный вход:", email);
        res.status(200).json({ message: "Вы успешно вошли!" });

    } catch (error) {
        console.error("❌ Ошибка при входе:", error.message);
        res.status(500).json({ message: "Ошибка сервера" });
    }
});

const jwt = require('jsonwebtoken');
const JWT_SECRET = '123qwe'; // Придумай любую строку

// 1. Обнови маршрут ЛОГИНА
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "Пользователь не найден" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Неверный пароль" });

        // Создаем ТОКЕН (паспорт)
        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({ 
            message: "Вы успешно вошли!",
            token: token // Отправляем токен на фронтенд
        });
    } catch (e) {
        res.status(500).json({ message: "Ошибка сервера" });
    }
});

// 2. Добавь маршрут ПРОФИЛЯ
app.get('/api/profile', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1]; // Достаем токен из заголовка

    if (!token) return res.status(401).json({ message: "Вы не авторизованы" });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password'); // Ищем юзера без пароля
        res.json(user);
    } catch (e) {
        res.status(401).json({ message: "Сессия истекла" });
    }
});