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

// 4. Запуск сервера
// Используем порт от системы (Render) или 5000 для локальной разработки
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const User = mongoose.model('User', userSchema);


app.post('/api/register', async (req, res) => {
    const { email, password } = req.body;

    try {
        // 1. Проверяем, нет ли уже такого пользователя
        const candidate = await User.findOne({ email });
        if (candidate) {
            return res.status(400).json({ message: "Этот email уже занят" });
        }

        // 2. Шифруем пароль
        const hashedPassword = await bcrypt.hash(password, 10);

        // 3. Создаем и сохраняем
        const user = new User({
            email,
            password: hashedPassword
        });

        await user.save(); // Тот самый важный await!
        
        console.log(`✅ Пользователь ${email} успешно зарегистрирован`);
        res.status(201).json({ message: "Регистрация прошла успешно!" });

    } catch (e) {
        console.error("❌ Ошибка базы:", e.message);
        res.status(500).json({ message: "Что-то пошло не так, попробуйте снова" });
    }
});