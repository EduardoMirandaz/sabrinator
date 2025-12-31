FROM ultralytics/ultralytics:latest

# Correct workdir spelling
WORKDIR /backend

COPY requirements.txt .
# Ultralytics base image already includes PyTorch, Ultralytics, and OpenCV
# Install only app-specific lightweight deps for FastAPI server
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code (server + images dir for volume mount compatibility)
COPY server.py ./
COPY model.pt ./
RUN mkdir -p processed images
COPY routes ./routes
COPY services ./services
COPY schemas ./schemas
COPY notifications ./notifications
COPY data ./data
COPY config.py ./

EXPOSE 5473

# Correct uvicorn target (module:app) and port
# Do not bake secrets into the image; pass at runtime via Compose/.env
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "5473"]
