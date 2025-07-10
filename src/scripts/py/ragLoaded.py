from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain.chains import RetrievalQA
from langchain_openai import ChatOpenAI
import numpy as np
import os

 
embeddings = OpenAIEmbeddings(model="text-embedding-3-large")

new_vector_store = FAISS.load_local(
    "DalElectify_index", embeddings, allow_dangerous_deserialization=True
)

retriever = new_vector_store.as_retriever(search_type="similarity", search_kwargs={"k": 80})
llm = ChatOpenAI(model="gpt-4o")

qa = RetrievalQA.from_chain_type(llm=llm, retriever=retriever)

response = qa.invoke({"query": "list all 6 Srini courses"})
print("\n💬 Answer:", response["result"])