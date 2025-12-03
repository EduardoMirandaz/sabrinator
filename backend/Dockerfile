FROM ultralytics/ultralytics:latest

# Correct workdir spelling
WORKDIR /backend

COPY requirements.txt .
# Ultralytics base image already includes PyTorch, Ultralytics, and OpenCV
# Install only app-specific lightweight deps for FastAPI server
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code (server + images dir for volume mount compatibility)
COPY server.py ./
COPY images ./images
COPY model.pt ./
RUN mkdir -p processed
COPY routes ./routes
COPY services ./services
COPY schemas ./schemas
COPY notifications ./notifications
COPY data ./data
COPY config.py ./

EXPOSE 5473

# Correct uvicorn target (module:app) and port
ENV ADMIN_USERNAME=draude \
	ADMIN_PASSWORD=91441209 \
	ADMIN_NAME="Admin Draude" \
	ADMIN_PHONE="+55 11 00000-0000"
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "5473"]
