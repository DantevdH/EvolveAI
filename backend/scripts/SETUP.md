# Vector Database Setup Guide

## Step-by-Step Setup

### 1. Environment Setup
Create a `.env` file in your `backend/` directory with:
```bash
OPENAI_API_KEY=your_openai_api_key_here
SUPABASE_URL=your_supabase_project_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 2. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 3. Test Connections
```bash
cd scripts
python test_connection.py
```

This will verify:
- ✅ Supabase connection
- ✅ Database tables exist
- ✅ pgvector extension working
- ✅ OpenAI API access

### 4. Populate with Sample Data
```bash
python populate_vector_db.py --mode=sample
```

This creates 5 sample documents covering fitness, nutrition, running, and physiotherapy.

### 5. Verify Data
Check your Supabase dashboard to see the populated tables:
- `documents` table should have 5 rows
- `document_embeddings` table should have multiple rows (chunks)

## What You'll Have After Setup

1. **Working vector database** with sample fitness knowledge
2. **Embedding pipeline** ready for your PDFs
3. **Metadata filtering** system for smart search
4. **Foundation** for the agent system

## Next Steps

After successful setup, we'll implement:
1. Base agent infrastructure
2. Specialist agents (Fitness Coach, Nutrition Coach, etc.)
3. Orchestrator agent
4. Integration with your FastAPI backend

## Troubleshooting

- **pgvector not enabled**: Go to Supabase Dashboard → Database → Extensions → Enable pgvector
- **Missing tables**: Run the SQL commands from the main README
- **API key issues**: Check your OpenAI billing and Supabase project settings

## Ready to Continue?

Once you see "✅ Sample data population completed successfully!", you're ready for the next phase: implementing the agent system! 