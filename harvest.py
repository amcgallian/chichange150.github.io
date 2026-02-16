import requests
import pandas as pd
from datetime import datetime
import os
from concurrent.futures import ThreadPoolExecutor, as_completed

OUTPUT_PATH = "./data/raw_catalog.csv"
ITEM_TYPES = ["Feature Service", "Feature Layer", "Map Service", "Image Service"]
RESULTS_PER_PAGE = 100
ORG_URL = "https://uchicago.maps.arcgis.com/sharing/rest/search"
UCHICAGO_ORG_ID = "ppFhFO7kjyIF441C"

# Your username and project tag
YOUR_USERNAME = "amcgallian_UChicago"
PROJECT_TAG = "DVFM"  # Only pull items with this tag

os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)

def fetch_page(start=1):
    """Fetch one page of ArcGIS search results for your user with the project tag."""
    # Search for items owned by you AND tagged with DVFM
    params = {
        "q": f"orgid:{UCHICAGO_ORG_ID} AND owner:{YOUR_USERNAME} AND tags:{PROJECT_TAG}",
        "start": start,
        "num": RESULTS_PER_PAGE,
        "f": "json",
        "sortField": "modified",
        "sortOrder": "desc"
    }
    
    try:
        r = requests.get(ORG_URL, params=params, timeout=15)
        r.raise_for_status()
        return r.json().get("results", [])
    except Exception as e:
        print(f"Error fetching page {start}: {e}")
        return []

def main():
    existing_df = None
    existing_items = {}
    
    # Check if file exists AND has content
    if os.path.exists(OUTPUT_PATH) and os.path.getsize(OUTPUT_PATH) > 0:
        try:
            existing_df = pd.read_csv(OUTPUT_PATH)
            if not existing_df.empty:
                existing_items = dict(zip(existing_df["id"], existing_df["modified"]))
                print(f"Loaded {len(existing_df)} existing items from catalog.")
            else:
                print("Existing catalog file is empty.")
        except pd.errors.EmptyDataError:
            print("Existing catalog file is empty or invalid. Starting fresh.")
            existing_df = None
    else:
        print("No existing catalog found. Creating new one.")

    print(f"Fetching items for user: {YOUR_USERNAME}")
    print(f"Filtering by tag: {PROJECT_TAG}")
    print(f"Search query: orgid:{UCHICAGO_ORG_ID} AND owner:{YOUR_USERNAME} AND tags:{PROJECT_TAG}")

    all_results = []
    start = 1
    batch_size = 10
    total_fetched = 0

    while True:
        starts = [start + i * RESULTS_PER_PAGE for i in range(batch_size)]
        results_batch = []

        with ThreadPoolExecutor(max_workers=batch_size) as executor:
            futures = [executor.submit(fetch_page, s) for s in starts]
            for future in as_completed(futures):
                results = future.result()
                if results:
                    results_batch.extend(results)

        if not results_batch:
            print("\nNo more items found.")
            break

        all_results.extend(results_batch)
        total_fetched += len(results_batch)
        print(f"\rFetched {total_fetched} items...", end="")

        if len(results_batch) < batch_size * RESULTS_PER_PAGE:
            break

        start += batch_size * RESULTS_PER_PAGE

    print(f"\nDone fetching. Total items received: {len(all_results)}")

    new_items = []
    for item in all_results:
        if item.get("type") not in ITEM_TYPES:
            continue

        mod_date = datetime.fromtimestamp(item.get("modified", 0) / 1000).strftime("%Y-%m-%d")
        item_id = item.get("id")

        if item_id in existing_items and existing_items[item_id] == mod_date:
            continue

        # Process tags - keep as comma-separated string
        tags = item.get("tags", [])
        if isinstance(tags, list):
            tags_str = ",".join(tags)
        else:
            tags_str = str(tags) if tags else ""

        record = {
            "id": item_id,
            "title": item.get("title", "Untitled"),
            "type": item.get("type", "Unknown"),
            "description": item.get("snippet", "") or item.get("description", ""),
            "tags": tags_str,
            "owner": item.get("owner", YOUR_USERNAME),
            "created": datetime.fromtimestamp(item.get("created", 0) / 1000).strftime("%Y-%m-%d"),
            "modified": mod_date,
            "view_count": item.get("numViews", 0),
            "url": f"https://www.arcgis.com/home/item.html?id={item_id}",
            "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

        new_items.append(record)

    print(f"Processed {len(new_items)} new or updated items.")

    # Combine existing and new items
    if existing_df is not None and not existing_df.empty:
        # Remove old versions of updated items
        existing_df = existing_df[~existing_df["id"].isin([i["id"] for i in new_items])]
        df = pd.concat([existing_df, pd.DataFrame(new_items)], ignore_index=True)
    elif new_items:
        df = pd.DataFrame(new_items)
    else:
        # Create empty DataFrame with correct columns if no items
        df = pd.DataFrame(columns=["id", "title", "type", "description", "tags", 
                                   "owner", "created", "modified", "view_count", "url", "last_updated"])
        print("No items found for your user with the specified tag.")

    # Sort by modified date, newest first
    if not df.empty:
        df = df.sort_values("modified", ascending=False)

    df.to_csv(OUTPUT_PATH, index=False)
    print(f"Catalog updated and saved: {OUTPUT_PATH}")
    print(f"Total items in catalog: {len(df)}")

    # Print summary
    if not df.empty and 'type' in df.columns:
        print("\nSummary by type:")
        print(df['type'].value_counts())
        
        # Show tag summary
        print("\nTag summary:")
        all_tags = []
        for tags in df['tags'].dropna():
            all_tags.extend([t.strip() for t in tags.split(',') if t.strip()])
        from collections import Counter
        tag_counts = Counter(all_tags)
        for tag, count in tag_counts.most_common(10):
            print(f"  {tag}: {count}")

if __name__ == "__main__":
    main()