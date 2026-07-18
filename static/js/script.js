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
            select.find('option:not(:first)').remove();
            
            // Map question types to display names
            const typeMap = {
                'mcqs': 'MCQs',
                'true_false': 'True/False',
                'fill_blanks': 'Fill in the Blanks',
                'match_column': 'Match Column',
                'one_mark': '1 Mark',
                'two_mark': '2 Marks',
                'three_mark': '3 Marks'
            };
            
            data.forEach(type => {
                const label = typeMap[type] || type.replace('_', ' ').toUpperCase();
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
        
        html += `<div class="question-card" data-index="${globalIndex}">`;
        
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
        
        html += `<div class="question-text">${q.question}</div>`;
        
        // Render based on question type
        if (q.type === 'mcqs') {
            html += renderMCQ(q, globalIndex);
        } else if (q.type === 'true_false') {
            html += renderTrueFalse(q, globalIndex);
        } else if (q.type === 'fill_blanks') {
            html += renderFillBlanks(q, globalIndex);
        } else if (q.type === 'match_column') {
            html += renderMatchColumn(q, globalIndex);
        } else {
            html += renderMarkQuestion(q, globalIndex);
        }
        
        html += `</div>`;
    });
    
    container.html(html);
    
    if (window.MathJax) {
        MathJax.typesetPromise();
    }
}

// ============================================
// Match Column Render Function
// ============================================
function renderMatchColumn(q, index) {
    let html = `<div class="match-column-section mt-3">`;
    html += `<div class="row">`;
    
    // Left Column
    html += `<div class="col-md-6">`;
    html += `<h6 class="text-center"><strong>Left Column</strong></h6>`;
    q.left_column.forEach((item, i) => {
        html += `
            <div class="match-item left-item" data-question="${index}" data-left="${item}">
                <button class="btn btn-outline-primary w-100 text-start match-btn" 
                        onclick="selectMatchItem(${index}, 'left', '${item}', ${i})">
                    ${String.fromCharCode(65 + i)}. ${item}
                </button>
            </div>
        `;
    });
    html += `</div>`;
    
    // Right Column
    html += `<div class="col-md-6">`;
    html += `<h6 class="text-center"><strong>Right Column</strong></h6>`;
    // Shuffle right column for matching
    const shuffledRight = [...q.right_column];
    for (let i = shuffledRight.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledRight[i], shuffledRight[j]] = [shuffledRight[j], shuffledRight[i]];
    }
    shuffledRight.forEach((item, i) => {
        html += `
            <div class="match-item right-item" data-question="${index}" data-right="${item}">
                <button class="btn btn-outline-secondary w-100 text-start match-btn" 
                        onclick="selectMatchItem(${index}, 'right', '${item}', ${i})">
                    ${String.fromCharCode(65 + i)}. ${item}
                </button>
            </div>
        `;
    });
    html += `</div>`;
    
    html += `</div>`;
    html += `
        <div id="match-status-${index}" class="mt-3" style="display: none;"></div>
        <div id="match-answer-${index}" class="answer">
            <strong><i class="bi bi-check-circle-fill text-success"></i> Correct Matches:</strong><br>
            ${Object.entries(q.correct_matches).map(([left, right]) => `${left} → ${right}`).join('<br>')}
        </div>
        <button class="btn btn-success mt-3" onclick="checkMatchColumn(${index})">
            <i class="bi bi-check-all"></i> Check Matches
        </button>
        <button class="btn btn-danger mt-3 ms-2" onclick="resetMatchColumn(${index})">
            <i class="bi bi-arrow-counterclockwise"></i> Reset
        </button>
    `;
    
    return html + `</div>`;
}

// Match Column State
let matchSelections = {};

function selectMatchItem(index, column, value, position) {
    if (!matchSelections[index]) {
        matchSelections[index] = { left: null, right: null, matches: {}, leftSelected: false, rightSelected: false };
    }
    
    const state = matchSelections[index];
    const questionCard = $(`.question-card[data-index="${index}"]`);
    const leftBtns = questionCard.find('.left-item .match-btn');
    const rightBtns = questionCard.find('.right-item .match-btn');
    
    if (column === 'left') {
        // Deselect previous left selection
        leftBtns.removeClass('btn-primary btn-outline-primary').addClass('btn-outline-primary');
        leftBtns.each(function() {
            if ($(this).data('left') === state.left) {
                $(this).removeClass('btn-primary');
            }
        });
        
        // Select new left
        state.left = value;
        state.leftSelected = true;
        leftBtns.each(function() {
            if ($(this).data('left') === value) {
                $(this).removeClass('btn-outline-primary').addClass('btn-primary');
            }
        });
        
        // If both selected, auto-match
        if (state.rightSelected && state.right) {
            state.matches[state.left] = state.right;
            state.leftSelected = false;
            state.rightSelected = false;
            state.left = null;
            state.right = null;
            
            // Disable matched items
            leftBtns.each(function() {
                if ($(this).data('left') === state.left) {
                    $(this).prop('disabled', true).removeClass('btn-primary').addClass('btn-success');
                }
            });
            rightBtns.each(function() {
                if ($(this).data('right') === state.right) {
                    $(this).prop('disabled', true).removeClass('btn-secondary').addClass('btn-success');
                }
            });
            
            updateMatchStatus(index);
        }
    } else if (column === 'right') {
        // Deselect previous right selection
        rightBtns.removeClass('btn-secondary btn-outline-secondary').addClass('btn-outline-secondary');
        rightBtns.each(function() {
            if ($(this).data('right') === state.right) {
                $(this).removeClass('btn-secondary');
            }
        });
        
        // Select new right
        state.right = value;
        state.rightSelected = true;
        rightBtns.each(function() {
            if ($(this).data('right') === value) {
                $(this).removeClass('btn-outline-secondary').addClass('btn-secondary');
            }
        });
        
        // If both selected, auto-match
        if (state.leftSelected && state.left) {
            state.matches[state.left] = state.right;
            state.leftSelected = false;
            state.rightSelected = false;
            const matchedLeft = state.left;
            const matchedRight = state.right;
            state.left = null;
            state.right = null;
            
            // Disable matched items
            leftBtns.each(function() {
                if ($(this).data('left') === matchedLeft) {
                    $(this).prop('disabled', true).removeClass('btn-primary').addClass('btn-success');
                }
            });
            rightBtns.each(function() {
                if ($(this).data('right') === matchedRight) {
                    $(this).prop('disabled', true).removeClass('btn-secondary').addClass('btn-success');
                }
            });
            
            updateMatchStatus(index);
        }
    }
}

function updateMatchStatus(index) {
    const state = matchSelections[index];
    const totalMatches = Object.keys(state.matches).length;
    const totalRequired = $('.left-item', `.question-card[data-index="${index}"]`).length;
    
    const statusDiv = $(`#match-status-${index}`);
    statusDiv.show();
    statusDiv.html(`
        <div class="alert alert-info">
            <i class="bi bi-info-circle"></i> Matched: ${totalMatches}/${totalRequired}
            ${totalMatches === totalRequired ? ' ✅ All matched!' : ''}
        </div>
    `);
}

function checkMatchColumn(index) {
    const q = allQuestions[index];
    const state = matchSelections[index];
    const statusDiv = $(`#match-status-${index}`);
    const answerDiv = $(`#match-answer-${index}`);
    
    if (!state || Object.keys(state.matches).length === 0) {
        statusDiv.show();
        statusDiv.html(`
            <div class="alert alert-warning">
                <i class="bi bi-exclamation-triangle"></i> Please match all items first!
            </div>
        `);
        return;
    }
    
    const totalMatches = Object.keys(state.matches).length;
    const totalRequired = Object.keys(q.correct_matches).length;
    
    if (totalMatches < totalRequired) {
        statusDiv.show();
        statusDiv.html(`
            <div class="alert alert-warning">
                <i class="bi bi-exclamation-triangle"></i> Please match all ${totalRequired} items. Currently matched: ${totalMatches}
            </div>
        `);
        return;
    }
    
    // Check matches
    let correctCount = 0;
    let incorrectMatches = [];
    
    Object.entries(state.matches).forEach(([left, right]) => {
        if (q.correct_matches[left] === right) {
            correctCount++;
        } else {
            incorrectMatches.push(`${left} → ${right} (Correct: ${q.correct_matches[left]})`);
        }
    });
    
    statusDiv.show();
    if (correctCount === totalRequired) {
        statusDiv.html(`
            <div class="alert alert-success">
                <i class="bi bi-check-circle-fill"></i> ✅ Perfect! All ${totalRequired} matches are correct!
            </div>
        `);
        answerDiv.addClass('show');
    } else {
        statusDiv.html(`
            <div class="alert alert-danger">
                <i class="bi bi-x-circle-fill"></i> ❌ ${correctCount}/${totalRequired} correct. 
                ${incorrectMatches.length > 0 ? '<br>Incorrect matches: ' + incorrectMatches.join('<br>') : ''}
            </div>
        `);
        answerDiv.addClass('show');
    }
    
    // Disable all buttons
    $('.match-btn', `.question-card[data-index="${index}"]`).prop('disabled', true);
}

function resetMatchColumn(index) {
    matchSelections[index] = { left: null, right: null, matches: {}, leftSelected: false, rightSelected: false };
    
    const questionCard = $(`.question-card[data-index="${index}"]`);
    questionCard.find('.match-btn').prop('disabled', false);
    questionCard.find('.left-item .match-btn')
        .removeClass('btn-primary btn-success btn-outline-primary')
        .addClass('btn-outline-primary');
    questionCard.find('.right-item .match-btn')
        .removeClass('btn-secondary btn-success btn-outline-secondary')
        .addClass('btn-outline-secondary');
    
    $(`#match-status-${index}`).hide();
    $(`#match-answer-${index}`).removeClass('show');
}

// ============================================
// MCQ Functions
// ============================================
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

function checkMCQ(index, selectedOption) {
    const q = allQuestions[index];
    const feedbackDiv = $(`#feedback-${index}`);
    const answerDiv = $(`#answer-${index}`);
    const buttons = $(`.option-btn[data-question="${index}"]`);
    
    buttons.removeClass('btn-outline-primary btn-success btn-danger').addClass('btn-outline-primary');
    
    const isCorrect = selectedOption === q.answer;
    
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
    
    feedbackDiv.show();
    if (isCorrect) {
        feedbackDiv.html(`
            <div class="alert alert-success">
                <i class="bi bi-check-circle-fill"></i> ✅ Correct! Well done!
            </div>
        `);
        answerDiv.addClass('show');
    } else {
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
    
    buttons.prop('disabled', true);
}

// ============================================
// True/False Functions
// ============================================
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

function checkTrueFalse(index, selectedValue) {
    const q = allQuestions[index];
    const feedbackDiv = $(`#feedback-${index}`);
    const answerDiv = $(`#answer-${index}`);
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
// Fill in the Blanks Functions
// ============================================
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
// Mark Question Functions
// ============================================
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
