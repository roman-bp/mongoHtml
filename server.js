const express = require('express');
const fs = require('fs');
const multer = require('multer');
const { MongoClient, ObjectId } = require('mongodb');
const app = express();

const url = 'mongodb://localhost:27017';
const dbName = 'mongoHtml';
const client = new MongoClient(url);

app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Налаштування multer для зберігання файлів та аватарів з використанням Buffer для обробки імен файлів
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === 'avatar') {
            cb(null, 'uploads/avatars');
        } else {
            cb(null, 'uploads');
        }
    },
    filename: (req, file, cb) => {
        // Використання Buffer для уникнення проблем із кодуванням
        const safeFileName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        cb(null, Date.now() + '-' + safeFileName);
    }
});
const upload = multer({ storage: storage });

// Переконайся, що папки "uploads" та "uploads/avatars" існують
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
if (!fs.existsSync('uploads/avatars')) fs.mkdirSync('uploads/avatars');

// Функції для читання та запису в users.json
function readUsersFromJSON() {
    try {
        const data = fs.readFileSync('users.json', 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Error reading users.json:", error);
        return [];
    }
}

function writeUsersToJSON(users) {
    try {
        fs.writeFileSync('users.json', JSON.stringify(users, null, 2));
        console.log("Data successfully written to users.json");
    } catch (error) {
        console.error("Error writing to users.json:", error);
    }
}

// Основна функція підключення до MongoDB
async function main() {
    try {
        await client.connect();
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
        return;
    }

    const db = client.db(dbName);
    const usersCollection = db.collection('users');

    app.use(express.static('public'));

    // Маршрут для отримання всіх користувачів з JSON
    app.get('/json-users', (req, res) => {
        try {
            const users = readUsersFromJSON();
            res.json(users);
        } catch (error) {
            console.error("Error sending users data:", error);
            res.status(500).send("Error reading users.json");
        }
    });

    // Маршрут для додавання нового користувача в JSON та MongoDB з файлами
    app.post('/json-users', upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'files', maxCount: 10 }]), async (req, res) => {
        try {
            const newUser = {
                name: req.body.name,
                email: req.body.email,
                phone: req.body.phone,
                address: req.body.address,
                notes: req.body.notes,
                avatar: req.files['avatar'] ? req.files['avatar'][0].path : null,
                files: req.files['files'] ? req.files['files'].map(file => file.path) : []
            };

            // Зберігаємо користувача в MongoDB та отримуємо його _id
            const result = await usersCollection.insertOne(newUser);
            newUser._id = result.insertedId.toString(); // Додаємо _id до об'єкта користувача у вигляді рядка

            // Додаємо користувача з _id до JSON
            const users = readUsersFromJSON();
            users.push(newUser);
            writeUsersToJSON(users);

            console.log("User added to MongoDB and users.json with ID:", newUser._id);
            res.status(201).json(newUser);
        } catch (error) {
            console.error("Error adding user:", error);
            res.status(500).send("Error adding user");
        }
    });

    // Маршрут для додавання файлів до існуючого користувача
    app.post('/json-users/:id/add-files', upload.array('files', 10), async (req, res) => {
        const userId = req.params.id;
        const newFiles = req.files.map(file => file.path);

        // Оновлення JSON
        try {
            const users = readUsersFromJSON();
            const user = users.find(u => u._id === userId || u._id === userId.toString());

            if (user) {
                user.files = [...(user.files || []), ...newFiles];
                writeUsersToJSON(users);
            } else {
                return res.status(404).json({ message: "User not found" });
            }
        } catch (error) {
            console.error("Error updating JSON file:", error);
            return res.status(500).send("Error updating JSON file");
        }

        // Оновлення MongoDB
        try {
            const result = await usersCollection.updateOne(
                { _id: new ObjectId(userId) },
                { $push: { files: { $each: newFiles } } }
            );
            if (result.modifiedCount === 1) {
                res.status(200).json({ message: "Files added successfully" });
            } else {
                res.status(404).json({ message: "User not found in MongoDB" });
            }
        } catch (error) {
            console.error("Error updating user in MongoDB:", error);
            res.status(500).send("Error updating user in MongoDB");
        }
    });

    // Маршрут для видалення файлу користувача
    app.post('/json-users/:id/delete-file', async (req, res) => {
        const userId = req.params.id;
        const { filePath } = req.body;

        // Оновлення JSON
        try {
            const users = readUsersFromJSON();
            const user = users.find(u => u._id === userId || u._id === userId.toString());

            if (user) {
                user.files = user.files.filter(file => file !== filePath);
                writeUsersToJSON(users);
            } else {
                return res.status(404).json({ message: "User not found" });
            }
        } catch (error) {
            console.error("Error updating JSON file:", error);
            return res.status(500).send("Error updating JSON file");
        }

        // Оновлення MongoDB
        try {
            const result = await usersCollection.updateOne(
                { _id: new ObjectId(userId) },
                { $pull: { files: filePath } }
            );
            if (result.modifiedCount === 1) {
                res.status(200).json({ message: "File deleted successfully" });
            } else {
                res.status(404).json({ message: "User not found in MongoDB" });
            }
        } catch (error) {
            console.error("Error updating user in MongoDB:", error);
            res.status(500).send("Error updating user in MongoDB");
        }
    });

    // Маршрут для зміни аватара користувача
    app.post('/json-users/:id/change-avatar', upload.single('avatar'), async (req, res) => {
        const userId = req.params.id;
        const avatarPath = req.file.path;

        // Оновлення JSON
        try {
            const users = readUsersFromJSON();
            const user = users.find(u => u._id === userId || u._id === userId.toString());

            if (user) {
                user.avatar = avatarPath;
                writeUsersToJSON(users);
            } else {
                return res.status(404).json({ message: "User not found" });
            }
        } catch (error) {
            console.error("Error updating JSON file:", error);
            return res.status(500).send("Error updating JSON file");
        }

        // Оновлення MongoDB
        try {
            const result = await usersCollection.updateOne(
                { _id: new ObjectId(userId) },
                { $set: { avatar: avatarPath } }
            );
            if (result.modifiedCount === 1) {
                res.status(200).json({ message: "Avatar updated successfully" });
            } else {
                res.status(404).json({ message: "User not found in MongoDB" });
            }
        } catch (error) {
            console.error("Error updating user in MongoDB:", error);
            res.status(500).send("Error updating user in MongoDB");
        }
    });

    app.listen(3000, () => console.log('Server is running on http://localhost:3000'));
}

main().catch(console.error);
