from flask import Flask, request, jsonify
from flask_cors import CORS  # Add this import
import pandas as pd
import numpy as np
import lightgbm as lgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

def train_model(df):
    # Preprocess data
    df['Date'] = pd.to_datetime(df['date'])
    df['Month'] = df['Date'].dt.month
    df['Day'] = df['Date'].dt.day
    df['Week'] = df['Date'].dt.isocalendar().week

    # Encode categorical features
    df = pd.get_dummies(df, columns=['category', 'seasonality'], drop_first=True)

    # Feature engineering
    df = df.sort_values(by='Date')
    df['Lag_Units_Sold'] = df.groupby('productID')['unitsSold'].shift(1)
    df['Rolling_Units_Sold'] = df.groupby('productID')['unitsSold'].rolling(window=3).mean().reset_index(0, drop=True)
    df = df.dropna()

    # Define features and target
    features = [col for col in df.columns if col not in ['date', 'Date', 'storeID', 'productID', 'inventoryLevel']]
    X = df[features]
    y = df['inventoryLevel']

    # Train model
    model = lgb.LGBMRegressor(random_state=42, n_estimators=100, learning_rate=0.1, max_depth=6)
    model.fit(X, y)
    
    return model, features

@app.route('/predict-demand', methods=['POST'])
def predict_demand():
    try:
        data = request.json
        if not data or 'inventory' not in data:
            return jsonify({'error': 'No inventory data provided'}), 400

        inventory_data = data['inventory']
        forecast_period = int(data.get('forecastPeriod', 7))
        
        # Convert to DataFrame and preprocess
        df = pd.DataFrame(inventory_data)
        df['date'] = pd.to_datetime(df['date'], format='%d-%m-%Y')
        
        # Train model on historical data
        model, features = train_model(df)
        
        predictions = []
        # Group by store and product
        for (store_id, product_id), group in df.groupby(['storeID', 'productID']):
            try:
                # Prepare most recent data for prediction
                latest_data = group.sort_values('date').iloc[-1:]
                current_stock = latest_data['inventoryLevel'].iloc[0]
                
                # Generate daily forecasts
                daily_forecasts = []
                current_date = df['date'].max()
                
                for i in range(1, forecast_period + 1):
                    forecast_date = current_date + pd.Timedelta(days=i)
                    
                    # Prepare features for prediction
                    pred_data = latest_data.copy()
                    pred_data['Date'] = forecast_date
                    pred_data['Month'] = forecast_date.month
                    pred_data['Day'] = forecast_date.day
                    pred_data['Week'] = forecast_date.isocalendar()[1]
                    
                    # Encode categorical features
                    pred_data = pd.get_dummies(pred_data, columns=['category', 'seasonality'], drop_first=True)
                    
                    # Ensure all feature columns exist
                    for feature in features:
                        if feature not in pred_data.columns:
                            pred_data[feature] = 0
                    
                    # Make prediction
                    X_pred = pred_data[features]
                    predicted_demand = model.predict(X_pred)[0]
                    
                    daily_forecasts.append({
                        'date': forecast_date.strftime('%Y-%m-%d'),
                        'demand': float(max(0, predicted_demand))
                    })

                # Calculate average daily demand
                predicted_demands = [f['demand'] for f in daily_forecasts]
                avg_daily_demand = np.mean(predicted_demands)

                predictions.append({
                    'storeId': store_id,
                    'productId': product_id,
                    'category': group['category'].iloc[0],
                    'currentStock': int(current_stock),
                    'predictedDailyDemand': float(avg_daily_demand),
                    'dailyForecasts': daily_forecasts
                })

            except Exception as e:
                print(f"Error processing prediction for store {store_id}, product {product_id}: {str(e)}")
                continue

        if not predictions:
            return jsonify({'error': 'No predictions could be generated'}), 400

        return jsonify(predictions)

    except Exception as e:
        print(f"Error in predict_demand: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Add new helper function for feature preparation
def prepare_features(data, forecast_date):
    """Prepare features for prediction"""
    features = data.copy()
    features['Date'] = forecast_date
    features['Month'] = forecast_date.month
    features['Day'] = forecast_date.day
    features['Week'] = forecast_date.isocalendar()[1]
    
    # Add rolling averages and lag features
    if 'unitsSold' in features.columns:
        features['Lag_Units_Sold'] = features['unitsSold'].shift(1)
        features['Rolling_Units_Sold'] = features['unitsSold'].rolling(window=3).mean()
    
    return features

@app.route('/predict-restock', methods=['POST'])
def predict_restock():
    try:
        data = request.json
        df = pd.DataFrame(data['inventory'])
        store_id = data.get('storeId')
        category = data.get('category')
        product_id = data.get('productId')
        threshold = float(data.get('threshold', 100))

        # Convert date to datetime
        df['Date'] = pd.to_datetime(df['date'])
        
        # Sort by date to get most recent entry
        df = df.sort_values('Date', ascending=False)

        # Filter data
        if store_id:
            df = df[df['storeID'] == store_id]
        if category:
            df = df[df['category'] == category]
        if product_id:
            df = df[df['productID'] == product_id]

        predictions = []
        # Group by store and product, take first (most recent) record
        for (store, product), group in df.groupby(['storeID', 'productID']):
            latest_record = group.iloc[0]  # Get most recent record
            current_stock = latest_record['inventoryLevel']
            
            # Calculate average daily sales from last 30 days of data
            recent_data = group[group['Date'] >= (latest_record['Date'] - pd.Timedelta(days=30))]
            avg_daily_sales = recent_data['unitsSold'].mean() if not recent_data.empty else group['unitsSold'].mean()
            
            if avg_daily_sales > 0:
                days_until_restock = (current_stock - threshold) / avg_daily_sales
                restock_date = datetime.now() + timedelta(days=max(0, days_until_restock))
                suggested_order = calculate_suggested_order(
                    current_stock, 
                    avg_daily_sales, 
                    threshold
                )
                
                predictions.append({
                    'storeId': store,
                    'productId': product,
                    'category': latest_record['category'],
                    'currentStock': int(current_stock),
                    'avgDailyConsumption': float(avg_daily_sales),
                    'daysUntilRestock': max(0, int(days_until_restock)),
                    'restockDate': restock_date.strftime('%Y-%m-%d'),
                    'suggestedOrder': int(suggested_order)
                })

        # Sort by urgency
        predictions.sort(key=lambda x: x['daysUntilRestock'])
        return jsonify(predictions)

    except Exception as e:
        print(f"Error in predict_restock: {str(e)}")
        return jsonify({'error': str(e)}), 500

def calculate_suggested_order(current_stock, daily_consumption, threshold):
    days_to_cover = 14  # Order enough for 2 weeks
    target_stock = threshold + (daily_consumption * days_to_cover)
    return max(0, target_stock - current_stock)

def calculate_seasonal_factor(group):
    current_month = datetime.now().month
    month_avg = group[group['Month'] == current_month]['unitsSold'].mean()
    overall_avg = group['unitsSold'].mean()
    return month_avg / overall_avg if overall_avg > 0 else 1.0

if __name__ == '__main__':
    app.run(debug=True)
