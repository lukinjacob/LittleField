import requests
import pandas as pd
import schedule
import time
from datetime import datetime
import io

# --- CONFIGURATION ---
TRANSACTION_URL = "https://opy.responsive.net/lfbackend/downloadhistory"
FILE_COUNTER_START = 50
FILE_COUNTER_END = 104

file_counter = FILE_COUNTER_START

# These are your exact credentials from the Fetch request
HEADERS = {
    "accept": "*/*",
    "accept-language": "en-US,en;q=0.9,es;q=0.8,es-ES;q=0.7",
    "authorization": "Bearer eyJhbGciOiJIUzI1NiJ9.eyJpbnN0aXR1dGlvbiI6InB5a2UzIiwiaWQiOiJmcmFuY2lzY29fY2FybmVAYmVya2VsZXkuZWR1IiwiaXNNb2JpbGUiOmZhbHNlLCJwbG90V2l0aEhUTUw1IjpmYWxzZSwicm9sZSI6InN0dWRlbnQiLCJ0ZWFtSWQiOiJMaXR0bGVzSW5MYXdzIiwic3ViIjoiZnJhbmNpc2NvX2Nhcm5lQGJlcmtlbGV5LmVkdSIsImlhdCI6MTc3MTgwMzMyNiwiZXhwIjoxNzcyNDA4MTI2fQ.ozazswnetYsRXOn8bA4z7kJuH6exPddFQzPUBuUuvFs",
    "cookie": "JSESSIONID=669C63659DEA13F491981217D300384F",
    "Referer": "https://opy.responsive.net/lf/dashboard",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36"
}

def fetch_and_save_data():
    global file_counter

    if file_counter > FILE_COUNTER_END:
        print("All files (50–104) have been saved. Stopping.")
        return schedule.CancelJob

    filename = f"{file_counter}.xlsx"
    print(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Fetching data → saving as {filename} ...")

    try:
        response = requests.get(TRANSACTION_URL, headers=HEADERS)
        response.raise_for_status()

        df = pd.read_excel(io.BytesIO(response.content))
        df['Scraped_Timestamp'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        df.to_excel(filename, index=False)
        print(f"Success! Saved {filename}  ({file_counter - FILE_COUNTER_START + 1}/{FILE_COUNTER_END - FILE_COUNTER_START + 1})")
        file_counter += 1

    except requests.exceptions.HTTPError as e:
        if response.status_code == 401:
            print("Error 401: Unauthorized. Your token or cookie has expired. Grab a new one using the Fetch method!")
        else:
            print(f"HTTP error occurred: {e}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

# --- SCHEDULER ---
# Run once immediately
fetch_and_save_data()

# Schedule to run every hour
schedule.every().hour.do(fetch_and_save_data)

print("\nScheduler is running. Keep this terminal window open to continue downloading data.")
print("Press Ctrl+C to stop the script.\n")

# Keep the script alive
while True:
    schedule.run_pending()
    time.sleep(1)
