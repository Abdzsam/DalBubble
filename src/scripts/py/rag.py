import vertexai
from vertexai.preview import rag
from vertexai.generative_models import GenerativeModel, Tool

PROJECT_ID = "581175759338"
display_name = "Courses Corpus"
file_display_name = "Dalhousie Courses"
description = "Corpus for Dalhousie Courses"
file_description = "Details of each course"
path = "../../../database/courses.txt"

vertexai.init(project=PROJECT_ID, location="us-central1")

backend_config = rag.RagVectorDbConfig(
    rag_embedding_model_config=rag.RagEmbeddingModelConfig(
        vertex_prediction_endpoint=rag.VertexPredictionEndpoint(
            publisher_model="publishers/google/models/text-embedding-005"
        )
    )
)

def get_or_create_corpus_and_file(display_name):
    # Check for existing corpus
    corpora = rag.list_corpora()
    for corpus in corpora:
        if corpus.display_name == display_name:
            print(f"Using existing corpus: {display_name}")
            # Check if file is already uploaded
            files = rag.list_files(corpus.name)
            for file in files:
                if file.display_name == file_display_name:
                    print("File already uploaded. Skipping upload.")
                    return corpus.name
            # If file not found, upload it
            print("Uploading missing file...")
            rag.upload_file(
                corpus_name=corpus.name,
                path=path,
                display_name=file_display_name,
                description=file_description,
            )
            return corpus.name
    
    # Create new corpus if not found
    print("Creating new corpus and uploading file...")
    corpus = rag.create_corpus(
        display_name=display_name,
        description=description,
        backend_config=backend_config
    )
    rag.upload_file(
        corpus_name=corpus.name,
        path=path,
        display_name=file_display_name,
        description=file_description,
    )
    return corpus.name

corpus_name = get_or_create_corpus_and_file(display_name)

# Set up retrieval tool
rag_retrieval_tool = Tool.from_retrieval(
    retrieval=rag.Retrieval(
        source=rag.VertexRagStore(
            rag_resources=[rag.RagResource(rag_corpus=corpus_name)],
            rag_retrieval_config=rag.RagRetrievalConfig(
                top_k=10,
                filter=rag.utils.resources.Filter(vector_distance_threshold=0.5),
            ),
        ),
    )
)

# Load Gemini model
rag_model = GenerativeModel(
    model_name="gemini-2.5-pro-preview-06-05",
    tools=[rag_retrieval_tool]
)

print("\n🔍 Ask me about Dalhousie courses! (Type 'exit' to quit)\n")

while True:
    query = input("💬 You: ").strip()
    if query.lower() in ["exit", "quit"]:
        print("👋 Exiting. Have a great day!")
        break
    try:
        response = rag_model.generate_content(query)
        print(f"\n🤖 Gemini: {response.text}\n")
    except Exception as e:
        print(f"⚠️ Error: {e}\n")
