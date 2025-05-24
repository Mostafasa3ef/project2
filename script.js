const API_URL ='http://16.171.153.52:3000';//'http://localhost:3000';

// تحديث عدد المنتجات في السلة
async function updateCartCount() {
    try {
        const response = await fetch(`${API_URL}/api/cart`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        const cart = await response.json();
        const cartCount = cart.items ? cart.items.length : 0;
        document.getElementById('cartCount').textContent = cartCount;
    } catch (error) {
        console.error('Error fetching cart:', error);
    }
}

// جلب الفئات ديناميكيًا
async function loadCategories() {
    try {
        const response = await fetch(`${API_URL}/api/categories`);
        const categories = await response.json();
        const nav = document.getElementById('categoriesNav');
        nav.innerHTML = '';
        categories.forEach(category => {
            const li = document.createElement('li');
            li.className = 'nav-item';
            li.innerHTML = `<a class="nav-link" href="products.html?category=${category.name}">${category.name}</a>`;
            nav.appendChild(li);
        });
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// جلب الأخبار
async function loadNews() {
    try {
        const response = await fetch(`${API_URL}/api/news`);
        const news = await response.json();
        const newsList = document.getElementById('newsList');
        newsList.innerHTML = '';
        news.forEach(item => {
            const div = document.createElement('div');
            div.className = 'col-md-4 news-item';
            div.innerHTML = `
                <h4>${item.title}</h4>
                <p>${item.content}</p>
                <small>نُشر في: ${new Date(item.createdAt).toLocaleDateString('ar-EG')}</small>
            `;
            newsList.appendChild(div);
        });
    } catch (error) {
        console.error('Error loading news:', error);
    }
}

// تسجيل مستخدم
async function registerUser() {
    const data = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
        nickname: document.getElementById('nickname').value
    };
    try {
        const response = await fetch(`${API_URL}/api/users/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        const messageDiv = document.getElementById('registerMessage');
        if (response.ok) {
            messageDiv.innerHTML = '<div class="alert alert-success">تم التسجيل بنجاح! يرجى تسجيل الدخول.</div>';
            setTimeout(() => window.location.href = 'login.html', 2000);
        } else {
            messageDiv.innerHTML = `<div class="alert alert-danger">${result.error || 'فشل التسجيل.'}</div>`;
        }
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('registerMessage').innerHTML = '<div class="alert alert-danger">حدث خطأ أثناء التسجيل.</div>';
    }
}

// تسجيل دخول
async function loginUser() {
    const data = {
        email: document.getElementById('email').value,
        password: document.getElementById('password').value
    };
    try {
        const response = await fetch(`${API_URL}/api/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        const messageDiv = document.getElementById('loginMessage');
        if (response.ok) {
            localStorage.setItem('token', result.token);
            document.getElementById('loginLink').style.display = 'none';
            document.getElementById('logoutLink').style.display = 'inline';
            messageDiv.innerHTML = '<div class="alert alert-success">تم تسجيل الدخول بنجاح!</div>';
            setTimeout(() => window.location.href = 'index.html', 2000);
        } else {
            messageDiv.innerHTML = `<div class="alert alert-danger">${result.error || 'فشل تسجيل الدخول.'}</div>`;
        }
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('loginMessage').innerHTML = '<div class="alert alert-danger">حدث خطأ أثناء تسجيل الدخول.</div>';
    }
}

// تسجيل خروج
function logout() {
    localStorage.removeItem('token');
    document.getElementById('loginLink').style.display = 'inline';
    document.getElementById('logoutLink').style.display = 'none';
    window.location.href = 'index.html';
}

// التحقق من تسجيل الدخول للدفع
async function checkLoginForCheckout() {
    const token = localStorage.getItem('token');
    const alert = document.getElementById('loginAlert');
    const form = document.getElementById('checkoutForm');
    if (!token) {
        alert.style.display = 'block';
        form.style.display = 'none';
        return false;
    }
    try {
        const response = await fetch(`${API_URL}/api/users/verify`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        if (response.ok) {
            alert.style.display = 'none';
            form.style.display = 'block';
            return true;
        } else {
            alert.style.display = 'block';
            form.style.display = 'none';
            localStorage.removeItem('token');
            return false;
        }
    } catch (error) {
        console.error('Error verifying token:', error);
        alert.style.display = 'block';
        form.style.display = 'none';
        return false;
    }
}

// إتمام الدفع
async function processCheckout() {
    const token = localStorage.getItem('token');
    const data = {
        address: document.getElementById('address').value,
        cardNumber: document.getElementById('cardNumber').value,
        expiry: document.getElementById('expiry').value,
        cvv: document.getElementById('cvv').value
    };
    try {
        const response = await fetch(`${API_URL}/api/checkout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        const messageDiv = document.getElementById('checkoutMessage');
        if (response.ok) {
            messageDiv.innerHTML = '<div class="alert alert-success">تم إتمام الدفع بنجاح!</div>';
            setTimeout(() => window.location.href = 'order.html', 2000);
        } else {
            messageDiv.innerHTML = `<div class="alert alert-danger">${result.error || 'فشل إتمام الدفع.'}</div>`;
        }
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('checkoutMessage').innerHTML = '<div class="alert alert-danger">حدث خطأ أثناء الدفع.</div>';
    }
}

// التحقق من صلاحيات الأدمن
async function checkAdminAccess() {
    const token = localStorage.getItem('token');
    const alert = document.getElementById('adminAlert');
    const content = document.getElementById('adminContent');
    if (!token) {
        alert.style.display = 'block';
        content.style.display = 'none';
        return false;
    }
    try {
        const response = await fetch(`${API_URL}/api/admin/users`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        if (response.ok) {
            alert.style.display = 'none';
            content.style.display = 'block';
            return true;
        } else {
            alert.style.display = 'block';
            content.style.display = 'none';
            localStorage.removeItem('token');
            return false;
        }
    } catch (error) {
        console.error('Error verifying admin:', error);
        alert.style.display = 'block';
        content.style.display = 'none';
        return false;
    }
}

// جلب المستخدمين
async function loadUsers() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/api/admin/users`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        const users = await response.json();
        const tableBody = document.getElementById('usersTable');
        tableBody.innerHTML = '';
        users.forEach(user => {
            const row = `
                <tr>
                    <td>${user.email}</td>
                    <td>${user.name}</td>
                    <td>${user.nickname}</td>
                    <td>${new Date(user.createdAt).toLocaleDateString('ar-EG')}</td>
                    <td>
                        <button class="btn btn-danger btn-sm" onclick="deleteUser('${user.email}')">
                            <i class="fa-solid fa-trash"></i> حذف
                        </button>
                    </td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
    } catch (error) {
        console.error('Error loading users:', error);
        alert('فشل تحميل المستخدمين.');
    }
}

// حذف مستخدم
async function deleteUser(email) {
    const token = localStorage.getItem('token');
    if (confirm(`هل أنت متأكد من حذف المستخدم ${email}؟`)) {
        try {
            const response = await fetch(`${API_URL}/api/admin/users/${email}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                alert('تم حذف المستخدم بنجاح!');
                loadUsers();
            } else {
                const result = await response.json();
                alert(result.error || 'فشل حذف المستخدم.');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('حدث خطأ أثناء حذف المستخدم.');
        }
    }
}

// جلب الطلبات
async function loadOrders() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/api/admin/orders`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        const orders = await response.json();
        const tableBody = document.getElementById('ordersTable');
        tableBody.innerHTML = '';
        orders.forEach(order => {
            const row = `
                <tr>
                    <td>${order.id}</td>
                    <td>${order.userEmail}</td>
                    <td>${order.address}</td>
                    <td>${new Date(order.createdAt).toLocaleDateString('ar-EG')}</td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
    } catch (error) {
        console.error('Error loading orders:', error);
        alert('فشل تحميل الطلبات.');
    }
}

// جلب الفئات في لوحة الأدمن
async function loadAdminCategories() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/api/categories`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        const categories = await response.json();
        const tableBody = document.getElementById('categoriesTable');
        tableBody.innerHTML = '';
        categories.forEach(category => {
            const row = `
                <tr>
                    <td>${category.id}</td>
                    <td>${category.name}</td>
                    <td>${new Date(category.createdAt).toLocaleDateString('ar-EG')}</td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
    } catch (error) {
        console.error('Error loading categories:', error);
        alert('فشل تحميل الفئات.');
    }
}

// إضافة/تعديل فئة
async function addCategory() {
    const token = localStorage.getItem('token');
    const data = {
        id: parseInt(document.getElementById('categoryId').value),
        name: document.getElementById('categoryName').value
    };
    try {
        const response = await fetch(`${API_URL}/api/admin/categories`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (response.ok) {
            alert('تم إضافة/تعديل الفئة بنجاح!');
            document.getElementById('categoryForm').reset();
            loadAdminCategories();
            loadCategories(); // تحديث النافبار
        } else {
            alert(result.error || 'فشل إضافة الفئة.');
        }
    } catch (error) {
        console.error('Error adding category:', error);
        alert('حدث خطأ أثناء إضافة الفئة.');
    }
}

// جلب الأخبار في لوحة الأدمن
async function loadAdminNews() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/api/news`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        const news = await response.json();
        const tableBody = document.getElementById('newsTable');
        tableBody.innerHTML = '';
        news.forEach(item => {
            const row = `
                <tr>
                    <td>${item.id}</td>
                    <td>${item.title}</td>
                    <td>${item.content}</td>
                    <td>${new Date(item.createdAt).toLocaleDateString('ar-EG')}</td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
    } catch (error) {
        console.error('Error loading news:', error);
        alert('فشل تحميل الأخبار.');
    }
}

// إضافة خبر
async function addNews() {
    const token = localStorage.getItem('token');
    const data = {
        id: parseInt(document.getElementById('newsId').value),
        title: document.getElementById('newsTitle').value,
        content: document.getElementById('newsContent').value
    };
    try {
        const response = await fetch(`${API_URL}/api/admin/news`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (response.ok) {
            alert('تم إضافة الخبر بنجاح!');
            document.getElementById('newsForm').reset();
            loadAdminNews();
        } else {
            alert(result.error || 'فشل إضافة الخبر.');
        }
    } catch (error) {
        console.error('Error adding news:', error);
        alert('حدث خطأ أثناء إضافة الخبر.');
    }
}

// تشغيل الدوال عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();
    loadCategories();
    const token = localStorage.getItem('token');
    if (token) {
        document.getElementById('loginLink').style.display = 'none';
        document.getElementById('logoutLink').style.display = 'inline';
    }
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
        loadNews();
    }
    if (window.location.pathname.includes('login.html')) {
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            loginUser();
        });
    }
    if (window.location.pathname.includes('register.html')) {
        document.getElementById('registerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            registerUser();
        });
    }
    if (window.location.pathname.includes('checkout.html')) {
        checkLoginForCheckout();
        document.getElementById('paymentForm').addEventListener('submit', (e) => {
            e.preventDefault();
            processCheckout();
        });
    }
    if (window.location.pathname.includes('admin.html')) {
        checkAdminAccess().then(isAdmin => {
            if (isAdmin) {
                loadUsers();
                loadOrders();
                loadAdminCategories();
                loadAdminNews();
                document.getElementById('categoryForm').addEventListener('submit', (e) => {
                    e.preventDefault();
                    addCategory();
                });
                document.getElementById('newsForm').addEventListener('submit', (e) => {
                    e.preventDefault();
                    addNews();
                });
            }
        });
    }
    document.getElementById('logoutLink').addEventListener('click', logout);
});