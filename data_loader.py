import json
import os
from pathlib import Path
import re

class DataLoader:
    def __init__(self):
        self.data_dir = Path('data')
        self.subjects = ['physics', 'chemistry', 'biology']
        self.question_types = ['mcqs', 'true_false', 'fill_blanks', 'match_column', 'vsaq', 'saq', 'laq']
        self.all_data = {}
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
                        
                        if chapter_name not in self.all_data[subject][q_type]:
                            try:
                                with open(json_file, 'r', encoding='utf-8') as f:
                                    questions = json.load(f)
                                    for q in questions:
                                        q['question'] = self.process_latex(q['question'])
                                        if 'options' in q:
                                            q['options'] = [self.process_latex(opt) for opt in q['options']]
                                        if 'answer' in q:
                                            if isinstance(q['answer'], str):
                                                q['answer'] = self.process_latex(q['answer'])
                                        # For match_column
                                        if 'left_column' in q:
                                            q['left_column'] = [self.process_latex(item) for item in q['left_column']]
                                        if 'right_column' in q:
                                            q['right_column'] = [self.process_latex(item) for item in q['right_column']]
                                        if 'correct_matches' in q:
                                            q['correct_matches'] = {self.process_latex(k): self.process_latex(v) for k, v in q['correct_matches'].items()}
                                    self.all_data[subject][q_type][chapter_name] = questions
                            except json.JSONDecodeError as e:
                                print(f"Error loading {json_file}: {e}")
    
    def process_latex(self, text):
        if not text:
            return text
        text = re.sub(r'\\\((.*?)\\\)', r'$\1$', text)
        text = re.sub(r'\\\[(.*?)\\\]', r'$$\1$$', text)
        return text
    
    def get_subjects(self):
        return self.subjects
    
    def get_chapters(self, subject=None):
        if subject and subject in self.all_data:
            chapters = set()
            for q_type in self.all_data[subject].values():
                chapters.update(q_type.keys())
            return sorted(list(chapters))
        return []
    
    def get_question_types(self):
        """Get all question types"""
        unique_types = set()
        for subject in self.all_data:
            for q_type in self.all_data[subject].keys():
                if self.all_data[subject][q_type]:
                    unique_types.add(q_type)
        return sorted(list(unique_types))
    
    def get_topics(self, subject=None, chapter=None):
        topics = set()
        if subject and subject in self.all_data and chapter:
            for q_type in self.all_data[subject].values():
                if chapter in q_type:
                    for q in q_type[chapter]:
                        if 'topic' in q:
                            topics.add(q['topic'])
        return sorted(list(topics))
    
    def get_filtered_questions(self, subject=None, chapter=None, question_type=None, marks=None, topic=None):
        filtered = []
        
        if not any([subject, chapter, question_type, marks, topic]):
            return self.get_all_questions()
        
        subjects_to_check = [subject] if subject else self.subjects
        
        for subj in subjects_to_check:
            if subj not in self.all_data:
                continue
            
            types_to_check = [question_type] if question_type else self.question_types
            
            for q_type in types_to_check:
                if q_type not in self.all_data[subj]:
                    continue
                
                chapters = self.all_data[subj][q_type]
                
                if chapter:
                    chapters = {chapter: chapters.get(chapter, [])}
                
                for chap, questions in chapters.items():
                    for q in questions:
                        if marks and str(q.get('marks', '')) != str(marks):
                            continue
                        
                        if topic and q.get('topic', '') != topic:
                            continue
                        
                        q_copy = q.copy()
                        q_copy['type'] = q_type
                        q_copy['subject'] = subj
                        q_copy['chapter'] = chap
                        filtered.append(q_copy)
        
        return filtered
    
    def get_all_questions(self):
        all_q = []
        seen_questions = set()
        
        for subject in self.subjects:
            if subject not in self.all_data:
                continue
            for q_type in self.question_types:
                if q_type not in self.all_data[subject]:
                    continue
                for chap, questions in self.all_data[subject][q_type].items():
                    for q in questions:
                        q_key = f"{q['question']}_{q_type}_{chap}"
                        if q_key not in seen_questions:
                            seen_questions.add(q_key)
                            q_copy = q.copy()
                            q_copy['type'] = q_type
                            q_copy['subject'] = subject
                            q_copy['chapter'] = chap
                            all_q.append(q_copy)
        
        return all_q
    
    def get_stats(self):
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
