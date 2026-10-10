# AI Resume Chat

A single-service FastAPI application that serves a static HTML/CSS/JavaScript chat frontend and a Groq-powered resume Q&A endpoint.

## Project structure

```text
ai-resume-chat/
├── backend/
│   ├── main.py
│   └── Atharva_Kulkarni_Resume_Starter.docx
├── frontend/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── requirements.txt
├── render.yaml
└── .gitignore
```

## Run locally

1. Create and activate a virtual environment.
2. Install requirements:

   ```bash
   pip install -r requirements.txt
   ```

3. Create a `.env` file in the repository root:

   ```text
   GROQ_API_KEY=your_actual_groq_api_key
   GROQ_MODEL=openai/gpt-oss-120b
   ```

4. Start the server from the repository root:

   ```bash
   uvicorn backend.main:app --reload
   ```

5. Open `http://127.0.0.1:8000/`. Do not use Live Server for the integrated app; FastAPI serves the page and API from the same origin.

API checks:
- `GET /api/info` confirms the API is reachable.
- `POST /chat` accepts `{ "question": "What technical skills are listed in the resume?" }` and returns `{ "answer": "..." }`.
- `GET /docs` provides interactive API documentation.

## Deploy to Render

1. Push the repository to GitHub. **Do not commit `.env` or your API key.**
2. In Render, choose **New + → Blueprint** and connect the repository. Render will read `render.yaml`; alternatively, create a Python Web Service manually.
3. Set `GROQ_API_KEY` in the Render service's Environment settings. `GROQ_MODEL` is defined in `render.yaml` and can be changed there if needed.
4. Deploy and open the `onrender.com` URL. The root route serves the frontend; `/api/info` and `/chat` remain on the same domain.

If setting up manually, use:
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
- Health check path: `/api/info`

## Notes

- The resume is loaded at application startup from the DOCX file beside `backend/main.py`. Keep that path correct when replacing the resume.
- The `.env` file is for local development only. Store production secrets in Render's Environment settings.
- The free web service may sleep after inactivity, so its first request after a quiet period may take longer.
- Before sharing broadly, add rate limiting to prevent unwanted repeated usage of the public AI endpoint.
