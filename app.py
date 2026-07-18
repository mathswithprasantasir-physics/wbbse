from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import os
from data_loader import DataLoader

app = Flask(__name__)
CORS(app)

# Initialize data loader
data_loader = DataLoader()

@app.route('/')
def index():
    """Render the main page"""
    return render_template('index.html')

@app.route('/api/subjects')
def get_subjects():
    """Get all available subjects"""
    try:
        subjects = data_loader.get_subjects()
        return jsonify(subjects)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/chapters')
def get_chapters():
    """Get all available chapters for a subject"""
    try:
        subject = request.args.get('subject')
        chapters = data_loader.get_chapters(subject)
        return jsonify(chapters)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/questions')
def get_questions():
    """Get questions based on filters"""
    try:
        subject = request.args.get('subject')
        chapter = request.args.get('chapter')
        question_type = request.args.get('type')
        marks = request.args.get('marks')
        topic = request.args.get('topic')
        
        questions = data_loader.get_filtered_questions(
            subject=subject,
            chapter=chapter,
            question_type=question_type,
            marks=marks,
            topic=topic
        )
        return jsonify(questions)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/topics')
def get_topics():
    """Get topics for a subject and chapter"""
    try:
        subject = request.args.get('subject')
        chapter = request.args.get('chapter')
        topics = data_loader.get_topics(subject, chapter)
        return jsonify(topics)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/question_types')
def get_question_types():
    """Get all question types"""
    try:
        types = data_loader.get_question_types()
        return jsonify(types)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/export')
def export_questions():
    """Export questions as JSON"""
    try:
        subject = request.args.get('subject')
        chapter = request.args.get('chapter')
        question_type = request.args.get('type')
        
        questions = data_loader.get_filtered_questions(
            subject=subject,
            chapter=chapter,
            question_type=question_type
        )
        return jsonify(questions)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/stats')
def get_stats():
    """Get statistics about the question bank"""
    try:
        stats = data_loader.get_stats()
        return jsonify(stats)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Error handlers
@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({'error': 'Resource not found'}), 404

@app.errorhandler(500)
def server_error(error):
    """Handle 500 errors"""
    return jsonify({'error': 'Internal server error'}), 500

@app.errorhandler(400)
def bad_request(error):
    """Handle 400 errors"""
    return jsonify({'error': 'Bad request'}), 400

if __name__ == '__main__':
    # Get port from environment variable (for Render/Heroku) or use default 5000
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    
    # For production, use debug=False
    app.run(debug=debug, host='0.0.0.0', port=port)
