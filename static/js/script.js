// Global state
let currentPage = 1;
const questionsPerPage = 10;
let allQuestions = [];
let showingAnswers = false;

// Initialize when page loads
$(document).ready(function() {
    loadSubjects();
    loadStats();
    loadQuestionTypes();
    
    // Event listeners
    $('#applyFilters').click(applyFilters);
    $('#resetFilters').click(resetFilters);
    $('#showAnswersBtn').click(toggleAnswers);
    $('#exportBtn').click(exportQuestions);
    $('#subjectFilter').change(loadChapters);
    $('#chapterFilter').change(loadTopics);
});

function loadSubjects() {
    // Subjects are already in HTML, but we need to handle the change event
    $('#subjectFilter').trigger('change');
}

function loadChapters() {
    const subject = $('#subjectFilter').val();
    const select = $('#chapterFilter');
    select.html('<option value="">All Chapters</option>');
    
    if (!subject) {
        $('#topicFilter').html('<option value="">All Topics</option>');
        return;
    }
    
    $.ajax({
        url: '/api/chapters',
        method: 'GET',
        data: { subject: subject },
        success: function(data) {
            data.forEach(chapter => {
                select.append(`<option value="${chapter}">${chapter}</option>`);
            });
        },
        error: function() {
            showError('Failed to load chapters');
        }
    });
}

function loadQuestionTypes() {
    $.ajax({
        url: '/api/question_types',
        method: 'GET',
        success: function(data) {
            const select = $('#typeFilter');
            data.forEach(type => {
                const label = type.replace('_', ' ').toUpperCase();
                select.append(`<option value="${type}">${label}</option>`);
            });
        },
        error: function() {
            showError('Failed to load question types');
        }
    });
}

function loadTopics() {
    const subject = $('#subjectFilter').val();
    const chapter = $('#chapterFilter').val();
    const select = $('#topicFilter');
    select.html('<option value="">All Topics</option>');
    
    if (!subject || !chapter) return;
    
    $.ajax({
        url: '/api/topics',
        method: 'GET',
        data: { subject: subject, chapter: chapter },
        success: function(data) {
            data.forEach(topic => {
                select.append(`<option value="${topic}">${topic}</option>`);
            });
        },
        error: function() {
            showError('Failed to load topics');
        }
    });
}

function applyFilters() {
    const filters = {
        subject: $('#subjectFilter').val(),
        chapter: $('#chapterFilter').val(),
        type: $('#typeFilter').val(),
        marks: $('#marksFilter').val(),
        topic: $('#topicFilter').val()
    };
    
    // Remove empty filters
    Object.keys(filters).forEach(key => {
        if (!filters[key]) delete filters[key];
    });
    
    $.ajax({
        url: '/api/questions',
        method: 'GET',
        data: filters,
        success: function(data) {
            allQuestions = data;
            currentPage = 1;
            renderQuestions();
            updatePagination();
            updateQuestionCount();
            
            // Hide answers when new questions load
            showingAnswers = false;
            $('#showAnswersBtn').html('<i class="bi bi-eye"></i> Show Answers');
        },
        error: function() {
            showError('Failed to load questions');
        }
    });
}

function resetFilters() {
    $('#subjectFilter').val('');
    $('#chapterFilter').html('<option value="">All Chapters</option>');
    $('#typeFilter').val('');
    $('#marksFilter').val('');
    $('#topicFilter').html('<option value="">All Topics</option>');
    applyFilters();
}

function renderQuestions() {
    const container = $('#questionsContainer');
    
    if (allQuestions.length === 0) {
        container.html(`
            <div class="text-center text-muted py-5">
                <i class="bi bi-inbox display-1"></i>
                <p>No questions found matching the filters</p>
            </div>
        `);
        return;
    }
    
    const start = (currentPage - 1) * questionsPerPage;
    const end = start + questionsPerPage;
    const pageQuestions = allQuestions.slice(start, end);
    
    let html = '';
    pageQuestions.forEach((q, index) => {
        const typeLabel = q.type.replace('_', ' ').toUpperCase();
        const marksLabel = q.marks ? `${q.marks} Mark${q.marks > 1 ? 's' : ''}` : 'N/A';
        const subjectLabel = q.subject.charAt(0).toUpperCase() + q.subject.slice(1);
        
        html += `
            <div class="question-card position-relative">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <div>
                        <span class="badge bg-danger">${subjectLabel}</span>
                        <span class="badge bg-primary">${q.chapter}</span>
                        <span class="badge bg-info">${typeLabel}</span>
                        <span class="badge bg-success">${marksLabel}</span>
                        ${q.topic ? `<span class="badge bg-secondary">${q.topic}</span>` : ''}
                    </div>
                    <span class="badge bg-warning text-dark">Q${start + index + 1}</span>
                </div>
                
                <div class="question-text">${q.question}</div>
        `;
        
        // Render options for MCQs
        if (q.type === 'mcqs' && q.options) {
            html += `<div class="options">`;
            const letters = ['A', 'B', 'C', 'D'];
            q.options.forEach((opt, i) => {
                html += `
                    <div class="option">
                        <strong>${letters[i]}.</strong> ${opt}
                    </div>
                `;
            });
            html += `</div>`;
        }
        
        // Answer section
        html += `
                <div class="answer ${showingAnswers ? 'show' : ''}">
                    <strong><i class="bi bi-check-circle-fill text-success"></i> Answer:</strong>
                    ${q.type === 'true_false' ? (q.answer ? 'True' : 'False') : q.answer}
                </div>
            </div>
        `;
    });
    
    container.html(html);
    
    // Re-render math if MathJax is available
    if (window.MathJax) {
        MathJax.typesetPromise();
    }
}

function updatePagination() {
    const totalPages = Math.ceil(allQuestions.length / questionsPerPage);
    const pagination = $('#pagination');
    
    if (totalPages <= 1) {
        pagination.html('');
        return;
    }
    
    let html = '';
    
    // Previous button
    html += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage - 1}">&laquo;</a>
        </li>
    `;
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        html += `
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" data-page="${i}">${i}</a>
            </li>
        `;
    }
    
    // Next button
    html += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage + 1}">&raquo;</a>
        </li>
    `;
    
    pagination.html(html);
    
    // Click handlers
    pagination.find('.page-link').click(function(e) {
        e.preventDefault();
        const page = parseInt($(this).data('page'));
        if (page >= 1 && page <= totalPages) {
            currentPage = page;
            renderQuestions();
            updatePagination();
            // Scroll to top of questions
            $('#questionsContainer')[0].scrollIntoView({ behavior: 'smooth' });
        }
    });
}

function updateQuestionCount() {
    $('#questionCount').text(`${allQuestions.length} questions`);
}

function toggleAnswers() {
    showingAnswers = !showingAnswers;
    $('.answer').toggleClass('show');
    $('#showAnswersBtn').html(showingAnswers ? 
        '<i class="bi bi-eye-slash"></i> Hide Answers' : 
        '<i class="bi bi-eye"></i> Show Answers'
    );
}

function exportQuestions() {
    const filters = {
        subject: $('#subjectFilter').val(),
        chapter: $('#chapterFilter').val(),
        type: $('#typeFilter').val()
    };
    
    // Remove empty filters
    Object.keys(filters).forEach(key => {
        if (!filters[key]) delete filters[key];
    });
    
    $.ajax({
        url: '/api/export',
        method: 'GET',
        data: filters,
        success: function(data) {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `questions_${new Date().toISOString().slice(0,10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        },
        error: function() {
            showError('Failed to export questions');
        }
    });
}

function loadStats() {
    $.ajax({
        url: '/api/stats',
        method: 'GET',
        success: function(data) {
            const container = $('#statsContainer');
            let html = `
                <div class="stats-item">
                    <span>Total Questions</span>
                    <span class="stat-value">${data.total_questions}</span>
                </div>
            `;
            
            // Add by subject
            if (data.by_subject) {
                Object.keys(data.by_subject).forEach(subject => {
                    const label = subject.charAt(0).toUpperCase() + subject.slice(1);
                    html += `
                        <div class="stats-item">
                            <span>${label}</span>
                            <span class="stat-value">${data.by_subject[subject]}</span>
                        </div>
                    `;
                });
            }
            
            // Add by type
            if (data.by_type) {
                Object.keys(data.by_type).forEach(type => {
                    const label = type.replace('_', ' ').toUpperCase();
                    html += `
                        <div class="stats-item">
                            <span>${label}</span>
                            <span class="stat-value">${data.by_type[type]}</span>
                        </div>
                    `;
                });
            }
            
            container.html(html);
        },
        error: function() {
            $('#statsContainer').html('<p class="text-danger">Failed to load statistics</p>');
        }
    });
}

function showError(message) {
    // You can implement a better error notification
    alert(message);
}