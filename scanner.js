// js/scanner.js - Enhanced Leaf Disease Classification

class LeafScanner {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.imageAnalysis = {
            qualityScore: 0,
            features: {},
            preprocessing: {}
        };
    }

    // Enhanced image validation
    isValidImageType(file) {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        return allowedTypes.includes(file.type);
    }

    isValidFileSize(file) {
        return file.size <= 10 * 1024 * 1024; // 10MB
    }

    // Advanced image preprocessing
    async preprocessImage(image) {
        const img = new Image();
        
        return new Promise((resolve) => {
            img.onload = () => {
                // Set canvas size
                this.canvas.width = img.width;
                this.canvas.height = img.height;
                
                // Draw original image
                this.ctx.drawImage(img, 0, 0);
                
                const originalData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
                
                // Apply preprocessing steps
                const processedData = this.applyPreprocessing(originalData);
                this.ctx.putImageData(processedData, 0, 0);
                
                // Extract features
                this.extractImageFeatures(processedData);
                
                resolve(this.canvas.toDataURL('image/jpeg', 0.9));
            };
            img.src = image;
        });
    }

    applyPreprocessing(imageData) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        
        // Create a copy for processing
        const processedData = new ImageData(new Uint8ClampedArray(data), width, height);
        const processed = processedData.data;
        
        // 1. Contrast enhancement
        this.enhanceContrast(processed, width, height);
        
        // 2. Noise reduction (simple median filter)
        this.applyNoiseReduction(processed, width, height);
        
        // 3. Color normalization
        this.normalizeColors(processed, width, height);
        
        // 4. Edge preservation
        this.preserveEdges(processed, width, height);
        
        return processedData;
    }

    enhanceContrast(data, width, height) {
        // Calculate histogram
        const histogram = new Array(256).fill(0);
        for (let i = 0; i < data.length; i += 4) {
            const brightness = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
            histogram[brightness]++;
        }
        
        // Apply histogram equalization
        this.applyHistogramEqualization(data, histogram);
    }

    applyHistogramEqualization(data, histogram) {
        // Calculate cumulative distribution
        const cdf = new Array(256).fill(0);
        cdf[0] = histogram[0];
        for (let i = 1; i < 256; i++) {
            cdf[i] = cdf[i - 1] + histogram[i];
        }
        
        // Normalize CDF
        const cdfMin = cdf.find(val => val > 0);
        const totalPixels = cdf[255];
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            const brightness = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
            const equalized = Math.round(((cdf[brightness] - cdfMin) / (totalPixels - cdfMin)) * 255);
            
            const ratio = equalized / (brightness || 1);
            
            data[i] = Math.min(255, Math.max(0, r * ratio));     // Red
            data[i + 1] = Math.min(255, Math.max(0, g * ratio)); // Green
            data[i + 2] = Math.min(255, Math.max(0, b * ratio)); // Blue
        }
    }

    applyNoiseReduction(data, width, height) {
        const tempData = new Uint8ClampedArray(data);
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                
                // Get 3x3 neighborhood
                const neighbors = [];
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const nIdx = ((y + dy) * width + (x + dx)) * 4;
                        neighbors.push({
                            r: tempData[nIdx],
                            g: tempData[nIdx + 1],
                            b: tempData[nIdx + 2]
                        });
                    }
                }
                
                // Median filter for each channel
                data[idx] = this.median(neighbors.map(n => n.r));     // Red
                data[idx + 1] = this.median(neighbors.map(n => n.g)); // Green
                data[idx + 2] = this.median(neighbors.map(n => n.b)); // Blue
            }
        }
    }

    median(values) {
        values.sort((a, b) => a - b);
        const mid = Math.floor(values.length / 2);
        return values.length % 2 !== 0 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
    }

    normalizeColors(data, width, height) {
        let totalR = 0, totalG = 0, totalB = 0;
        let count = 0;
        
        // Calculate average color
        for (let i = 0; i < data.length; i += 4) {
            totalR += data[i];
            totalG += data[i + 1];
            totalB += data[i + 2];
            count++;
        }
        
        const avgR = totalR / count;
        const avgG = totalG / count;
        const avgB = totalB / count;
        
        const targetAvg = 128;
        
        // Normalize to target average
        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, (data[i] / avgR) * targetAvg);     // Red
            data[i + 1] = Math.min(255, (data[i + 1] / avgG) * targetAvg); // Green
            data[i + 2] = Math.min(255, (data[i + 2] / avgB) * targetAvg); // Blue
        }
    }

    preserveEdges(data, width, height) {
        // Simple edge preservation using Sobel filter
        const tempData = new Uint8ClampedArray(data);
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                
                // Sobel operators for edge detection
                const gx = this.calculateSobelGradient(tempData, x, y, width, 'x');
                const gy = this.calculateSobelGradient(tempData, x, y, width, 'y');
                
                const gradient = Math.sqrt(gx * gx + gy * gy);
                
                // Preserve strong edges
                if (gradient > 50) {
                    // Keep original values for edges
                    data[idx] = tempData[idx];
                    data[idx + 1] = tempData[idx + 1];
                    data[idx + 2] = tempData[idx + 2];
                }
            }
        }
    }

    calculateSobelGradient(data, x, y, width, direction) {
        const kernel = direction === 'x' ? 
            [-1, 0, 1, -2, 0, 2, -1, 0, 1] : 
            [-1, -2, -1, 0, 0, 0, 1, 2, 1];
            
        let sum = 0;
        let k = 0;
        
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const idx = ((y + dy) * width + (x + dx)) * 4;
                const brightness = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
                sum += brightness * kernel[k];
                k++;
            }
        }
        
        return sum;
    }

    // Feature extraction for disease classification
    extractImageFeatures(imageData) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        
        const features = {
            colorStats: this.analyzeColorDistribution(data),
            textureFeatures: this.analyzeTexture(data, width, height),
            shapeFeatures: this.analyzeShapeCharacteristics(data, width, height),
            spotDetection: this.detectSpotsLesions(data, width, height),
            edgeDensity: this.calculateEdgeDensity(data, width, height)
        };
        
        this.imageAnalysis.features = features;
        this.imageAnalysis.qualityScore = this.calculateImageQuality(features);
        
        return features;
    }

    analyzeColorDistribution(data) {
        let totalR = 0, totalG = 0, totalB = 0;
        let healthyGreen = 0, yellowSpots = 0, brownSpots = 0;
        let pixelCount = data.length / 4;
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            totalR += r;
            totalG += g;
            totalB += b;
            
            // Detect healthy green (high G, moderate R, low B)
            if (g > 100 && g > r && g > b && Math.abs(r - g) < 50) {
                healthyGreen++;
            }
            
            // Detect yellow spots (high R and G, low B)
            if (r > 150 && g > 150 && b < 100) {
                yellowSpots++;
            }
            
            // Detect brown spots (high R, moderate G, low B)
            if (r > 100 && g > 50 && g < 150 && b < 50) {
                brownSpots++;
            }
        }
        
        return {
            avgR: totalR / pixelCount,
            avgG: totalG / pixelCount,
            avgB: totalB / pixelCount,
            healthyGreenRatio: healthyGreen / pixelCount,
            yellowSpotRatio: yellowSpots / pixelCount,
            brownSpotRatio: brownSpots / pixelCount,
            colorVariance: this.calculateColorVariance(data)
        };
    }

    calculateColorVariance(data) {
        // Calculate color variance for texture analysis
        let sumR = 0, sumG = 0, sumB = 0;
        let sumSqR = 0, sumSqG = 0, sumSqB = 0;
        const count = data.length / 4;
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            sumR += r;
            sumG += g;
            sumB += b;
            sumSqR += r * r;
            sumSqG += g * g;
            sumSqB += b * b;
        }
        
        return {
            varianceR: (sumSqR / count) - Math.pow(sumR / count, 2),
            varianceG: (sumSqG / count) - Math.pow(sumG / count, 2),
            varianceB: (sumSqB / count) - Math.pow(sumB / count, 2)
        };
    }

    analyzeTexture(data, width, height) {
        // Analyze texture patterns for disease identification
        let smoothAreas = 0;
        let roughAreas = 0;
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                
                // Calculate local variance
                const localVariance = this.calculateLocalVariance(data, x, y, width);
                
                if (localVariance < 100) smoothAreas++;
                else if (localVariance > 500) roughAreas++;
            }
        }
        
        const totalAreas = (width - 2) * (height - 2);
        
        return {
            smoothAreaRatio: smoothAreas / totalAreas,
            roughAreaRatio: roughAreas / totalAreas,
            textureComplexity: roughAreas / (smoothAreas + 1)
        };
    }

    calculateLocalVariance(data, x, y, width) {
        let sum = 0, sumSq = 0;
        let count = 0;
        
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const idx = ((y + dy) * width + (x + dx)) * 4;
                const brightness = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
                sum += brightness;
                sumSq += brightness * brightness;
                count++;
            }
        }
        
        return (sumSq / count) - Math.pow(sum / count, 2);
    }

    analyzeShapeCharacteristics(data, width, height) {
        // Analyze leaf shape and structure
        const edgePixels = this.detectEdgePixels(data, width, height);
        const area = width * height;
        
        return {
            edgeDensity: edgePixels / area,
            aspectRatio: width / height,
            compactness: (4 * Math.PI * area) / Math.pow(this.calculatePerimeter(data, width, height), 2)
        };
    }

    detectEdgePixels(data, width, height) {
        let edgeCount = 0;
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                const gx = this.calculateSobelGradient(data, x, y, width, 'x');
                const gy = this.calculateSobelGradient(data, x, y, width, 'y');
                
                if (Math.sqrt(gx * gx + gy * gy) > 30) {
                    edgeCount++;
                }
            }
        }
        
        return edgeCount;
    }

    calculatePerimeter(data, width, height) {
        // Simplified perimeter calculation
        return this.detectEdgePixels(data, width, height);
    }

    detectSpotsLesions(data, width, height) {
        let spotCount = 0;
        let totalSpotArea = 0;
        
        // Simple spot detection based on color anomalies
        for (let y = 2; y < height - 2; y++) {
            for (let x = 2; x < width - 2; x++) {
                const idx = (y * width + x) * 4;
                
                if (this.isPotentialSpot(data, x, y, width)) {
                    spotCount++;
                    totalSpotArea += this.measureSpotArea(data, x, y, width, height);
                }
            }
        }
        
        return {
            spotCount,
            totalSpotArea,
            spotDensity: spotCount / (width * height)
        };
    }

    isPotentialSpot(data, x, y, width) {
        const idx = (y * width + x) * 4;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2];
        
        // Spot detection logic (yellow/brown areas surrounded by green)
        const isSpotColor = (r > 150 && g < 120) || (r > 120 && g > 120 && b < 80);
        
        if (!isSpotColor) return false;
        
        // Check if surrounded by different colors (indicating a spot)
        let differentNeighbors = 0;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                
                const nIdx = ((y + dy) * width + (x + dx)) * 4;
                const nr = data[nIdx], ng = data[nIdx + 1], nb = data[nIdx + 2];
                
                // Check if neighbor is significantly different
                if (Math.abs(r - nr) > 30 || Math.abs(g - ng) > 30) {
                    differentNeighbors++;
                }
            }
        }
        
        return differentNeighbors >= 5; // Most neighbors are different
    }

    measureSpotArea(data, startX, startY, width, height) {
        // Simple flood fill area measurement
        let area = 0;
        const visited = new Set();
        const queue = [[startX, startY]];
        const targetColor = this.getColorAt(data, startX, startY, width);
        
        while (queue.length > 0) {
            const [x, y] = queue.shift();
            const key = `${x},${y}`;
            
            if (visited.has(key) || x < 0 || x >= width || y < 0 || y >= height) {
                continue;
            }
            
            const currentColor = this.getColorAt(data, x, y, width);
            if (this.colorsSimilar(targetColor, currentColor, 20)) {
                visited.add(key);
                area++;
                
                // Add neighbors
                queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
            }
        }
        
        return area;
    }

    getColorAt(data, x, y, width) {
        const idx = (y * width + x) * 4;
        return {
            r: data[idx],
            g: data[idx + 1],
            b: data[idx + 2]
        };
    }

    colorsSimilar(color1, color2, threshold) {
        return Math.abs(color1.r - color2.r) < threshold &&
               Math.abs(color1.g - color2.g) < threshold &&
               Math.abs(color1.b - color2.b) < threshold;
    }

    calculateEdgeDensity(data, width, height) {
        const edgePixels = this.detectEdgePixels(data, width, height);
        return edgePixels / (width * height);
    }

    calculateImageQuality(features) {
        let score = 100;
        
        // Deduct points for poor quality indicators
        if (features.colorStats.healthyGreenRatio < 0.3) score -= 20;
        if (features.textureFeatures.textureComplexity > 0.5) score -= 15;
        if (features.spotDetection.spotDensity > 0.1) score -= 25;
        if (features.edgeDensity < 0.01) score -= 10;
        
        return Math.max(0, score);
    }

    // Enhanced classification based on extracted features
    classifyLeafDisease(features) {
        const { colorStats, textureFeatures, spotDetection } = features;
        
        // Disease classification logic
        if (colorStats.healthyGreenRatio > 0.7 && spotDetection.spotDensity < 0.01) {
            return { disease: 'Healthy', confidence: 85, isHealthy: true };
        }
        
        // Early Blight detection (concentric rings, yellow spots)
        if (spotDetection.spotDensity > 0.05 && colorStats.yellowSpotRatio > 0.03) {
            const confidence = Math.min(90, 60 + (spotDetection.spotDensity * 500));
            return { disease: 'Early_Blight', confidence, isHealthy: false };
        }
        
        // Late Blight detection (brown lesions, high spot density)
        if (spotDetection.spotDensity > 0.08 && colorStats.brownSpotRatio > 0.05) {
            const confidence = Math.min(85, 55 + (spotDetection.spotDensity * 400));
            return { disease: 'Late_Blight', confidence, isHealthy: false };
        }
        
        // Rust detection (orange-brown spots, moderate density)
        if (spotDetection.spotDensity > 0.03 && colorStats.brownSpotRatio > 0.02) {
            const confidence = Math.min(80, 50 + (spotDetection.spotDensity * 300));
            return { disease: 'Rust', confidence, isHealthy: false };
        }
        
        // Generic disease classification
        if (spotDetection.spotDensity > 0.02) {
            const confidence = Math.min(75, 40 + (spotDetection.spotDensity * 200));
            return { disease: 'Unknown_Disease', confidence, isHealthy: false };
        }
        
        return { disease: 'Healthy', confidence: 70, isHealthy: true };
    }

    // Main scanning function
    async scanLeafDisease(imageFile) {
        try {
            // Validate image
            if (!this.isValidImageType(imageFile)) {
                throw new Error('Invalid image type. Please use JPG, PNG, or WEBP.');
            }
            
            if (!this.isValidFileSize(imageFile)) {
                throw new Error('Image too large. Maximum size is 10MB.');
            }
            
            // Read image
            const imageUrl = await this.readFileAsDataURL(imageFile);
            
            // Preprocess image
            const processedImage = await this.preprocessImage(imageUrl);
            
            // Create temporary image for feature extraction
            const img = new Image();
            await new Promise((resolve) => {
                img.onload = resolve;
                img.src = processedImage;
            });
            
            // Set canvas size and draw processed image
            this.canvas.width = img.width;
            this.canvas.height = img.height;
            this.ctx.drawImage(img, 0, 0);
            
            // Extract features from processed image
            const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            const features = this.extractImageFeatures(imageData);
            
            // Classify disease
            const classification = this.classifyLeafDisease(features);
            
            return {
                prediction: classification,
                features: features,
                imageQuality: this.imageAnalysis.qualityScore,
                preprocessing: this.imageAnalysis.preprocessing,
                timestamp: new Date().toISOString(),
                scan_id: 'scan_' + Date.now()
            };
            
        } catch (error) {
            console.error('Scanning error:', error);
            throw new Error('Leaf scanning failed: ' + error.message);
        }
    }

    readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(file);
        });
    }

    getRecommendations(disease, confidence) {
        const recommendations = {
            Healthy: {
                immediate_actions: [
                    'Continue regular watering schedule',
                    'Maintain current sunlight exposure',
                    'Monitor for any changes weekly'
                ],
                follow_up: 'No immediate action needed. Continue regular plant care.'
            },
            Early_Blight: {
                immediate_actions: [
                    'Remove affected leaves immediately',
                    'Apply copper-based fungicide',
                    'Improve air circulation around plant',
                    'Avoid overhead watering'
                ],
                follow_up: 'Re-inspect after 7 days and reapply treatment if needed.'
            },
            Late_Blight: {
                immediate_actions: [
                    'Remove and destroy all infected plants',
                    'Apply systemic fungicide',
                    'Isolate from other plants',
                    'Improve soil drainage'
                ],
                follow_up: 'Consider soil replacement and consult agricultural expert.'
            },
            Rust: {
                immediate_actions: [
                    'Apply sulfur-based fungicide',
                    'Remove severely infected leaves',
                    'Ensure proper plant spacing',
                    'Water at base only'
                ],
                follow_up: 'Monitor new growth for signs of recurrence.'
            },
            Unknown_Disease: {
                immediate_actions: [
                    'Isolate plant if possible',
                    'Take multiple clear photos',
                    'Consult local nursery expert',
                    'Monitor progression daily'
                ],
                follow_up: 'Seek professional diagnosis for accurate treatment.'
            }
        };
        
        return recommendations[disease] || recommendations.Unknown_Disease;
    }
}

// Global scanner instance
window.leafScanner = new LeafScanner();

// Enhanced drag and drop handlers
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('uploadArea').classList.add('active');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('uploadArea').classList.remove('active');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('uploadArea').classList.remove('active');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFileSelect(files);
    }
}

async function handleFileSelect(files) {
    if (files.length === 0) return;
    
    const file = files[0];
    
    try {
        // Show preview
        showFilePreview(file);
        
        // Scan for diseases
        const result = await window.leafScanner.scanLeafDisease(file);
        
        // Display results
        displayScanResult(result);
        
    } catch (error) {
        console.error('Scan failed:', error);
        document.getElementById('scanningStatus').innerHTML = 
            `<span style="color: #f44336;">❌ ${error.message}</span>`;
        resetUploadArea();
    }
}

function showFilePreview(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const uploadArea = document.getElementById('uploadArea');
        uploadArea.innerHTML = `
            <div style="text-align: center;">
                <img src="${e.target.result}" style="max-width: 200px; max-height: 200px; border-radius: 8px;">
                <p style="margin-top: 10px; color: #4caf50;">
                    <i class="fas fa-spinner fa-spin"></i> Processing image...
                </p>
            </div>
        `;
    };
    reader.readAsDataURL(file);
}

function displayScanResult(result) {
    const resultDiv = document.getElementById('scanResult');
    const recommendations = window.leafScanner.getRecommendations(
        result.prediction.disease, 
        result.prediction.confidence
    );
    
    let html = `
        <div class="scan-result ${result.prediction.isHealthy ? 'healthy' : 'diseased'}">
            <h3>Scan Complete ✅</h3>
            <div class="prediction-main">
                <div class="disease-name">${result.prediction.disease.replace('_', ' ')}</div>
                <div class="confidence">Confidence: ${result.prediction.confidence.toFixed(1)}%</div>
                <div class="health-status">${result.prediction.isHealthy ? '🌱 Plant is Healthy' : '⚠ Needs Attention'}</div>
                <div class="quality-score">Image Quality: ${result.imageQuality.toFixed(0)}%</div>
            </div>
            
            <div class="recommendations">
                <h4>Recommended Actions:</h4>
                <ul>
                    ${recommendations.immediate_actions.map(action => 
                        `<li>${action}</li>`).join('')}
                </ul>
                <p><strong>Follow-up:</strong> ${recommendations.follow_up}</p>
            </div>
            
            <div class="scan-meta">
                <small>Scan ID: ${result.scan_id} | ${new Date(result.timestamp).toLocaleString()}</small>
            </div>
            
            <button onclick="resetScanner()" class="btn btn-primary" style="margin-top: 15px;">
                <i class="fas fa-redo"></i> Scan Another Leaf
            </button>
        </div>
    `;
    
    resultDiv.innerHTML = html;
    resultDiv.style.display = 'block';
    
    // Hide scanning status
    document.getElementById('scanningStatus').style.display = 'none';
}

function resetUploadArea() {
    document.getElementById('uploadArea').innerHTML = `
        <div class="upload-icon">
            <i class="fas fa-cloud-upload-alt"></i>
        </div>
        <div class="upload-text">
            <h3>Drag & Drop Leaf Image</h3>
            <p>Supports: JPG, PNG, WEBP (Max 10MB)</p>
        </div>
        <div class="browse-btn">Browse Files</div>
    `;
}

function resetScanner() {
    resetUploadArea();
    document.getElementById('scanResult').style.display = 'none';
    document.getElementById('scanningStatus').style.display = 'none';
    document.getElementById('fileInput').value = '';
}

// Initialize event listeners
document.addEventListener('DOMContentLoaded', function() {
    const uploadArea = document.getElementById('uploadArea');
    if (uploadArea) {
        uploadArea.addEventListener('dragover', handleDragOver);
        uploadArea.addEventListener('dragleave', handleDragLeave);
        uploadArea.addEventListener('drop', handleDrop);
        uploadArea.addEventListener('click', () => document.getElementById('fileInput').click());
    }
});