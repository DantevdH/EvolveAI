# 🗄️ Vector Database Population Guide

This guide explains how to populate your Supabase vector database with documents and embeddings for use with the EvolveAI specialist agents.

## 🎯 **Overview**

The vector database population system allows you to:
- **Process real documents** (PDFs, JSON, CSV) instead of hardcoded data
- **Automatically categorize content** by topic (fitness, nutrition, running, physiotherapy)
- **Generate embeddings** using OpenAI's text-embedding-3-small model
- **Create searchable knowledge bases** for each specialist agent
- **Scale efficiently** with your document collection

## 📁 **File Structure**

```
backend/
├── scripts/populate/
│   ├── populate_vector_db.py    # Main population script
│   ├── test_populate.py         # Test script for verification
│   └── README.md                # Script-specific documentation
├── data/                        # Your document collection
│   ├── fitness/                 # Fitness-related documents
│   ├── nutrition/               # Nutrition-related documents
│   ├── running/                 # Running-related documents
│   └── physiotherapy/           # Physiotherapy-related documents
└── docs/
    └── VECTOR_DATABASE_POPULATION.md  # This guide
```

## 🗄️ **Database Schema**

### **Documents Table**
| Field | Type | Description | Auto-populated |
|-------|------|-------------|----------------|
| `id` | UUID | Unique identifier | ✅ Yes |
| `title` | TEXT | Document title | ✅ Yes |
| `content` | TEXT | Full document content | ✅ Yes |
| `content_type` | TEXT | File type (pdf, json, csv) | ✅ Yes |
| `topic` | TEXT | Content category | ✅ Yes |
| `metadata` | JSONB | Rich metadata | ✅ Yes |
| `created_at` | TIMESTAMP | Creation timestamp | ✅ Yes |
| `updated_at` | TIMESTAMP | Update timestamp | ✅ Yes |

### **Document_Embeddings Table**
| Field | Type | Description | Auto-populated |
|-------|------|-------------|----------------|
| `id` | UUID | Unique identifier | ✅ Yes |
| `document_id` | UUID | Links to parent document | ✅ Yes |
| `chunk_index` | INTEGER | Sequential chunk number | ✅ Yes |
| `chunk_text` | TEXT | Text chunk content | ✅ Yes |
| `embedding` | VECTOR(1536) | OpenAI embedding | ✅ Yes |
| `chunk_metadata` | JSONB | Chunk-specific metadata | ✅ Yes |
| `created_at` | TIMESTAMP | Creation timestamp | ✅ Yes |

## 🚀 **Quick Start**

### **1. Prepare Your Documents**
```bash
# Create data directory structure
mkdir -p backend/data/{fitness,nutrition,running,physiotherapy}

# Add your documents
cp your_fitness_guide.pdf backend/data/fitness/
cp nutrition_data.json backend/data/nutrition/
cp running_program.csv backend/data/running/
```

### **2. Run Population Script**
```bash
cd backend

# Process all files in data directory
python scripts/populate/populate_vector_db.py --mode=directory --data-dir=./data

# Process only PDFs
python scripts/populate/populate_vector_db.py --mode=pdfs --data-dir=./data

# Process specific file types
python scripts/populate/populate_vector_db.py --mode=directory --data-dir=./data --file-types .pdf .json
```

### **3. Verify Population**
```bash
# Check database summary
python scripts/populate/populate_vector_db.py --mode=directory --data-dir=./data --verbose
```

## 📚 **Supported File Types**

### **PDF Documents**
- **Extraction**: Full text content extraction
- **Metadata**: Page count, file size, creation date
- **Chunking**: 1000 characters with 200 character overlap
- **Use Case**: Fitness guides, research papers, manuals

### **JSON Files**
- **Processing**: Structured data parsing
- **Content**: Formatted JSON with indentation
- **Metadata**: File size, modification time
- **Use Case**: Exercise databases, nutrition data, user profiles

### **CSV Files**
- **Processing**: Tabular data conversion
- **Content**: Formatted table representation
- **Dependencies**: Requires `pandas` package
- **Use Case**: Training logs, nutrition databases, progress tracking

## 🎯 **Topic Detection**

### **Automatic Categorization**
The script automatically detects document topics using weighted keyword scoring:

#### **Fitness** (🏋️‍♂️)
```python
keywords = ['workout', 'exercise', 'training', 'fitness', 'strength', 'muscle', 'cardio']
# Automatically filters for Fitness Coach agent
```

#### **Nutrition** (🥗)
```python
keywords = ['nutrition', 'diet', 'food', 'meal', 'protein', 'carbohydrate', 'vitamin']
# Automatically filters for Nutrition Coach agent
```

#### **Running** (🏃‍♂️)
```python
keywords = ['running', 'cardio', 'endurance', 'marathon', 'sprint', 'jogging']
# Automatically filters for Running Coach agent
```

#### **Physiotherapy** (🩺)
```python
keywords = ['injury', 'recovery', 'physio', 'therapy', 'rehabilitation', 'pain']
# Automatically filters for Physiotherapist agent
```

### **Manual Topic Override**
You can override automatic detection by modifying the `_detect_topic` method in the script.

## 🔧 **Advanced Usage**

### **Process Single File**
```bash
# Process specific PDF
python scripts/populate/populate_vector_db.py \
  --mode=file \
  --file-path=./data/fitness/advanced_workout.pdf

# Process JSON file
python scripts/populate/populate_vector_db.py \
  --mode=structured \
  --file-path=./data/nutrition/macro_data.json
```

### **Process Directory with Filters**
```bash
# Process only fitness documents
python scripts/populate/populate_vector_db.py \
  --mode=directory \
  --data-dir=./data/fitness \
  --file-types .pdf .json

# Process with verbose logging
python scripts/populate/populate_vector_db.py \
  --mode=directory \
  --data-dir=./data \
  --verbose
```

### **Custom File Types**
```bash
# Process specific file types
python scripts/populate/populate_vector_db.py \
  --mode=directory \
  --data-dir=./data \
  --file-types .pdf .json .csv .txt
```

## 📊 **Metadata Extraction**

### **Smart Keyword Extraction**
Instead of boring file metadata, the script automatically extracts meaningful keywords using **TF-IDF analysis**:

#### **TF-IDF Keyword Extraction** (automatic):
```json
{
  "keywords": [
    "progressive overload", "strength training", "muscle building",
    "squats", "deadlifts", "bench press", "dumbbells", "barbell",
    "training frequency", "rest days", "proper form"
  ],
  "page_count": 18,
  "extraction_date": "2024-01-15",
  "file_extension": ".pdf"
}
```

#### **Chunk Keywords** (per text chunk):
```json
{
  "chunk_type": "content",
  "word_count": 156,
  "source_document": "Fitness Health Guide",
  "keywords": ["strength", "training", "progressive", "overload"]
}
```

### **How TF-IDF Works**
The system automatically identifies the most important and distinctive terms:

1. **Term Frequency (TF)**: How often a word appears in the document
2. **Inverse Document Frequency (IDF)**: How rare/common the word is across all documents
3. **TF-IDF Score**: Combines both to find the most distinctive and important terms
4. **Automatic Ranking**: Keywords are automatically ranked by importance

### **Benefits of TF-IDF**
- ✅ **Fully automatic** - No manual keyword lists needed
- ✅ **Context-aware** - Keywords reflect actual document content
- ✅ **Intelligent ranking** - Most important terms appear first
- ✅ **Bigram support** - Captures meaningful phrases like "progressive overload"
- ✅ **Consistent quality** - No fallback modes, always high-quality extraction
- ✅ **Professional grade** - Industry-standard keyword extraction method

### **Keyword Categories**
The system automatically detects and extracts keywords from these domains:

- **🏋️‍♂️ Fitness**: Exercise types, body parts, equipment, training concepts, goals
- **🥗 Nutrition**: Macronutrients, food categories, dietary concepts, supplements
- **🏃‍♂️ Running**: Running types, race distances, training concepts, pace
- **🩺 Physiotherapy**: Injury types, body areas, treatment methods, recovery

### **Intelligent Topic Detection**
Topics are automatically detected with confidence scoring:
- **High confidence** (score ≥ 2): Topic assigned automatically
- **Low confidence** (score < 2): Defaults to 'general'
- **Fallback**: Always returns a valid topic

## 🧪 **Testing and Verification**

### **Run Test Script**
```bash
cd backend
python scripts/populate/test_populate.py
```

### **Expected Output**
```
🧪 Testing populate script functionality...

Running Import Test...
✅ Successfully imported VectorDBPopulator

Running Class Instantiation...
✅ Successfully instantiated VectorDBPopulator

Running Methods Exist...
✅ Method exists: process_pdf
✅ Method exists: process_structured_file
✅ Method exists: process_data_directory
✅ Method exists: process_single_file
✅ Method exists: chunk_text
✅ Method exists: generate_embeddings
✅ Method exists: populate_database

Running Deprecated Methods Removed...
✅ Deprecated method removed: create_sample_documents
✅ Deprecated method removed: run_sample_population

📊 Test Results: 4/4 tests passed
🎉 All tests passed! The populate script is working correctly.
```

### **Verify Database Population**
```bash
# Check database contents
python -c "
from scripts.populate.populate_vector_db import VectorDBPopulator
populator = VectorDBPopulator()
summary = populator.get_database_summary()
print(f'Database Summary: {summary}')
"
```

## 🔄 **Integration with AI Agents**

### **Automatic Agent Filtering**
Each specialist agent automatically filters documents by topic:

```python
# Fitness Coach Agent
from core.agents.specialists.fitness_coach import FitnessCoach

coach = FitnessCoach()
# Automatically searches only documents with topic="fitness"
relevant_docs = coach.search_knowledge_base("beginner workout routine")
```

### **RAG Enhancement**
The agents use populated documents to enhance their responses:

1. **Query Processing**: User request is analyzed
2. **Document Search**: Relevant documents are retrieved from vector database
3. **Prompt Enhancement**: Retrieved content is added to LLM prompts
4. **Response Generation**: Enhanced responses with knowledge base context

## 🚨 **Troubleshooting**

### **Common Issues**

#### **1. Import Errors**
```bash
# Error: ModuleNotFoundError: No module named 'scripts.populate'
# Solution: Run from backend directory
cd backend
python scripts/populate/populate_vector_db.py --help
```

#### **2. Environment Variables**
```bash
# Error: Missing required environment variables
# Solution: Check .env file
cat .env | grep -E "(SUPABASE|OPENAI)"
```

#### **3. File Processing Failures**
```bash
# Error: PDF contains no extractable text
# Solution: Check if PDF has text (not just images)
# Use OCR tools for image-based PDFs
```

#### **4. Embedding Generation Failures**
```bash
# Error: OpenAI API connection failed
# Solution: Check API key and credits
# Verify model access permissions
```

### **Debug Mode**
```bash
# Enable verbose logging
python scripts/populate/populate_vector_db.py \
  --mode=directory \
  --data-dir=./data \
  --verbose
```

## 📈 **Performance Optimization**

### **Smart Embedding Generation**
- **Batch Processing**: Processes chunks in batches of 10 to avoid rate limits
- **Retry Logic**: Automatic retry with exponential backoff for failed requests
- **Rate Limit Handling**: Detects rate limits and waits appropriately
- **Progress Tracking**: Shows batch progress during processing

### **Chunking Strategy**
- **Chunk Size**: 1000 characters (optimal for OpenAI embeddings)
- **Overlap**: 200 characters (maintains context between chunks)
- **Adjustment**: Modify `chunk_size` and `overlap` parameters in script

### **Batch Processing**
- **Parallel Processing**: Process multiple files simultaneously
- **Memory Management**: Process files in batches for large collections
- **Progress Tracking**: Monitor population progress with verbose logging

### **Database Optimization**
- **Indexes**: Ensure proper database indexes are created
- **Batch Inserts**: Use batch operations for better performance
- **Connection Pooling**: Reuse database connections

## 🔮 **Future Enhancements**

### **Planned Features**
- **OCR Integration**: Extract text from image-based PDFs
- **Multi-language Support**: Process documents in multiple languages
- **Advanced Metadata**: Extract structured data from documents
- **Incremental Updates**: Update only changed documents

### **Advanced Processing**
- **Document Versioning**: Track document changes over time
- **Quality Scoring**: Assess document quality and relevance
- **Duplicate Detection**: Identify and handle duplicate content
- **Content Validation**: Verify document content quality

## 📞 **Support**

### **Getting Help**
1. **Check this guide** for common solutions
2. **Run the test script** to verify functionality
3. **Check environment variables** in your `.env` file
4. **Review error logs** for specific issues

### **Contributing**
- **Add new file type support** in the script
- **Improve topic detection** algorithms
- **Enhance metadata extraction** capabilities
- **Add performance optimizations**

---

## 📋 **Quick Reference**

### **Essential Commands**
```bash
# Process all files
python scripts/populate/populate_vector_db.py --mode=directory --data-dir=./data

# Process specific file types
python scripts/populate/populate_vector_db.py --mode=directory --data-dir=./data --file-types .pdf .json

# Test script functionality
python scripts/populate/test_populate.py

# Enable verbose logging
python scripts/populate/populate_vector_db.py --mode=directory --data-dir=./data --verbose
```

### **File Organization**
```
data/
├── fitness/          # Fitness Coach documents
├── nutrition/        # Nutrition Coach documents  
├── running/          # Running Coach documents
└── physiotherapy/    # Physiotherapist documents
```

### **Key Benefits**
- ✅ **No hardcoded data** - Process real documents
- ✅ **Automatic categorization** - Smart topic detection
- ✅ **RAG enhancement** - Knowledge base integration
- ✅ **Scalable processing** - Handle large document collections
- ✅ **Professional quality** - Production-ready code

---

**Your vector database is now ready to power intelligent, knowledge-enhanced AI responses!** 🚀✨

The specialist agents will automatically use this populated knowledge base to provide more accurate, context-aware fitness and health guidance.

## 🔧 **Requirements**

### **Core Dependencies**
- **FastAPI**: Web framework for API endpoints
- **OpenAI**: API client for embedding generation
- **Supabase**: Vector database and storage
- **PyPDF2**: PDF text extraction
- **Pandas**: CSV processing (optional, for CSV support)

### **Machine Learning for TF-IDF**
- **scikit-learn**: Advanced keyword extraction using TF-IDF analysis
- **NumPy**: Numerical computing support
- **Required**: scikit-learn must be installed for keyword extraction

### **Installation**
```bash
# Install all dependencies including scikit-learn
pip install -r requirements.txt

# Or install manually
pip install scikit-learn==1.3.0 numpy==1.24.3 pandas==2.0.3
```

### **Requirements**
- **scikit-learn 1.3.0+** is required for keyword extraction
- **No fallback mode** - ensures consistent, high-quality keyword extraction
- **Automatic error handling** - clear error messages if dependencies are missing
