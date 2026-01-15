from fastapi.testclient import TestClient
from secure_upload_backend.main import app

client = TestClient(app)

print('\n=== Running backend tests ===')

resp = client.post('/register', json={'username': 'testuser', 'password': 'secret'})
print('Register:', resp.status_code, resp.json())

resp = client.post('/token', data={'username': 'testuser', 'password': 'secret'})
print('Login:', resp.status_code, resp.json())
access_token = resp.json().get('access_token')

resp = client.post('/upload', files={'file': ('hello.txt', b'hi')})
print('Unauthorized upload (expected 401):', resp.status_code)

headers = {'Authorization': f'Bearer {access_token}'}
resp = client.post('/upload', files={'file': ('hello.txt', b'hi')}, headers=headers)
print('Authorized upload:', resp.status_code, resp.json())

if resp.status_code == 200:
    print('\nAll backend tests passed ✅')
else:
    print('\nSome backend tests failed ⚠️')
