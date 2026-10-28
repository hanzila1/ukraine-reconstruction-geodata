import streamlit as st

st.set_page_config(
    page_title="geoInnovation:lab | Feasibility Demonstrator",
    page_icon="🌍",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.title("🌍 geoInnovation:lab — Demonstrator")
st.caption("Geospatial Sustainability & Innovation Sprint")

st.sidebar.header("Navigation")
page = st.sidebar.radio("Select View", ["Overview", "Analysis & Monitoring", "Compliance & Reports"])

if page == "Overview":
    st.subheader("Project Overview")
    st.info("Feasibility Study & Innovation Sprint workspace ready for deployment.")
    
    col1, col2, col3 = st.columns(3)
    col1.metric("Status", "Sprint Setup")
    col2.metric("Target", "Kharkiv Collaboration")
    col3.metric("Focus", "EO & GeoAI Demonstrator")

elif page == "Analysis & Monitoring":
    st.subheader("Spatial Analysis & Earth Observation")
    st.write("Earth observation, satellite indices, and change detection pipeline.")

elif page == "Compliance & Reports":
    st.subheader("Sustainability & Compliance Checks")
    st.write("Automated compliance verification and audit report generation.")
