"""End-to-end smoke test covering Day 1-2 features."""

import httpx

BASE = "http://127.0.0.1:8000/api/v1"


def login_or_register(c: httpx.Client, email: str, pwd: str) -> str:
    c.post(f"{BASE}/auth/register", json={"email": email, "password": pwd})
    r = c.post(f"{BASE}/auth/jwt/login", data={"username": email, "password": pwd})
    return r.json()["access_token"]


def main() -> None:
    with httpx.Client() as c:
        print("=== health ===")
        r = c.get(f"{BASE}/health")
        print(r.status_code, r.json())

        print("\n=== user A: register + login ===")
        tok_a = login_or_register(c, "alice@example.com", "alicepass123")
        ha = {"Authorization": f"Bearer {tok_a}"}

        print("\n=== user A: create prompt ===")
        r = c.post(
            f"{BASE}/prompts",
            headers=ha,
            json={
                "name": "Customer Service",
                "content": "You are a polite customer service agent.",
            },
        )
        print(r.status_code, r.json())
        p_id = r.json()["id"]

        print("\n=== user A: list prompts ===")
        r = c.get(f"{BASE}/prompts", headers=ha)
        print(r.status_code, len(r.json()), "items")

        print("\n=== user A: update prompt ===")
        r = c.patch(f"{BASE}/prompts/{p_id}", headers=ha, json={"name": "CS v2"})
        print(r.status_code, r.json()["name"])

        print("\n=== user A: create key ===")
        r = c.post(
            f"{BASE}/keys",
            headers=ha,
            json={
                "name": "OpenAI Prod",
                "provider": "openai",
                "api_key": "sk-test-real-key-1234567890",
            },
        )
        print(r.status_code, r.json())
        k_id = r.json()["id"]

        print("\n=== user A: list keys (masked) ===")
        r = c.get(f"{BASE}/keys", headers=ha)
        print(r.status_code, r.json())

        print("\n=== user B: register + should NOT see A's data ===")
        tok_b = login_or_register(c, "bob@example.com", "bobpass123")
        hb = {"Authorization": f"Bearer {tok_b}"}
        r = c.get(f"{BASE}/prompts", headers=hb)
        print("B prompts:", r.status_code, len(r.json()), "items (expect 0)")
        r = c.get(f"{BASE}/keys", headers=hb)
        print("B keys:", r.status_code, len(r.json()), "items (expect 0)")

        print("\n=== user B: try to access A's prompt ===")
        r = c.get(f"{BASE}/prompts/{p_id}", headers=hb)
        print("B GET A's prompt:", r.status_code, "(expect 404)")

        print("\n=== user A: create agent ===")
        r = c.post(
            f"{BASE}/agents",
            headers=ha,
            json={
                "name": "CS Bot",
                "description": "Answers customer questions",
                "prompt_id": p_id,
                "key_id": k_id,
                "model": "gpt-4o-mini",
                "temperature": 0.5,
                "max_tokens": 512,
            },
        )
        print(r.status_code, r.json())
        a_id = r.json()["id"]

        print("\n=== user A: list agents ===")
        r = c.get(f"{BASE}/agents", headers=ha)
        print(r.status_code, len(r.json()), "items")

        print("\n=== user A: update agent ===")
        r = c.patch(f"{BASE}/agents/{a_id}", headers=ha, json={"temperature": 0.9})
        print(r.status_code, "temperature =", r.json()["temperature"])

        print("\n=== user A: create agent with foreign prompt_id (should 400) ===")
        r = c.post(
            f"{BASE}/agents",
            headers=ha,
            json={
                "name": "Bad",
                "prompt_id": 9999,
                "key_id": k_id,
                "model": "gpt-4o-mini",
            },
        )
        print(r.status_code, r.json())

        print("\n=== user B: cannot see A's agent ===")
        r = c.get(f"{BASE}/agents", headers=hb)
        print("B agents:", r.status_code, len(r.json()), "(expect 0)")
        r = c.get(f"{BASE}/agents/{a_id}", headers=hb)
        print("B GET A's agent:", r.status_code, "(expect 404)")

        print("\n=== user A: messages history empty ===")
        r = c.get(f"{BASE}/agents/{a_id}/messages", headers=ha)
        print(r.status_code, len(r.json()), "items (expect 0)")

        print("\n=== cleanup ===")
        r = c.delete(f"{BASE}/agents/{a_id}", headers=ha)
        print("delete agent:", r.status_code)
        r = c.delete(f"{BASE}/prompts/{p_id}", headers=ha)
        print("delete prompt:", r.status_code)
        r = c.delete(f"{BASE}/keys/{k_id}", headers=ha)
        print("delete key:", r.status_code)


if __name__ == "__main__":
    main()
