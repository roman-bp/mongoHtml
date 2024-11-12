let usersData = []; // Масив для зберігання даних користувачів

// Завантаження даних користувачів
fetch('/json-users')
    .then(response => response.json())
    .then(data => {
        usersData = data;
        displayUsers(usersData); // Відображення всіх користувачів
    });

// Функція для відображення користувачів на основі масиву даних
function displayUsers(users) {
    const userList = document.getElementById('user-list');
    userList.innerHTML = ''; // Очищуємо список перед додаванням нових користувачів

    users.forEach(user => {
        const userCard = document.createElement('div');
        userCard.classList.add('user-card');

        const avatar = document.createElement('img');
        avatar.src = user.avatar ? user.avatar : 'default-avatar.jpg';
        avatar.alt = `${user.name}'s avatar`;
        avatar.classList.add('avatar');

        const name = document.createElement('h2');
        name.textContent = user.name;

        const toggleButton = document.createElement('button');
        toggleButton.textContent = "View Details";
        toggleButton.classList.add('toggle-button');
        
        const details = document.createElement('div');
        details.classList.add('details');
        details.style.display = 'none';

        // Інформація про користувача
        details.innerHTML = `
            <p>Email: ${user.email}</p>
            <p>Phone: ${user.phone || "N/A"}</p>
            <p>Address: ${user.address || "N/A"}</p>
            <p>Notes: ${user.notes || "N/A"}</p>
            <h4>Files:</h4>
        `;

        // Список файлів
        const filesList = document.createElement('ul');
        if (user.files && Array.isArray(user.files)) {
            user.files.forEach((file) => {
                const listItem = document.createElement('li');

                const fileLink = document.createElement('a');
                fileLink.href = file;
                fileLink.target = '_blank';

                // Використовуємо TextDecoder для декодування символів
                const decoder = new TextDecoder("utf-8");
                const encodedFileName = file.split('\\').pop().replace(/^\d+-/, '');
                const fileName = decoder.decode(new TextEncoder().encode(encodedFileName)).substring(0, 20) + '...';

                fileLink.textContent = fileName; 
                fileLink.classList.add('file-name');

                const deleteButton = document.createElement('button');
                deleteButton.textContent = "✖";
                deleteButton.classList.add('delete-button');
                deleteButton.onclick = () => deleteFile(user._id, file);

                listItem.appendChild(fileLink);
                listItem.appendChild(deleteButton);
                filesList.appendChild(listItem);
            });
        } else {
            filesList.innerHTML = "<li>No files available</li>";
        }

        details.appendChild(filesList);

        // Поле для завантаження нових файлів
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.multiple = true;
        fileInput.id = `new-files-${user._id}`;

        const addFilesButton = document.createElement('button');
        addFilesButton.textContent = "Додати файли";
        addFilesButton.classList.add('add-files-button');
        addFilesButton.onclick = () => addFilesToUser(user._id);

        details.appendChild(fileInput);
        details.appendChild(addFilesButton);

        // Поле для заміни аватара
        const avatarInput = document.createElement('input');
        avatarInput.type = 'file';
        avatarInput.accept = "image/*";
        avatarInput.id = `avatar-${user._id}`;

        const changeAvatarButton = document.createElement('button');
        changeAvatarButton.textContent = "Змінити аватар";
        changeAvatarButton.classList.add('change-avatar-button');
        changeAvatarButton.onclick = () => changeAvatar(user._id);

        details.appendChild(avatarInput);
        details.appendChild(changeAvatarButton);

        userCard.appendChild(avatar);
        userCard.appendChild(name);
        userCard.appendChild(toggleButton);
        userCard.appendChild(details);
        userList.appendChild(userCard);

        toggleButton.onclick = () => {
            details.style.display = details.style.display === 'none' ? 'block' : 'none';
            toggleButton.textContent = details.style.display === 'none' ? "View Details" : "Hide Details";
        };
    });
}

// Функція для фільтрації користувачів за ім'ям
document.getElementById('search-input').addEventListener('input', function (event) {
    const query = event.target.value.toLowerCase();
    const filteredUsers = usersData.filter(user => user.name.toLowerCase().includes(query));
    displayUsers(filteredUsers);
});

// Функція для додавання файлів до існуючого користувача
function addFilesToUser(userId) {
    const formData = new FormData();
    const files = document.getElementById(`new-files-${userId}`).files;

    for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
    }

    fetch(`/json-users/${userId}/add-files`, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        alert('Files added successfully!');
        location.reload(); // Оновлення сторінки для відображення змін
    })
    .catch(error => console.error('Error:', error));
}

// Функція для заміни аватара користувача
function changeAvatar(userId) {
    const formData = new FormData();
    const avatarFile = document.getElementById(`avatar-${userId}`).files[0];
    formData.append('avatar', avatarFile);

    fetch(`/json-users/${userId}/change-avatar`, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        alert('Avatar changed successfully!');
        location.reload(); // Оновлення сторінки для відображення змін
    })
    .catch(error => console.error('Error:', error));
}

// Функція для видалення файлу з картки користувача
function deleteFile(userId, filePath) {
    fetch(`/json-users/${userId}/delete-file`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ filePath })
    })
    .then(response => response.json())
    .then(data => {
        alert('File deleted successfully!');
        location.reload(); // Оновлення сторінки для відображення змін
    })
    .catch(error => console.error('Error:', error));
}
