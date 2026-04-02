FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY server.py requirements.txt ./

RUN pip install --no-cache-dir -r requirements.txt

RUN mkdir -p uploads texts research

EXPOSE 5001

CMD ["python", "server.py"]
