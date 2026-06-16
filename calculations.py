import numpy as np

# Random Index (RI) table for AHP Consistency Ratio
AHP_RI = {
    1: 0.00,
    2: 0.00,
    3: 0.58,
    4: 0.90,
    5: 1.12,
    6: 1.24,
    7: 1.32,
    8: 1.41,
    9: 1.45,
    10: 1.49
}

def calculate_ahp(matrix):
    """
    Computes AHP priority vectors, lambda max, CI, and CR.
    
    Parameters:
    matrix (list of list of float): Pairwise comparison matrix of size n x n.
    
    Returns:
    dict: A dictionary containing calculation steps, weights, lambda_max, CI, CR, and consistency status.
    """
    A = np.array(matrix, dtype=float)
    n = A.shape[0]
    
    if n != A.shape[1]:
        raise ValueError("Matrix must be square.")
        
    # 1. Calculate column sums
    col_sums = np.sum(A, axis=0)
    
    # 2. Normalize the comparison matrix
    # Avoid division by zero
    col_sums_nonzero = np.where(col_sums == 0, 1.0, col_sums)
    normalized_matrix = A / col_sums_nonzero
    
    # 3. Calculate priority vector (weights) as row averages
    weights = np.mean(normalized_matrix, axis=1)
    
    # 4. Consistency check
    # Weighted sum vector: Ws = A * w
    weighted_sum = np.dot(A, weights)
    
    # Consistency vector: Cs_i = Ws_i / w_i
    # Avoid division by zero if weights are 0
    weights_nonzero = np.where(weights == 0, 1.0, weights)
    consistency_vector = weighted_sum / weights_nonzero
    
    # Lambda Max: average of consistency vector
    lambda_max = float(np.mean(consistency_vector))
    
    # Consistency Index (CI)
    if n > 1:
        ci = (lambda_max - n) / (n - 1)
    else:
        ci = 0.0
        
    # Consistency Ratio (CR)
    ri = AHP_RI.get(n, 1.49) # Default to 1.49 if n > 10
    if ri > 0:
        cr = ci / ri
    else:
        cr = 0.0
        
    is_consistent = bool(cr < 0.1)
    
    return {
        "matrix": A.tolist(),
        "col_sums": col_sums.tolist(),
        "normalized_matrix": normalized_matrix.tolist(),
        "weights": weights.tolist(),
        "weighted_sum": weighted_sum.tolist(),
        "consistency_vector": consistency_vector.tolist(),
        "lambda_max": lambda_max,
        "ci": ci,
        "ri": ri,
        "cr": cr,
        "is_consistent": is_consistent
    }

def calculate_topsis(
    decision_matrix,
    weights,
    criteria_types,
    alternatives=None
):
    X = np.array(decision_matrix, dtype=float)
    m, n = X.shape
    w = np.array(weights, dtype=float)

    if len(w) != n:
        raise ValueError(
            "Number of weights must match criteria."
        )

    if len(criteria_types) != n:
        raise ValueError(
            "Number of criteria types must match criteria."
        )

    # Normalisasi bobot
    w = w / np.sum(w)

    # Matriks ternormalisasi
    column_norms = np.sqrt(np.sum(X**2, axis=0))
    column_norms[column_norms == 0] = 1

    normalized_matrix = X / column_norms

    # Matriks ternormalisasi terbobot
    weighted_matrix = normalized_matrix * w

    # Solusi ideal
    ideal_positive = np.zeros(n)
    ideal_negative = np.zeros(n)

    for j in range(n):
        if criteria_types[j].lower() == "benefit":
            ideal_positive[j] = np.max(weighted_matrix[:, j])
            ideal_negative[j] = np.min(weighted_matrix[:, j])
        else:
            ideal_positive[j] = np.min(weighted_matrix[:, j])
            ideal_negative[j] = np.max(weighted_matrix[:, j])

    # Jarak ke solusi ideal
    distance_positive = np.sqrt(
        np.sum(
            (weighted_matrix - ideal_positive) ** 2,
            axis=1
        )
    )

    distance_negative = np.sqrt(
        np.sum(
            (weighted_matrix - ideal_negative) ** 2,
            axis=1
        )
    )

    # Nilai preferensi
    preference_values = (
        distance_negative /
        (distance_positive + distance_negative)
    )

    # Ranking
    sorted_indices = np.argsort(
        preference_values
    )[::-1]

    ranks = np.empty_like(sorted_indices)
    ranks[sorted_indices] = np.arange(
        1,
        len(sorted_indices) + 1
    )

    # Ranking siap tampil
    ranking_results = []

    if alternatives is None:
        alternatives = [
            f"A{i+1}"
            for i in range(m)
        ]

    for idx in sorted_indices:
        ranking_results.append({
            "alternative": alternatives[idx],
            "score": round(
                float(preference_values[idx]),
                6
            )
        })

    return {
        "decision_matrix": X.tolist(),
        "normalized_matrix": normalized_matrix.tolist(),
        "weighted_matrix": weighted_matrix.tolist(),
        "ideal_positive": ideal_positive.tolist(),
        "ideal_negative": ideal_negative.tolist(),
        "distance_positive": distance_positive.tolist(),
        "distance_negative": distance_negative.tolist(),
        "preference_values":
            preference_values.tolist(),
        "sorted_indices":
            sorted_indices.tolist(),
        "ranks":
            ranks.tolist(),
        "ranking_results":
            ranking_results
    }
