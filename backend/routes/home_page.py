import streamlit as st
from PIL import Image

st.set_page_config(page_title="PharmaLens", layout="wide")
# --- Style ---
st.markdown("""
    <style>
        .navbar {
            background-color: #002147;
            padding: 15px;
            color: #FFD700;
            font-size: 20px;
            font-weight: bold;
            border-radius: 0 0 10px 10px;
        }
        .navbar-item {
            text-align: center;
            padding: 10px;
        }
        .navbar-item:hover {
            background-color: #003366;
            border-radius: 5px;
            cursor: pointer;
        }
    </style>
""", unsafe_allow_html=True)

# --- Real Streamlit horizontal navbar using columns ---
with st.container():
    st.markdown('<div class="navbar">', unsafe_allow_html=True)
    col1, col2, col3, col4, col5, spacer = st.columns([1.5, 1, 1, 1, 1, 5])
    
    with col1:
        st.markdown('<div class="navbar-item">PharmaLens</div>', unsafe_allow_html=True)
    with col2:
        if st.button("Home"):
            st.session_state.page = "Home"
    with col3:
        if st.button("Medicines"):
            st.session_state.page = "Medicines"
    with col4:
        if st.button("Tutorials"):
            st.session_state.page = "Tutorials"
    with col5:
        if st.button("About"):
            st.session_state.page = "About"
    st.markdown('</div>', unsafe_allow_html=True)

# --- Dummy Pages ---
page = st.session_state.get("page", "Home")

if page == "Home":
    st.header("🏠 Welcome to PharmaLens")
    st.write("Your AI-powered medicine assistant.")
elif page == "Medicines":
    st.header("💊 Medicine Info")
    st.write("Search for drug dosage, side effects, and interactions.")
elif page == "Tutorials":
    st.header("📘 Tutorials")
    st.write("Learn how to use the PharmaLens platform.")
elif page == "About":
    st.header("ℹ️ About PharmaLens")
    st.write("This project was created for healthcare assistance.")
# --- Header / Hero Section ---
st.markdown("<h1 style='text-align: left;'><b>💊 PharmaLens</b></h1>", unsafe_allow_html=True)
st.markdown("<h4 style='text-align: left; color: dark blue;'>Your AI-powered assistant for prescription decoding and medicine insights.</h4>", unsafe_allow_html=True)

st.markdown("---")

# --- Upload Section ---
st.subheader("📤 Upload Your Prescription Image")
uploaded_file = st.file_uploader("Choose an image (JPG, PNG, JPEG)", type=["jpg", "png", "jpeg"])

if uploaded_file:
    image = Image.open(uploaded_file)
    st.image(image, caption="Uploaded Image", use_column_width=True)
    st.success("Image uploaded. OCR and analysis will be shown below .")
    st.progress(0.5)

# --- Call to Action Buttons ---
st.markdown("### 🚀 Quick Actions")
col1, col2, col3 = st.columns(3)

with col1:
    st.button("Try a Demo")

with col2:
    st.button("Ask Our Chatbot")

with col3:
    st.button("View Tutorials")

# --- Info Section ---
st.markdown("### 🧠 What Can PharmaLens Do?")
st.markdown("""
- Extract text from prescription images using AWS Textract
- Identify **medicine name**, **dosage**, and **expiry date**
- Match with your personal or standard drug database
- Provide **tutorials** and AI assistance for users
""")

# --- Footer ---
st.markdown("---")
st.markdown("<center><small>PharmaLens © 2025 | Built with 💙 for smarter healthcare</small></center>", unsafe_allow_html=True)
