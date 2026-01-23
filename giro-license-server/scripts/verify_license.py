import os

import psycopg2
from dotenv import load_dotenv


def verify_license(key):
    # Load environment variables from backend/.env
    env_path = os.path.join(os.path.dirname(__file__), "..", "backend", ".env")
    load_dotenv(env_path)

    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("Error: DATABASE_URL not found in .env")
        return

    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()

        # Check for exact key
        print(f"Checking license: {key}")
        cur.execute(
            "SELECT id, status, activated_at, expires_at FROM licenses WHERE license_key = %s",
            (key,),
        )
        row = cur.fetchone()

        if row:
            print(f"✅ Found License!")
            print(f"ID: {row[0]}")
            print(f"Status: {row[1]}")
            print(f"Activated At: {row[2]}")
            print(f"Expires At: {row[3]}")
        else:
            print("❌ License NOT FOUND in database.")

            # Check for partial matches or common errors
            key_no_last = key[:-1]
            cur.execute(
                "SELECT license_key FROM licenses WHERE license_key LIKE %s",
                (key_no_last + "%",),
            )
            matches = cur.fetchall()
            if matches:
                print(f"Found {len(matches)} similar keys:")
                for m in matches:
                    print(f" - {m[0]}")

        cur.close()
        conn.close()
    except Exception as e:
        print(f"Database connection failed: {e}")


if __name__ == "__main__":
    import sys

    search_key = sys.argv[1] if len(sys.argv) > 1 else "GIRO-MSGB-HA4K-W429-7ELK"
    verify_license(search_key)
