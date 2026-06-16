from flask import Flask, render_template, request, jsonify, redirect, url_for
import calculations

app = Flask(__name__)

@app.route('/')
def admin_dashboard():
    """Serves the Admin Dashboard interface."""
    return render_template('admin.html')

@app.route('/admin')
def redirect_to_root():
    """Redirects /admin to /."""
    return redirect(url_for('admin_dashboard'))

@app.route('/api/calculate-ahp', methods=['POST'])
def api_calculate_ahp():
    """
    POST endpoint to compute AHP weights.
    Expects JSON structure:
    {
        "matrix": [[1, 2, ...], [0.5, 1, ...], ...]
    }
    """
    try:
        data = request.get_json()
        if not data or 'matrix' not in data:
            return jsonify({"error": "Missing 'matrix' parameter in request body."}), 400
            
        matrix = data['matrix']
        # Validate dimensions
        n = len(matrix)
        if n == 0:
            return jsonify({"error": "Matrix cannot be empty."}), 400
            
        for row in matrix:
            if len(row) != n:
                return jsonify({"error": "Matrix must be square."}), 400
                
        # Perform calculation
        results = calculations.calculate_ahp(matrix)
        return jsonify(results)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/calculate-topsis', methods=['POST'])
def api_calculate_topsis():
    """
    POST endpoint to compute TOPSIS rankings.
    Expects JSON structure:
    {
        "decision_matrix": [[val1, val2, ...], ...],
        "weights": [w1, w2, ...],
        "criteria_types": ["benefit", "cost", ...]
    }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Missing request body."}), 400
            
        required_fields = ['decision_matrix', 'weights', 'criteria_types']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing '{field}' parameter in request body."}), 400
                
        decision_matrix = data['decision_matrix']
        weights = data['weights']
        criteria_types = data['criteria_types']
        
        m = len(decision_matrix)
        if m == 0:
            return jsonify({"error": "Decision matrix must have at least one supplier."}), 400
            
        n = len(weights)
        if n == 0:
            return jsonify({"error": "Weights list cannot be empty."}), 400
            
        if len(criteria_types) != n:
            return jsonify({"error": "Criteria types list must match the number of weights."}), 400
            
        for row in decision_matrix:
            if len(row) != n:
                return jsonify({"error": "All alternatives in decision matrix must have scores for all criteria."}), 400
                
        # Perform calculation
        alternatives = data.get('alternatives', None)
        results = calculations.calculate_topsis(
            decision_matrix,
            weights,
            criteria_types,
            alternatives=alternatives
        )
        return jsonify(results)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Running Flask locally on port 5000 in debug mode
    app.run(host='0.0.0.0', port=5000, debug=True)
