import os
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel

from .downloader import get_video_info, start_download_task, TASKS
from .utils import cleanup_old_files, format_size

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")
STATIC_DIR = os.path.join(BASE_DIR, "static")
DOWNLOADS_DIR = os.path.join(BASE_DIR, "downloads")

app = FastAPI(title="YouTube Media Converter", version="1.0.0")

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
templates = Jinja2Templates(directory=TEMPLATES_DIR)

@app.on_event("startup")
def startup_event():
    os.makedirs(DOWNLOADS_DIR, exist_ok=True)
    cleanup_old_files(max_age_seconds=3600)

class InfoRequest(BaseModel):
    url: str

class ConvertRequest(BaseModel):
    url: str
    format: str # 'mp3' or 'mp4'
    quality: str # '128', '192', '320' or '360', '720', '1080'

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse(request=request, name="index.html")

@app.post("/api/info")
async def fetch_info(req: InfoRequest):
    url = req.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL tidak boleh kosong.")
    try:
        data = get_video_info(url)
        return {"success": True, "data": data}
    except Exception as e:
        return JSONResponse(
            status_code=400,
            content={"success": False, "detail": f"Gagal mengambil info video: {str(e)}"}
        )

@app.post("/api/convert")
async def convert_media(req: ConvertRequest):
    url = req.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL tidak valid.")
    if req.format not in ['mp3', 'mp4']:
        raise HTTPException(status_code=400, detail="Format harus 'mp3' atau 'mp4'.")
    
    try:
        task_id = start_download_task(url, req.format, req.quality)
        return {"success": True, "task_id": task_id}
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "detail": str(e)}
        )

@app.get("/api/status/{task_id}")
async def check_status(task_id: str):
    if task_id not in TASKS:
        raise HTTPException(status_code=404, detail="Tugas tidak ditemukan.")
    
    task_info = dict(TASKS[task_id])
    if "filepath" in task_info and task_info.get("size"):
        task_info["formatted_size"] = format_size(task_info["size"])
    return task_info

@app.get("/api/download/{task_id}")
async def download_file(task_id: str):
    if task_id not in TASKS:
        raise HTTPException(status_code=404, detail="File tidak ditemukan.")
    
    task = TASKS[task_id]
    if task["status"] != "completed" or not task.get("filepath"):
        raise HTTPException(status_code=400, detail="Konversi belum selesai atau gagal.")
    
    filepath = task["filepath"]
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File fisik sudah dihapus atau tidak ditemukan.")
        
    filename = task.get("filename") or os.path.basename(filepath)
    return FileResponse(
        path=filepath,
        filename=filename,
        media_type="application/octet-stream"
    )
