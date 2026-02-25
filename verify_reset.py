
import requests
import sys

API_BASE = "http://localhost:8000"
EMAIL = "reset_test@example.com"
PASSWORD = "password123"
NEW_PASSWORD = "newpassword123"

def print_result(step, success, msg=""):
    print(f"[{'OK' if success else 'FAIL'}] {step} {msg}")
    if not success:
        sys.exit(1)

# 1. Register a user
print("\n--- 1. Registering User ---")
try:
    resp = requests.post(f"{API_BASE}/user/register", json={
        "email": EMAIL,
        "password": PASSWORD,
        "confirm_password": PASSWORD
    })
    # It might fail if user already exists, which is fine for this test
    if resp.status_code == 200:
        print_result("Registration", True)
    elif resp.status_code == 400 and "already exists" in resp.text:
        print_result("Registration", True, "(User already exists)")
    else:
        print_result("Registration", False, resp.text)
except Exception as e:
    print_result("Registration", False, str(e))

# 2. Request Password Reset
print("\n--- 2. Requesting Password Reset ---")
reset_token = ""
try:
    resp = requests.post(f"{API_BASE}/user/forgot-password", json={"email": EMAIL})
    if resp.status_code == 200:
        data = resp.json()
        reset_token = data.get("reset_token")
        if reset_token:
            print_result("Request Reset", True, "Token received")
        else:
            print_result("Request Reset", False, "No token in response")
    else:
        print_result("Request Reset", False, resp.text)
except Exception as e:
    print_result("Request Reset", False, str(e))

# 3. Reset Password
print("\n--- 3. Resetting Password ---")
try:
    resp = requests.post(f"{API_BASE}/user/reset-password", json={
        "token": reset_token,
        "new_password": NEW_PASSWORD,
        "confirm_password": NEW_PASSWORD
    })
    if resp.status_code == 200:
        print_result("Reset Password", True)
    else:
        print_result("Reset Password", False, resp.text)
except Exception as e:
    print_result("Reset Password", False, str(e))

# 4. Login with OLD password (should fail)
print("\n--- 4. Login with OLD password (should fail) ---")
try:
    resp = requests.post(f"{API_BASE}/user/login", json={
        "email": EMAIL,
        "password": PASSWORD
    })
    if resp.status_code == 401:
        print_result("Login Old Password", True, "Restricted correctly")
    else:
        print_result("Login Old Password", False, f"Unexpected status: {resp.status_code}")
except Exception as e:
    print_result("Login Old Password", False, str(e))

# 5. Login with NEW password (should succeed)
print("\n--- 5. Login with NEW password (should succeed) ---")
try:
    resp = requests.post(f"{API_BASE}/user/login", json={
        "email": EMAIL,
        "password": NEW_PASSWORD
    })
    if resp.status_code == 200:
        print_result("Login New Password", True)
    else:
        print_result("Login New Password", False, resp.text)
except Exception as e:
    print_result("Login New Password", False, str(e))
