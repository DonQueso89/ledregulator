import uvicorn

def main():
    uvicorn.run("ledregulator.main:app", host="0.0.0.0", port=8888, log_level="info")