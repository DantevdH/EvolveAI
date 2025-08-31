# Vector Database Population Script

This script populates your Supabase vector database with sample fitness and nutrition data, and can later be used to process your actual PDFs.

## Prerequisites

1. **Supabase Project**: Make sure pgvector extension is enabled
2. **Environment Variables**: Set up your `.env` file with:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   SUPABASE_URL=your_supabase_project_url_here
   SUPABASE_ANON_KEY=your_supabase_anon_key_here
   ```

## Installation

Install the required dependencies:
```bash
pip install -r requirements.txt
```

## Usage

### 1. Populate with Sample Data (Recommended First Step)
```bash
cd backend/scripts
python populate_vector_db.py --mode=sample
```

This will create 5 sample documents covering:
- Beginner Strength Training
- Intermediate Hypertrophy Program
- Nutrition Fundamentals
- Running Training for Beginners
- Injury Prevention and Recovery

### 2. Process a Single PDF
```bash
python populate_vector_db.py --mode=pdf --pdf-path=/path/to/your/document.pdf
```

### 3. Process a Directory of PDFs
```bash
python populate_vector_db.py --mode=pdfs --pdf-dir=/path/to/your/pdf/folder
```

## What the Script Does

1. **Document Processing**: Extracts text from PDFs or uses sample content
2. **Text Chunking**: Splits long documents into smaller, overlapping chunks
3. **Embedding Generation**: Creates OpenAI embeddings for each chunk
4. **Database Storage**: Stores documents and embeddings in Supabase tables

## Database Schema

The script creates two main tables:
- `documents`: Stores original content and metadata
- `document_embeddings`: Stores chunked text with vector embeddings

## Sample Data Structure

Each document includes:
- Title and content
- Topic classification (fitness, nutrition, running, physiotherapy)
- Metadata (difficulty level, body part, sport type, etc.)
- Vector embeddings for semantic search

## Next Steps

After running this script, you'll have:
1. ✅ Sample data in your vector database
2. ✅ Working embedding pipeline
3. ✅ Ready for agent system implementation

## Troubleshooting

- **Missing environment variables**: Check your `.env` file
- **Supabase connection issues**: Verify your URL and API keys
- **OpenAI API errors**: Check your API key and billing status
- **PDF processing errors**: Ensure PyPDF2 is installed correctly 