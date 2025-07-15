# 📦 Inventory Management & Demand Forecasting System

![Python](https://img.shields.io/badge/Python-3.7%2B-blue?logo=python)
![Flask](https://img.shields.io/badge/Flask-API-lightgrey?logo=flask)
![LightGBM](https://img.shields.io/badge/LightGBM-ML-success?logo=lightgbm)
![Frontend](https://img.shields.io/badge/Frontend-HTML%2FCSS%2FJS-orange?logo=html5)

---

## 🚀 Overview

A modern, full-featured **Inventory Management System** with:
- 📊 **Dashboard Analytics**
- 🤖 **AI-powered Demand Forecasting**
- 🔄 **Restock Prediction**
- 🛒 **Sales & Purchases Tracking**
- 🔐 **User Authentication**
- 🎨 **Interactive Data Visualizations**

---

## 🗂️ Project Structure

```text
Projects-main/
├── server.py                # 🧠 Flask backend (ML API)
├── l2.py                    # 📈 Model training & analysis script
├── inventory.html           # 🖥️ Main dashboard UI
├── inventory-script.js      # ⚙️ Dashboard logic
├── inventory-styles.css     # 🎨 Dashboard styles
├── demand-forecast.html     # 📉 Demand forecast visualization
├── prediction-results.html  # 📋 Prediction/restock results
├── login.html               # 🔑 Login page
├── login-script.js          # 🔒 Login logic
├── login-styles.css         # 💅 Login styles
├── store.csv                # 🗃️ Historical data (large)
├── pic.jpg                  # 🖼️ Logo
```

---

## ✨ Features

- **User Authentication**: Secure login for access control
- **Inventory Management**: Add, edit, delete, and search items
- **Sales & Purchases**: Record and analyze transactions
- **Dashboard Analytics**: Visualize inventory, revenue, and trends
- **Demand Forecasting**: Predict future demand using ML (LightGBM)
- **Restock Prediction**: Get smart restock suggestions
- **Data Visualization**: Interactive charts and tables
- **CSV Data Import**: Uses `store.csv` for historical data

---

## ⚙️ Setup Instructions

1. **Install Python dependencies:**
   ```bash
   pip install flask flask-cors pandas numpy lightgbm scikit-learn matplotlib
   ```
2. **Run the backend server:**
   ```bash
   python server.py
   ```
3. **Open `inventory.html` in your browser** to access the dashboard (ensure the backend is running for predictions).
4. **Login** with your credentials to start managing inventory.

---

## 🖥️ Usage

- **Add/Edit Inventory:** Use the dashboard to manage products, sales, and purchases.
- **Forecast Demand:** Use the "Predict" tab to generate demand forecasts.
- **View Results:** Forecast and restock results are shown in dedicated pages with charts and tables.
- **Analyze Model:** Run `l2.py` for standalone model training and evaluation.

---

## 📁 File Descriptions

| File                     | Description                                 |
|--------------------------|---------------------------------------------|
| `server.py`              | Flask API for ML-powered predictions        |
| `l2.py`                  | Data science script for model analysis      |
| `inventory.html/.js/.css`| Main inventory management UI & logic        |
| `demand-forecast.html`   | Demand forecast visualization               |
| `prediction-results.html`| Restock & demand prediction results         |
| `login.html/.js/.css`    | User authentication interface               |
| `store.csv`              | Main data source (large, not included here) |
| `pic.jpg`                | Logo for the UI                            |

---

## 📝 Notes

- Requires **Python 3.7+** and a modern browser.
- Backend must be running for prediction features.
- `store.csv` should be formatted with columns as used in the scripts.

---

## 💡 Screenshots

> _Add screenshots of your dashboard, analytics, and prediction results here for extra visual appeal!_

---

## 🤝 Contributing

Pull requests and suggestions are welcome! For major changes, please open an issue first to discuss what you would like to change.

---

## 📜 License

MIT License 

---

## 🔮 Future Improvements

- **SQL Database Integration:** Replace local CSV storage with a robust SQL database (e.g., PostgreSQL or MySQL) for better scalability, security, and concurrent access.
- **Advanced Prediction Models:** Incorporate more efficient and accurate machine learning models (e.g., deep learning, ensemble methods) for demand and restock forecasting.
- **User Roles & Permissions:** Implement granular user roles (admin, manager, staff) for enhanced access control.
- **API Security:** Add authentication and authorization to backend API endpoints.
- **Cloud Deployment:** Enable easy deployment to cloud platforms (e.g., AWS, Azure, GCP).
- **Automated Testing:** Add unit and integration tests for backend and frontend.
- **Mobile-Friendly UI:** Improve responsive design for seamless use on tablets and smartphones.

--- 

---

## 👤 Author

- **Name:** Sidhant Kaistha
- **Email:** sidhantkaistha2004@gmail.com

--- 
