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
            // Clear existing options except first
            select.find('option:not(:first)').remove();
            
            // Add unique types
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
    const end = Math.min(start + questionsPerPage, allQuestions.length);
    const pageQuestions = allQuestions.slice(start, end);
    
    let html = '';
    
    pageQuestions.forEach((q, idx) => {
        const globalIndex = start + idx;
        const typeLabel = q.type ? q.type.replace('_', ' ').toUpperCase() : 'UNKNOWN';
        const marksLabel = q.marks ? `${q.marks} Mark${q.marks > 1 ? 's' : ''}` : 'N/A';
        const subjectLabel = q.subject ? q.subject.charAt(0).toUpperCase() + q.subject.slice(1) : 'Unknown';
        
        // Build question HTML
        html += `<div class="question-card" data-index="${globalIndex}">`;
        
        // Header with badges
        html += `
            <div class="d-flex justify-content-between align-items-start mb-2 flex-wrap">
                <div>
                    <span class="badge bg-danger">${subjectLabel}</span>
                    <span class="badge bg-primary">${q.chapter || 'Unknown'}</span>
                    <span class="badge bg-info">${typeLabel}</span>
                    <span class="badge bg-success">${marksLabel}</span>
                    ${q.topic ? `<span class="badge bg-secondary">${q.topic}</span>` : ''}
                </div>
                <span class="badge bg-warning text-dark">Q${globalIndex + 1}</span>
            </div>
        `;
        
        // Question text
        html += `<div class="question-text">${q.question}</div>`;
        
        // Render based on question type
        if (q.type === 'mcqs') {
            html += renderMCQ(q, globalIndex);
        } else if (q.type === 'true_false') {
            html += renderTrueFalse(q, globalIndex);
        } else if (q.type === 'fill_blanks') {
            html += renderFillBlanks(q, globalIndex);
        } else {
            html += renderMarkQuestion(q, globalIndex);
        }
        
        html += `</div>`;
    });
    
    container.html(html);
    
    // Re-render math if MathJax is available
    if (window.MathJax) {
        MathJax.typesetPromise();
    }
}

function renderMCQ(q, index) {
    const letters = ['A', 'B', 'C', 'D'];
    let html = `<div class="options mt-3">`;
    
    q.options.forEach((opt, i) => {
        const letter = letters[i];
        html += `
            <div class="option-item mb-2">
                <button class="btn btn-outline-primary option-btn w-100 text-start" 
                        onclick="checkMCQ(${index}, '${letter}')"
                        data-question="${index}" data-option="${letter}">
                    <strong>${letter}.</strong> ${opt}
                </button>
            </div>
        `;
    });
    
    html += `
        <div id="feedback-${index}" class="mt-2" style="display: none;"></div>
        <div id="answer-${index}" class="answer">
            <strong><i class="bi bi-check-circle-fill text-success"></i> Correct Answer:</strong> ${q.answer}
        </div>
    `;
    
    return html + `</div>`;
}

function renderTrueFalse(q, index) {
    return `
        <div class="true-false-options mt-3">
            <div class="btn-group w-100" role="group">
                <button class="btn btn-outline-success tf-btn" onclick="checkTrueFalse(${index}, true)">
                    <i class="bi bi-check-circle"></i> True
                </button>
                <button class="btn btn-outline-danger tf-btn" onclick="checkTrueFalse(${index}, false)">
                    <i class="bi bi-x-circle"></i> False
                </button>
            </div>
            <div id="feedback-${index}" class="mt-2" style="display: none;"></div>
            <div id="answer-${index}" class="answer">
                <strong><i class="bi bi-check-circle-fill text-success"></i> Correct Answer:</strong> ${q.answer ? 'True' : 'False'}
            </div>
        </div>
    `;
}

function renderFillBlanks(q, index) {
    return `
        <div class="fill-blanks-section mt-3">
            <div class="input-group">
                <input type="text" class="form-control fb-input" id="fb-input-${index}" 
                       placeholder="Type your answer here..." 
                       onkeypress="if(event.key==='Enter') checkFillBlanks(${index})">
                <button class="btn btn-primary" onclick="checkFillBlanks(${index})">
                    <i class="bi bi-check"></i> Check
                </button>
            </div>
            <div id="feedback-${index}" class="mt-2" style="display: none;"></div>
            <div id="answer-${index}" class="answer">
                <strong><i class="bi bi-check-circle-fill text-success"></i> Correct Answer:</strong> ${q.answer}
            </div>
        </div>
    `;
}

function renderMarkQuestion(q, index) {
    return `
        <div class="mark-question-section mt-3">
            <button class="btn btn-info" onclick="showMarkAnswer(${index})">
                <i class="bi bi-eye"></i> Show Answer
            </button>
            <div id="answer-${index}" class="answer">
                <strong><i class="bi bi-check-circle-fill text-success"></i> Answer:</strong> ${q.answer}
            </div>
        </div>
    `;
}

// ============================================
// MCQ Check Function - FIXED
// ============================================
function checkMCQ(index, selectedOption) {
    const q = allQuestions[index];
    const feedbackDiv = $(`#feedback-${index}`);
    const answerDiv = $(`#answer-${index}`);
    const buttons = $(`.option-btn[data-question="${index}"]`);
    
    // Remove previous selections
    buttons.removeClass('btn-outline-primary btn-success btn-danger').addClass('btn-outline-primary');
    
    // CRITICAL FIX: Compare selected letter with answer letter
    const isCorrect = selectedOption === q.answer;
    
    // Highlight selected option
    buttons.each(function() {
        const btnText = $(this).text().trim();
        if (btnText.startsWith(selectedOption)) {
            $(this).removeClass('btn-outline-primary');
            if (isCorrect) {
                $(this).addClass('btn-success');
            } else {
                $(this).addClass('btn-danger');
            }
        }
    });
    
    // Show feedback
    feedbackDiv.show();
    if (isCorrect) {
        feedbackDiv.html(`
            <div class="alert alert-success">
                <i class="bi bi-check-circle-fill"></i> ✅ Correct! Well done!
            </div>
        `);
        answerDiv.addClass('show');
    } else {
        // Find the correct option text
        const letters = ['A', 'B', 'C', 'D'];
        const correctIndex = letters.indexOf(q.answer);
        const correctText = q.options[correctIndex] || q.answer;
        
        feedbackDiv.html(`
            <div class="alert alert-danger">
                <i class="bi bi-x-circle-fill"></i> ❌ Incorrect. The correct answer is ${q.answer}. ${correctText}
            </div>
        `);
        answerDiv.addClass('show');
    }
    
    // Disable all buttons for this question
    buttons.prop('disabled', true);
}

// ============================================
// True/False Check Function
// ============================================
function checkTrueFalse(index, selectedValue) {
    const q = allQuestions[index];
    const feedbackDiv = $(`#feedback-${index}`);
    const answerDiv = $(`#answer-${index}`);
    
    // Find the buttons in this question
    const questionCard = $(`#feedback-${index}`).closest('.question-card');
    const buttons = questionCard.find('.tf-btn');
    
    buttons.removeClass('btn-outline-success btn-outline-danger btn-success btn-danger');
    
    const isCorrect = selectedValue === q.answer;
    
    if (selectedValue) {
        buttons.eq(0).removeClass('btn-outline-success').addClass(isCorrect ? 'btn-success' : 'btn-danger');
        buttons.eq(1).removeClass('btn-outline-danger').addClass('btn-outline-danger');
    } else {
        buttons.eq(1).removeClass('btn-outline-danger').addClass(isCorrect ? 'btn-success' : 'btn-danger');
        buttons.eq(0).removeClass('btn-outline-success').addClass('btn-outline-success');
    }
    
    feedbackDiv.show();
    if (isCorrect) {
        feedbackDiv.html(`
            <div class="alert alert-success">
                <i class="bi bi-check-circle-fill"></i> ✅ Correct! Well done!
            </div>
        `);
        answerDiv.addClass('show');
    } else {
        feedbackDiv.html(`
            <div class="alert alert-danger">
                <i class="bi bi-x-circle-fill"></i> ❌ Incorrect. The correct answer is ${q.answer ? 'True' : 'False'}
            </div>
        `);
        answerDiv.addClass('show');
    }
    
    buttons.prop('disabled', true);
}

// ============================================
// Fill in the Blanks Check Function
// ============================================
function checkFillBlanks(index) {
    const q = allQuestions[index];
    const input = $(`#fb-input-${index}`);
    const userAnswer = input.val().trim();
    const feedbackDiv = $(`#feedback-${index}`);
    const answerDiv = $(`#answer-${index}`);
    
    if (!userAnswer) {
        feedbackDiv.show();
        feedbackDiv.html(`
            <div class="alert alert-warning">
                <i class="bi bi-exclamation-triangle-fill"></i> Please type an answer first!
            </div>
        `);
        return;
    }
    
    const isCorrect = userAnswer.toLowerCase() === q.answer.toLowerCase();
    
    feedbackDiv.show();
    if (isCorrect) {
        feedbackDiv.html(`
            <div class="alert alert-success">
                <i class="bi bi-check-circle-fill"></i> ✅ Correct! Well done!
            </div>
        `);
        input.addClass('is-valid');
        input.removeClass('is-invalid');
        answerDiv.addClass('show');
    } else {
        feedbackDiv.html(`
            <div class="alert alert-danger">
                <i class="bi bi-x-circle-fill"></i> ❌ Incorrect. The correct answer is "${q.answer}"
            </div>
        `);
        input.addClass('is-invalid');
        input.removeClass('is-valid');
        answerDiv.addClass('show');
    }
    
    input.prop('disabled', true);
    input.next('button').prop('disabled', true);
}

// ============================================
// Mark Question - Show Answer
// ============================================
function showMarkAnswer(index) {
    const answerDiv = $(`#answer-${index}`);
    answerDiv.toggleClass('show');
}

// ============================================
// Toggle All Answers
// ============================================
function toggleAnswers() {
    showingAnswers = !showingAnswers;
    $('.answer').toggleClass('show');
    $('#showAnswersBtn').html(showingAnswers ? 
        '<i class="bi bi-eye-slash"></i> Hide Answers' : 
        '<i class="bi bi-eye"></i> Show Answers'
    );
}

// ============================================
// Pagination
// ============================================
function updatePagination() {
    const totalPages = Math.ceil(allQuestions.length / questionsPerPage);
    const pagination = $('#pagination');
    
    if (totalPages <= 1) {
        pagination.html('');
        return;
    }
    
    let html = '';
    
    html += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage - 1}">&laquo;</a>
        </li>
    `;
    
    for (let i = 1; i <= totalPages; i++) {
        html += `
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" data-page="${i}">${i}</a>
            </li>
        `;
    }
    
    html += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage + 1}">&raquo;</a>
        </li>
    `;
    
    pagination.html(html);
    
    pagination.find('.page-link').click(function(e) {
        e.preventDefault();
        const page = parseInt($(this).data('page'));
        if (page >= 1 && page <= totalPages) {
            currentPage = page;
            renderQuestions();
            updatePagination();
            $('#questionsContainer')[0].scrollIntoView({ behavior: 'smooth' });
        }
    });
}

function updateQuestionCount() {
    $('#questionCount').text(`${allQuestions.length} questions`);
}

// ============================================
// Export Questions
// ============================================
function exportQuestions() {
    const filters = {
        subject: $('#subjectFilter').val(),
        chapter: $('#chapterFilter').val(),
        type: $('#typeFilter').val()
    };
    
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

// ============================================
// Load Statistics
// ============================================
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
    alert(message);
}
