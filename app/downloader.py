import os
import re
import uuid
import threading
import yt_dlp
from .utils import get_ffmpeg_path, DOWNLOADS_DIR, format_duration

# Global task registry for tracking background downloads
# task_id -> { status, progress, speed, eta, message, filename, filepath, error }
TASKS = {}

def sanitize_filename(name):
    return re.sub(r'[\\/*?:"<>|]', "", name).strip()

def get_video_info(url):
    """Fetches video metadata without downloading media."""
    ydl_opts = {
        'skip_download': True,
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)
        
        # Determine available resolutions
        formats = info.get('formats', [])
        resolutions = set()
        for f in formats:
            h = f.get('height')
            if h and h in [360, 480, 720, 1080, 1440, 2160]:
                resolutions.add(h)
        
        sorted_resolutions = sorted(list(resolutions)) if resolutions else [360, 720, 1080]

        return {
            "id": info.get('id'),
            "title": info.get('title'),
            "thumbnail": info.get('thumbnail'),
            "duration": format_duration(info.get('duration')),
            "raw_duration": info.get('duration', 0),
            "uploader": info.get('uploader') or info.get('channel') or "Unknown Channel",
            "view_count": f"{info.get('view_count', 0):,}" if info.get('view_count') else "-",
            "available_resolutions": sorted_resolutions,
            "url": url
        }

def _progress_hook(d, task_id):
    if task_id not in TASKS:
        return
    
    status = d.get('status')
    if status == 'downloading':
        total = d.get('total_bytes') or d.get('total_bytes_estimate') or 0
        downloaded = d.get('downloaded_bytes', 0)
        percentage = (downloaded / total * 100) if total > 0 else 0
        speed = d.get('speed')
        eta = d.get('eta')
        
        speed_str = f"{speed / 1024 / 1024:.2f} MB/s" if speed else "Menghitung..."
        eta_str = f"{eta} detik" if eta else "-"
        
        TASKS[task_id].update({
            "status": "downloading",
            "progress": round(percentage, 1),
            "speed": speed_str,
            "eta": eta_str,
            "message": f"Mengunduh stream: {round(percentage, 1)}%"
        })
    elif status == 'finished':
        TASKS[task_id].update({
            "progress": 95,
            "message": "Memproses dan mengonversi format file..."
        })

def _postprocessor_hook(d, task_id):
    if task_id not in TASKS:
        return
    if d.get('status') == 'started':
        TASKS[task_id].update({
            "status": "processing",
            "progress": 96,
            "message": "FFmpeg sedang mengonversi media..."
        })
    elif d.get('status') == 'finished':
        TASKS[task_id].update({
            "progress": 100,
            "message": "Konversi selesai!"
        })

def _download_worker(url, format_type, quality, task_id):
    try:
        ffmpeg_bin = get_ffmpeg_path()
        out_tmpl = os.path.join(DOWNLOADS_DIR, f"{task_id}_%(title).100B.%(ext)s")
        
        ydl_opts = {
            'outtmpl': out_tmpl,
            'ffmpeg_location': ffmpeg_bin,
            'quiet': True,
            'no_warnings': True,
            'progress_hooks': [lambda d: _progress_hook(d, task_id)],
            'postprocessor_hooks': [lambda d: _postprocessor_hook(d, task_id)],
        }
        
        if format_type == 'mp3':
            bitrate = quality if quality in ['128', '192', '320'] else '192'
            ydl_opts.update({
                'format': 'bestaudio/best',
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': bitrate,
                }]
            })
        else:
            # MP4 format with height constraint
            height = quality if quality.isdigit() else '720'
            ydl_opts.update({
                'format': f'bestvideo[height<={height}][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<={height}]+bestaudio/best[height<={height}]/best',
                'merge_output_format': 'mp4'
            })
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            
            # Find the generated file matching task_id prefix
            result_file = None
            for f in os.listdir(DOWNLOADS_DIR):
                if f.startswith(task_id):
                    result_file = os.path.join(DOWNLOADS_DIR, f)
                    break
            
            clean_title = sanitize_filename(info.get('title', 'media'))
            ext = 'mp3' if format_type == 'mp3' else 'mp4'
            display_name = f"{clean_title}.{ext}"

            if result_file and os.path.exists(result_file):
                TASKS[task_id].update({
                    "status": "completed",
                    "progress": 100,
                    "message": "File siap diunduh!",
                    "filepath": result_file,
                    "filename": display_name,
                    "size": os.path.getsize(result_file)
                })
            else:
                raise Exception("File hasil konversi tidak ditemukan di server.")
                
    except Exception as e:
        TASKS[task_id].update({
            "status": "error",
            "progress": 0,
            "error": str(e),
            "message": f"Gagal: {str(e)}"
        })

def start_download_task(url, format_type, quality):
    """Initiates an asynchronous download/conversion process."""
    task_id = str(uuid.uuid4())[:8]
    TASKS[task_id] = {
        "id": task_id,
        "status": "queued",
        "progress": 0,
        "speed": "0 MB/s",
        "eta": "-",
        "message": "Menyiapkan antrean konversi...",
        "filename": None,
        "filepath": None,
        "error": None
    }
    
    t = threading.Thread(target=_download_worker, args=(url, format_type, quality, task_id), daemon=True)
    t.start()
    return task_id
