import os
import googleapiclient.discovery
import json
import re
import random
from datetime import datetime, timedelta

# Initialize YouTube API
API_KEY = "AIzaSyDb5lnof_d87ZJgh9XauyNIM82nBHpnau4"
youtube = googleapiclient.discovery.build("youtube", "v3", developerKey=API_KEY)


FOLDER_PATH = os.path.expanduser("~/Documents/youtube-timer")
JSON_FILE = os.path.join(FOLDER_PATH, "videos_by_duration_smart.json")


# Test configuration
DAILY_QUOTA_LIMIT = 10000
MAX_VIDEOS_PER_DURATION = 20  # Keep low for testing
TEST_MAX_RESULTS = 50
quota_used = 0

def iso_duration_to_seconds(iso_duration):
    """Convert ISO 8601 duration to seconds."""
    pattern = r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?"
    match = re.match(pattern, iso_duration)
    if not match:
        return 0
    hours = int(match.group(1) or 0)
    minutes = int(match.group(2) or 0)
    seconds = int(match.group(3) or 0)
    return hours * 3600 + minutes * 60 + seconds

def check_quota(cost):
    """Check if there's enough quota to proceed with an API call."""
    global quota_used
    if quota_used + cost > DAILY_QUOTA_LIMIT:
        print(f"Stopping to avoid exceeding quota. Quota used: {quota_used}/{DAILY_QUOTA_LIMIT}")
        return False
    quota_used += cost
    print(f"Quota usage: {quota_used}/{DAILY_QUOTA_LIMIT}")
    return True

def get_smart_search_params():
    """Get randomized search parameters."""
    # Randomize order
    order_options = ["relevance", "date", "rating", "viewCount"]
    random_order = random.choice(order_options)
    
    # Random date range within past 2 years
    days_ago = random.randint(0, 730)
    published_after = (datetime.now() - timedelta(days=days_ago)).isoformat() + "Z"
    published_before = datetime.now().isoformat() + "Z"

    return {
        "order": random_order,
        "published_after": published_after,
        "published_before": published_before
    }

def filter_video(video):
    """Filter out videos that are not viewable due to restrictions or status."""
    status = video.get("status", {})
    if not status:
        return False
        
    if status.get("uploadStatus") != "processed" or status.get("privacyStatus") != "public":
        return False

    content_details = video.get("contentDetails", {})
    if not content_details:
        return False

    region_restriction = content_details.get("regionRestriction", {})
    if "blocked" in region_restriction:
        return False

    return True

def load_existing_data():
    """Load existing data with error handling."""
    backup_filename = os.path.join(FOLDER_PATH, f"videos_by_duration_smart_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
    
    results = {str(i): [] for i in range(1, 3601)}
    
    if os.path.exists(JSON_FILE):
        try:
            with open(JSON_FILE, "r") as f:
                existing_data = json.load(f)
                with open(backup_filename, "w") as backup_f:
                    json.dump(existing_data, backup_f, indent=2)
            
            for duration, videos in existing_data.items():
                if duration.isdigit() and 1 <= int(duration) <= 3600:
                    results[duration] = videos
            
            print(f"Loaded existing data and created backup: {backup_filename}")
        except json.JSONDecodeError:
            print(f"Error reading {JSON_FILE}, starting with empty dataset")
    
    return results

def save_results(results):
    """Save results with error handling."""
    temp_filename = os.path.join(FOLDER_PATH, "videos_by_duration_smart_temp.json")
    
    try:
        with open(temp_filename, "w") as f:
            json.dump(results, f, indent=2)
        
        if os.path.exists(JSON_FILE):
            os.replace(temp_filename, JSON_FILE)
        else:
            os.rename(temp_filename, JSON_FILE)
        
        print("Results saved successfully")
    except Exception as e:
        print(f"Error saving results: {e}")
        if os.path.exists(temp_filename):
            os.remove(temp_filename)

def fetch_and_categorize_videos(queries):
    """Fetch videos and categorize all valid ones by duration."""
    results = load_existing_data()
    videos_added = 0
    
    try:
        while check_quota(100):  # Main quota check for the search
            query = random.choice(queries)
            search_params = get_smart_search_params()
            
            print(f"\nSearching with query: {query}")
            print(f"Order: {search_params['order']}")
            
            request = youtube.search().list(
                q=query,
                part="id,snippet",
                type="video",
                maxResults=TEST_MAX_RESULTS,
                order=search_params['order'],
                publishedAfter=search_params['published_after'],
                publishedBefore=search_params['published_before']
            )
            
            response = request.execute()
            video_ids = [item["id"]["videoId"] for item in response["items"]]
            
            if not video_ids:
                continue

            if not check_quota(len(video_ids)):  # Quota check for video details
                break

            video_request = youtube.videos().list(
                part="contentDetails,snippet,status",
                id=",".join(video_ids)
            )
            video_response = video_request.execute()

            for video in video_response.get("items", []):
                if not filter_video(video):
                    continue

                iso_duration = video["contentDetails"]["duration"]
                seconds = iso_duration_to_seconds(iso_duration)
                
                # Only process videos up to 1 hour
                if 1 <= seconds <= 3600:
                    duration_key = str(seconds)
                    if len(results[duration_key]) < MAX_VIDEOS_PER_DURATION:
                        existing_ids = {vid["id"] for vid in results[duration_key]}
                        if video["id"] not in existing_ids:
                            results[duration_key].append({
                                "id": video["id"],
                                "title": video["snippet"]["title"],
                                "duration": iso_duration,
                                "added_date": datetime.now().isoformat(),
                                "search_params": {
                                    "query": query,
                                    "order": search_params['order']
                                }
                            })
                            videos_added += 1
                            print(f"Added {seconds}s video: {video['snippet']['title']}")
            
            # Save progress after each batch
            save_results(results)
            print(f"Progress saved: {videos_added} total videos added")
            
    except Exception as e:
        print(f"Error during execution: {e}")
    finally:
        save_results(results)
        print(f"\nSession complete. Added {videos_added} new videos.")
        print(f"Final quota usage: {quota_used}")

    return results

# Expanded query list for better variety
queries = ["funny", "cats", "science", "dogs", "travel", "art", "random", "music", 
    "gaming", "sports", "nature", "technology", "movies", "DIY", "tutorials", 
    "history", "education", "entertainment", "news", "adventure", "fashion", 
    "cooking", "fitness", "health", "comedy", "photography", "space", "unboxing", 
    "life hacks", "memes", "anime", "reviews", "reaction", "magic", "vlogs", 
    "celebrity", "motivation", "horror", "sci-fi", "documentary", "wildlife", 
    "home improvement", "crafts", "fishing", "cars", "motorcycles", "gadgets", 
    "bloopers", "kids", "pranks", "animals", "skateboarding", "water sports", 
    "robotics", "short films", "parody", "fun facts", "ASMR", "hiking", "challenges", 
    "wilderness", "dancing", "meditation", "VR", "3D printing", "stop motion", 
    "animation", "drawing", "painting", "minimalism", "architecture", "finance", 
    "productivity", "puzzles", "board games", "card tricks", "strategy games", 
    "language learning", "riddles", "psychology", "cultural events", "world records"]

# Run the script
results = fetch_and_categorize_videos(queries)

# Print summary
print("\nFinal Summary:")
print(f"Total quota used: {quota_used}")
videos_found = sum(len(videos) for videos in results.values())
print(f"Total videos found: {videos_found}")
print("Distribution:")
for duration, videos in sorted(results.items()):
    if videos:
        print(f"{duration}s: {len(videos)} videos")
