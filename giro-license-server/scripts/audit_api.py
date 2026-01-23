import requests
import sys
import uuid
import json

BASE_URL = "http://localhost:8000/api/v1"

def test_flow():
    email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    password = "Password123!"
    name = "Test Auditor"

    print(f"--- Starting Audit for {email} ---")

    # 1. Register
    reg_payload = {
        "email": email,
        "password": password,
        "name": name,
        "phone": "11999999999",
        "company_name": "Audit Corp"
    }
    print("1. Testing Registration...")
    res = requests.post(f"{BASE_URL}/auth/register", json=reg_payload)
    if res.status_code != 201:
        print(f"❌ Registration failed: {res.status_code} - {res.text}")
        return
    print("✅ Registration successful")

    # 2. Login
    login_payload = {
        "email": email,
        "password": password
    }
    print("2. Testing Login...")
    res = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
    if res.status_code != 200:
        print(f"❌ Login failed: {res.status_code} - {res.text}")
        return
    
    data = res.json()
    token = data.get("token")
    if not token:
        print("❌ Login failed: No token returned")
        return
    print("✅ Login successful")

    headers = {"Authorization": f"Bearer {token}"}

    # 3. Get Profile
    print("3. Testing Profile Retrieval...")
    res = requests.get(f"{BASE_URL}/auth/me", headers=headers)
    if res.status_code != 200:
        print(f"❌ Profile failed: {res.status_code} - {res.text}")
        return
    print("✅ Profile retrieval successful")

    # 4. Create MP Preference
    mp_payload = {
        "title": "Plano GIRO Audit",
        "price": 99.90,
        "quantity": 1
    }
    print("4. Testing Mercado Pago Preference Creation...")
    res = requests.post(f"{BASE_URL}/mercadopago/create_preference", json=mp_payload, headers=headers)
    if res.status_code != 200:
        print(f"❌ MP Preference failed: {res.status_code} - {res.text}")
        return
    
    mp_data = res.json()
    if "init_point" not in mp_data:
        print("❌ MP Preference failed: No init_point returned")
        return
    print("✅ Mercado Pago Preference creation successful")
    print(f"🔗 Init Point: {mp_data['init_point']}")

    print("\n--- Audit Completed Successfully 🚀 ---")

if __name__ == "__main__":
    test_flow()
