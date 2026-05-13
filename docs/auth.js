const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

async function postJson(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include',
  });
  return response.json();
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const result = await postJson('/api/login', { email, password });
  if (result.error) {
    alert(result.error);
    return;
  }
  window.location.href = '/';
});

registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = document.getElementById('registerName').value;
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;
  const result = await postJson('/api/register', { name, email, password });
  if (result.error) {
    alert(result.error);
    return;
  }
  window.location.href = '/';
});
