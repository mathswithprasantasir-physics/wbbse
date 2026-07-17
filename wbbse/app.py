from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import json
import os
from data_loader import DataLoader
import re

app = Flask(__name__)
CORS(app)
data_loader = DataLoader()

@app.route('/')
def index():
    """Render the main page"""
    return render_template('index.html')

@app.route('/api/subjects')
def get_subjects():
    """Get all available subjects"""
    subjects = data_loader.get_subjects()
    return jsonify(subjects)

@app.route('/api/chapters')
def get_chapters():
    """Get all available chapters for a subject"""
    subject = request.args.get('subject')
    chapters = data_loader.get_chapters(subject)
    return jsonify(chapters)

@app.route('/api/questions')
def get_questions():
    """Get questions based on filters"""
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

@app.route('/api/topics')
def get_topics():
    """Get topics for a subject and chapter"""
    subject = request.args.get('subject')
    chapter = request.args.get('chapter')
    topics = data_loader.get_topics(subject, chapter)
    return jsonify(topics)

@app.route('/api/question_types')
def get_question_types():
    """Get all question types"""
    types = data_loader.get_question_types()
    return jsonify(types)

@app.route('/api/export')
def export_questions():
    """Export questions as JSON"""
    subject = request.args.get('subject')
    chapter = request.args.get('chapter')
    question_type = request.args.get('type')
    
    questions = data_loader.get_filtered_questions(
        subject=subject,
        chapter=chapter,
        question_type=question_type
    )
    return jsonify(questions)

@app.route('/api/stats')
def get_stats():
    """Get statistics about the question bank"""
    stats = data_loader.get_stats()
    return jsonify(stats)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)