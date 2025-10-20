// Chart.js utilities for probability visualization in PlantGuard AI
class ProbabilityChart {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.data = [];
        this.chartType = 'bar'; // 'bar' or 'radar'
        this.init();
    }

    init() {
        if (!this.container) {
            console.error('Chart container not found:', this.containerId);
            return;
        }
        this.renderEmptyState();
    }

    updateData(newData, options = {}) {
        if (!newData || newData.length === 0) {
            this.renderEmptyState();
            return;
        }

        this.data = this.processData(newData);
        
        if (options.chartType) {
            this.chartType = options.chartType;
        }

        this.renderChart();
    }

    processData(rawData) {
        // Sort by probability and take top 8 for better visualization
        return rawData
            .sort((a, b) => b.probability - a.probability)
            .slice(0, 8)
            .map(item => ({
                ...item,
                formattedName: this.formatDiseaseName(item.className),
                isHealthy: item.className.includes('Healthy'),
                color: this.getColorForDisease(item.className, item.probability)
            }));
    }

    formatDiseaseName(className) {
        return className
            .replace(/_/g, ' ')
            .replace(/([A-Z])/g, ' $1')
            .replace(/\b\w/g, l => l.toUpperCase())
            .trim();
    }

    getColorForDisease(className, probability) {
        if (className.includes('Healthy')) {
            return {
                background: 'rgba(16, 185, 129, 0.8)',
                border: 'rgba(16, 185, 129, 1)',
                hover: 'rgba(16, 185, 129, 1)'
            };
        } else {
            // Gradient from yellow to red based on probability
            const intensity = probability / 100;
            if (intensity > 0.7) {
                return {
                    background: 'rgba(239, 68, 68, 0.8)',
                    border: 'rgba(239, 68, 68, 1)',
                    hover: 'rgba(239, 68, 68, 1)'
                };
            } else {
                return {
                    background: 'rgba(245, 158, 11, 0.8)',
                    border: 'rgba(245, 158, 11, 1)',
                    hover: 'rgba(245, 158, 11, 1)'
                };
            }
        }
    }

    renderChart() {
        // Clear container
        this.container.innerHTML = '';
        
        if (this.chartType === 'radar') {
            this.renderRadarChart();
        } else {
            this.renderBarChart();
        }

        // Add chart controls
        this.addChartControls();
    }

    renderBarChart() {
        const chartContainer = document.createElement('div');
        chartContainer.className = 'chart-container bar-chart';
        chartContainer.style.cssText = `
            width: 100%;
            height: 400px;
            position: relative;
        `;

        // Create canvas for custom drawing
        const canvas = document.createElement('canvas');
        canvas.width = this.container.offsetWidth;
        canvas.height = 400;
        canvas.style.cssText = `
            width: 100%;
            height: 100%;
        `;

        chartContainer.appendChild(canvas);
        this.container.appendChild(chartContainer);

        this.drawBarChart(canvas);
    }

    drawBarChart(canvas) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const padding = 60;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Draw grid lines
        this.drawGrid(ctx, width, height, padding);

        // Calculate bar dimensions
        const barWidth = chartWidth / this.data.length * 0.6;
        const maxProbability = Math.max(...this.data.map(d => d.probability));

        // Draw bars
        this.data.forEach((item, index) => {
            const barHeight = (item.probability / maxProbability) * chartHeight * 0.8;
            const x = padding + (index * chartWidth / this.data.length) + (chartWidth / this.data.length - barWidth) / 2;
            const y = height - padding - barHeight;

            // Draw bar
            ctx.fillStyle = item.color.background;
            ctx.strokeStyle = item.color.border;
            ctx.lineWidth = 2;

            // Rounded rectangle
            this.drawRoundedRect(ctx, x, y, barWidth, barHeight, 4);
            ctx.fill();
            ctx.stroke();

            // Add value label
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(
                `${item.probability.toFixed(1)}%`,
                x + barWidth / 2,
                y - 5
            );

            // Add disease name
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.font = '10px Inter, sans-serif';
            ctx.save();
            ctx.translate(x + barWidth / 2, height - padding + 20);
            ctx.rotate(-Math.PI / 4);
            ctx.fillText(
                this.abbreviateName(item.formattedName),
                0,
                0
            );
            ctx.restore();
        });

        // Add Y-axis labels
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'right';
        for (let i = 0; i <= 5; i++) {
            const value = (maxProbability / 5) * i;
            const y = height - padding - (value / maxProbability) * chartHeight * 0.8;
            ctx.fillText(
                `${value.toFixed(0)}%`,
                padding - 10,
                y + 4
            );
        }
    }

    renderRadarChart() {
        const chartContainer = document.createElement('div');
        chartContainer.className = 'chart-container radar-chart';
        chartContainer.style.cssText = `
            width: 100%;
            height: 400px;
            position: relative;
        `;

        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 400;
        canvas.style.cssText = `
            width: 100%;
            height: 100%;
            max-width: 400px;
            margin: 0 auto;
        `;

        chartContainer.appendChild(canvas);
        this.container.appendChild(chartContainer);

        this.drawRadarChart(canvas);
    }

    drawRadarChart(canvas) {
        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 40;
        const angleStep = (2 * Math.PI) / this.data.length;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw concentric circles
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        for (let i = 1; i <= 4; i++) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius * (i / 4), 0, 2 * Math.PI);
            ctx.stroke();
        }

        // Draw axes and labels
        this.data.forEach((item, index) => {
            const angle = index * angleStep - Math.PI / 2;
            const x = centerX + Math.cos(angle) * (radius + 20);
            const y = centerY + Math.sin(angle) * (radius + 20);

            // Draw axis line
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius);
            ctx.stroke();

            // Draw label
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.font = '10px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.abbreviateName(item.formattedName), x, y);
        });

        // Draw data polygon
        ctx.fillStyle = 'rgba(16, 185, 129, 0.3)';
        ctx.strokeStyle = 'rgba(16, 185, 129, 1)';
        ctx.lineWidth = 2;
        ctx.beginPath();

        this.data.forEach((item, index) => {
            const angle = index * angleStep - Math.PI / 2;
            const distance = (item.probability / 100) * radius;
            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance;

            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw data points
        this.data.forEach((item, index) => {
            const angle = index * angleStep - Math.PI / 2;
            const distance = (item.probability / 100) * radius;
            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance;

            ctx.fillStyle = item.isHealthy ? '#10b981' : '#ef4444';
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();

            // Value label
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 10px Inter, sans-serif';
            ctx.fillText(`${item.probability.toFixed(0)}%`, x, y - 10);
        });
    }

    drawGrid(ctx, width, height, padding) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;

        // Horizontal grid lines
        for (let i = 0; i <= 5; i++) {
            const y = padding + (height - padding * 2) * (i / 5);
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
            ctx.stroke();
        }

        // Vertical grid lines (optional)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        for (let i = 0; i <= this.data.length; i++) {
            const x = padding + (width - padding * 2) * (i / this.data.length);
            ctx.beginPath();
            ctx.moveTo(x, padding);
            ctx.lineTo(x, height - padding);
            ctx.stroke();
        }
    }

    drawRoundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    abbreviateName(name) {
        if (name.length <= 15) return name;
        
        const words = name.split(' ');
        if (words.length > 1) {
            return words.map(word => word[0]).join('') + '.';
        }
        
        return name.substring(0, 12) + '...';
    }

    addChartControls() {
        const controls = document.createElement('div');
        controls.className = 'chart-controls';
        controls.style.cssText = `
            display: flex;
            justify-content: center;
            gap: 1rem;
            margin-top: 1rem;
            padding: 1rem;
        `;

        const barButton = this.createControlButton('Bar Chart', 'bar');
        const radarButton = this.createControlButton('Radar Chart', 'radar');

        controls.appendChild(barButton);
        controls.appendChild(radarButton);
        this.container.appendChild(controls);
    }

    createControlButton(text, type) {
        const button = document.createElement('button');
        button.textContent = text;
        button.className = `chart-control-btn ${this.chartType === type ? 'active' : ''}`;
        button.style.cssText = `
            padding: 0.5rem 1rem;
            border: 1px solid rgba(255, 255, 255, 0.3);
            background: ${this.chartType === type ? 'rgba(16, 185, 129, 0.3)' : 'transparent'};
            color: white;
            border-radius: var(--radius-md);
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 0.875rem;
        `;

        button.addEventListener('click', () => {
            this.chartType = type;
            this.renderChart();
        });

        button.addEventListener('mouseenter', () => {
            if (this.chartType !== type) {
                button.style.background = 'rgba(255, 255, 255, 0.1)';
            }
        });

        button.addEventListener('mouseleave', () => {
            if (this.chartType !== type) {
                button.style.background = 'transparent';
            }
        });

        return button;
    }

    renderEmptyState() {
        this.container.innerHTML = `
            <div class="empty-state">
                <div class="empty-chart-icon">
                    <i class="fas fa-chart-bar"></i>
                </div>
                <h4>Waiting for Analysis</h4>
                <p>Probabilities will appear here after image analysis</p>
                <div class="chart-placeholder">
                    <div class="placeholder-bar" style="animation-delay: 0s"></div>
                    <div class="placeholder-bar" style="animation-delay: 0.1s"></div>
                    <div class="placeholder-bar" style="animation-delay: 0.2s"></div>
                    <div class="placeholder-bar" style="animation-delay: 0.3s"></div>
                    <div class="placeholder-bar" style="animation-delay: 0.4s"></div>
                </div>
            </div>
        `;
    }

    clear() {
        this.data = [];
        this.renderEmptyState();
    }

    // Utility method to export chart as image
    exportAsImage(filename = 'plantguard-analysis.png') {
        const canvas = this.container.querySelector('canvas');
        if (!canvas) return;

        const link = document.createElement('a');
        link.download = filename;
        link.href = canvas.toDataURL();
        link.click();
    }

    // Method to update chart with smooth animation
    animateUpdate(newData) {
        const oldData = [...this.data];
        this.updateData(newData);

        // Add animation class to container
        this.container.classList.add('chart-updating');
        setTimeout(() => {
            this.container.classList.remove('chart-updating');
        }, 1000);
    }
}

// Additional chart utilities
class ChartUtils {
    static createSparkline(data, width = 100, height = 30) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        const max = Math.max(...data);
        const min = Math.min(...data);
        
        // Draw sparkline
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        data.forEach((value, index) => {
            const x = (index / (data.length - 1)) * width;
            const y = height - ((value - min) / (max - min)) * height;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        return canvas;
    }

    static createProgressRing(percentage, size = 60) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        
        const ctx = canvas.getContext('2d');
        const center = size / 2;
        const radius = size / 2 - 5;
        
        // Background circle
        ctx.beginPath();
        ctx.arc(center, center, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 4;
        ctx.stroke();
        
        // Progress arc
        const startAngle = -Math.PI / 2;
        const endAngle = startAngle + (percentage / 100) * 2 * Math.PI;
        
        ctx.beginPath();
        ctx.arc(center, center, radius, startAngle, endAngle);
        ctx.strokeStyle = percentage > 70 ? '#10b981' : percentage > 40 ? '#f59e0b' : '#ef4444';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.stroke();
        
        // Percentage text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${percentage}%`, center, center);
        
        return canvas;
    }
}

// Initialize global chart instance
let probabilityChart = null;

// Initialize chart when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    probabilityChart = new ProbabilityChart('probabilitiesChart');
});

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ProbabilityChart, ChartUtils };
}