from flask import Flask, jsonify, request, render_template
from supabase import create_client, Client
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Supabase Setup
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

if not url or not key:
    print("Error: SUPABASE_URL and SUPABASE_KEY must be set in .env")
    # In a real app, you might want to exit or handle this more gracefully
    supabase = None
else:
    supabase: Client = create_client(url, key)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    if not supabase:
        return jsonify({"error": "Database not configured"}), 500
    
    try:
        # Fetch all entries, sorted by score descending
        response = supabase.table('leaderboard').select("*").order('score', desc=True).execute()
        return jsonify(response.data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/add', methods=['POST'])
def add_entry():
    if not supabase:
        return jsonify({"error": "Database not configured"}), 500

    data = request.json
    name = data.get('name')
    score = data.get('score')

    if not name or score is None:
        return jsonify({"error": "Name and score are required"}), 400
    
    try:
        score_int = int(score)
        if score_int < 0:
             return jsonify({"error": "Score must be a positive integer"}), 400
    except ValueError:
        return jsonify({"error": "Score must be an integer"}), 400

    try:
        response = supabase.table('leaderboard').insert({"name": name, "score": score_int}).execute()
        return jsonify(response.data), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/update/<int:entry_id>', methods=['PUT'])
def update_entry(entry_id):
    if not supabase:
        return jsonify({"error": "Database not configured"}), 500

    data = request.json
    score = data.get('score')

    if score is None:
        return jsonify({"error": "Score is required"}), 400

    try:
        score_int = int(score)
        if score_int < 0:
             return jsonify({"error": "Score must be a positive integer"}), 400
    except ValueError:
        return jsonify({"error": "Score must be an integer"}), 400

    try:
        response = supabase.table('leaderboard').update({"score": score_int}).eq("id", entry_id).execute()
        return jsonify(response.data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/delete/<int:entry_id>', methods=['DELETE'])
def delete_entry(entry_id):
    if not supabase:
        return jsonify({"error": "Database not configured"}), 500

    try:
        response = supabase.table('leaderboard').delete().eq("id", entry_id).execute()
        return jsonify(response.data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
