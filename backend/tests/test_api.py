import urllib.request
import json
import time
import sys

# Ensure UTF-8 output on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

BASE_URL = "http://127.0.0.1:5000"

def request(endpoint, method="GET", data=None, token=None):
    url = f"{BASE_URL}{endpoint}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    req_data = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as resp:
            status = resp.status
            body = resp.read().decode("utf-8")
            return status, json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, {"raw": body}
    except Exception as e:
        return 500, {"error": str(e)}

def run_tests():
    print("====================================================")
    print(">>> Akatsuki Campus Engine (Rust/Axum) - Test Suite")
    print("====================================================\n")

    # 1. Health check
    status, res = request("/api/health")
    assert status == 200, f"Health check failed: {res}"
    print(f"[PASS] [1/12] Health check passed: {res.get('service')}")

    # 2. Login with pre-seeded Alex (CS Founder)
    status, res = request("/api/auth/login", method="POST", data={
        "email": "alex.cs@college.edu",
        "password": "college123"
    })
    assert status == 200, f"Login failed: {res}"
    alex_token = res["token"]
    alex_id = res["user"]["id"]
    print(f"[PASS] [2/12] Logged in as student Alex Chen ({res['user']['roll_number']})")

    # 3. Official MIT ERP Login Endpoint
    status, erp_res = request("/api/auth/erp-login", method="POST", data={
        "username": "2023bcse042@mit.asia",
        "password": "demo123"
    })
    assert status == 200, f"ERP login failed: {erp_res}"
    erp_token = erp_res["token"]
    erp_user = erp_res["user"]
    print(f"[PASS] [3/12] MIT ERP login verified student: '{erp_user['name']}' ({erp_user['roll_number']})")

    # 4. Register a new student: Sarah (Robotics Lead)
    email = f"sarah.mech_{int(time.time())}@college.edu"
    roll = f"MECH2027-{int(time.time()) % 1000}"
    status, res = request("/api/auth/register", method="POST", data={
        "email": email,
        "password": "password123",
        "name": "Sarah Connor",
        "roll_number": roll,
        "department": "Mechanical & Mechatronics",
        "graduation_year": 2027,
        "bio": "Robotics Club President. Building autonomous rovers.",
        "skills": "ROS2, C++, CAD, Arduino"
    })
    assert status == 201, f"Registration failed: {res}"
    sarah_token = res["token"]
    sarah_id = res["user"]["id"]
    print(f"[PASS] [4/12] Registered new student: Sarah Connor ({roll})")

    # 5. Sarah posts a new campus opportunity (Default: OPEN)
    status, new_job = request("/api/jobs", method="POST", token=sarah_token, data={
        "title": "Autonomous Drone Firmware Engineer",
        "description": "Looking for a peer student to program flight stabilization firmware for the inter-college drone racing event.",
        "category": "PROJECT_COLLAB",
        "location_type": "ON_CAMPUS",
        "location": "Robotics Arena Shed 3",
        "stipend": "INR 6,000 + Competition Sponsorship",
        "skills_required": "C++, Embedded Systems, FreeRTOS",
        "department": "Open to all branches",
        "deadline": "2026-11-20"
    })
    assert status == 201, f"Job creation failed: {new_job}"
    job_id = new_job["id"]
    assert new_job["status"] == "OPEN"
    print(f"[PASS] [5/12] Created new campus job: '{new_job['title']}' (Status: {new_job['status']})")

    # 6. ERP Student starts a DM thread for this specific job
    status, conv = request(f"/api/conversations/job/{job_id}", method="POST", token=erp_token)
    assert status in [200, 201], f"Create conversation failed: {conv}"
    conv_id = conv["id"]
    print(f"[PASS] [6/12] ERP Student opened job inquiry DM thread (Conversation ID: {conv_id})")

    # ERP Student sends a DM
    status, msg1 = request(f"/api/conversations/{conv_id}/messages", method="POST", token=erp_token, data={
        "content": "Hi Sarah! I am experienced with FreeRTOS flight controllers. Can you share the drone schematic?"
    })
    assert status == 201, f"Send message failed: {msg1}"

    # Sarah replies in the job thread
    status, msg2 = request(f"/api/conversations/{conv_id}/messages", method="POST", token=sarah_token, data={
        "content": "Sure! I uploaded the schematic to our GitHub repo. Check Shed 3 tomorrow at 4 PM."
    })
    assert status == 201, f"Sarah reply failed: {msg2}"
    print(f"[PASS] [6/12] Exchanged DMs in job thread between student and job owner")

    # 7. Job Creator checks Job-Wise DMs (GitHub Issue discussion view)
    status, job_dms = request(f"/api/jobs/{job_id}/conversations", token=sarah_token)
    assert status == 200 and len(job_dms) >= 1, f"Fetch job DMs failed: {job_dms}"
    print(f"[PASS] [7/12] Job owner viewed {len(job_dms)} DM thread(s) specifically for job '{new_job['title']}':")
    print(f"       -> Student: {job_dms[0]['student_name']} ({job_dms[0]['student_roll_number']})")
    print(f"       -> Last message: '{job_dms[0]['last_message']}'")

    # 8. Sarah toggles the job to CLOSED (like closing a GitHub Issue)
    status, close_res = request(f"/api/jobs/{job_id}/status", method="PATCH", token=sarah_token, data={
        "status": "CLOSED"
    })
    assert status == 200, f"Close job failed: {close_res}"
    assert close_res["job"]["status"] == "CLOSED"
    print(f"[PASS] [8/12] Job owner toggled job status to: CLOSED (like closing a GitHub Issue)")

    # 9. Another student (Alex) tries to apply or start a new DM on the CLOSED thread -> should be rejected!
    status, blocked_app = request(f"/api/jobs/{job_id}/apply", method="POST", token=alex_token, data={
        "pitch_note": "I want to apply late!",
        "resume_url": "https://example.com/resume.pdf"
    })
    assert status == 400, f"Expected 400 Bad Request for closed job, got: {status} ({blocked_app})"
    print(f"[PASS] [9/12] Applications properly blocked for CLOSED job: '{blocked_app.get('error')}'")

    status, blocked_dm = request(f"/api/conversations/job/{job_id}", method="POST", token=alex_token)
    assert status == 400, f"Expected 400 Bad Request for new DM on closed thread, got: {status} ({blocked_dm})"
    print(f"[PASS] [9/12] New inquiry DMs properly locked for CLOSED thread: '{blocked_dm.get('error')}'")

    # 10. Sarah re-opens the job (like re-opening a GitHub Issue)
    status, reopen_res = request(f"/api/jobs/{job_id}/status", method="PATCH", token=sarah_token, data={
        "status": "OPEN"
    })
    assert status == 200, f"Reopen job failed: {reopen_res}"
    assert reopen_res["job"]["status"] == "OPEN"
    print(f"[PASS] [10/12] Job owner re-opened job status to: OPEN")

    # 11. Now Alex can apply successfully
    status, app = request(f"/api/jobs/{job_id}/apply", method="POST", token=alex_token, data={
        "pitch_note": "Glad you re-opened! I have 2 years of C++ flight controller experience.",
        "resume_url": "https://college-portfolio.edu/alex/resume.pdf"
    })
    assert status == 201, f"Application after re-open failed: {app}"
    app_id = app["id"]
    print(f"[PASS] [11/12] Application successfully accepted after re-opening job (App ID: {app_id})")

    # 12. Sarah reviews applications and updates status
    status, applicants = request(f"/api/jobs/{job_id}/applications", token=sarah_token)
    assert status == 200 and len(applicants) == 1, f"Fetch applications failed: {applicants}"
    print(f"[PASS] [12/12] Sarah reviewed application from: {applicants[0]['applicant_name']} ({applicants[0]['applicant_roll_number']})")

    print("\n>>> ALL 12 INTEGRATION TEST STAGES COMPLETED SUCCESSFULLY! <<<")

if __name__ == "__main__":
    run_tests()
