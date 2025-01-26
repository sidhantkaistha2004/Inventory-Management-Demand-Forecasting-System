import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import lightgbm as lgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score, explained_variance_score, mean_absolute_percentage_error

# Load Data
data = pd.read_csv("store.csv")
print(data.head())
# Preprocess Data
data['Date'] = pd.to_datetime(data['Date'], dayfirst=True)
data['Month'] = data['Date'].dt.month
data['Day'] = data['Date'].dt.day
data['Week'] = data['Date'].dt.isocalendar().week

# Encode Categorical Features
data = pd.get_dummies(data, columns=['Category', 'Seasonality'], drop_first=True)

# Feature Engineering: Lag and Rolling Features
data = data.sort_values(by='Date')
data['Lag_Units_Sold'] = data['Units Sold'].shift(1)
data['Lag_Inventory_Level'] = data['Inventory Level'].shift(1)
data['Rolling_Units_Sold'] = data['Units Sold'].rolling(window=3).mean()
data['Rolling_Inventory_Level'] = data['Inventory Level'].rolling(window=3).mean()
data['Sales_Revenue'] = data['Units Sold'] * data['Price']
data = data.dropna()  # Drop rows with NaN values due to lag/rolling features

# Define Features and Target
X = data.drop(columns=['Inventory Level', 'Date', 'Store ID', 'Product ID'])
y = data['Inventory Level']

# Train-Test Split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# LightGBM Model
model = lgb.LGBMRegressor(random_state=42, n_estimators=100, learning_rate=0.1, max_depth=6)
model.fit(X_train, y_train)

# Make Predictions
y_pred = model.predict(X_test)

# Calculate Metrics
# Evaluate the Voting Regressor
mae = mean_absolute_error(y_test, y_pred)
mse = mean_squared_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)
evs = explained_variance_score(y_test, y_pred)
mape = mean_absolute_percentage_error(y_test, y_pred)

print(f"Mean Absolute Error (MAE): {mae}")
print(f"Mean Squared Error (MSE): {mse}")
print(f"R² Score: {r2}")
print(f"Explained Variance Score (EVS): {evs}")
print(f"Mean Absolute Percentage Error (MAPE): {mape}")

# 1. Predicted vs. Actual Inventory Levels
plt.figure(figsize=(10, 6))
plt.scatter(y_test, y_pred, alpha=0.6, color='b')
plt.plot([y_test.min(), y_test.max()], [y_test.min(), y_test.max()], 'k--', lw=2, label='Perfect Prediction')
plt.title("Predicted vs. Actual Inventory Levels")
plt.xlabel("Actual Inventory Levels")
plt.ylabel("Predicted Inventory Levels")
plt.legend()
plt.grid(True)
plt.show()

# 2. Error Distribution
errors = y_test - y_pred
plt.figure(figsize=(10, 6))
plt.hist(errors, bins=20, color='orange', edgecolor='black', alpha=0.7)
plt.title("Distribution of Prediction Errors")
plt.xlabel("Prediction Error (Actual - Predicted)")
plt.ylabel("Frequency")
plt.grid(True)
plt.show()

# 3. Feature Importance
importances = model.feature_importances_
feature_names = X.columns

plt.figure(figsize=(12, 6))
plt.barh(feature_names, importances, color='skyblue', edgecolor='black')
plt.title("Feature Importance in Inventory Prediction")
plt.xlabel("Importance")
plt.ylabel("Features")
plt.grid(True)
plt.show()

