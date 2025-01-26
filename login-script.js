function authenticateUser() {
    var username = document.getElementById('username').value;
    var password = document.getElementById('password').value;
    var user = authenticateOnServer(username, password);

    if (user) {
        localStorage.setItem('authenticated', true);
        localStorage.setItem('username', user.username);
        localStorage.setItem('role', user.role);
        window.location.href = 'inventory.html';
    } else {
        document.getElementById('error').innerText = 'Invalid username or password';
    }
}

function authenticateOnServer(username, password) {
    var users = [
        { username: 'admin', password: 'admin', role: 'admin' },
        { username: 'user', password: 'user', role: 'user' }
    ];

    var authenticatedUser = users.find(user => user.username === username && user.password === password);
    return authenticatedUser;
}
