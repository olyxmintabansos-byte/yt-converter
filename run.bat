@echo off
title StreamShift - YouTube Converter
echo ======================================================
echo       StreamShift - YouTube to MP3 & MP4 Converter
echo ======================================================
echo.
echo Menjalankan server lokal di http://127.0.0.1:8000 ...
echo Tekan Ctrl+C untuk menghentikan server.
echo.
start http://127.0.0.1:8000
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
pause
