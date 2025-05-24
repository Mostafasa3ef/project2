require('dotenv').config();
const express = require('express');
const AWS = require('aws-sdk');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// إعدادات AWS
AWS.config.update({
    region: process.env.AWS_REGION || 'eu-north-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const JWT_SECRET = process.env.JWT_SECRET || 'x7k9p2m8q3z5r1t4';

// التحقق من صلاحيات الأدمن
const checkAdmin = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.email !== 'admin@example.com') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Admin Verify Error:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
};

// تسجيل مستخدم
app.post('/api/users/register', async (req, res) => {
    const { name, email, password, nickname } = req.body;
    if (!name || !email || !password || !nickname) {
        return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
    }
    const params = {
        TableName: 'Users',
        Item: {
            email,
            name,
            password, // ملاحظة: في الإنتاج، استخدم bcrypt للتشفير
            nickname,
            createdAt: new Date().toISOString()
        },
        ConditionExpression: 'attribute_not_exists(email)'
    };
    try {
        await dynamoDB.put(params).promise();
        res.status(201).json({ message: 'تم التسجيل بنجاح' });
    } catch (error) {
        console.error('Register Error:', error);
        if (error.code === 'ConditionalCheckFailedException') {
            return res.status(400).json({ error: 'الإيميل مسجل مسبقًا' });
        }
        res.status(500).json({ error: 'فشل التسجيل', details: error.message });
    }
});

// تسجيل دخول
app.post('/api/users/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'الإيميل وكلمة المرور مطلوبان' });
    }
    const params = {
        TableName: 'Users',
        Key: { email }
    };
    try {
        const data = await dynamoDB.get(params).promise();
        if (!data.Item || data.Item.password !== password) {
            return res.status(401).json({ error: 'الإيميل أو كلمة المرور غير صحيحة' });
        }
        const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ token, message: 'تم تسجيل الدخول بنجاح' });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ error: 'فشل تسجيل الدخول', details: error.message });
    }
});

// التحقق من التوكن
app.get('/api/users/verify', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'لا يوجد توكن' });
    try {
        jwt.verify(token, JWT_SECRET);
        res.json({ message: 'التوكن صالح' });
    } catch (error) {
        console.error('Verify Error:', error);
        res.status(401).json({ error: 'توكن غير صالح' });
    }
});

// جلب بيانات السلة
app.get('/api/cart', async (req, res) => {
    const userEmail = req.query.userEmail || 'guest';
    const params = {
        TableName: 'Cart',
        Key: { userEmail }
    };
    try {
        const data = await dynamoDB.get(params).promise();
        res.json(data.Item || { items: [] });
    } catch (error) {
        console.error('Cart Error:', error);
        res.status(500).json({ error: 'فشل جلب السلة', details: error.message });
    }
});

// إتمام الدفع
app.post('/api/checkout', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'يرجى تسجيل الدخول' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const { address, cardNumber, expiry, cvv } = req.body;
        if (!address || !cardNumber || !expiry || !cvv) {
            return res.status(400).json({ error: 'بيانات الدفع ناقصة' });
        }
        const orderId = Date.now().toString();
        const params = {
            TableName: 'Orders',
            Item: {
                id: orderId,
                userEmail: decoded.email,
                address,
                paymentDetails: { cardNumber, expiry, cvv },
                createdAt: new Date().toISOString()
            }
        };
        await dynamoDB.put(params).promise();
        await dynamoDB.delete({ TableName: 'Cart', Key: { userEmail: decoded.email } }).promise();
        res.json({ message: 'تم الدفع بنجاح', orderId });
    } catch (error) {
        console.error('Checkout Error:', error);
        res.status(500).json({ error: 'فشل الدفع', details: error.message });
    }
});

// APIs للأدمن
// جلب المستخدمين
app.get('/api/admin/users', checkAdmin, async (req, res) => {
    const params = {
        TableName: 'Users'
    };
    try {
        const data = await dynamoDB.scan(params).promise();
        res.json(data.Items);
    } catch (error) {
        console.error('Get Users Error:', error);
        res.status(500).json({ error: 'فشل جلب المستخدمين', details: error.message });
    }
});

// جلب الطلبات
app.get('/api/admin/orders', checkAdmin, async (req, res) => {
    const params = {
        TableName: 'Orders'
    };
    try {
        const data = await dynamoDB.scan(params).promise();
        res.json(data.Items);
    } catch (error) {
        console.error('Get Orders Error:', error);
        res.status(500).json({ error: 'فشل جلب الطلبات', details: error.message });
    }
});

// حذف مستخدم
app.delete('/api/admin/users/:email', checkAdmin, async (req, res) => {
    const { email } = req.params;
    const params = {
        TableName: 'Users',
        Key: { email }
    };
    try {
        await dynamoDB.delete(params).promise();
        res.json({ message: 'تم حذف المستخدم بنجاح' });
    } catch (error) {
        console.error('Delete User Error:', error);
        res.status(500).json({ error: 'فشل حذف المستخدم', details: error.message });
    }
});

// إضافة/تعديل فئة
app.post('/api/admin/categories', checkAdmin, async (req, res) => {
    const { id, name } = req.body;
    if (!id || !name) return res.status(400).json({ error: 'المعرف والاسم مطلوبان' });
    const params = {
        TableName: 'Categories',
        Item: {
            id,
            name,
            createdAt: new Date().toISOString()
        }
    };
    try {
        await dynamoDB.put(params).promise();
        res.json({ message: 'تم إضافة/تعديل الفئة بنجاح' });
    } catch (error) {
        console.error('Category Error:', error);
        res.status(500).json({ error: 'فشل إضافة الفئة', details: error.message });
    }
});

// جلب الفئات
app.get('/api/categories', async (req, res) => {
    const params = {
        TableName: 'Categories'
    };
    try {
        const data = await dynamoDB.scan(params).promise();
        res.json(data.Items);
    } catch (error) {
        console.error('Get Categories Error:', error);
        res.status(500).json({ error: 'فشل جلب الفئات', details: error.message });
    }
});

// إضافة خبر
app.post('/api/admin/news', checkAdmin, async (req, res) => {
    const { id, title, content } = req.body;
    if (!id || !title || !content) return res.status(400).json({ error: 'المعرف، العنوان، والمحتوى مطلوبان' });
    const params = {
        TableName: 'News',
        Item: {
            id,
            title,
            content,
            createdAt: new Date().toISOString()
        }
    };
    try {
        await dynamoDB.put(params).promise();
        res.json({ message: 'تم إضافة الخبر بنجاح' });
    } catch (error) {
        console.error('News Error:', error);
        res.status(500).json({ error: 'فشل إضافة الخبر', details: error.message });
    }
});

// جلب الأخبار
app.get('/api/news', async (req, res) => {
    const params = {
        TableName: 'News'
    };
    try {
        const data = await dynamoDB.scan(params).promise();
        res.json(data.Items);
    } catch (error) {
        console.error('Get News Error:', error);
        res.status(500).json({ error: 'فشل جلب الأخبار', details: error.message });
    }
});

// تشغيل السيرفر
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));