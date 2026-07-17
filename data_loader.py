import json
import os
from pathlib import Path
import re

class DataLoader:
    def __init__(self):
        self.data_dir = Path('data')
        self.subjects = ['physics', 'chemistry', 'biology']
        self.question_types = ['mcqs', 'true_false', 'fill_blanks', 'one_mark', 'two_mark', 'three_mark']
        self.load_all_data()
    
    def load_all_data(self):
        """Load all question data from JSON files"""
        self.all_data = {}
        
        for subject in self.subjects:
            self.all_data[subject] = {}
            subject_dir = self.data_dir / subject
            
            if not subject_dir.exists():
                continue
                
            for q_type in self.question_types:
                type_dir = subject_dir / q_type
                if type_dir.exists():
                    self.all_data[subject][q_type] = {}
                    for json_file in type_dir.glob('*.json'):
                        chapter_name = json_file.stem.replace('_', ' ').title()
                        with open(json_file, 'r', encoding='utf-8') as f:
                            questions = json.load(f)
                            # Process LaTeX in questions
                            for q in questions:
                                q['question'] = self.process_latex(q['question'])
                                if 'options' in q:
                                    q['options'] = [self.process_latex(opt) for opt in q['options']]
                                if 'answer' in q:
                                    if isinstance(q['answer'], str):
                                        q['answer'] = self.process_latex(q['answer'])
                            self.all_data[subject][q_type][chapter_name] = questions
    
    def process_latex(self, text):
        """Process LaTeX expressions in text"""
        if not text:
            return text
        # Replace \( ... \) with $ ... $ for MathJax
        text = re.sub(r'\\\((.*?)\\\)', r'$\1$', text)
        text = re.sub(r'\\\[(.*?)\\\]', r'$$\1$$', text)
        return text
    
    def get_subjects(self):
        """Get all subjects"""
        return self.subjects
    
    def get_chapters(self, subject=None):
        """Get all unique chapters for a subject"""
        if subject and subject in self.all_data:
            chapters = set()
            for q_type in self.all_data[subject].values():
                chapters.update(q_type.keys())
            return sorted(list(chapters))
        return []
    
    def get_question_types(self):
        """Get all question types"""
        return self.question_types
    
    def get_topics(self, subject=None, chapter=None):
        """Get topics for a specific subject and chapter"""
        topics = set()
        if subject and subject in self.all_data and chapter:
            for q_type in self.all_data[subject].values():
                if chapter in q_type:
                    for q in q_type[chapter]:
                        if 'topic' in q:
                            topics.add(q['topic'])
        return sorted(list(topics))
    
    def get_filtered_questions(self, subject=None, chapter=None, question_type=None, marks=None, topic=None):
        """Get questions based on filters"""
        filtered = []
        
        # If no filters, return all questions
        if not any([subject, chapter, question_type, marks, topic]):
            return self.get_all_questions()
        
        # Filter by subject
        subjects_to_check = [subject] if subject else self.subjects
        
        for subj in subjects_to_check:
            if subj not in self.all_data:
                continue
            
            # Filter by question type
            types_to_check = [question_type] if question_type else self.question_types
            
            for q_type in types_to_check:
                if q_type not in self.all_data[subj]:
                    continue
                
                chapters = self.all_data[subj][q_type]
                
                # Filter by chapter
                if chapter:
                    chapters = {chapter: chapters.get(chapter, [])}
                
                for chap, questions in chapters.items():
                    for q in questions:
                        # Filter by marks
                        if marks and str(q.get('marks', '')) != str(marks):
                            continue
                        
                        # Filter by topic
                        if topic and q.get('topic', '') != topic:
                            continue
                        
                        # Add question with metadata
                        q_copy = q.copy()
                        q_copy['type'] = q_type
                        q_copy['subject'] = subj
                        q_copy['chapter'] = chap
                        filtered.append(q_copy)
        
        return filtered
    
    def get_all_questions(self):
        """Get all questions"""
        all_q = []
        for subject in self.subjects:
            if subject not in self.all_data:
                continue
            for q_type in self.question_types:
                if q_type not in self.all_data[subject]:
                    continue
                for chap, questions in self.all_data[subject][q_type].items():
                    for q in questions:
                        q_copy = q.copy()
                        q_copy['type'] = q_type
                        q_copy['subject'] = subject
                        q_copy['chapter'] = chap
                        all_q.append(q_copy)
        return all_q
    
    def get_stats(self):
        """Get statistics"""
        stats = {
            'total_questions': 0,
            'by_subject': {},
            'by_type': {},
            'by_chapter': {},
            'by_marks': {}
        }
        
        for subject in self.subjects:
            if subject not in self.all_data:
                continue
            stats['by_subject'][subject] = 0
            
            for q_type in self.question_types:
                if q_type not in self.all_data[subject]:
                    continue
                if q_type not in stats['by_type']:
                    stats['by_type'][q_type] = 0
                    
                for chap, questions in self.all_data[subject][q_type].items():
                    count = len(questions)
                    stats['total_questions'] += count
                    stats['by_subject'][subject] += count
                    stats['by_type'][q_type] += count
                    
                    chapter_key = f"{subject} - {chap}"
                    if chapter_key not in stats['by_chapter']:
                        stats['by_chapter'][chapter_key] = 0
                    stats['by_chapter'][chapter_key] += count
                    
                    for q in questions:
                        marks = str(q.get('marks', 'N/A'))
                        if marks not in stats['by_marks']:
                            stats['by_marks'][marks] = 0
                        stats['by_marks'][marks] += 1
        
        return stats