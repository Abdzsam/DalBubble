from langchain_openai import OpenAIEmbeddings
from langchain_community. vectorstores import FAISS
import faiss
from langchain_community.docstore.in_memory import InMemoryDocstore
from langchain_core.documents import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter
import shutil
import re
import os


coursesPath = "../../../database/courses.txt"

if os.path.exists("DalElectify_index"):
    shutil.rmtree("DalElectify_index")
    print("Old FAISS index folder deleted.")

embeddings = OpenAIEmbeddings(model="text-embedding-3-large")

Dimensions = embeddings.embed_query("ToGetEmbeddingDimensions")

index = faiss.IndexFlatL2(len(Dimensions))

vector_store = FAISS(
    embedding_function=embeddings,
    index=index,
    docstore=InMemoryDocstore(),
    index_to_docstore_id={},
)

# with open(coursesPath, 'r') as coursesData:
#     allCourses = coursesData.read()
#     coursesArr = re.split(r'^-{6}$',allCourses, flags=re.MULTILINE)
    
#     documents = []
#     BATCH_SIZE = 200

#     for i in range(1,len(coursesArr)):
#         document = Document(page_content=coursesArr[i])
#         documents.append(document)
        
#         if len(documents) == BATCH_SIZE:
#             vector_store.add_documents(documents)
#             print(f"Embedded batch up to index {i}/{len(coursesArr)}")
#             documents = []
    
#     if documents:
#         vector_store.add_documents(documents)
#         print(f"Embedded final batch {len(coursesArr)}/{len(coursesArr)}")

#     vector_store.save_local("DalElectify_index")
#     print("✅ FAISS index saved.")

# Set up text splitter
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=5000,
    chunk_overlap=200,
    separators=["\n\n", "\n", ".", " ", ""]
)

# Helper function to batch document list
def batch(iterable, n=100):
    for i in range(0, len(iterable), n):
        yield iterable[i:i + n]

# Read and split course data
with open(coursesPath, 'r') as f:
    all_courses = f.read()

course_blocks = re.split(r'^-{6}$', all_courses, flags=re.MULTILINE)

documents = []
for course_text in course_blocks:
    course_text = course_text.strip()
    if not course_text:
        continue
    chunks = text_splitter.split_text(course_text)
    documents.extend([Document(page_content=chunk) for chunk in chunks])

# Embed in safe batches
for i, doc_batch in enumerate(batch(documents, 100)):
    vector_store.add_documents(doc_batch)
    print(f"✅ Embedded batch {i + 1}/{(len(documents) + 99) // 100}")

# Save the FAISS index
vector_store.save_local("DalElectify_index")
print("✅ FAISS index saved.")

