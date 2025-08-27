// src/utils/vectorStore.ts
import { VectorStore } from '../types';

/**
 * Calculates the dot product of two vectors.
 * @param vecA The first vector.
 * @param vecB The second vector.
 * @returns The dot product.
 */
function dotProduct(vecA: number[], vecB: number[]): number {
    let product = 0;
    for (let i = 0; i < vecA.length; i++) {
        product += vecA[i] * vecB[i];
    }
    return product;
}

/**
 * Calculates the magnitude (Euclidean norm) of a vector.
 * @param vec The vector.
 * @returns The magnitude.
 */
function magnitude(vec: number[]): number {
    let sum = 0;
    for (let i = 0; i < vec.length; i++) {
        sum += vec[i] * vec[i];
    }
    return Math.sqrt(sum);
}

/**
 * Calculates the cosine similarity between two vectors.
 * @param vecA The first vector.
 * @param vecB The second vector.
 * @returns A similarity score between -1 and 1 (typically 0 to 1 for embeddings).
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
    const dot = dotProduct(vecA, vecB);
    const magA = magnitude(vecA);
    const magB = magnitude(vecB);
    if (magA === 0 || magB === 0) {
        return 0; // Avoid division by zero
    }
    return dot / (magA * magB);
}

/**
 * Searches the vector store for the top K most similar vectors to a query vector,
 * factoring in the recency of the information.
 * @param queryVector The vector representation of the search query.
 * @param vectorStore The store containing all the document vectors and their metadata.
 * @param topK The number of top results to return.
 * @param currentTurn The current turn number of the game.
 * @returns An array of the top K most similar text chunks.
 */
export function searchVectors(
    queryVector: number[],
    vectorStore: VectorStore,
    topK: number = 3,
    currentTurn: number
): string[] {
    if (!vectorStore || vectorStore.vectors.length === 0) {
        return [];
    }

    const W_SEMANTIC = 0.7; // Weight for content relevance
    const W_RECENCY = 0.3;  // Weight for time relevance

    // Calculate similarity scores for all vectors in the store
    const scores = vectorStore.vectors.map((vec, index) => {
        const metadata = vectorStore.metadata[index];
        if (!metadata) {
            return { score: -1, text: '' }; // Should not happen if data is consistent
        }
        
        const semanticScore = cosineSimilarity(queryVector, vec);
        
        // Use currentTurn as fallback if turnNumber is missing (for older data)
        const eventTurn = metadata.turnNumber || currentTurn; 
        // Recency score is higher for more recent events. +1 to avoid division by zero.
        const recencyScore = 1 / (currentTurn - eventTurn + 1);

        const finalScore = (W_SEMANTIC * semanticScore) + (W_RECENCY * recencyScore);

        return {
            score: finalScore,
            text: metadata.text || ''
        };
    });

    // Sort by the combined final score in descending order
    scores.sort((a, b) => b.score - a.score);

    // Return the text of the top K results
    return scores.slice(0, topK).map(result => result.text);
}